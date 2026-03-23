import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { DbClient } from '@/lib/database.types'

function requireProfile(profile: { id: string; org_id: string } | null) {
  if (!profile) throw new Error('Profile not loaded — please refresh and try again.')
  return profile
}

// ─── Query keys ──────────────────────────────────────────────
export const clientKeys = {
  all:    (orgId: string) => ['clients', orgId] as const,
  list:   (orgId: string, filters?: object) => ['clients', orgId, filters] as const,
  detail: (id: string) => ['client', id] as const,
}

// ─── List clients (with optional filtering) ──────────────────
export function useClients(filters?: { status?: string; search?: string }) {
  const { profile } = useAuth()
  const orgId = profile?.org_id

  return useQuery({
    queryKey: clientKeys.list(orgId ?? '', filters),
    queryFn: async () => {
      let q = supabase
        .from('clients')
        .select('*')
        .eq('org_id', orgId!)
        .order('created_at', { ascending: false })

      if (filters?.status && filters.status !== 'all') {
        q = q.eq('status', filters.status)
      }
      if (filters?.search) {
        q = q.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`)
      }

      const { data, error } = await q
      if (error) throw error
      return data as DbClient[]
    },
    enabled: !!orgId,
  })
}

// ─── Single client ────────────────────────────────────────────
export function useClient(id: string) {
  return useQuery({
    queryKey: clientKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      return data as DbClient
    },
    enabled: !!id,
  })
}

// ─── Create client ────────────────────────────────────────────
export function useCreateClient() {
  const { profile } = useAuth()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (input: {
      name: string
      email?: string
      phone?: string
      status?: DbClient['status']
      goal?: string
      category?: string
    }) => {
      const p = requireProfile(profile)
      const { data, error } = await supabase
        .from('clients')
        .insert({
          org_id:            p.org_id,
          assigned_coach_id: p.id,
          name:              input.name,
          email:             input.email ?? null,
          phone:             input.phone ?? null,
          status:            input.status ?? 'active',
          goal:              input.goal ?? null,
          category:          input.category ?? null,
        } as any)
        .select()
        .single()
      if (error) throw error
      return data as DbClient
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: clientKeys.all(requireProfile(profile).org_id) })
    },
  })
}

// ─── Update client ────────────────────────────────────────────
export function useUpdateClient() {
  const { profile } = useAuth()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DbClient> & { id: string }) => {
      const { data, error } = await supabase
        .from('clients')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as DbClient
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: clientKeys.all(requireProfile(profile).org_id) })
      qc.invalidateQueries({ queryKey: clientKeys.detail(data.id) })
    },
  })
}

// ─── Delete client ────────────────────────────────────────────
export function useDeleteClient() {
  const { profile } = useAuth()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('clients').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: clientKeys.all(requireProfile(profile).org_id) })
    },
  })
}
