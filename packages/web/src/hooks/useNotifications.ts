import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { DbNotification } from '@/lib/database.types'

export function useNotifications() {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const userId = profile?.id

  const query = useQuery({
    queryKey: ['notifications', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId!)
        .order('created_at', { ascending: false })
        .limit(20)
      if (error) throw error
      return data as DbNotification[]
    },
    enabled: !!userId,
  })

  // Realtime subscription
  useEffect(() => {
    if (!userId) return
    const channel = supabase
      .channel('notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, () => {
        qc.invalidateQueries({ queryKey: ['notifications', userId] })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId, qc])

  return query
}

export function useMarkNotificationRead() {
  const { profile } = useAuth()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true } as any)
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications', profile?.id] }),
  })
}

export function useMarkAllNotificationsRead() {
  const { profile } = useAuth()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true } as any)
        .eq('user_id', profile!.id)
        .eq('read', false)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications', profile?.id] }),
  })
}
