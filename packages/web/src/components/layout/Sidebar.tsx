import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  Users,
  BookOpen,
  MessageSquare,
  Zap,
  PlayCircle,
  Users2,
  CreditCard,
  ChevronDown,
  Dumbbell,
  LayoutDashboard,
  CheckSquare,
  ClipboardList,
  Utensils,
  BarChart3,
  HelpCircle,
  ShoppingBag,
  Gift,
  UserCog,
  X,
  Menu,
  LogOut,
  Settings,
  Loader2,
  CheckCircle2,
} from 'lucide-react'
import clsx from 'clsx'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import type { UnitSystem } from '@/lib/database.types'

// ─── Settings modal ───────────────────────────────────────────
function SettingsModal({ onClose }: { onClose: () => void }) {
  const { org, refreshOrg } = useAuth()
  const [unit, setUnit] = useState<UnitSystem>((org?.unit_system ?? 'imperial') as UnitSystem)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function save() {
    if (!org) return
    setSaving(true)
    setSaved(false)
    const { error } = await supabase
      .from('organizations')
      .update({ unit_system: unit })
      .eq('id', org.id)
    setSaving(false)
    if (!error) {
      await refreshOrg()
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 z-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Settings</h2>
            <p className="text-xs text-gray-500 mt-0.5">{org?.name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        {/* Units */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Measurement Units</p>
          <div className="grid grid-cols-2 gap-2">
            {(['imperial', 'metric'] as UnitSystem[]).map(u => (
              <button
                key={u}
                onClick={() => setUnit(u)}
                className={clsx(
                  'flex flex-col items-center gap-1.5 p-4 rounded-xl border-2 text-sm font-semibold transition-all',
                  unit === u
                    ? 'border-brand-500 bg-brand-50 text-brand-700'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50',
                )}
              >
                <span className="text-xl">{u === 'imperial' ? '🇺🇸' : '🌍'}</span>
                <span className="capitalize">{u}</span>
                <span className="text-xs font-normal opacity-70">
                  {u === 'imperial' ? 'lbs · miles · °F' : 'kg · km · °C'}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose}
            className="flex-1 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving || unit === org?.unit_system}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-brand-600 to-violet-600 rounded-xl hover:from-brand-700 hover:to-violet-700 disabled:opacity-50 transition-all"
          >
            {saving
              ? <><Loader2 size={15} className="animate-spin" />Saving…</>
              : saved
                ? <><CheckCircle2 size={15} />Saved!</>
                : 'Save Settings'
            }
          </button>
        </div>
      </div>
    </div>
  )
}

interface LibraryItem {
  label: string
  href: string
  icon: React.ReactNode
}

const libraryItems: LibraryItem[] = [
  { label: 'Exercises', href: '/library/exercises', icon: <Dumbbell size={14} /> },
  { label: 'Workouts', href: '/library/workouts', icon: <ClipboardList size={14} /> },
  { label: 'Programs', href: '/library/programs', icon: <BarChart3 size={14} /> },
  { label: 'Tasks', href: '/library/tasks', icon: <CheckSquare size={14} /> },
  { label: 'Forms & Questionnaires', href: '/library/forms', icon: <BookOpen size={14} /> },
  { label: 'Meal Plan Templates', href: '/library/meals', icon: <Utensils size={14} /> },
  { label: 'Metric Groups', href: '/library/metrics', icon: <BarChart3 size={14} /> },
]

interface SidebarProps {
  mobile?: boolean
  onClose?: () => void
}

export default function Sidebar({ mobile = false, onClose }: SidebarProps) {
  const [libraryOpen, setLibraryOpen]     = useState(false)
  const [showSettings, setShowSettings]   = useState(false)
  const location = useLocation()
  const isLibraryActive = location.pathname.startsWith('/library')
  const { profile, signOut } = useAuth()

  const navItemClass = ({ isActive }: { isActive: boolean }) =>
    clsx(
      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group relative',
      isActive
        ? 'bg-gradient-to-r from-brand-600/25 to-brand-500/10 text-white border border-brand-500/20'
        : 'text-gray-400 hover:bg-sidebar-hover hover:text-gray-200 border border-transparent'
    )

  return (
    <>
    {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    <div className="h-full flex flex-col bg-sidebar-bg w-64 select-none border-r border-sidebar-border">
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-brand-500 to-violet-600 rounded-lg flex items-center justify-center shadow-lg shadow-brand-600/30">
            <Dumbbell size={16} className="text-white" />
          </div>
          <span className="text-white font-bold text-base tracking-tight">FitProto</span>
        </div>
        {mobile && (
          <button onClick={onClose} className="text-gray-500 hover:text-white p-1 rounded transition-colors">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Divider */}
      <div className="mx-4 h-px bg-sidebar-border" />

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        <NavLink to="/dashboard" className={navItemClass}>
          {({ isActive }) => (
            <>
              <LayoutDashboard size={17} className={isActive ? 'text-brand-400' : 'text-gray-500 group-hover:text-gray-300'} />
              Dashboard
              {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-brand-400 rounded-full" />}
            </>
          )}
        </NavLink>

        <NavLink to="/clients" className={navItemClass}>
          {({ isActive }) => (
            <>
              <Users size={17} className={isActive ? 'text-brand-400' : 'text-gray-500 group-hover:text-gray-300'} />
              Clients
              {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-brand-400 rounded-full" />}
            </>
          )}
        </NavLink>

        {/* Library with submenu */}
        <div>
          <button
            onClick={() => setLibraryOpen(!libraryOpen)}
            className={clsx(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 border relative',
              isLibraryActive
                ? 'bg-gradient-to-r from-brand-600/25 to-brand-500/10 text-white border-brand-500/20'
                : 'text-gray-400 hover:bg-sidebar-hover hover:text-gray-200 border-transparent'
            )}
          >
            {isLibraryActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-brand-400 rounded-full" />}
            <BookOpen size={17} className={isLibraryActive ? 'text-brand-400' : 'text-gray-500'} />
            <span className="flex-1 text-left">Library</span>
            <ChevronDown
              size={14}
              className={clsx('transition-transform duration-200 text-gray-500', (libraryOpen || isLibraryActive) && 'rotate-180')}
            />
          </button>
          {(libraryOpen || isLibraryActive) && (
            <div className="mt-1 ml-3 space-y-0.5 border-l border-sidebar-border pl-3">
              {libraryItems.map((item) => (
                <NavLink
                  key={item.href}
                  to={item.href}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all',
                      isActive
                        ? 'text-brand-300 bg-brand-500/10'
                        : 'text-gray-500 hover:text-gray-300 hover:bg-sidebar-hover'
                    )
                  }
                >
                  {item.icon}
                  {item.label}
                </NavLink>
              ))}
            </div>
          )}
        </div>

        <NavLink to="/inbox" className={navItemClass}>
          {({ isActive }) => (
            <>
              <MessageSquare size={17} className={isActive ? 'text-brand-400' : 'text-gray-500 group-hover:text-gray-300'} />
              Inbox
              {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-brand-400 rounded-full" />}
            </>
          )}
        </NavLink>

        <NavLink to="/automation" className={navItemClass}>
          {({ isActive }) => (
            <>
              <Zap size={17} className={isActive ? 'text-brand-400' : 'text-gray-500 group-hover:text-gray-300'} />
              Automation
              {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-brand-400 rounded-full" />}
            </>
          )}
        </NavLink>

        <NavLink to="/on-demand" className={navItemClass}>
          {({ isActive }) => (
            <>
              <PlayCircle size={17} className={isActive ? 'text-brand-400' : 'text-gray-500 group-hover:text-gray-300'} />
              On-demand
              {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-brand-400 rounded-full" />}
            </>
          )}
        </NavLink>

        <NavLink to="/community" className={navItemClass}>
          {({ isActive }) => (
            <>
              <Users2 size={17} className={isActive ? 'text-brand-400' : 'text-gray-500 group-hover:text-gray-300'} />
              Community Forums
              {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-brand-400 rounded-full" />}
            </>
          )}
        </NavLink>

        <NavLink to="/payments" className={navItemClass}>
          {({ isActive }) => (
            <>
              <CreditCard size={17} className={isActive ? 'text-brand-400' : 'text-gray-500 group-hover:text-gray-300'} />
              Payment & Packages
              {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-brand-400 rounded-full" />}
            </>
          )}
        </NavLink>

        <div className="pt-3 pb-1">
          <div className="h-px bg-sidebar-border mx-1" />
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-600 px-3 mt-3 mb-1">More</p>
        </div>

        <NavLink to="/quick-start" className={navItemClass}>
          {({ isActive }) => (
            <>
              <HelpCircle size={17} className={isActive ? 'text-brand-400' : 'text-gray-500 group-hover:text-gray-300'} />
              Quick Start Guide
              {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-brand-400 rounded-full" />}
            </>
          )}
        </NavLink>

        <NavLink to="/marketplace" className={navItemClass}>
          {({ isActive }) => (
            <>
              <ShoppingBag size={17} className={isActive ? 'text-brand-400' : 'text-gray-500 group-hover:text-gray-300'} />
              Marketplace
              {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-brand-400 rounded-full" />}
            </>
          )}
        </NavLink>

        <NavLink to="/referral" className={navItemClass}>
          {({ isActive }) => (
            <>
              <Gift size={17} className={isActive ? 'text-brand-400' : 'text-gray-500 group-hover:text-gray-300'} />
              Referral Program
              {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-brand-400 rounded-full" />}
            </>
          )}
        </NavLink>

        <NavLink to="/teammates" className={navItemClass}>
          {({ isActive }) => (
            <>
              <UserCog size={17} className={isActive ? 'text-brand-400' : 'text-gray-500 group-hover:text-gray-300'} />
              Teammates
              {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-brand-400 rounded-full" />}
            </>
          )}
        </NavLink>
      </nav>

      {/* Coach profile */}
      <div className="px-3 pb-4">
        <div className="h-px bg-sidebar-border mb-3" />
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-sidebar-hover cursor-pointer transition-colors group">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-md shadow-brand-900/40">
            {profile?.initials ?? '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-semibold truncate">{profile?.full_name ?? 'Coach'}</p>
            <p className="text-gray-500 text-xs truncate capitalize">{profile?.role ?? 'owner'}</p>
          </div>
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <button
              onClick={() => setShowSettings(true)}
              title="Settings"
              className="text-gray-600 hover:text-gray-300 transition-colors p-1 rounded"
            >
              <Settings size={14} />
            </button>
            <button
              onClick={signOut}
              title="Sign out"
              className="text-gray-600 hover:text-gray-300 transition-colors p-1 rounded"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
    </>
  )
}

export function MobileMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors lg:hidden"
    >
      <Menu size={22} />
    </button>
  )
}
