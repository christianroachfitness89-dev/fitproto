import { useState } from 'react'
import { Search, Bell, CheckSquare } from 'lucide-react'
import { MobileMenuButton } from './Sidebar'
import { useNotifications, useMarkAllNotificationsRead } from '@/hooks/useNotifications'
import clsx from 'clsx'

interface HeaderProps {
  title: string
  onMenuClick: () => void
}

export default function Header({ title, onMenuClick }: HeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false)
  const { data: notifications = [] } = useNotifications()
  const markAllRead = useMarkAllNotificationsRead()

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <header className="h-16 glass border-b border-white/60 flex items-center px-6 gap-4 sticky top-0 z-20">
      <MobileMenuButton onClick={onMenuClick} />

      <h1 className="text-base font-semibold text-gray-800 flex-1 lg:flex-none tracking-tight">{title}</h1>

      <div className="hidden md:flex flex-1 max-w-xs">
        <div className="relative w-full">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search clients, workouts..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all shadow-sm placeholder-gray-400"
          />
        </div>
      </div>

      <div className="flex items-center gap-1.5 ml-auto">
        <button className="p-2 rounded-lg text-gray-400 hover:bg-white hover:text-gray-600 transition-all hover:shadow-sm">
          <CheckSquare size={18} />
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(v => !v)}
            className="relative p-2 rounded-lg text-gray-400 hover:bg-white hover:text-gray-600 transition-all hover:shadow-sm"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-500 rounded-full ring-2 ring-white/60" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-card-lg border border-gray-100 overflow-hidden z-50">
              <div className="px-4 py-3.5 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-semibold text-gray-800 text-sm">Notifications</h3>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <span className="text-xs font-medium text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">{unreadCount} new</span>
                  )}
                  {unreadCount > 0 && (
                    <button
                      onClick={() => markAllRead.mutate()}
                      className="text-xs text-gray-400 hover:text-gray-600"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <Bell size={24} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No notifications</p>
                  </div>
                ) : (
                  notifications.map(notif => (
                    <div
                      key={notif.id}
                      className={clsx(
                        'px-4 py-3 border-b border-gray-50 hover:bg-gray-50/80 cursor-pointer transition-colors',
                        !notif.read && 'bg-brand-50/40'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        {!notif.read && <div className="w-1.5 h-1.5 rounded-full bg-brand-500 mt-2 flex-shrink-0" />}
                        <div className={!notif.read ? '' : 'ml-[18px]'}>
                          <p className="text-sm font-medium text-gray-800">{notif.title}</p>
                          {notif.body && <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{notif.body}</p>}
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="px-4 py-3 text-center bg-gray-50/50">
                <button className="text-sm text-brand-600 font-medium hover:text-brand-700">
                  View all notifications
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
