import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { DbClientWorkout, DbClientWorkoutWithWorkout } from '@/lib/database.types'

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
