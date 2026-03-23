import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { DbClientWorkout, DbClientWorkoutWithWorkout, DbWorkoutLog } from '@/lib/database.types'

export function useClientWorkouts(clientId: string) {
  return useQuery({
    queryKey: ['client_workouts', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_workouts')
        .select('*, workout:workouts(*)')
        .eq('client_id', clientId)
        .order('assigned_at', { ascending: false })
      if (error) throw error
      return data as DbClientWorkoutWithWorkout[]
    },
    enabled: !!clientId,
  })
}

export function useAssignWorkout() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (input: {
      client_id: string
      workout_id: string
      due_date?: string
      notes?: string
    }) => {
      const { data, error } = await supabase
        .from('client_workouts')
        .insert({
          client_id:  input.client_id,
          workout_id: input.workout_id,
          due_date:   input.due_date ?? null,
          notes:      input.notes ?? null,
        } as any)
        .select('*, workout:workouts(*)')
        .single()
      if (error) throw error
      return data as DbClientWorkoutWithWorkout
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['client_workouts', vars.client_id] })
    },
  })
}

export function useUpdateClientWorkoutStatus() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, status, clientId }: { id: string; status: DbClientWorkout['status']; clientId: string }) => {
      const { error } = await supabase
        .from('client_workouts')
        .update({ status } as any)
        .eq('id', id)
      if (error) throw error
      return { id, clientId }
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['client_workouts', vars.clientId] })
    },
  })
}

export function useRemoveClientWorkout() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, clientId }: { id: string; clientId: string }) => {
      const { error } = await supabase
        .from('client_workouts')
        .delete()
        .eq('id', id)
      if (error) throw error
      return { clientId }
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['client_workouts', vars.clientId] })
    },
  })
}

export function useWorkoutLogs(clientId: string) {
  return useQuery({
    queryKey: ['workout_logs', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workout_logs')
        .select('*')
        .eq('client_id', clientId)
        .order('completed_at', { ascending: false })
      if (error) throw error
      return data as DbWorkoutLog[]
    },
    enabled: !!clientId,
  })
}

interface SetLogInput {
  workout_exercise_id: string
  set_number: number
  reps_achieved: number | null
  weight_used: number | null
  duration_seconds: number | null
  distance_meters: number | null
  rpe: number | null
}

export function useLogWorkoutSession() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (input: {
      clientId: string
      clientWorkoutId: string
      workoutId: string
      completedAt: string
      notes: string
      setLogs: SetLogInput[]
    }) => {
      // 1. Insert workout_log
      const { data: log, error: logErr } = await supabase
        .from('workout_logs')
        .insert({
          client_id:         input.clientId,
          workout_id:        input.workoutId,
          client_workout_id: input.clientWorkoutId,
          completed_at:      input.completedAt,
          notes:             input.notes || null,
        } as any)
        .select()
        .single()
      if (logErr) throw logErr

      // 2. Insert set logs (only rows where something was entered)
      const loggable = input.setLogs.filter(s =>
        s.reps_achieved != null || s.weight_used != null ||
        s.duration_seconds != null || s.distance_meters != null
      )
      if (loggable.length > 0) {
        const { error: setsErr } = await supabase
          .from('workout_set_logs')
          .insert(loggable.map(s => ({ ...s, workout_log_id: (log as any).id })) as any)
        if (setsErr) throw setsErr
      }

      // 3. Mark assignment completed
      const { error: statusErr } = await supabase
        .from('client_workouts')
        .update({ status: 'completed' } as any)
        .eq('id', input.clientWorkoutId)
      if (statusErr) throw statusErr

      return log as DbWorkoutLog
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['client_workouts', vars.clientId] })
      qc.invalidateQueries({ queryKey: ['workout_logs', vars.clientId] })
    },
  })
}
