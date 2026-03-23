/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js'

const url = (import.meta as any).env?.VITE_SUPABASE_URL as string ?? ''
const key = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string ?? ''

export const isConfigured = !!url && url !== 'https://your-project-id.supabase.co' && url !== ''

// Guard: createClient throws if url/key are empty strings, which crashes the
// entire module before React mounts (white screen). Use placeholder values when
// not configured — the app will show SetupRequired before any queries run.
export const supabase = createClient(
  isConfigured ? url : 'https://placeholder.supabase.co',
  isConfigured ? key : 'placeholder-key',
)
