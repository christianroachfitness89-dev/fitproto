import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

export interface DbHabit {
  id: string
  org_id: string
  client_id: string | null
  name: string
  description: string | null
  emoji: string
  frequency: 'daily' | 'weekdays' | 'weekends' | 'weekly'
  active: boolean
  is_template: boolean
  metric_definition_id: string | null
  created_at: string
}

export interface DbHabitWithClient extends DbHabit {
  clients: { name: string } | null
}

// All habits for the org (assigned only, not templates)
export function useAllHabits() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['habits', 'all', profile?.org_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('habits')
        .select('*, clients(name)')
        .eq('org_id', profile!.org_id!)
        .eq('is_template', false)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as DbHabitWithClient[]
    },
    enabled: !!profile?.org_id,
  })
}

// Templates only
export function useHabitTemplates() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['habits', 'templates', profile?.org_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('habits')
        .select('*')
        .eq('org_id', profile!.org_id!)
        .eq('is_template', true)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as DbHabit[]
    },
    enabled: !!profile?.org_id,
  })
}

// Per-client habits (non-template)
export function useHabits(clientId: string) {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['habits', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('habits')
        .select('*')
        .eq('client_id', clientId)
        .eq('is_template', false)
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
      client_id?: string | null
      name: string
      description?: string
      emoji?: string
      frequency?: DbHabit['frequency']
      is_template?: boolean
      metric_definition_id?: string | null
    }) => {
      const { data, error } = await supabase
        .from('habits')
        .insert({
          org_id:               profile!.org_id,
          client_id:            input.client_id ?? null,
          name:                 input.name.trim(),
          description:          input.description?.trim() || null,
          emoji:                input.emoji ?? '✅',
          frequency:            input.frequency ?? 'daily',
          is_template:          input.is_template ?? false,
          metric_definition_id: input.metric_definition_id ?? null,
        })
        .select()
        .single()
      if (error) throw error
      return data as DbHabit
    },
    onSuccess: (data, vars) => {
      if (vars.is_template) {
        qc.invalidateQueries({ queryKey: ['habits', 'templates'] })
      } else {
        qc.invalidateQueries({ queryKey: ['habits', 'all'] })
        if (vars.client_id) qc.invalidateQueries({ queryKey: ['habits', vars.client_id] })
      }
    },
  })
}

// Assign a template to a client (creates a new real habit from the template)
export function useAssignHabitTemplate() {
  const { profile } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ template, clientId }: { template: DbHabit; clientId: string }) => {
      const { data, error } = await supabase
        .from('habits')
        .insert({
          org_id:               profile!.org_id,
          client_id:            clientId,
          name:                 template.name,
          description:          template.description,
          emoji:                template.emoji,
          frequency:            template.frequency,
          is_template:          false,
          metric_definition_id: template.metric_definition_id ?? null,
        })
        .select()
        .single()
      if (error) throw error
      return data as DbHabit
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['habits', 'all'] })
      qc.invalidateQueries({ queryKey: ['habits', data.client_id] })
    },
  })
}

export function useDeleteHabit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, clientId, isTemplate }: { id: string; clientId: string | null; isTemplate?: boolean }) => {
      const { error } = await supabase.from('habits').delete().eq('id', id)
      if (error) throw error
      return { clientId, isTemplate }
    },
    onSuccess: ({ clientId, isTemplate }) => {
      if (isTemplate) {
        qc.invalidateQueries({ queryKey: ['habits', 'templates'] })
      } else {
        qc.invalidateQueries({ queryKey: ['habits', 'all'] })
        if (clientId) qc.invalidateQueries({ queryKey: ['habits', clientId] })
      }
    },
  })
}

export function useToggleHabitActive() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, clientId, active }: { id: string; clientId: string | null; active: boolean }) => {
      const { error } = await supabase.from('habits').update({ active }).eq('id', id)
      if (error) throw error
      return clientId
    },
    onSuccess: (clientId) => {
      qc.invalidateQueries({ queryKey: ['habits', 'all'] })
      if (clientId) qc.invalidateQueries({ queryKey: ['habits', clientId] })
    },
  })
}
