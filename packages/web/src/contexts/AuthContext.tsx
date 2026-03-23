import { createContext, useContext, useEffect, useState } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { DbProfile, DbOrganization } from '@/lib/database.types'

interface AuthContextValue {
  user: User | null
  session: Session | null
  profile: DbProfile | null
  org: DbOrganization | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<DbProfile | null>(null)
  const [org, setOrg]         = useState<DbOrganization | null>(null)
  const [loading, setLoading] = useState(true)

  async function loadProfileAndOrg(userId: string, attempt = 0) {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single() as { data: DbProfile | null; error: any }

    if (!profileData) {
      // The DB trigger that creates the profile row may not have run yet
      // (common on first signup). Retry up to 5 times with backoff.
      if (attempt < 5) {
        await new Promise(r => setTimeout(r, 300 * (attempt + 1)))
        return loadProfileAndOrg(userId, attempt + 1)
      }
      return // give up after retries
    }

    setProfile(profileData)
    const { data: orgData } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', profileData.org_id)
      .single() as { data: DbOrganization | null; error: any }
    if (orgData) setOrg(orgData)
  }

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        loadProfileAndOrg(session.user.id).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        loadProfileAndOrg(session.user.id)
      } else {
        setProfile(null)
        setOrg(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  async function signUp(email: string, password: string, fullName: string) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })
    return { error }
  }

  async function signOut() {
    await supabase.auth.signOut()
    setProfile(null)
    setOrg(null)
  }

  return (
    <AuthContext.Provider value={{ user, session, profile, org, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
