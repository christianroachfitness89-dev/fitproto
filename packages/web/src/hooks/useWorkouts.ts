import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { DbExercise, DbWorkout, DbProgram } from '@/lib/database.types'

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
      const { data, error } = await supabase
        .from('exercises')
        .insert({ ...input, org_id: profile!.org_id } as any)
        .select()
        .single()
      if (error) throw error
      return data as DbExercise
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exercises', profile!.org_id] }),
  })
}

export function useDeleteExercise() {
  const { profile } = useAuth()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('exercises').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exercises', profile!.org_id] }),
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
      const { data, error } = await supabase
        .from('workouts')
        .insert({ ...input, org_id: profile!.org_id } as any)
        .select()
        .single()
      if (error) throw error
      return data as DbWorkout
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workouts', profile!.org_id] }),
  })
}

export function useDeleteWorkout() {
  const { profile } = useAuth()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('workouts').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workouts', profile!.org_id] }),
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
      const { data, error } = await supabase
        .from('programs')
        .insert({ ...input, org_id: profile!.org_id } as any)
        .select()
        .single()
      if (error) throw error
      return data as DbProgram
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['programs', profile!.org_id] }),
  })
}
