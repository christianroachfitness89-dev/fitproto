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
    <header className="h-14 bg-[#0d1117] border-b border-[#1e2535] flex items-center px-4 sm:px-6 gap-3 sm:gap-4 sticky top-0 z-20 flex-shrink-0">
      <MobileMenuButton onClick={onMenuClick} />

      <h1 className="text-sm font-black text-[#e8edf5] flex-1 lg:flex-none tracking-tight uppercase"
        style={{ fontFamily: "'Syne', system-ui, sans-serif" }}>
        {title}
      </h1>

      <div className="hidden md:flex flex-1 max-w-xs">
        <div className="relative w-full">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#3a4a62]" />
          <input
            type="text"
            placeholder="Search clients, workouts..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-[#161b27] border border-[#242d40] rounded-xl focus:outline-none focus:border-amber-400/50 focus:ring-2 focus:ring-amber-400/10 transition-all text-[#c5cedb] placeholder-[#3a4a62]"
          />
        </div>
      </div>

      <div className="flex items-center gap-1 ml-auto">
        <button className="p-2 rounded-xl text-[#3a4a62] hover:bg-white/5 hover:text-[#8a9ab5] transition-all">
          <CheckSquare size={17} />
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(v => !v)}
            className="relative p-2 rounded-xl text-[#3a4a62] hover:bg-white/5 hover:text-[#8a9ab5] transition-all"
          >
            <Bell size={17} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-400 rounded-full ring-2 ring-[#0d1117]" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] bg-[#161b27] rounded-2xl shadow-2xl border border-[#242d40] overflow-hidden z-50">
              <div className="px-4 py-3.5 border-b border-[#1e2535] flex items-center justify-between">
                <h3 className="font-bold text-[#c5cedb] text-sm tracking-tight">Notifications</h3>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <span className="text-[10px] font-black text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full">{unreadCount} new</span>
                  )}
                  {unreadCount > 0 && (
                    <button
                      onClick={() => markAllRead.mutate()}
                      className="text-xs text-[#4a5a75] hover:text-[#8a9ab5] transition-colors"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="text-center py-8">
                    <Bell size={22} className="mx-auto mb-2 opacity-20 text-[#6a7a95]" />
                    <p className="text-sm text-[#3a4a62]">No notifications</p>
                  </div>
                ) : (
                  notifications.map(notif => (
                    <div
                      key={notif.id}
                      className={clsx(
                        'px-4 py-3 border-b border-[#1e2535] hover:bg-white/[0.03] cursor-pointer transition-colors',
                        !notif.read && 'bg-amber-400/5'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        {!notif.read && <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 flex-shrink-0" />}
                        <div className={!notif.read ? '' : 'ml-[18px]'}>
                          <p className="text-sm font-medium text-[#c5cedb]">{notif.title}</p>
                          {notif.body && <p className="text-xs text-[#6a7a95] mt-0.5 leading-relaxed">{notif.body}</p>}
                          <p className="text-xs text-[#3a4a62] mt-1 tabular-nums">
                            {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="px-4 py-3 text-center border-t border-[#1e2535]">
                <button className="text-xs font-bold text-amber-400/70 hover:text-amber-400 uppercase tracking-wider transition-colors">
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
