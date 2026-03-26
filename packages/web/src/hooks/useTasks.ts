import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { DbTask } from '@/lib/database.types'

// All tasks for the org (non-template)
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
        .eq('is_template', false)
        .order('due_date', { ascending: true, nullsFirst: false })
      if (clientId) q = q.eq('client_id', clientId)
      const { data, error } = await q
      if (error) throw error
      return data as (DbTask & { clients: { name: string } | null })[]
    },
    enabled: !!orgId,
  })
}

// Templates only
export function useTaskTemplates() {
  const { profile } = useAuth()
  const orgId = profile?.org_id

  return useQuery({
    queryKey: ['tasks', 'templates', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('org_id', orgId!)
        .eq('is_template', true)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as DbTask[]
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
      is_template?: boolean
      metric_definition_id?: string | null
    }) => {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          org_id:               profile!.org_id,
          assigned_to:          profile!.id,
          title:                input.title,
          client_id:            input.client_id ?? null,
          type:                 input.type ?? 'general',
          due_date:             input.due_date ?? null,
          is_template:          input.is_template ?? false,
          metric_definition_id: input.metric_definition_id ?? null,
        } as any)
        .select()
        .single()
      if (error) throw error
      return data as DbTask
    },
    onSuccess: (_, vars) => {
      if (vars.is_template) {
        qc.invalidateQueries({ queryKey: ['tasks', 'templates', profile!.org_id] })
      } else {
        qc.invalidateQueries({ queryKey: ['tasks', profile!.org_id] })
      }
    },
  })
}

// Assign a template to a client (creates a new real task from the template)
export function useAssignTaskTemplate() {
  const { profile } = useAuth()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ template, clientId, dueDate }: { template: DbTask; clientId: string; dueDate?: string }) => {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          org_id:               profile!.org_id,
          assigned_to:          profile!.id,
          title:                template.title,
          client_id:            clientId,
          type:                 template.type,
          due_date:             dueDate ?? null,
          is_template:          false,
          metric_definition_id: template.metric_definition_id ?? null,
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
    mutationFn: async ({ id, isTemplate }: { id: string; isTemplate?: boolean }) => {
      const { error } = await supabase.from('tasks').delete().eq('id', id)
      if (error) throw error
      return isTemplate
    },
    onSuccess: (isTemplate) => {
      if (isTemplate) {
        qc.invalidateQueries({ queryKey: ['tasks', 'templates', profile!.org_id] })
      } else {
        qc.invalidateQueries({ queryKey: ['tasks', profile!.org_id] })
      }
    },
  })
}
