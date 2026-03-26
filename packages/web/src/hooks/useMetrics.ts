import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { DbCheckIn } from '@/lib/database.types'

// ─── Types ───────────────────────────────────────────────────
export type MetricCategory = 'body_composition' | 'performance' | 'wellness' | 'measurements' | 'custom'
// stored as text in DB with CHECK constraint (no enum type needed)

export interface DbMetricDefinition {
  id: string
  org_id: string
  name: string
  unit: string
  emoji: string
  category: MetricCategory
  created_at: string
}

export interface DbCustomMetricValue {
  id: string
  org_id: string
  client_id: string
  definition_id: string
  value: number
  logged_at: string
  created_at: string
}

export interface CustomMetricValueWithDef extends DbCustomMetricValue {
  metric_definitions: { name: string; unit: string; emoji: string; category: string }
}

// ─── Check-ins (built-in metrics) ────────────────────────────
export function useCheckIns(clientId: string) {
  return useQuery({
    queryKey: ['check_ins', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('check_ins')
        .select('*')
        .eq('client_id', clientId)
        .order('checked_in_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as DbCheckIn[]
    },
    enabled: !!clientId,
  })
}

export function useCreateCheckIn() {
  const { profile } = useAuth()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (input: {
      client_id: string
      weight_kg?: number | null
      body_fat_pct?: number | null
      energy_level?: number | null
      sleep_hours?: number | null
      notes?: string | null
      checked_in_at?: string
    }) => {
      const { data, error } = await supabase
        .from('check_ins')
        .insert({
          client_id:    input.client_id,
          weight_kg:    input.weight_kg    ?? null,
          body_fat_pct: input.body_fat_pct ?? null,
          energy_level: input.energy_level ?? null,
          sleep_hours:  input.sleep_hours  ?? null,
          notes:        input.notes        ?? null,
          checked_in_at: input.checked_in_at ?? new Date().toISOString().slice(0, 10),
        } as any)
        .select()
        .single()
      if (error) throw error
      return data as DbCheckIn
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ['check_ins', data.client_id] }),
  })
}

export function useDeleteCheckIn() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, clientId }: { id: string; clientId: string }) => {
      const { error } = await supabase.from('check_ins').delete().eq('id', id)
      if (error) throw error
      return clientId
    },
    onSuccess: (clientId) => qc.invalidateQueries({ queryKey: ['check_ins', clientId] }),
  })
}

// ─── Metric definitions (org-level) ─────────────────────────
export function useMetricDefinitions() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['metric_definitions', profile?.org_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('metric_definitions')
        .select('*')
        .eq('org_id', profile!.org_id!)
        .order('category')
        .order('name')
      if (error) throw error
      return (data ?? []) as DbMetricDefinition[]
    },
    enabled: !!profile?.org_id,
  })
}

export function useCreateMetricDefinition() {
  const { profile } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      name: string
      unit?: string
      emoji?: string
      category?: MetricCategory
    }) => {
      const { data, error } = await supabase
        .from('metric_definitions')
        .insert({
          org_id:   profile!.org_id,
          name:     input.name.trim(),
          unit:     input.unit?.trim() ?? '',
          emoji:    input.emoji ?? '📊',
          category: input.category ?? 'custom',
        })
        .select()
        .single()
      if (error) throw error
      return data as DbMetricDefinition
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['metric_definitions', profile!.org_id] }),
  })
}

export function useDeleteMetricDefinition() {
  const { profile } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('metric_definitions').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['metric_definitions', profile!.org_id] }),
  })
}

// ─── Custom metric values (per client) ───────────────────────
export function useCustomMetricValues(clientId: string) {
  return useQuery({
    queryKey: ['custom_metric_values', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('custom_metric_values')
        .select('*, metric_definitions(name, unit, emoji, category)')
        .eq('client_id', clientId)
        .order('logged_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as CustomMetricValueWithDef[]
    },
    enabled: !!clientId,
  })
}

export function useLogCustomMetricValue() {
  const { profile } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      client_id: string
      definition_id: string
      value: number
      logged_at?: string
    }) => {
      const { data, error } = await supabase
        .from('custom_metric_values')
        .insert({
          org_id:        profile!.org_id,
          client_id:     input.client_id,
          definition_id: input.definition_id,
          value:         input.value,
          logged_at:     input.logged_at ?? new Date().toISOString().slice(0, 10),
        })
        .select()
        .single()
      if (error) throw error
      return data as DbCustomMetricValue
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ['custom_metric_values', data.client_id] }),
  })
}

export function useDeleteCustomMetricValue() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, clientId }: { id: string; clientId: string }) => {
      const { error } = await supabase.from('custom_metric_values').delete().eq('id', id)
      if (error) throw error
      return clientId
    },
    onSuccess: (clientId) => qc.invalidateQueries({ queryKey: ['custom_metric_values', clientId] }),
  })
}
