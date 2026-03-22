import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Search, UserPlus, ChevronDown, ArrowUpDown,
  MessageSquare, MoreHorizontal, Filter, LayoutGrid, List,
  Loader2, X, Users,
} from 'lucide-react'
import clsx from 'clsx'
import { useClients, useCreateClient } from '@/hooks/useClients'
import type { DbClient } from '@/lib/database.types'

type StatusFilter = 'all' | 'active' | 'inactive' | 'pending'
type ViewMode = 'table' | 'grid'

function StatusBadge({ status }: { status: DbClient['status'] }) {
  return (
    <span className={clsx(
      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
      status === 'active'   && 'bg-emerald-50 text-emerald-700',
      status === 'inactive' && 'bg-gray-100 text-gray-600',
      status === 'pending'  && 'bg-amber-50 text-amber-700',
    )}>
      <span className={clsx('w-1.5 h-1.5 rounded-full',
        status === 'active'   && 'bg-emerald-500',
        status === 'inactive' && 'bg-gray-400',
        status === 'pending'  && 'bg-amber-500',
      )} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

function ComplianceBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={clsx('h-full rounded-full', value >= 80 ? 'bg-emerald-500' : value >= 50 ? 'bg-amber-400' : 'bg-rose-400')}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-sm text-gray-600 w-8">{value}%</span>
    </div>
  )
}

function ClientCard({ client }: { client: DbClient }) {
  const initials = client.name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
  return (
    <Link
      to={`/clients/${client.id}`}
      className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-card-hover hover:border-brand-200 transition-all group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {initials}
          </div>
          <div>
            <p className="font-semibold text-gray-800 group-hover:text-brand-700 transition-colors">{client.name}</p>
            <p className="text-xs text-gray-500">{client.email ?? '—'}</p>
          </div>
        </div>
        <StatusBadge status={client.status} />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">Goal</span>
          <span className="font-medium text-gray-700">{client.goal ?? '—'}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">Joined</span>
          <span className="text-gray-600">{new Date(client.joined_at).toLocaleDateString()}</span>
        </div>
      </div>
      <div className="mt-4 pt-3 border-t border-gray-50 flex items-center gap-2">
        <button
          onClick={e => e.preventDefault()}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-brand-600 bg-brand-50 rounded-lg hover:bg-brand-100 transition-colors"
        >
          <MessageSquare size={12} />
          Message
        </button>
        <button
          onClick={e => e.preventDefault()}
          className="flex-1 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
        >
          View Profile
        </button>
      </div>
    </Link>
  )
}

