import { useState } from 'react'
import {
  Repeat2, Plus, Trash2, Search, Loader2,
  UserPlus, ToggleLeft, ToggleRight, X, Library,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import {
  useAllHabits, useHabitTemplates,
  useCreateHabit, useDeleteHabit, useToggleHabitActive, useAssignHabitTemplate,
  type DbHabit,
} from '@/hooks/useHabits'
import { useClients } from '@/hooks/useClients'
import clsx from 'clsx'

type Tab = 'templates' | 'assigned'

const EMOJIS = ['✅', '💧', '🏃', '🥗', '😴', '🧘', '💪', '📖', '🚶', '🥤', '🎯', '⚡']

const FREQ_LABELS: Record<DbHabit['frequency'], string> = {
  daily: 'Daily',
  weekdays: 'Weekdays',
  weekends: 'Weekends',
  weekly: 'Weekly',
}

// ── Assign-template modal ────────────────────────────────────
function AssignModal({
  template,
  clients,
  onAssign,
  onClose,
}: {
  template: DbHabit
  clients: { id: string; name: string }[]
  onAssign: (clientId: string) => Promise<void>
  onClose: () => void
}) {
  const [clientId, setClientId] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!clientId) return
    setBusy(true)
    try { await onAssign(clientId); onClose() }
    finally { setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 z-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-gray-900">Assign Habit</h3>
            <p className="text-xs text-gray-500 mt-0.5">{template.emoji} {template.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1"><X size={18} /></button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <select
            value={clientId}
            onChange={e => setClientId(e.target.value)}
            required
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 bg-white"
          >
            <option value="">Select client…</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={!clientId || busy}
              className="flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-brand-600 rounded-xl disabled:opacity-50 hover:from-violet-700 hover:to-brand-700 transition-all">
              {busy ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
              Assign
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────
export default function HabitsLibrary() {
  const { profile } = useAuth()
  const { data: habits = [], isLoading: habitsLoading } = useAllHabits()
  const { data: templates = [], isLoading: templatesLoading } = useHabitTemplates()
  const { data: clients = [] } = useClients()
  const createHabit = useCreateHabit()
  const deleteHabit = useDeleteHabit()
  const toggleActive = useToggleHabitActive()
  const assignTemplate = useAssignHabitTemplate()

  const [tab, setTab] = useState<Tab>('templates')
  const [clientFilter, setClientFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [search, setSearch] = useState('')
  const [assigningTemplate, setAssigningTemplate] = useState<DbHabit | null>(null)

  // Create form
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('✅')
  const [description, setDescription] = useState('')
  const [frequency, setFrequency] = useState<DbHabit['frequency']>('daily')
  const [assignTo, setAssignTo] = useState('')
  const [creating, setCreating] = useState(false)

  if (!profile?.org_id) return <div className="flex items-center justify-center h-64"><Loader2 size={24} className="animate-spin text-brand-500" /></div>

  const isTemplate = tab === 'templates'

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    if (!isTemplate && !assignTo) return
    setCreating(true)
    try {
      await createHabit.mutateAsync({
        client_id: isTemplate ? null : assignTo,
        name: name.trim(),
        description: description.trim() || undefined,
        emoji,
        frequency,
        is_template: isTemplate,
      })
      setName(''); setDescription(''); setEmoji('✅'); setFrequency('daily'); setAssignTo('')
    } finally {
      setCreating(false)
    }
  }

  const filteredHabits = habits.filter(h => {
    if (statusFilter === 'active' && !h.active) return false
    if (statusFilter === 'inactive' && h.active) return false
    if (clientFilter !== 'all' && h.client_id !== clientFilter) return false
    if (search && !h.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const filteredTemplates = templates.filter(t =>
    !search || t.name.toLowerCase().includes(search.toLowerCase())
  )

  const activeCount = habits.filter(h => h.active).length

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      {assigningTemplate && (
        <AssignModal
          template={assigningTemplate}
          clients={clients}
          onAssign={(clientId) =>
            assignTemplate.mutateAsync({ template: assigningTemplate, clientId })
          }
          onClose={() => setAssigningTemplate(null)}
        />
      )}

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
        <p className="text-sm text-gray-500 ml-12">Build a habit template library, then assign to any client instantly.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-6 w-fit">
        {([
          { id: 'templates', label: 'Templates', count: templates.length },
          { id: 'assigned',  label: 'Assigned',  count: activeCount || habits.length },
        ] as { id: Tab; label: string; count: number }[]).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={clsx(
              'px-4 py-2 text-sm font-semibold rounded-lg transition-all flex items-center gap-2',
              tab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            )}
          >
            {t.label}
            {t.count > 0 && (
              <span className={clsx(
                'text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                tab === t.id ? 'bg-violet-100 text-violet-700' : 'bg-gray-200 text-gray-600'
              )}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Create form */}
      <form onSubmit={handleCreate} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-5 mb-6">
        <div className="flex items-center gap-2 mb-3">
          {isTemplate
            ? <Library size={14} className="text-gray-400" />
            : <UserPlus size={14} className="text-gray-400" />
          }
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            {isTemplate ? 'New Template' : 'Assign New Habit'}
          </p>
        </div>

        {/* Emoji picker */}
        <div className="flex gap-1.5 mb-3 flex-wrap">
          {EMOJIS.map(e => (
            <button
              key={e}
              type="button"
              onClick={() => setEmoji(e)}
              className={clsx(
                'w-8 h-8 rounded-lg text-base flex items-center justify-center transition-all',
                emoji === e ? 'bg-violet-100 ring-2 ring-violet-400 ring-offset-1' : 'hover:bg-gray-100'
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
            placeholder={isTemplate ? 'Habit template name…' : 'Habit name…'}
            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400"
          />
          {!isTemplate && (
            <select
              value={assignTo}
              onChange={e => setAssignTo(e.target.value)}
              required={!isTemplate}
              className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 bg-white"
            >
              <option value="">Select client…</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
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
            disabled={!name.trim() || (!isTemplate && !assignTo) || creating}
            className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-brand-600 rounded-xl hover:from-violet-700 hover:to-brand-700 disabled:opacity-50 transition-all"
          >
            {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            {isTemplate ? 'Save Template' : 'Assign Habit'}
          </button>
        </div>
      </form>

      {/* Search bar */}
      <div className="relative mb-4 max-w-xs">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search…"
          className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400"
        />
      </div>

      {/* ── Templates tab ── */}
      {isTemplate && (
        <>
          {templatesLoading ? (
            <div className="flex items-center justify-center py-16"><Loader2 size={24} className="animate-spin text-brand-500" /></div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Library size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">No templates yet</p>
              <p className="text-xs mt-1">Save a template above — then assign it to any client in one click.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTemplates.map(t => (
                <div key={t.id}
                  className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200 shadow-sm hover:border-brand-200 transition-all">
                  <span className="text-xl flex-shrink-0">{t.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{t.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-violet-50 text-violet-600">
                        {FREQ_LABELS[t.frequency]}
                      </span>
                      {t.description && (
                        <span className="text-xs text-gray-400 truncate max-w-[140px]">{t.description}</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setAssigningTemplate(t)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-lg transition-colors flex-shrink-0"
                  >
                    <UserPlus size={12} />
                    Assign
                  </button>
                  <button
                    onClick={() => deleteHabit.mutate({ id: t.id, clientId: null, isTemplate: true })}
                    className="flex-shrink-0 p-1.5 rounded-lg text-gray-300 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Assigned tab ── */}
      {!isTemplate && (
        <>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="flex gap-2">
              {(['all', 'active', 'inactive'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={clsx(
                    'px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-colors',
                    statusFilter === s ? 'bg-violet-100 text-violet-700' : 'text-gray-500 hover:bg-gray-100'
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
            <select
              value={clientFilter}
              onChange={e => setClientFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 bg-white sm:ml-auto"
            >
              <option value="all">All clients</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {habitsLoading ? (
            <div className="flex items-center justify-center py-16"><Loader2 size={24} className="animate-spin text-brand-500" /></div>
          ) : filteredHabits.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Repeat2 size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">No habits found</p>
              <p className="text-xs mt-1">Assign a habit above or use a template.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredHabits.map(h => (
                <div key={h.id}
                  className={clsx(
                    'flex items-center gap-3 p-4 bg-white rounded-xl border transition-all',
                    h.active ? 'border-gray-200 shadow-sm' : 'border-gray-100 opacity-60'
                  )}>
                  <span className="text-xl flex-shrink-0">{h.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{h.name}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-violet-50 text-violet-600">
                        {FREQ_LABELS[h.frequency]}
                      </span>
                      {(h as any).clients?.name && (
                        <span className="text-xs text-gray-400">{(h as any).clients.name}</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => toggleActive.mutate({ id: h.id, clientId: h.client_id, active: !h.active })}
                    title={h.active ? 'Deactivate' : 'Activate'}
                    className="flex-shrink-0 text-gray-400 hover:text-violet-500 transition-colors"
                  >
                    {h.active
                      ? <ToggleRight size={20} className="text-violet-500" />
                      : <ToggleLeft size={20} />
                    }
                  </button>
                  <button
                    onClick={() => deleteHabit.mutate({ id: h.id, clientId: h.client_id })}
                    className="flex-shrink-0 p-1.5 rounded-lg text-gray-300 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
