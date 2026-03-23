import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { DbProfile, DbOrganization } from '@/lib/database.types'

interface AuthContextValue {
  user: User | null
  session: Session | null
  profile: DbProfile | null
  org: DbOrganization | null
  loading: boolean
  profileLoading: boolean
  profileError: string | null
  retryProfile: () => void
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]                     = useState<User | null>(null)
  const [session, setSession]               = useState<Session | null>(null)
  const [profile, setProfile]               = useState<DbProfile | null>(null)
  const [org, setOrg]                       = useState<DbOrganization | null>(null)
  const [loading, setLoading]               = useState(true)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileError, setProfileError]     = useState<string | null>(null)
  const userRef = useRef<User | null>(null)

  async function loadProfileAndOrg(userId: string, attempt = 0) {
    if (attempt === 0) {
      setProfileLoading(true)
      setProfileError(null)
    }

    // Verify the session token is still valid before querying
    const { data: { session: currentSession } } = await supabase.auth.getSession()
    if (!currentSession) {
      // Token expired / no session — sign out cleanly
      await supabase.auth.signOut()
      setProfileLoading(false)
      return
    }

    const { data: profileData, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (error) {
      console.error('[Auth] Profile query error', error)
      // JWT / auth errors — don't retry, sign out
      const msg = error.message ?? ''
      if (
        msg.includes('JWT') ||
        msg.includes('token') ||
        (error as any).code === 'PGRST301'
      ) {
        await supabase.auth.signOut()
        setProfileLoading(false)
        return
      }
      // Other errors (network, DB) — retry with backoff
      if (attempt < 5) {
        await new Promise(r => setTimeout(r, 300 * (attempt + 1)))
        return loadProfileAndOrg(userId, attempt + 1)
      }
      setProfileError(`Database error: ${msg || 'unknown'}`)
      setProfileLoading(false)
      return
    }

    if (!profileData) {
      // Row missing — retry (handles DB trigger lag on new signups)
      if (attempt < 5) {
        await new Promise(r => setTimeout(r, 300 * (attempt + 1)))
        return loadProfileAndOrg(userId, attempt + 1)
      }
      // After 5 retries, the profile row genuinely doesn't exist
      setProfileError('Your account profile was not found. Please sign out and sign back in, or contact support.')
      setProfileLoading(false)
      return
    }

    setProfile(profileData)
    setProfileError(null)

    const { data: orgData } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', profileData.org_id)
      .maybeSingle()
    if (orgData) setOrg(orgData)

    setProfileLoading(false)
  }

  const retryProfile = useCallback(() => {
    const uid = userRef.current?.id
    if (uid) loadProfileAndOrg(uid)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      userRef.current = session?.user ?? null
      if (session?.user) {
        loadProfileAndOrg(session.user.id).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      userRef.current = session?.user ?? null
      if (session?.user) {
        loadProfileAndOrg(session.user.id)
      } else {
        setProfile(null)
        setOrg(null)
        setProfileError(null)
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
    setProfileError(null)
  }

  return (
    <AuthContext.Provider value={{
      user, session, profile, org,
      loading, profileLoading, profileError, retryProfile,
      signIn, signUp, signOut,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
