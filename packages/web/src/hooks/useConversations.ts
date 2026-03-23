import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { DbConversation, DbMessage } from '@/lib/database.types'

export type ConversationWithClient = DbConversation & {
  clients: { name: string; email: string | null }
  latest_message?: DbMessage
  unread_count: number
}

// ─── Conversations list ───────────────────────────────────────
export function useConversations() {
  const { profile } = useAuth()
  const orgId = profile?.org_id

  return useQuery({
    queryKey: ['conversations', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          clients(name, email),
          messages(id, content, sender_type, read, created_at)
        `)
        .eq('org_id', orgId!)
        .order('last_message_at', { ascending: false, nullsFirst: false })
      if (error) throw error

      return (data ?? []).map((conv: any) => {
        const msgs: DbMessage[] = conv.messages ?? []
        const sorted = [...msgs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        return {
          ...conv,
          messages: undefined,
          latest_message: sorted[0] ?? null,
          unread_count: msgs.filter((m) => !m.read && m.sender_type === 'client').length,
        } as ConversationWithClient
      })
    },
    enabled: !!orgId,
  })
}

// ─── Messages for a conversation ─────────────────────────────
export function useMessages(conversationId: string | null) {
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId!)
        .order('created_at', { ascending: true })
      if (error) throw error
      return data as DbMessage[]
    },
    enabled: !!conversationId,
  })

  // Realtime: new messages in this conversation
  useEffect(() => {
    if (!conversationId) return
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, () => {
        qc.invalidateQueries({ queryKey: ['messages', conversationId] })
        qc.invalidateQueries({ queryKey: ['conversations'] })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [conversationId, qc])

  return query
}

// ─── Send a message ───────────────────────────────────────────
export function useSendMessage() {
  const { profile } = useAuth()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ conversationId, content }: { conversationId: string; content: string }) => {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_type:     'coach',
          sender_id:       profile!.id,
          content,
        } as any)
        .select()
        .single()
      if (error) throw error

      // Update conversation's last_message_at
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() } as any)
        .eq('id', conversationId)

      return data as DbMessage
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['messages', vars.conversationId] })
      qc.invalidateQueries({ queryKey: ['conversations'] })
    },
  })
}

// ─── Mark all client messages in a conversation as read ───────
export function useMarkAsRead() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (conversationId: string) => {
      await supabase.rpc('mark_conversation_read', { p_conversation_id: conversationId })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['conversations'] })
    },
  })
}

// ─── Get or create a conversation for a client ───────────────
export function useGetOrCreateConversation() {
  const { profile } = useAuth()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (clientId: string) => {
      // Try to find existing
      const { data: existing } = await supabase
        .from('conversations')
        .select('*')
        .eq('client_id', clientId)
        .single()
      if (existing) return existing as DbConversation

      // Create new
      const { data, error } = await supabase
        .from('conversations')
        .insert({ org_id: profile!.org_id, client_id: clientId } as any)
        .select()
        .single()
      if (error) throw error
      return data as DbConversation
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['conversations'] }),
  })
}