// ─── Add Client Modal ─────────────────────────────────────────
function AddClientModal({ onClose }: { onClose: () => void }) {
  const create = useCreateClient()
  const [form, setForm] = useState({
    name: '', email: '', phone: '', goal: '', category: '',
    status: 'active' as DbClient['status'],
  })
  const [error, setError] = useState<string | null>(null)

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Name is required'); return }
    setError(null)
    try {
      await create.mutateAsync({
        name:     form.name,
        email:    form.email || undefined,
        phone:    form.phone || undefined,
        goal:     form.goal || undefined,
        category: form.category || undefined,
        status:   form.status,
      })
      onClose()
    } catch (err: any) {
      setError(err.message)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 z-10">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">Add New Client</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700">{error}</div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Full Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all"
                placeholder="Jane Smith"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => set('email', e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all"
                  placeholder="jane@example.com"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Phone</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => set('phone', e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all"
                  placeholder="+61 4xx xxx xxx"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Primary Goal</label>
              <input
                type="text"
                value={form.goal}
                onChange={e => set('goal', e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all"
                placeholder="Weight Loss, Muscle Gain, Performance..."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Category</label>
                <input
                  type="text"
                  value={form.category}
                  onChange={e => set('category', e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all"
                  placeholder="Premium, Standard..."
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Status</label>
                <select
                  value={form.status}
                  onChange={e => set('status', e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all bg-white"
                >
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={create.isPending}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-brand-600 to-violet-600 rounded-xl hover:from-brand-700 hover:to-violet-700 disabled:opacity-60 transition-all"
            >
              {create.isPending ? <Loader2 size={15} className="animate-spin" /> : 'Add Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Clients page ─────────────────────────────────────────────
export default function Clients() {
  const [search, setSearch]         = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [viewMode, setViewMode]     = useState<ViewMode>('table')
  const [showFilters, setShowFilters] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)

  const { data: clients = [], isLoading } = useClients({
    status: statusFilter,
    search: search.length >= 2 ? search : undefined,
  })

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      {showAddModal && <AddClientModal onClose={() => setShowAddModal(false)} />}

      {/* Page header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">
          All Clients{' '}
          <span className="text-gray-400 font-normal text-base">
            ({isLoading ? '…' : clients.length})
          </span>
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode(v => v === 'table' ? 'grid' : 'table')}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          >
            {viewMode === 'table' ? <LayoutGrid size={20} /> : <List size={20} />}
          </button>
          <button
            onClick={() => setShowFilters(f => !f)}
            className={clsx(
              'flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors',
              showFilters ? 'bg-brand-50 text-brand-600' : 'text-gray-600 hover:bg-gray-100'
            )}
          >
            <Filter size={16} />
            Filters
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-brand-600 to-violet-600 text-white text-sm font-semibold rounded-xl hover:from-brand-700 hover:to-violet-700 transition-all shadow-sm shadow-brand-500/20"
          >
            <UserPlus size={16} />
            Add Client
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1">
            {(['all', 'active', 'inactive', 'pending'] as StatusFilter[]).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={clsx(
                  'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors capitalize',
                  statusFilter === s ? 'bg-brand-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
                )}
              >
                {s === 'all' ? 'All' : s}
              </button>
            ))}
          </div>

          {['Category', 'Group'].map(f => (
            <button
              key={f}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              {f}: <span className="font-medium">All</span>
              <ChevronDown size={14} />
            </button>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search clients..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all shadow-sm"
        />
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-gray-300" />
        </div>
      )}

      {/* Grid view */}
      {!isLoading && viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {clients.map(c => <ClientCard key={c.id} client={c} />)}
          {clients.length === 0 && <EmptyState onAdd={() => setShowAddModal(true)} />}
        </div>
      )}

      {/* Table view */}
      {!isLoading && viewMode === 'table' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="px-5 py-3 text-left"><input type="checkbox" className="rounded border-gray-300" /></th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Client</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Goal</th>
                  <th className="px-4 py-3 text-left">
                    <button className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700">
                      Joined <ArrowUpDown size={12} />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {clients.map(client => {
                  const initials = client.name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
                  return (
                    <tr key={client.id} className="hover:bg-gray-50/70 transition-colors group">
                      <td className="px-5 py-4"><input type="checkbox" className="rounded border-gray-300" /></td>
                      <td className="px-4 py-4">
                        <Link to={`/clients/${client.id}`} className="flex items-center gap-3 group/link">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                            {initials}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-800 group-hover/link:text-brand-600 transition-colors">{client.name}</p>
                            <p className="text-xs text-gray-500">{client.email ?? '—'}</p>
                          </div>
                        </Link>
                      </td>
                      <td className="px-4 py-4"><StatusBadge status={client.status} /></td>
                      <td className="px-4 py-4 text-sm text-gray-600">{client.goal ?? '—'}</td>
                      <td className="px-4 py-4 text-sm text-gray-600">
                        {new Date(client.joined_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">{client.category ?? '—'}</td>
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
                  )
                })}
              </tbody>
            </table>
          </div>
          {clients.length === 0 && (
            <div className="text-center py-16">
              <EmptyState onAdd={() => setShowAddModal(true)} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="text-center py-8 text-gray-400 col-span-full">
      <Users size={40} className="mx-auto mb-3 opacity-20" />
      <p className="font-medium text-sm">No clients found</p>
      <p className="text-xs mt-1 mb-4">Add your first client to get started</p>
      <button
        onClick={onAdd}
        className="px-4 py-2 bg-brand-50 text-brand-600 text-sm font-semibold rounded-xl hover:bg-brand-100 transition-colors"
      >
        + Add Client
      </button>
    </div>
  )
}
