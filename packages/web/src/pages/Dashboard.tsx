import { Users, Dumbbell, TrendingUp, MessageSquare, CheckCircle2, Clock, ChevronRight, ArrowUpRight } from 'lucide-react'
import { mockClients, mockTasks, mockMessages } from '../data/mockData'
import { Link } from 'react-router-dom'
import clsx from 'clsx'

interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  icon: React.ReactNode
  color: string
  trend?: number
}

function StatCard({ label, value, sub, icon, color, trend }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
        <div className={clsx('w-11 h-11 rounded-xl flex items-center justify-center', color)}>
          {icon}
        </div>
      </div>
      {trend !== undefined && (
        <div className="mt-3 flex items-center gap-1">
          <ArrowUpRight size={14} className="text-emerald-500" />
          <span className="text-xs text-emerald-600 font-medium">+{trend}% this week</span>
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
          <h2 className="text-2xl font-bold text-gray-900">Good morning, Christian 👋</h2>
          <p className="text-gray-500 text-sm mt-1">Here's what's happening with your clients today.</p>
        </div>
        <Link
          to="/clients"
          className="hidden sm:flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white text-sm font-semibold rounded-lg hover:bg-brand-700 transition-colors"
        >
          <Users size={16} />
          View Clients
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Clients"
          value={mockClients.length}
          sub={`${activeClients} active`}
          icon={<Users size={22} className="text-brand-600" />}
          color="bg-brand-50"
          trend={12}
        />
        <StatCard
          label="Workouts This Week"
          value={14}
          sub="across all clients"
          icon={<Dumbbell size={22} className="text-emerald-600" />}
          color="bg-emerald-50"
          trend={8}
        />
        <StatCard
          label="Avg. Compliance"
          value="73%"
          sub="last 30 days"
          icon={<TrendingUp size={22} className="text-amber-600" />}
          color="bg-amber-50"
        />
        <StatCard
          label="Unread Messages"
          value={unreadMessages}
          sub={`${pendingTasks} tasks pending`}
          icon={<MessageSquare size={22} className="text-rose-600" />}
          color="bg-rose-50"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent clients */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <h3 className="font-semibold text-gray-800">Recent Client Activity</h3>
            <Link to="/clients" className="text-brand-600 text-sm font-medium hover:text-brand-700 flex items-center gap-1">
              View all <ChevronRight size={14} />
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {mockClients.slice(0, 4).map((client) => (
              <Link
                key={client.id}
                to={`/clients/${client.id}`}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors"
              >
                <div className="w-9 h-9 rounded-full bg-brand-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {client.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{client.name}</p>
                  <p className="text-xs text-gray-400 truncate">{client.goal}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-medium text-gray-600">{client.last30dTraining}%</p>
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
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <h3 className="font-semibold text-gray-800">Upcoming Tasks</h3>
            <button className="text-brand-600 text-sm font-medium hover:text-brand-700 flex items-center gap-1">
              View all <ChevronRight size={14} />
            </button>
          </div>
          <div className="divide-y divide-gray-50">
            {mockTasks.map((task) => (
              <div key={task.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors">
                <button
                  className={clsx(
                    'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                    task.completed
                      ? 'bg-emerald-500 border-emerald-500'
                      : 'border-gray-300 hover:border-brand-400'
                  )}
                >
                  {task.completed && <CheckCircle2 size={12} className="text-white" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={clsx('text-sm font-medium truncate', task.completed ? 'line-through text-gray-400' : 'text-gray-800')}>
                    {task.title}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{task.clientName}</p>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-400 flex-shrink-0">
                  <Clock size={12} />
                  {task.dueDate}
                </div>
              </div>
            ))}
          </div>
          <div className="px-5 py-3 border-t border-gray-50">
            <button className="w-full text-center text-sm text-brand-600 font-medium hover:text-brand-700 transition-colors">
              + Add new task
            </button>
          </div>
        </div>
      </div>

      {/* Messages preview */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
          <h3 className="font-semibold text-gray-800">Recent Messages</h3>
          <Link to="/inbox" className="text-brand-600 text-sm font-medium hover:text-brand-700 flex items-center gap-1">
            Open inbox <ChevronRight size={14} />
          </Link>
        </div>
        <div className="divide-y divide-gray-50">
          {mockMessages.map((msg) => (
            <Link
              key={msg.id}
              to="/inbox"
              className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors"
            >
              <div className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                {msg.clientInitials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">{msg.clientName}</p>
                <p className="text-xs text-gray-500 truncate">{msg.content}</p>
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
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
