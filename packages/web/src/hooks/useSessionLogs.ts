import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { DbSessionLog, SessionTask } from '@/lib/database.types'

export const sessionLogKeys = {
  all:    (orgId: string) => ['session_logs', orgId] as const,
  client: (clientId: string) => ['session_logs', 'client', clientId] as const,
}

export function useAllSessionLogs() {
  const { profile } = useAuth()
  const orgId = profile?.org_id

  return useQuery({
    queryKey: sessionLogKeys.all(orgId ?? ''),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('session_logs')
        .select('*')
        .eq('org_id', orgId!)
        .order('session_date', { ascending: false })
        .order('session_time', { ascending: false })
      if (error) throw error
      return (data ?? []) as DbSessionLog[]
    },
    enabled: !!orgId,
  })
}

export function useSessionLogs(clientId: string) {
  return useQuery({
    queryKey: sessionLogKeys.client(clientId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('session_logs')
        .select('*')
        .eq('client_id', clientId)
        .order('session_date', { ascending: false })
      if (error) throw error
      return (data ?? []) as DbSessionLog[]
    },
    enabled: !!clientId,
  })
}

export function useCreateSessionLog() {
  const { profile } = useAuth()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (input: {
      client_id: string
      session_date: string
      session_time?: string | null
      workout_type?: string | null
      client_weight_kg?: number | null
      session_notes?: string | null
      tasks?: SessionTask[]
    }) => {
      const { data, error } = await supabase
        .from('session_logs')
        .insert({
          org_id:           profile!.org_id!,
          client_id:        input.client_id,
          session_date:     input.session_date,
          session_time:     input.session_time     ?? null,
          workout_type:     input.workout_type     ?? null,
          client_weight_kg: input.client_weight_kg ?? null,
          session_notes:    input.session_notes    ?? null,
          tasks:            input.tasks            ?? [],
        })
        .select()
        .single()
      if (error) throw error
      return data as DbSessionLog
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: sessionLogKeys.all(profile?.org_id ?? '') })
      qc.invalidateQueries({ queryKey: sessionLogKeys.client(data.client_id) })
    },
  })
}

export function useUpdateSessionLog() {
  const { profile } = useAuth()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, clientId, ...updates }: Partial<DbSessionLog> & { id: string; clientId: string }) => {
      const { data, error } = await supabase
        .from('session_logs')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as DbSessionLog
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: sessionLogKeys.all(profile?.org_id ?? '') })
      qc.invalidateQueries({ queryKey: sessionLogKeys.client(vars.clientId) })
    },
  })
}

export function useDeleteSessionLog() {
  const { profile } = useAuth()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, clientId }: { id: string; clientId: string }) => {
      const { error } = await supabase.from('session_logs').delete().eq('id', id)
      if (error) throw error
      return { clientId }
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: sessionLogKeys.all(profile?.org_id ?? '') })
      qc.invalidateQueries({ queryKey: sessionLogKeys.client(vars.clientId) })
    },
  })
}
