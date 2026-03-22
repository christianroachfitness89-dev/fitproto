import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Mail,
  Phone,
  MessageSquare,
  Dumbbell,
  TrendingUp,
  Calendar,
  Tag,
  MoreHorizontal,
  Plus,
  CheckCircle2,
  Clock,
} from 'lucide-react'
import { mockClients, mockTasks } from '../data/mockData'
import clsx from 'clsx'

type Tab = 'overview' | 'workouts' | 'nutrition' | 'metrics' | 'notes'

export default function ClientDetail() {
  const { id } = useParams()
  const client = mockClients.find((c) => c.id === id)
  const clientTasks = mockTasks.filter((t) => t.clientId === id)

  if (!client) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">Client not found.</p>
        <Link to="/clients" className="text-brand-600 mt-2 inline-block">Back to clients</Link>
      </div>
    )
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'workouts', label: 'Workouts' },
    { key: 'nutrition', label: 'Nutrition' },
    { key: 'metrics', label: 'Metrics' },
    { key: 'notes', label: 'Notes' },
  ]

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Back */}
      <Link to="/clients" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">
        <ArrowLeft size={16} />
        Back to Clients
      </Link>

      {/* Profile header */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row items-start gap-5">
          <div className="w-20 h-20 rounded-2xl bg-brand-600 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
            {client.initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <h2 className="text-2xl font-bold text-gray-900">{client.name}</h2>
              <span
                className={clsx(
                  'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold w-fit',
                  client.status === 'active' && 'bg-emerald-50 text-emerald-700',
                  client.status === 'pending' && 'bg-amber-50 text-amber-700',
                  client.status === 'inactive' && 'bg-gray-100 text-gray-600'
                )}
              >
                <span className={clsx('w-1.5 h-1.5 rounded-full', client.status === 'active' ? 'bg-emerald-500' : client.status === 'pending' ? 'bg-amber-500' : 'bg-gray-400')} />
                {client.status}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-4 mt-2">
              <div className="flex items-center gap-1.5 text-sm text-gray-500">
                <Mail size={14} />
                {client.email}
              </div>
              {client.phone && (
                <div className="flex items-center gap-1.5 text-sm text-gray-500">
                  <Phone size={14} />
                  {client.phone}
                </div>
              )}
              <div className="flex items-center gap-1.5 text-sm text-gray-500">
                <Calendar size={14} />
                Joined {new Date(client.joinedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </div>
            </div>
            {client.tags && (
              <div className="flex flex-wrap gap-2 mt-3">
                {client.tags.map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                    <Tag size={10} />
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-sm font-semibold rounded-lg hover:bg-brand-700 transition-colors">
              <MessageSquare size={15} />
              Message
            </button>
            <button className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">
              <MoreHorizontal size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Last 7d Training', value: `${client.last7dTraining}%`, icon: <Dumbbell size={18} className="text-brand-500" /> },
          { label: 'Last 30d Training', value: `${client.last30dTraining}%`, icon: <TrendingUp size={18} className="text-emerald-500" /> },
          { label: 'Last 7d Tasks', value: `${client.last7dTasks}%`, icon: <CheckCircle2 size={18} className="text-amber-500" /> },
          { label: 'Last Activity', value: `${client.lastActivity} ago`, icon: <Clock size={18} className="text-rose-500" /> },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">{stat.icon}<span className="text-xs text-gray-500">{stat.label}</span></div>
            <p className="text-xl font-bold text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="border-b border-gray-100">
          <div className="flex overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                className={clsx(
                  'flex-shrink-0 px-5 py-3.5 text-sm font-medium border-b-2 transition-colors',
                  tab.key === 'overview'
                    ? 'border-brand-600 text-brand-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {/* Overview tab content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Goals & Info */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-800">Client Info</h3>
              <div className="space-y-3">
                {[
                  { label: 'Primary Goal', value: client.goal },
                  { label: 'Category', value: client.category },
                  { label: 'Group', value: client.group },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between py-2 border-b border-gray-50">
                    <span className="text-sm text-gray-500">{item.label}</span>
                    <span className="text-sm font-medium text-gray-800">{item.value || '—'}</span>
                  </div>
                ))}
              </div>

              <div className="mt-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-800">Assigned Program</h3>
                  <button className="flex items-center gap-1 text-xs text-brand-600 font-medium hover:text-brand-700">
                    <Plus size={12} />
                    Assign
                  </button>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <Dumbbell size={24} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-sm text-gray-500">No program assigned</p>
                  <button className="mt-2 text-xs text-brand-600 font-medium hover:text-brand-700">
                    Assign a program
                  </button>
                </div>
              </div>
            </div>

            {/* Tasks */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-800">Tasks</h3>
                <button className="flex items-center gap-1 text-xs text-brand-600 font-medium hover:text-brand-700">
                  <Plus size={12} />
                  Add task
                </button>
              </div>
              {clientTasks.length > 0 ? (
                <div className="space-y-2">
                  {clientTasks.map((task) => (
                    <div key={task.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div
                        className={clsx(
                          'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                          task.completed ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300'
                        )}
                      >
                        {task.completed && <CheckCircle2 size={12} className="text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={clsx('text-sm font-medium', task.completed ? 'line-through text-gray-400' : 'text-gray-700')}>
                          {task.title}
                        </p>
                        <p className="text-xs text-gray-400">Due {task.dueDate}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-sm text-gray-500">No tasks assigned</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
