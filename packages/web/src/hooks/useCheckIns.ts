import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { DbCheckIn } from '@/lib/database.types'

export function useCheckIns(clientId: string) {
  return useQuery({
    queryKey: ['check_ins', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('check_ins')
        .select('*')
        .eq('client_id', clientId)
        .order('checked_in_at', { ascending: true })
      if (error) throw error
      return data as DbCheckIn[]
    },
    enabled: !!clientId,
  })
}

export function useCreateCheckIn() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (input: {
      client_id:     string
      checked_in_at: string
      weight_kg?:    number
      body_fat_pct?: number
      notes?:        string
      energy_level?: number
      sleep_hours?:  number
    }) => {
      const { data, error } = await supabase
        .from('check_ins')
        .insert({
          client_id:     input.client_id,
          checked_in_at: input.checked_in_at,
          weight_kg:     input.weight_kg     ?? null,
          body_fat_pct:  input.body_fat_pct  ?? null,
          notes:         input.notes         ?? null,
          energy_level:  input.energy_level  ?? null,
          sleep_hours:   input.sleep_hours   ?? null,
        } as any)
        .select()
        .single()
      if (error) throw error
      return data as DbCheckIn
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['check_ins', vars.client_id] })
    },
  })
}

export function useDeleteCheckIn() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, clientId }: { id: string; clientId: string }) => {
      const { error } = await supabase.from('check_ins').delete().eq('id', id)
      if (error) throw error
      return { clientId }
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['check_ins', vars.clientId] })
    },
  })
}
