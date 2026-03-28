import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { DbLead, LeadStatus } from '@/lib/database.types'

export const leadKeys = {
  all:  (orgId: string) => ['leads', orgId] as const,
  list: (orgId: string) => ['leads', orgId, 'list'] as const,
}

export function useLeads() {
  const { profile } = useAuth()
  const orgId = profile?.org_id

  return useQuery({
    queryKey: leadKeys.list(orgId ?? ''),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('org_id', orgId!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as DbLead[]
    },
    enabled: !!orgId,
  })
}

export function useCreateLead() {
  const { profile } = useAuth()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (input: {
      name: string
      email?: string
      phone?: string
      source?: string
      notes?: string
      assigned_coach_id?: string
    }) => {
      const { data, error } = await supabase
        .from('leads')
        .insert({ ...input, org_id: profile!.org_id! })
        .select()
        .single()
      if (error) throw error
      return data as DbLead
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: leadKeys.list(profile?.org_id ?? '') })
    },
  })
}

export function useUpdateLead() {
  const { profile } = useAuth()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DbLead> & { id: string }) => {
      const { data, error } = await supabase
        .from('leads')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as DbLead
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: leadKeys.list(profile?.org_id ?? '') })
    },
  })
}

export function useDeleteLead() {
  const { profile } = useAuth()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('leads').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: leadKeys.list(profile?.org_id ?? '') })
    },
  })
}

export function useConvertLeadToClient() {
  const { profile } = useAuth()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ leadId, lead }: { leadId: string; lead: DbLead }) => {
      // Create the client
      const { data: client, error: clientErr } = await supabase
        .from('clients')
        .insert({
          org_id: profile!.org_id!,
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          status: 'active',
          assigned_coach_id: lead.assigned_coach_id,
          tags: [],
          portal_sections: ['workouts'],
        })
        .select()
        .single()
      if (clientErr) throw clientErr

      // Mark lead as converted with link to new client
      const { error: leadErr } = await supabase
        .from('leads')
        .update({ status: 'converted' as LeadStatus, converted_client_id: client.id })
        .eq('id', leadId)
      if (leadErr) throw leadErr

      return client
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: leadKeys.list(profile?.org_id ?? '') })
      qc.invalidateQueries({ queryKey: ['clients'] })
    },
  })
}
