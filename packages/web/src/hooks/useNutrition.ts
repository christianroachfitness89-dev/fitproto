import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { DbNutritionPlan } from '@/lib/database.types'

export function useNutritionPlan(clientId: string) {
  return useQuery({
    queryKey: ['nutrition_plan', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('nutrition_plans')
        .select('*')
        .eq('client_id', clientId)
        .maybeSingle()
      if (error) throw error
      return data as DbNutritionPlan | null
    },
    enabled: !!clientId,
  })
}

export function useUpsertNutritionPlan() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (input: {
      client_id:       string
      org_id:          string
      mfp_username?:   string | null
      calories_target?: number | null
      protein_g?:      number | null
      carbs_g?:        number | null
      fat_g?:          number | null
      notes?:          string | null
    }) => {
      const { data, error } = await supabase
        .from('nutrition_plans')
        .upsert(
          {
            client_id:       input.client_id,
            org_id:          input.org_id,
            mfp_username:    input.mfp_username    ?? null,
            calories_target: input.calories_target ?? null,
            protein_g:       input.protein_g       ?? null,
            carbs_g:         input.carbs_g         ?? null,
            fat_g:           input.fat_g           ?? null,
            notes:           input.notes           ?? null,
            updated_at:      new Date().toISOString(),
          } as any,
          { onConflict: 'client_id' }
        )
        .select()
        .single()
      if (error) throw error
      return data as DbNutritionPlan
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['nutrition_plan', vars.client_id] })
    },
  })
}
