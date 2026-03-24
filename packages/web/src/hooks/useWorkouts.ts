import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type {
  DbExercise, DbWorkout, DbWorkoutExercise, DbWorkoutSet,
  DbProgram, DbProgramWorkout, DbProgramWorkoutWithWorkout,
  DbProgramAssignment, ProgressionType,
} from '@/lib/database.types'

// ─── Exercises ────────────────────────────────────────────────
export function useExercises(search?: string) {
  const { profile } = useAuth()
  const orgId = profile?.org_id

  return useQuery({
    queryKey: ['exercises', orgId, search],
    queryFn: async () => {
      let q = supabase.from('exercises').select('*').eq('org_id', orgId!).order('name')
      if (search) q = q.ilike('name', `%${search}%`)
      const { data, error } = await q
      if (error) throw error
      return data as DbExercise[]
    },
    enabled: !!orgId,
  })
}

export function useCreateExercise() {
  const { profile } = useAuth()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (input: Omit<DbExercise, 'id' | 'created_at' | 'org_id'>) => {
      const orgId = profile?.org_id
      if (!orgId) throw new Error('Session not ready — please wait a moment and try again.')
      const { data, error } = await supabase
        .from('exercises')
        .insert({ ...input, org_id: orgId } as any)
        .select()
        .single()
      if (error) throw error
      return data as DbExercise
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exercises'] }),
  })
}

export function useBulkImportExercises() {
  const { profile } = useAuth()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (rows: Omit<DbExercise, 'id' | 'created_at' | 'org_id'>[]) => {
      const orgId = profile?.org_id
      if (!orgId) throw new Error('Session not ready')
      const payload = rows.map(r => ({ ...r, org_id: orgId }))
      // Insert in batches of 200 to stay within Supabase limits
      let inserted = 0
      for (let i = 0; i < payload.length; i += 200) {
        const { error } = await supabase.from('exercises').insert(payload.slice(i, i + 200) as any)
        if (error) throw error
        inserted += Math.min(200, payload.length - i)
      }
      return inserted
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exercises'] }),
  })
}

export function useDeleteExercise() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('exercises').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exercises'] }),
  })
}

// ─── Workouts ─────────────────────────────────────────────────
export function useWorkouts(search?: string) {
  const { profile } = useAuth()
  const orgId = profile?.org_id

  return useQuery({
    queryKey: ['workouts', orgId, search],
    queryFn: async () => {
      let q = supabase
        .from('workouts')
        .select(`*, workout_exercises(id)`)
        .eq('org_id', orgId!)
        .order('created_at', { ascending: false })
      if (search) q = q.ilike('name', `%${search}%`)
      const { data, error } = await q
      if (error) throw error
      return data as (DbWorkout & { workout_exercises: { id: string }[] })[]
    },
    enabled: !!orgId,
  })
}

export function useCreateWorkout() {
  const { profile } = useAuth()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (input: Omit<DbWorkout, 'id' | 'created_at' | 'org_id'>) => {
      const orgId = profile?.org_id
      if (!orgId) throw new Error('Session not ready — please wait a moment and try again.')
      const { data, error } = await supabase
        .from('workouts')
        .insert({ ...input, org_id: orgId } as any)
        .select()
        .single()
      if (error) throw error
      return data as DbWorkout
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workouts'] }),
  })
}

export function useDeleteWorkout() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('workouts').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workouts'] }),
  })
}

// ─── Workout detail (exercises + sets) ───────────────────────
export type WorkoutExerciseWithSets = DbWorkoutExercise & {
  exercise: DbExercise | null
  workout_sets: DbWorkoutSet[]
}

export type WorkoutDetail = DbWorkout & {
  workout_exercises: WorkoutExerciseWithSets[]
}

export function useWorkoutDetail(workoutId: string | undefined) {
  return useQuery({
    queryKey: ['workout-detail', workoutId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workouts')
        .select(`
          *,
          workout_exercises (
            *,
            exercise:exercises(*),
            workout_sets (*)
          )
        `)
        .eq('id', workoutId!)
        .single()
      if (error) throw error

      const result = data as WorkoutDetail
      result.workout_exercises.sort((a, b) => a.order_index - b.order_index)
      result.workout_exercises.forEach(we =>
        we.workout_sets.sort((a, b) => a.set_number - b.set_number)
      )
      return result
    },
    enabled: !!workoutId,
  })
}

export function useUpdateWorkout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<DbWorkout> & { id: string }) => {
      const { error } = await supabase.from('workouts').update(patch as any).eq('id', id)
      if (error) throw error
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['workout-detail', vars.id] })
      qc.invalidateQueries({ queryKey: ['workouts'] })
    },
  })
}

// ─── Workout exercises ────────────────────────────────────────
export function useAddWorkoutExercise(workoutId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      exercise_id: string | null
      exercise_name: string
      order_index: number
    }) => {
      const { data, error } = await supabase
        .from('workout_exercises')
        .insert({
          workout_id: workoutId,
          progression_type: 'none',
          ...input,
        } as any)
        .select()
        .single()
      if (error) throw error
      return data as DbWorkoutExercise
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workout-detail', workoutId] }),
  })
}

export function useUpdateWorkoutExercise(workoutId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      progression_type,
      progression_value,
      notes,
    }: {
      id: string
      progression_type?: ProgressionType
      progression_value?: number | null
      notes?: string | null
    }) => {
      const { error } = await supabase
        .from('workout_exercises')
        .update({ progression_type, progression_value, notes } as any)
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workout-detail', workoutId] }),
  })
}

