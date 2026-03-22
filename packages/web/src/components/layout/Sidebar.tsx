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
} from 'lucide-react'
import clsx from 'clsx'

interface LibraryItem {
  label: string
  href: string
  icon: React.ReactNode
}

const libraryItems: LibraryItem[] = [
  { label: 'Exercises', href: '/library/exercises', icon: <Dumbbell size={16} /> },
  { label: 'Workouts', href: '/library/workouts', icon: <ClipboardList size={16} /> },
  { label: 'Programs', href: '/library/programs', icon: <BarChart3 size={16} /> },
  { label: 'Tasks', href: '/library/tasks', icon: <CheckSquare size={16} /> },
  { label: 'Forms & Questionnaires', href: '/library/forms', icon: <BookOpen size={16} /> },
  { label: 'Meal Plan Templates', href: '/library/meals', icon: <Utensils size={16} /> },
  { label: 'Metric Groups', href: '/library/metrics', icon: <BarChart3 size={16} /> },
]

interface SidebarProps {
  mobile?: boolean
  onClose?: () => void
}

export default function Sidebar({ mobile = false, onClose }: SidebarProps) {
  const [libraryOpen, setLibraryOpen] = useState(false)
  const location = useLocation()
  const isLibraryActive = location.pathname.startsWith('/library')

  const navItemClass = ({ isActive }: { isActive: boolean }) =>
    clsx(
      'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group',
      isActive
        ? 'bg-sidebar-active text-white'
        : 'text-gray-400 hover:bg-sidebar-hover hover:text-white'
    )

  return (
    <div className="h-full flex flex-col bg-sidebar-bg w-64 select-none">
      {/* Logo */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
            <Dumbbell size={18} className="text-white" />
          </div>
          <span className="text-white font-bold text-lg tracking-tight">FitProto</span>
        </div>
        {mobile && (
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1 rounded">
            <X size={20} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        <NavLink to="/dashboard" className={navItemClass}>
          <LayoutDashboard size={18} />
          Dashboard
        </NavLink>

        <NavLink to="/clients" className={navItemClass}>
          {({ isActive }) => (
            <>
              <Users size={18} className={isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'} />
              Clients
            </>
          )}
        </NavLink>

        {/* Library with submenu */}
        <div>
          <button
            onClick={() => setLibraryOpen(!libraryOpen)}
            className={clsx(
              'w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
              isLibraryActive
                ? 'bg-sidebar-active text-white'
                : 'text-gray-400 hover:bg-sidebar-hover hover:text-white'
            )}
          >
            <BookOpen size={18} />
            <span className="flex-1 text-left">Library</span>
            <ChevronDown
              size={16}
              className={clsx('transition-transform duration-200', (libraryOpen || isLibraryActive) && 'rotate-180')}
            />
          </button>
          {(libraryOpen || isLibraryActive) && (
            <div className="mt-1 ml-4 space-y-0.5 border-l border-sidebar-border pl-3">
              {libraryItems.map((item) => (
                <NavLink
                  key={item.href}
                  to={item.href}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all',
                      isActive
                        ? 'text-brand-400 bg-brand-500/10'
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
          <MessageSquare size={18} />
          Inbox
        </NavLink>

        <NavLink to="/automation" className={navItemClass}>
          <Zap size={18} />
          Automation
        </NavLink>

        <NavLink to="/on-demand" className={navItemClass}>
          <PlayCircle size={18} />
          On-demand
        </NavLink>

        <NavLink to="/community" className={navItemClass}>
          <Users2 size={18} />
          Community Forums
        </NavLink>

        <NavLink to="/payments" className={navItemClass}>
          <CreditCard size={18} />
          Payment & Packages
        </NavLink>

        <div className="pt-3 pb-1">
          <div className="h-px bg-sidebar-border mx-2" />
        </div>

        <NavLink to="/quick-start" className={navItemClass}>
          <HelpCircle size={18} />
          Quick Start Guide
        </NavLink>

        <NavLink to="/marketplace" className={navItemClass}>
          <ShoppingBag size={18} />
          Marketplace
        </NavLink>

        <NavLink to="/referral" className={navItemClass}>
          <Gift size={18} />
          Referral Program
        </NavLink>

        <NavLink to="/teammates" className={navItemClass}>
          <UserCog size={18} />
          Teammates
        </NavLink>
      </nav>

      {/* Coach profile */}
      <div className="px-3 py-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-sidebar-hover cursor-pointer transition-colors">
          <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            CR
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">Christian Roach</p>
            <p className="text-gray-500 text-xs truncate">Head Coach</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export function MobileMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors lg:hidden"
    >
      <Menu size={22} />
    </button>
  )
}
