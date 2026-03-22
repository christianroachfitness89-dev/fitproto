import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Search,
  UserPlus,
  ChevronDown,
  ArrowUpDown,
  MessageSquare,
  MoreHorizontal,
  Filter,
  LayoutGrid,
  List,
} from 'lucide-react'
import { mockClients } from '../data/mockData'
import type { Client } from '../types'
import clsx from 'clsx'

type StatusFilter = 'all' | 'active' | 'inactive' | 'pending'
type ViewMode = 'table' | 'grid'

function StatusBadge({ status }: { status: Client['status'] }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
        status === 'active' && 'bg-emerald-50 text-emerald-700',
        status === 'inactive' && 'bg-gray-100 text-gray-600',
        status === 'pending' && 'bg-amber-50 text-amber-700'
      )}
    >
      <span
        className={clsx(
          'w-1.5 h-1.5 rounded-full',
          status === 'active' && 'bg-emerald-500',
          status === 'inactive' && 'bg-gray-400',
          status === 'pending' && 'bg-amber-500'
        )}
      />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

function ComplianceBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={clsx(
            'h-full rounded-full',
            value >= 80 ? 'bg-emerald-500' : value >= 50 ? 'bg-amber-400' : 'bg-rose-400'
          )}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-sm text-gray-600 w-8">{value}%</span>
    </div>
  )
}

function ClientCard({ client }: { client: Client }) {
  return (
    <Link
      to={`/clients/${client.id}`}
      className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md hover:border-brand-200 transition-all group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-brand-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 group-hover:bg-brand-700 transition-colors">
            {client.initials}
          </div>
          <div>
            <p className="font-semibold text-gray-800">{client.name}</p>
            <p className="text-xs text-gray-500">{client.email}</p>
          </div>
        </div>
        <StatusBadge status={client.status} />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">Goal</span>
          <span className="font-medium text-gray-700">{client.goal}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">30d compliance</span>
          <ComplianceBar value={client.last30dTraining} />
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">Last active</span>
          <span className="text-gray-600">{client.lastActivity} ago</span>
        </div>
      </div>
      <div className="mt-4 pt-3 border-t border-gray-50 flex items-center gap-2">
        <button
          onClick={(e) => { e.preventDefault() }}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-brand-600 bg-brand-50 rounded-lg hover:bg-brand-100 transition-colors"
        >
          <MessageSquare size={12} />
          Message
        </button>
        <button
          onClick={(e) => { e.preventDefault() }}
          className="flex-1 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
        >
          View Profile
        </button>
      </div>
    </Link>
  )
}

export default function Clients() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [showFilters, setShowFilters] = useState(true)

  const filtered = mockClients.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">
          All Clients <span className="text-gray-400 font-normal text-base">({filtered.length})</span>
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode(viewMode === 'table' ? 'grid' : 'table')}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          >
            {viewMode === 'table' ? <LayoutGrid size={20} /> : <List size={20} />}
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={clsx(
              'flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors',
              showFilters ? 'bg-brand-50 text-brand-600' : 'text-gray-600 hover:bg-gray-100'
            )}
          >
            <Filter size={16} />
            Filters
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-sm font-semibold rounded-lg hover:bg-brand-700 transition-colors">
            <UserPlus size={16} />
            Add Client
          </button>
          <button className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">
            <ChevronDown size={18} />
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="flex flex-wrap items-center gap-3">
          {/* Status filters */}
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1">
            {(['all', 'active', 'inactive', 'pending'] as StatusFilter[]).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={clsx(
                  'px-3 py-1.5 text-xs font-medium rounded-md transition-colors capitalize',
                  statusFilter === s
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50'
                )}
              >
                {s === 'all' ? 'All Status' : s}
              </button>
            ))}
          </div>

          {/* Dropdown filters */}
          {['Category', 'Group', 'Last Activity', 'Last Assigned Workout'].map((f) => (
            <button
              key={f}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              {f}: <span className="font-medium">All</span>
              <ChevronDown size={14} />
            </button>
          ))}

          <button className="text-brand-600 text-sm font-medium hover:text-brand-700 ml-auto">
            Hide filters
          </button>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search client..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition-all"
        />
      </div>

      {/* Grid view */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((client) => (
            <ClientCard key={client.id} client={client} />
          ))}
        </div>
      ) : (
        /* Table view */
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="px-5 py-3 text-left">
                    <input type="checkbox" className="rounded border-gray-300" />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700">
                      Last Activity <ArrowUpDown size={12} />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700">
                      Last 7d Training <ArrowUpDown size={12} />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700">
                      Last 30d Training <ArrowUpDown size={12} />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700">
                      Last 7d Tasks <ArrowUpDown size={12} />
                    </button>
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((client) => (
                  <tr key={client.id} className="hover:bg-gray-50/70 transition-colors group">
                    <td className="px-5 py-4">
                      <input type="checkbox" className="rounded border-gray-300" />
                    </td>
                    <td className="px-4 py-4">
                      <Link to={`/clients/${client.id}`} className="flex items-center gap-3 group/link">
                        <div className="w-9 h-9 rounded-full bg-brand-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                          {client.initials}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-800 group-hover/link:text-brand-600 transition-colors">
                            {client.name}
                          </p>
                          <p className="text-xs text-gray-500">{client.email}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={client.status} />
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">{client.lastActivity} ago</td>
                    <td className="px-4 py-4">
                      <ComplianceBar value={client.last7dTraining} />
                    </td>
                    <td className="px-4 py-4">
                      <ComplianceBar value={client.last30dTraining} />
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">{client.last7dTasks}%</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                          <MessageSquare size={15} />
                        </button>
                        <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                          <MoreHorizontal size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <Users2 size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">No clients found</p>
              <p className="text-sm mt-1">Try adjusting your filters</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Users2({ size, className }: { size: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}
