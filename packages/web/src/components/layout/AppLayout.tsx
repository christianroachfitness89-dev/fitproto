import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import clsx from 'clsx'

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/clients': 'Clients',
  '/inbox': 'Inbox',
  '/automation': 'Automation',
  '/on-demand': 'On-demand',
  '/community': 'Community Forums',
  '/payments': 'Payment & Packages',
  '/marketplace': 'Everfit Marketplace',
  '/referral': 'Referral Program',
  '/teammates': 'Teammates',
  '/quick-start': 'Quick Start Guide',
  '/library/exercises': 'Exercises',
  '/library/workouts': 'Workouts',
  '/library/programs': 'Programs',
  '/library/tasks': 'Tasks',
  '/library/forms': 'Forms & Questionnaires',
  '/library/meals': 'Meal Plan Templates',
  '/library/metrics': 'Metric Groups',
}

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const title = pageTitles[location.pathname] ?? 'FitProto'

  return (
    <div className="flex h-screen overflow-hidden bg-surface-100">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative z-50 h-full w-64">
            <Sidebar mobile onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header title={title} onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
