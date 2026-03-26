import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

export interface DbHabit {
  id: string
  org_id: string
  client_id: string
  name: string
  description: string | null
  emoji: string
  frequency: 'daily' | 'weekdays' | 'weekends' | 'weekly'
  active: boolean
  created_at: string
}

export interface DbHabitWithClient extends DbHabit {
  clients: { name: string } | null
}

export function useAllHabits() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['habits', 'all', profile?.org_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('habits')
        .select('*, clients(name)')
        .eq('org_id', profile!.org_id!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as DbHabitWithClient[]
    },
    enabled: !!profile?.org_id,
  })
}

export function useHabits(clientId: string) {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['habits', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('habits')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: true })
      if (error) throw error
      return (data ?? []) as DbHabit[]
    },
    enabled: !!profile?.org_id,
  })
}

export function useCreateHabit() {
  const { profile } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      client_id: string
      name: string
      description?: string
      emoji?: string
      frequency?: DbHabit['frequency']
    }) => {
      const { data, error } = await supabase
        .from('habits')
        .insert({
          org_id:      profile!.org_id,
          client_id:   input.client_id,
          name:        input.name.trim(),
          description: input.description?.trim() || null,
          emoji:       input.emoji ?? '✅',
          frequency:   input.frequency ?? 'daily',
        })
        .select()
        .single()
      if (error) throw error
      return data as DbHabit
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['habits', vars.client_id] }),
  })
}

export function useDeleteHabit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, clientId }: { id: string; clientId: string }) => {
      const { error } = await supabase.from('habits').delete().eq('id', id)
      if (error) throw error
      return clientId
    },
    onSuccess: (clientId) => qc.invalidateQueries({ queryKey: ['habits', clientId] }),
  })
}

export function useToggleHabitActive() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, clientId, active }: { id: string; clientId: string; active: boolean }) => {
      const { error } = await supabase.from('habits').update({ active }).eq('id', id)
      if (error) throw error
      return clientId
    },
    onSuccess: (clientId) => qc.invalidateQueries({ queryKey: ['habits', clientId] }),
  })
}
