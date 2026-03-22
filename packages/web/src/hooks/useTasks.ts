import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { DbTask } from '@/lib/database.types'

export function useTasks(clientId?: string) {
  const { profile } = useAuth()
  const orgId = profile?.org_id

  return useQuery({
    queryKey: ['tasks', orgId, clientId],
    queryFn: async () => {
      let q = supabase
        .from('tasks')
        .select(`*, clients(name)`)
        .eq('org_id', orgId!)
        .order('due_date', { ascending: true, nullsFirst: false })
      if (clientId) q = q.eq('client_id', clientId)
      const { data, error } = await q
      if (error) throw error
      return data as (DbTask & { clients: { name: string } | null })[]
    },
    enabled: !!orgId,
  })
}

export function useCreateTask() {
  const { profile } = useAuth()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (input: {
      title: string
      client_id?: string
      type?: DbTask['type']
      due_date?: string
    }) => {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          org_id:      profile!.org_id,
          assigned_to: profile!.id,
          title:       input.title,
          client_id:   input.client_id ?? null,
          type:        input.type ?? 'general',
          due_date:    input.due_date ?? null,
        } as any)
        .select()
        .single()
      if (error) throw error
      return data as DbTask
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks', profile!.org_id] }),
  })
}

export function useToggleTask() {
  const { profile } = useAuth()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const { error } = await supabase
        .from('tasks')
        .update({ completed } as any)
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks', profile!.org_id] }),
  })
}

export function useDeleteTask() {
  const { profile } = useAuth()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tasks').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks', profile!.org_id] }),
  })
}
