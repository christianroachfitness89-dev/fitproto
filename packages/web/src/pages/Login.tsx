import { useState } from 'react'
import { Dumbbell, Eye, EyeOff, ArrowRight, Loader2, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import clsx from 'clsx'

type Mode = 'signin' | 'signup'

const ADMIN_KEYWORD = 'globaladmin'
const ADMIN_EMAIL   = 'globaladmin@fitproto.dev'

export default function Login() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode]                 = useState<Mode>('signin')
  const [email, setEmail]               = useState('')
  const [password, setPassword]         = useState('')
  const [fullName, setFullName]         = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState<string | null>(null)
  const [success, setSuccess]           = useState<string | null>(null)
  const [adminMode, setAdminMode]       = useState(false)

  function handleEmailChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setEmail(val)
    if (val.trim().toLowerCase() === ADMIN_KEYWORD) {
      setAdminMode(true)
      setEmail('')
      setMode('signin')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)
    if (adminMode) {
      const { error } = await signIn(ADMIN_EMAIL, password)
      if (error) setError(error.message)
    } else if (mode === 'signin') {
      const { error } = await signIn(email, password)
      if (error) setError(error.message)
    } else {
      if (!fullName.trim()) { setError('Please enter your name.'); setLoading(false); return }
      const { error } = await signUp(email, password, fullName)
      if (error) { setError(error.message) } else {
        setSuccess('Check your email to confirm your account, then sign in.')
        setMode('signin')
      }
    }
    setLoading(false)
  }

  // ─── Admin mode ───────────────────────────────────────────────
  if (adminMode) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center p-4">
        {/* Background grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(251,191,36,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(251,191,36,0.03)_1px,transparent_1px)] bg-[size:64px_64px] pointer-events-none" />

        <div className="relative w-full max-w-sm">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 bg-[#1e2535] border border-[#2e3a52] rounded-2xl flex items-center justify-center">
              <ShieldCheck size={22} className="text-amber-400" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-[#e8edf5] tracking-tight"
                style={{ fontFamily: "'Syne', system-ui, sans-serif" }}>
                FitProto
              </h1>
              <p className="text-amber-400/60 text-xs font-bold uppercase tracking-widest">Developer Access</p>
            </div>
          </div>

          <div className="bg-[#161b27] border border-[#242d40] rounded-2xl shadow-2xl p-8">
            <h2 className="text-lg font-black text-[#e8edf5] mb-1">Admin Access</h2>
            <p className="text-[#4a5a75] text-sm mb-6">Enter your developer password to continue.</p>

            {error && (
              <div className="mb-4 p-3 bg-rose-400/10 border border-rose-400/20 rounded-xl text-sm text-rose-400">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-[#3a4a62] uppercase tracking-widest mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-11 text-sm bg-[#1e2535] border border-[#2e3a52] text-[#e8edf5] placeholder-[#3a4a62] rounded-xl focus:outline-none focus:border-amber-400/50 transition-all"
                    placeholder="••••••••"
                    autoFocus required
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#3a4a62] hover:text-[#8a9ab5] transition-colors">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 bg-amber-400 hover:bg-amber-300 text-[#0d1117] font-black rounded-xl transition-all disabled:opacity-50">
                {loading ? <Loader2 size={18} className="animate-spin" /> : <><ArrowRight size={16} /> Authenticate</>}
              </button>
            </form>

            <button onClick={() => { setAdminMode(false); setError(null); setPassword('') }}
              className="w-full text-center text-xs text-[#2e3a52] hover:text-[#4a5a75] transition-colors mt-4">
              Back to login
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ─── Normal login ─────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0d1117] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(251,191,36,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(251,191,36,0.03)_1px,transparent_1px)] bg-[size:64px_64px] pointer-events-none" />
      {/* Amber glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-amber-400/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 bg-amber-400/10 border border-amber-400/20 rounded-2xl flex items-center justify-center">
            <Dumbbell size={24} className="text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-[#e8edf5] tracking-tight"
              style={{ fontFamily: "'Syne', system-ui, sans-serif" }}>
              FitProto
            </h1>
            <p className="text-amber-400/60 text-xs font-bold uppercase tracking-widest">Coach Client Platform</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-[#161b27] border border-[#242d40] rounded-2xl shadow-2xl p-8">
          <div className="mb-6">
            <h2 className="text-xl font-black text-[#e8edf5]"
              style={{ fontFamily: "'Syne', system-ui, sans-serif" }}>
              {mode === 'signin' ? 'Welcome back' : 'Create your account'}
            </h2>
            <p className="text-[#4a5a75] text-sm mt-1">
              {mode === 'signin' ? 'Sign in to your coach dashboard' : 'Start coaching in minutes'}
            </p>
          </div>

          {success && (
            <div className="mb-4 p-3 bg-emerald-400/10 border border-emerald-400/20 rounded-xl text-sm text-emerald-400">{success}</div>
          )}
          {error && (
            <div className="mb-4 p-3 bg-rose-400/10 border border-rose-400/20 rounded-xl text-sm text-rose-400">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-[10px] font-bold text-[#3a4a62] uppercase tracking-widest mb-1.5">Full Name</label>
                <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                  className="w-full px-4 py-3 text-sm bg-[#1e2535] border border-[#2e3a52] text-[#e8edf5] placeholder-[#3a4a62] rounded-xl focus:outline-none focus:border-amber-400/50 transition-all"
                  placeholder="Christian Roach" required />
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold text-[#3a4a62] uppercase tracking-widest mb-1.5">Email</label>
              <input type="email" value={email} onChange={handleEmailChange}
                className="w-full px-4 py-3 text-sm bg-[#1e2535] border border-[#2e3a52] text-[#e8edf5] placeholder-[#3a4a62] rounded-xl focus:outline-none focus:border-amber-400/50 transition-all"
                placeholder="coach@example.com" required />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[#3a4a62] uppercase tracking-widest mb-1.5">Password</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-11 text-sm bg-[#1e2535] border border-[#2e3a52] text-[#e8edf5] placeholder-[#3a4a62] rounded-xl focus:outline-none focus:border-amber-400/50 transition-all"
                  placeholder="••••••••" minLength={6} required />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#3a4a62] hover:text-[#8a9ab5] transition-colors">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {mode === 'signin' && (
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="rounded border-[#2e3a52] bg-[#1e2535] accent-amber-400" />
                  <span className="text-sm text-[#4a5a75]">Remember me</span>
                </label>
                <button type="button" className="text-sm text-amber-400/70 font-medium hover:text-amber-400 transition-colors">
                  Forgot password?
                </button>
              </div>
            )}

            <button type="submit" disabled={loading}
              className={clsx(
                'w-full flex items-center justify-center gap-2 py-3 font-black rounded-xl transition-all',
                loading
                  ? 'bg-amber-400/50 text-[#0d1117] cursor-not-allowed'
                  : 'bg-amber-400 hover:bg-amber-300 text-[#0d1117]',
              )}>
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>{mode === 'signin' ? 'Sign In' : 'Create Account'}<ArrowRight size={16} /></>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-[#4a5a75] mt-6">
            {mode === 'signin' ? (
              <>Don't have an account?{' '}
                <button onClick={() => { setMode('signup'); setError(null) }} className="text-amber-400 font-bold hover:text-amber-300">
                  Start free
                </button>
              </>
            ) : (
              <>Already have an account?{' '}
                <button onClick={() => { setMode('signin'); setError(null) }} className="text-amber-400 font-bold hover:text-amber-300">
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>

        <p className="text-center text-xs text-[#1e2535] mt-6 uppercase tracking-widest font-bold">
          © {new Date().getFullYear()} FitProto
        </p>
      </div>
    </div>
  )
}
