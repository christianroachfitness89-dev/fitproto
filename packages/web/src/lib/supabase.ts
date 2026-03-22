/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js'

const url = (import.meta as any).env?.VITE_SUPABASE_URL as string ?? ''
const key = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string ?? ''

// createClient without a generic — we type query results ourselves in each hook
export const supabase = createClient(url, key)
export const isConfigured = !!url && url !== 'https://your-project-id.supabase.co' && url !== ''
