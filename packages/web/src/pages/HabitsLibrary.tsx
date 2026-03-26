import { useState } from 'react'
import { Repeat2, Plus, Trash2, Search, ChevronDown, Loader2, ToggleLeft, ToggleRight } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import {
  useAllHabits,
  useCreateHabit,
  useDeleteHabit,
  useToggleHabitActive,
  type DbHabit,
} from '@/hooks/useHabits'
import { useClients } from '@/hooks/useClients'
import clsx from 'clsx'

const EMOJIS = ['✅', '💧', '🏃', '🥗', '😴', '🧘', '💪', '📖', '🚶', '🥤']

const FREQ_LABELS: Record<DbHabit['frequency'], string> = {
  daily: 'Daily',
  weekdays: 'Weekdays',
  weekends: 'Weekends',
  weekly: 'Weekly',
}

export default function HabitsLibrary() {
  const { profile } = useAuth()
  const { data: habits = [], isLoading } = useAllHabits()
  const { data: clients = [] } = useClients()
  const createHabit = useCreateHabit()
  const deleteHabit = useDeleteHabit()
  const toggleActive = useToggleHabitActive()

  const [clientFilter, setClientFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [search, setSearch] = useState('')

  // Create form
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('✅')
  const [description, setDescription] = useState('')
  const [frequency, setFrequency] = useState<DbHabit['frequency']>('daily')
  const [assignTo, setAssignTo] = useState<string>('')
  const [creating, setCreating] = useState(false)

  if (!profile?.org_id) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="animate-spin text-brand-500" />
      </div>
    )
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !assignTo) return
    setCreating(true)
    try {
      await createHabit.mutateAsync({
        client_id: assignTo,
        name: name.trim(),
        description: description.trim() || undefined,
        emoji,
        frequency,
      })
      setName('')
      setDescription('')
      setEmoji('✅')
      setFrequency('daily')
      setAssignTo('')
    } finally {
      setCreating(false)
    }
  }

  const filtered = habits.filter(h => {
    if (statusFilter === 'active' && !h.active) return false
    if (statusFilter === 'inactive' && h.active) return false
    if (clientFilter !== 'all' && h.client_id !== clientFilter) return false
    if (search && !h.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const activeCount = habits.filter(h => h.active).length

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-brand-600 flex items-center justify-center">
            <Repeat2 size={18} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Habits</h1>
          {activeCount > 0 && (
            <span className="text-xs font-semibold text-violet-700 bg-violet-100 px-2 py-0.5 rounded-full">
              {activeCount} active
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500 ml-12">Create and assign recurring habits to any client.</p>
      </div>

      {/* Create form */}
      <form onSubmit={handleCreate} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-5 mb-6">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Add New Habit</p>

        {/* Emoji row */}
        <div className="flex gap-1.5 mb-3 flex-wrap">
          {EMOJIS.map(e => (
            <button
              key={e}
              type="button"
              onClick={() => setEmoji(e)}
              className={clsx(
                'w-8 h-8 rounded-lg text-lg flex items-center justify-center transition-all',
                emoji === e
                  ? 'bg-violet-100 ring-2 ring-violet-400 ring-offset-1'
                  : 'hover:bg-gray-100'
              )}
            >
              {e}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-3">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Habit name…"
            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400"
          />
          <select
            value={assignTo}
            onChange={e => setAssignTo(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 bg-white"
          >
            <option value="">Select client…</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <input
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Description (optional)"
            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400"
          />
          <select
            value={frequency}
            onChange={e => setFrequency(e.target.value as DbHabit['frequency'])}
            className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 bg-white"
          >
            {(Object.keys(FREQ_LABELS) as DbHabit['frequency'][]).map(f => (
              <option key={f} value={f}>{FREQ_LABELS[f]}</option>
            ))}
          </select>
          <button
            type="submit"
            disabled={!name.trim() || !assignTo || creating}
            className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-brand-600 rounded-xl hover:from-violet-700 hover:to-brand-700 disabled:opacity-50 transition-all"
          >
            {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Add Habit
          </button>
        </div>
      </form>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search habits…"
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'active', 'inactive'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={clsx(
                'px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-colors',
                statusFilter === s
                  ? 'bg-violet-100 text-violet-700'
                  : 'text-gray-500 hover:bg-gray-100'
              )}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="relative">
          <select
            value={clientFilter}
            onChange={e => setClientFilter(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 bg-white"
          >
            <option value="all">All clients</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Habit list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-brand-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Repeat2 size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No habits found</p>
          <p className="text-xs mt-1">Create a habit above to get started.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(habit => (
            <HabitRow
              key={habit.id}
              habit={habit}
              clientName={(habit as any).clients?.name ?? null}
              onToggleActive={() =>
                toggleActive.mutate({ id: habit.id, clientId: habit.client_id, active: !habit.active })
              }
              onDelete={() =>
                deleteHabit.mutate({ id: habit.id, clientId: habit.client_id })
              }
            />
          ))}
        </div>
      )}
    </div>
  )
}

function HabitRow({
  habit,
  clientName,
  onToggleActive,
  onDelete,
}: {
  habit: DbHabit
  clientName: string | null
  onToggleActive: () => void
  onDelete: () => void
}) {
  return (
    <div className={clsx(
      'flex items-center gap-3 p-4 bg-white rounded-xl border transition-all',
      habit.active ? 'border-gray-200 shadow-sm' : 'border-gray-100 opacity-60'
    )}>
      <span className="text-xl flex-shrink-0">{habit.emoji}</span>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{habit.name}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-violet-50 text-violet-600 capitalize">
            {FREQ_LABELS[habit.frequency]}
          </span>
          {clientName && (
            <span className="text-xs text-gray-400">{clientName}</span>
          )}
          {habit.description && (
            <span className="text-xs text-gray-400 truncate max-w-[160px]">{habit.description}</span>
          )}
        </div>
      </div>

      <button
        onClick={onToggleActive}
        title={habit.active ? 'Deactivate' : 'Activate'}
        className="flex-shrink-0 text-gray-400 hover:text-violet-500 transition-colors"
      >
        {habit.active
          ? <ToggleRight size={20} className="text-violet-500" />
          : <ToggleLeft size={20} />
        }
      </button>

      <button
        onClick={onDelete}
        className="flex-shrink-0 p-1.5 rounded-lg text-gray-300 hover:text-rose-500 hover:bg-rose-50 transition-colors"
      >
        <Trash2 size={14} />
      </button>
    </div>
  )
}
