import { Users, Dumbbell, TrendingUp, MessageSquare, CheckCircle2, Clock, ChevronRight, ArrowUpRight } from 'lucide-react'
import { mockClients, mockTasks, mockMessages } from '../data/mockData'
import { Link } from 'react-router-dom'
import clsx from 'clsx'

interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  icon: React.ReactNode
  gradient: string
  iconBg: string
  trend?: number
}

function StatCard({ label, value, sub, icon, gradient, iconBg, trend }: StatCardProps) {
  return (
    <div className={clsx('rounded-2xl p-5 text-white relative overflow-hidden shadow-card-lg', gradient)}>
      {/* Decorative circle */}
      <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-white/10" />
      <div className="absolute -right-1 -bottom-6 w-16 h-16 rounded-full bg-white/5" />

      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-white/70 uppercase tracking-wider">{label}</p>
          <p className="text-3xl font-bold mt-1.5 tracking-tight">{value}</p>
          {sub && <p className="text-xs text-white/60 mt-0.5">{sub}</p>}
        </div>
        <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center', iconBg)}>
          {icon}
        </div>
      </div>

      {trend !== undefined && (
        <div className="relative mt-4 flex items-center gap-1 bg-white/15 rounded-lg px-2.5 py-1.5 w-fit">
          <ArrowUpRight size={12} className="text-white" />
          <span className="text-xs text-white font-semibold">+{trend}% this week</span>
        </div>
      )}
    </div>
  )
}

export default function Dashboard() {
  const activeClients = mockClients.filter((c) => c.status === 'active').length
  const pendingTasks = mockTasks.filter((t) => !t.completed).length
  const unreadMessages = mockMessages.filter((m) => !m.read).length

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Good morning, Christian 👋</h2>
          <p className="text-gray-500 text-sm mt-1">Here's what's happening with your clients today.</p>
        </div>
        <Link
          to="/clients"
          className="hidden sm:flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-brand-600 to-violet-600 text-white text-sm font-semibold rounded-xl hover:from-brand-700 hover:to-violet-700 transition-all shadow-md shadow-brand-500/25 hover:shadow-brand-500/40"
        >
          <Users size={15} />
          View Clients
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Clients"
          value={mockClients.length}
          sub={`${activeClients} active`}
          icon={<Users size={20} className="text-white" />}
          gradient="bg-gradient-to-br from-brand-500 to-violet-600"
          iconBg="bg-white/20"
          trend={12}
        />
        <StatCard
          label="Workouts This Week"
          value={14}
          sub="across all clients"
          icon={<Dumbbell size={20} className="text-white" />}
          gradient="bg-gradient-to-br from-emerald-500 to-teal-600"
          iconBg="bg-white/20"
          trend={8}
        />
        <StatCard
          label="Avg. Compliance"
          value="73%"
          sub="last 30 days"
          icon={<TrendingUp size={20} className="text-white" />}
          gradient="bg-gradient-to-br from-amber-500 to-orange-500"
          iconBg="bg-white/20"
        />
        <StatCard
          label="Unread Messages"
          value={unreadMessages}
          sub={`${pendingTasks} tasks pending`}
          icon={<MessageSquare size={20} className="text-white" />}
          gradient="bg-gradient-to-br from-rose-500 to-pink-600"
          iconBg="bg-white/20"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent clients */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <h3 className="font-semibold text-gray-900 text-sm">Recent Client Activity</h3>
            <Link to="/clients" className="text-brand-600 text-xs font-semibold hover:text-brand-700 flex items-center gap-0.5 transition-colors">
              View all <ChevronRight size={13} />
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {mockClients.slice(0, 4).map((client) => (
              <Link
                key={client.id}
                to={`/clients/${client.id}`}
                className="flex items-center gap-3.5 px-5 py-3.5 hover:bg-surface-50 transition-colors group"
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm">
                  {client.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate group-hover:text-brand-700 transition-colors">{client.name}</p>
                  <p className="text-xs text-gray-400 truncate">{client.goal}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={clsx(
                    'text-sm font-bold',
                    client.last30dTraining >= 80 ? 'text-emerald-600' :
                    client.last30dTraining >= 50 ? 'text-amber-600' : 'text-rose-500'
                  )}>{client.last30dTraining}%</p>
                  <p className="text-xs text-gray-400">compliance</p>
                </div>
                <div
                  className={clsx(
                    'w-2 h-2 rounded-full flex-shrink-0',
                    client.status === 'active' ? 'bg-emerald-400' :
                    client.status === 'pending' ? 'bg-amber-400' : 'bg-gray-300'
                  )}
                />
              </Link>
            ))}
          </div>
        </div>

        {/* Tasks */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <h3 className="font-semibold text-gray-900 text-sm">Upcoming Tasks</h3>
            <button className="text-brand-600 text-xs font-semibold hover:text-brand-700 flex items-center gap-0.5 transition-colors">
              View all <ChevronRight size={13} />
            </button>
          </div>
          <div className="divide-y divide-gray-50">
            {mockTasks.map((task) => (
              <div key={task.id} className="flex items-center gap-3.5 px-5 py-3.5 hover:bg-surface-50 transition-colors">
                <button
                  className={clsx(
                    'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all',
                    task.completed
                      ? 'bg-emerald-500 border-emerald-500 shadow-sm shadow-emerald-200'
                      : 'border-gray-200 hover:border-brand-400'
                  )}
                >
                  {task.completed && <CheckCircle2 size={11} className="text-white" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={clsx('text-sm font-medium truncate', task.completed ? 'line-through text-gray-300' : 'text-gray-800')}>
                    {task.title}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{task.clientName}</p>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-400 flex-shrink-0 bg-gray-50 px-2 py-1 rounded-lg">
                  <Clock size={11} />
                  {task.dueDate}
                </div>
              </div>
            ))}
          </div>
          <div className="px-5 py-3 border-t border-gray-50">
            <button className="w-full text-center text-sm text-brand-600 font-semibold hover:text-brand-700 transition-colors">
              + Add new task
            </button>
          </div>
        </div>
      </div>

      {/* Messages preview */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
          <h3 className="font-semibold text-gray-900 text-sm">Recent Messages</h3>
          <Link to="/inbox" className="text-brand-600 text-xs font-semibold hover:text-brand-700 flex items-center gap-0.5 transition-colors">
            Open inbox <ChevronRight size={13} />
          </Link>
        </div>
        <div className="divide-y divide-gray-50">
          {mockMessages.map((msg) => (
            <Link
              key={msg.id}
              to="/inbox"
              className="flex items-center gap-3.5 px-5 py-3.5 hover:bg-surface-50 transition-colors group"
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm">
                {msg.clientInitials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 group-hover:text-brand-700 transition-colors">{msg.clientName}</p>
                <p className="text-xs text-gray-500 truncate">{msg.content}</p>
              </div>
              <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                <p className="text-xs text-gray-400">
                  {new Date(msg.timestamp).toLocaleDateString()}
                </p>
                {!msg.read && (
                  <span className="w-2 h-2 rounded-full bg-brand-500" />
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
