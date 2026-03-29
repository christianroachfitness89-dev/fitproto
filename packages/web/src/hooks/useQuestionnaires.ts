import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { DbQuestionnaireTemplate, DbQuestionnaireResponse } from '@/lib/database.types'

export type QuestionType = 'text' | 'textarea' | 'yes_no' | 'checkbox_group'

export interface QuestionnaireQuestion {
  id: string
  text: string
  type: QuestionType
  required: boolean
  options?: string[]
}

const templateKeys = {
  all:  (orgId: string) => ['questionnaire_templates', orgId] as const,
  byType: (orgId: string, type: string) => ['questionnaire_templates', orgId, type] as const,
}

const responseKeys = {
  forLead: (leadId: string, type: string) => ['questionnaire_responses', leadId, type] as const,
}

// ─── Templates ────────────────────────────────────────────────

export function useQuestionnaireTemplate(type: 'preq' | 'consult') {
  const { profile } = useAuth()
  const orgId = profile?.org_id

  return useQuery({
    queryKey: templateKeys.byType(orgId ?? '', type),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('questionnaire_templates')
        .select('*')
        .eq('org_id', orgId!)
        .eq('type', type)
        .maybeSingle()
      if (error) throw error
      if (!data) return null
      return {
        ...data,
        questions: (data.questions ?? []) as QuestionnaireQuestion[],
      } as DbQuestionnaireTemplate & { questions: QuestionnaireQuestion[] }
    },
    enabled: !!orgId,
  })
}

export function useUpsertQuestionnaireTemplate() {
  const { profile } = useAuth()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({
      type,
      title,
      questions,
    }: {
      type: 'preq' | 'consult'
      title: string
      questions: QuestionnaireQuestion[]
    }) => {
      const { data, error } = await supabase
        .from('questionnaire_templates')
        .upsert(
          { org_id: profile!.org_id!, type, title, questions },
          { onConflict: 'org_id,type' }
        )
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: templateKeys.byType(profile?.org_id ?? '', vars.type) })
    },
  })
}

// ─── Responses ────────────────────────────────────────────────

export function useQuestionnaireResponse(leadId: string, type: 'preq' | 'consult') {
  return useQuery({
    queryKey: responseKeys.forLead(leadId, type),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('questionnaire_responses')
        .select('*')
        .eq('lead_id', leadId)
        .eq('type', type)
        .order('submitted_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return data as DbQuestionnaireResponse | null
    },
    enabled: !!leadId,
  })
}

export function useSaveQuestionnaireResponse() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({
      leadId,
      type,
      answers,
      existingId,
    }: {
      leadId: string
      type: 'preq' | 'consult'
      answers: Record<string, string | boolean | string[]>
      existingId?: string
    }) => {
      if (existingId) {
        const { data, error } = await supabase
          .from('questionnaire_responses')
          .update({ answers, submitted_at: new Date().toISOString() })
          .eq('id', existingId)
          .select()
          .single()
        if (error) throw error
        return data
      } else {
        const { data, error } = await supabase
          .from('questionnaire_responses')
          .insert({ lead_id: leadId, type, answers })
          .select()
          .single()
        if (error) throw error
        return data
      }
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: responseKeys.forLead(vars.leadId, vars.type) })
    },
  })
}