export function useRemoveWorkoutExercise(workoutId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('workout_exercises').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workout-detail', workoutId] }),
  })
}

export function useReorderWorkoutExercises(workoutId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (exercises: { id: string; order_index: number }[]) => {
      const updates = exercises.map(e =>
        supabase.from('workout_exercises').update({ order_index: e.order_index } as any).eq('id', e.id)
      )
      await Promise.all(updates)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workout-detail', workoutId] }),
  })
}

// ─── Workout sets ─────────────────────────────────────────────
export function useAddWorkoutSet(workoutId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: Omit<DbWorkoutSet, 'id'>) => {
      const { data, error } = await supabase
        .from('workout_sets')
        .insert(input as any)
        .select()
        .single()
      if (error) throw error
      return data as DbWorkoutSet
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workout-detail', workoutId] }),
  })
}

export function useUpdateWorkoutSet(workoutId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<DbWorkoutSet> & { id: string }) => {
      const { error } = await supabase.from('workout_sets').update(patch as any).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workout-detail', workoutId] }),
  })
}

export function useRemoveWorkoutSet(workoutId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('workout_sets').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workout-detail', workoutId] }),
  })
}

// ─── Last-performance lookup ──────────────────────────────────
export function useLastPerformance(workoutExerciseId: string | undefined) {
  return useQuery({
    queryKey: ['last-performance', workoutExerciseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workout_set_logs')
        .select('*')
        .eq('workout_exercise_id', workoutExerciseId!)
        .order('created_at', { ascending: false })
        .limit(20)
      if (error) throw error
      return data
    },
    enabled: !!workoutExerciseId,
    staleTime: 1000 * 60 * 5,
  })
}

// ─── Programs ─────────────────────────────────────────────────
export function usePrograms(search?: string) {
  const { profile } = useAuth()
  const orgId = profile?.org_id

  return useQuery({
    queryKey: ['programs', orgId, search],
    queryFn: async () => {
      let q = supabase.from('programs').select('*').eq('org_id', orgId!).order('created_at', { ascending: false })
      if (search) q = q.ilike('name', `%${search}%`)
      const { data, error } = await q
      if (error) throw error
      return data as DbProgram[]
    },
    enabled: !!orgId,
  })
}

export function useCreateProgram() {
  const { profile } = useAuth()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (input: Omit<DbProgram, 'id' | 'created_at' | 'org_id'>) => {
      const orgId = profile?.org_id
      if (!orgId) throw new Error('Session not ready — please wait a moment and try again.')
      const { data, error } = await supabase
        .from('programs')
        .insert({ ...input, org_id: orgId } as any)
        .select()
        .single()
      if (error) throw error
      return data as DbProgram
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['programs'] }),
  })
}

export type DbProgramWithWorkouts = DbProgram & {
  program_workouts: DbProgramWorkoutWithWorkout[]
}

export function useProgramDetail(programId: string | undefined) {
  return useQuery({
    queryKey: ['program-detail', programId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('programs')
        .select('*, program_workouts(*, workout:workouts(*))')
        .eq('id', programId!)
        .single()
      if (error) throw error
      return data as DbProgramWithWorkouts
    },
    enabled: !!programId,
  })
}

export function useUpdateProgram() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...update }: Partial<Omit<DbProgram, 'org_id' | 'created_at'>> & { id: string }) => {
      const { data, error } = await supabase
        .from('programs')
        .update(update as any)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as DbProgram
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['programs'] })
      qc.invalidateQueries({ queryKey: ['program-detail', data.id] })
    },
  })
}

export function useDeleteProgram() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('programs').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['programs'] }),
  })
}

export function useAddProgramWorkout(programId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { workout_id: string; week_number: number; day_number: number }) => {
      const { data, error } = await supabase
        .from('program_workouts')
        .insert({ program_id: programId, ...input } as any)
        .select('*, workout:workouts(*)')
        .single()
      if (error) throw error
      return data as DbProgramWorkoutWithWorkout
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['program-detail', programId] }),
  })
}

export function useRemoveProgramWorkout(programId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('program_workouts').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['program-detail', programId] }),
  })
}

export function useClientProgramAssignment(clientId: string) {
  return useQuery({
    queryKey: ['program-assignment', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('program_assignments')
        .select('*, program:programs(*)')
        .eq('client_id', clientId)
        .eq('active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return data as (DbProgramAssignment & { program: DbProgram | null }) | null
    },
    enabled: !!clientId,
  })
}

export function useAssignProgram(clientId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ program_id, start_date }: { program_id: string; start_date?: string }) => {
      await supabase
        .from('program_assignments')
        .update({ active: false } as any)
        .eq('client_id', clientId)
        .eq('active', true)
      const { data, error } = await supabase
        .from('program_assignments')
        .insert({ client_id: clientId, program_id, start_date: start_date ?? null, active: true } as any)
        .select('*, program:programs(*)')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['program-assignment', clientId] }),
  })
}

export function useUnassignProgram(clientId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await supabase
        .from('program_assignments')
        .update({ active: false } as any)
        .eq('id', assignmentId)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['program-assignment', clientId] }),
  })
}

// Re-export types so callers can import from this file
export type { DbProgramWorkout, DbProgramWorkoutWithWorkout, DbProgramAssignment }
