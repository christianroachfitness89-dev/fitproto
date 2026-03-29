import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { isConfigured } from './lib/supabase'
import AppLayout from './components/layout/AppLayout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Clients from './pages/Clients'
import ClientDetail from './pages/ClientDetail'
import Library from './pages/Library'
import WorkoutBuilder from './pages/WorkoutBuilder'
import ProgramBuilder from './pages/ProgramBuilder'
import Inbox from './pages/Inbox'
import Community from './pages/Community'
import CourseBuilder from './pages/CourseBuilder'
import TasksLibrary from './pages/TasksLibrary'
import HabitsLibrary from './pages/HabitsLibrary'
import MetricsLibrary from './pages/MetricsLibrary'
import Placeholder from './pages/Placeholder'
import ClientPortal from './pages/ClientPortal'
import AdminPanel from './pages/AdminPanel'
import Leads from './pages/Leads'
import CheckIns     from './pages/CheckIns'
import SessionLogs  from './pages/SessionLogs'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,       // 30s before background refetch
      retry: 1,
    },
  },
})

// ─── Guard: redirect to /login if not authenticated ──────────
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, profile, profileLoading, profileError, retryProfile, signOut } = useAuth()
  if (loading) return <FullPageLoader />
  if (!user) return <Navigate to="/login" replace />

  // User is authenticated but profile hasn't loaded yet
  if (profileLoading || (!profile && !profileError)) return <FullPageLoader />

  // Profile failed to load — show actionable error instead of broken UI
  if (profileError || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sidebar-bg via-[#1e1e35] to-[#2a1a4e] flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center">
          <div className="w-12 h-12 bg-rose-100 rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Couldn't load your profile</h2>
          {profileError && (
            <p className="text-xs font-mono bg-gray-100 text-gray-700 rounded-lg px-3 py-2 mb-3 text-left break-all">
              {profileError}
            </p>
          )}
          <p className="text-gray-500 text-sm mb-5">
            Try refreshing, or sign out and back in. If this keeps happening, contact support.
          </p>
          <button
            onClick={retryProfile}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-2.5 rounded-xl transition-colors mb-3"
          >
            Try again
          </button>
          <button
            onClick={signOut}
            className="w-full text-gray-500 hover:text-gray-700 text-sm py-1 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    )
  }

  // Redirect admin users away from coach routes
  if (profile.role === 'admin') return <Navigate to="/admin" replace />

  return <>{children}</>
}

// ─── Guard: admin-only route ──────────────────────────────────
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, profile, profileLoading } = useAuth()
  if (loading || profileLoading) return <FullPageLoader />
  if (!user) return <Navigate to="/login" replace />
  if (!profile) return <FullPageLoader />
  if (profile.role !== 'admin') return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

// ─── Guard: redirect to /dashboard if already logged in ──────
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, profile } = useAuth()
  if (loading) return <FullPageLoader />
  if (user && profile?.role === 'admin') return <Navigate to="/admin" replace />
  if (user) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

function FullPageLoader() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-sidebar-bg via-[#1e1e35] to-[#2a1a4e] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

// ─── Setup screen when Supabase isn't configured ─────────────
function SetupRequired() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-sidebar-bg via-[#1e1e35] to-[#2a1a4e] flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-lg w-full">
        <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mb-4">
          <span className="text-2xl">⚙️</span>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Setup Required</h2>
        <p className="text-gray-600 text-sm mb-4">
          Connect your Supabase project to get started. Create a <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">.env.local</code> file in <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">packages/web/</code> with:
        </p>
        <pre className="bg-gray-900 text-emerald-400 text-xs p-4 rounded-xl font-mono mb-4 overflow-x-auto">
{`VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key`}
        </pre>
        <p className="text-gray-500 text-xs">
          Then run the SQL in <code className="bg-gray-100 px-1.5 py-0.5 rounded font-mono">supabase/schema.sql</code> in your Supabase SQL Editor, and restart the dev server.
        </p>
      </div>
    </div>
  )
}

export default function App() {
  if (!isConfigured) return <SetupRequired />

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <HashRouter>
          <Routes>
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            {/* Developer admin — separate from coach UI */}
            <Route path="/admin" element={<AdminRoute><AdminPanel /></AdminRoute>} />
            <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="clients" element={<Clients />} />
              <Route path="clients/:id" element={<ClientDetail />} />
              <Route path="clients/check-ins"     element={<CheckIns />} />
              <Route path="clients/session-logs"  element={<SessionLogs />} />
              <Route path="library/courses" element={<CourseBuilder />} />
              <Route path="library/tasks" element={<TasksLibrary />} />
              <Route path="library/habits" element={<HabitsLibrary />} />
              <Route path="library/metrics" element={<MetricsLibrary />} />
              <Route path="library/workouts/:id" element={<WorkoutBuilder />} />
              <Route path="library/programs/:id" element={<ProgramBuilder />} />
              <Route path="library/:section" element={<Library />} />
              <Route path="library" element={<Navigate to="/library/exercises" replace />} />
              <Route path="leads" element={<Leads />} />
              <Route path="inbox" element={<Inbox />} />
              <Route path="automation" element={<Placeholder title="Automation" description="Set up automated workflows, reminders, and check-ins for your clients." />} />
              <Route path="on-demand" element={<Placeholder title="On-demand Content" description="Create and manage on-demand video content and resources for your clients." />} />
              <Route path="community" element={<Community />} />
              <Route path="payments" element={<Placeholder title="Payment & Packages" description="Manage subscriptions, packages, and payment processing." />} />
              <Route path="marketplace" element={<Placeholder title="Marketplace" description="Discover and share programs and content with other coaches." />} />
              <Route path="referral" element={<Placeholder title="Referral Program" description="Earn rewards by referring other coaches to FitProto." />} />
              <Route path="teammates" element={<Placeholder title="Teammates" description="Invite and manage team members who help you coach clients." />} />
              <Route path="quick-start" element={<Placeholder title="Quick Start Guide" description="Everything you need to get started with FitProto." />} />
            </Route>
            {/* Client portal — public, no login required */}
            <Route path="/portal/:clientId" element={<ClientPortal />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </HashRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
