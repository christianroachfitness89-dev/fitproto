import { useState } from 'react'
import {
  CheckSquare, Plus, Trash2, Check, Search,
  ChevronDown, Loader2, UserPlus, X, Library,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import {
  useTasks, useTaskTemplates,
  useCreateTask, useToggleTask, useDeleteTask, useAssignTaskTemplate,
} from '@/hooks/useTasks'
import { useClients } from '@/hooks/useClients'
import { useMetricDefinitions } from '@/hooks/useMetrics'
import type { DbTask } from '@/lib/database.types'
import clsx from 'clsx'

type Tab = 'templates' | 'assigned'
type Filter = 'all' | 'pending' | 'completed'

// ── Assign-template modal ────────────────────────────────────
function AssignModal({
  template,
  clients,
  onAssign,
  onClose,
}: {
  template: DbTask
  clients: { id: string; name: string }[]
  onAssign: (clientId: string, dueDate?: string) => Promise<unknown>
  onClose: () => void
}) {
  const [clientId, setClientId] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!clientId) return
    setBusy(true)
    try {
      await onAssign(clientId, dueDate || undefined)
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#161b27] border border-[#242d40] rounded-2xl shadow-2xl w-full max-w-sm p-6 z-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-[#e8edf5]">Assign Task</h3>
            <p className="text-xs text-[#8a9ab5] mt-0.5 truncate max-w-[220px]">{template.title}</p>
          </div>
          <button onClick={onClose} className="text-[#4a5a75] hover:text-[#8a9ab5] p-1">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <select
            value={clientId}
            onChange={e => setClientId(e.target.value)}
            required
            className="w-full px-3 py-2 text-sm bg-[#1e2535] border border-[#2e3a52] rounded-xl focus:outline-none focus:border-amber-400/50 text-[#c5cedb]"
          >
            <option value="">Select client…</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input
            type="date"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
            placeholder="Due date (optional)"
            className="w-full px-3 py-2 text-sm bg-[#1e2535] border border-[#2e3a52] rounded-xl focus:outline-none focus:border-amber-400/50 text-[#c5cedb]"
          />
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 text-sm font-semibold text-[#8a9ab5] bg-[#1e2535] rounded-xl hover:bg-[#242d40] transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={!clientId || busy}
              className="flex-1 flex items-center justify-center gap-2 py-2 text-sm font-black text-[#0d1117] bg-amber-400 rounded-xl disabled:opacity-50 hover:bg-amber-300 transition-all">
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
export default function TasksLibrary() {
  const { profile } = useAuth()
  const { data: tasks = [], isLoading: tasksLoading } = useTasks()
  const { data: templates = [], isLoading: templatesLoading } = useTaskTemplates()
  const { data: clients = [] } = useClients()
  const createTask = useCreateTask()
  const toggleTask = useToggleTask()
  const deleteTask = useDeleteTask()
  const assignTemplate = useAssignTaskTemplate()

  const [tab, setTab] = useState<Tab>('templates')
  const [filter, setFilter] = useState<Filter>('all')
  const [clientFilter, setClientFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [assigningTemplate, setAssigningTemplate] = useState<DbTask | null>(null)

  // Create form
  const [title, setTitle] = useState('')
  const { data: metricDefs = [] } = useMetricDefinitions()
  const [taskType, setTaskType] = useState<DbTask['type']>('general')
  const [dueDate, setDueDate] = useState('')
  const [assignTo, setAssignTo] = useState('')
  const [metricDefId, setMetricDefId] = useState('')
  const [creating, setCreating] = useState(false)

  if (!profile?.org_id) return <div className="flex items-center justify-center h-64"><Loader2 size={24} className="animate-spin text-amber-400" /></div>

  const isTemplate = tab === 'templates'

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    if (!isTemplate && !assignTo) return
    setCreating(true)
    try {
      await createTask.mutateAsync({
        title:                title.trim(),
        client_id:            isTemplate ? undefined : assignTo,
        type:                 taskType,
        due_date:             dueDate || undefined,
        is_template:          isTemplate,
        metric_definition_id: metricDefId || null,
      })
      setTitle(''); setDueDate(''); setAssignTo(''); setTaskType('general'); setMetricDefId('')
    } finally {
      setCreating(false)
    }
  }

  const filteredTasks = tasks.filter(t => {
    if (filter === 'pending' && t.completed) return false
    if (filter === 'completed' && !t.completed) return false
    if (clientFilter !== 'all' && t.client_id !== clientFilter) return false
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const filteredTemplates = templates.filter(t =>
    !search || t.title.toLowerCase().includes(search.toLowerCase())
  )

  const pendingCount = tasks.filter(t => !t.completed).length

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto bg-[#0d1117] min-h-screen">
      {assigningTemplate && (
        <AssignModal
          template={assigningTemplate}
          clients={clients}
          onAssign={(clientId, due) =>
            assignTemplate.mutateAsync({ template: assigningTemplate, clientId, dueDate: due })
          }
          onClose={() => setAssigningTemplate(null)}
        />
      )}

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center">
            <CheckSquare size={18} className="text-amber-400" />
          </div>
          <h1 className="text-2xl font-bold text-[#e8edf5]">Tasks</h1>
          {pendingCount > 0 && (
            <span className="text-xs font-semibold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full">
              {pendingCount} pending
            </span>
          )}
        </div>
        <p className="text-sm text-[#8a9ab5] ml-12">Build a template library, then assign tasks to clients in one click.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-[#161b27] border border-[#242d40] rounded-xl mb-6 w-fit">
        {([
          { id: 'templates', label: 'Templates', count: templates.length },
          { id: 'assigned',  label: 'Assigned',  count: pendingCount || tasks.length },
        ] as { id: Tab; label: string; count: number }[]).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={clsx(
              'px-4 py-2 text-sm font-semibold rounded-lg transition-all flex items-center gap-2',
              tab === t.id
                ? 'text-amber-400 border-b-2 border-amber-400 bg-amber-400/5'
                : 'text-[#3a4a62] hover:text-[#8a9ab5]'
            )}
          >
            {t.label}
            {t.count > 0 && (
              <span className={clsx(
                'text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                tab === t.id ? 'bg-amber-400/10 text-amber-400' : 'bg-[#1e2535] text-[#4a5a75]'
              )}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Create form */}
      <form onSubmit={handleCreate} className="bg-[#161b27] rounded-2xl border border-[#242d40] p-4 sm:p-5 mb-6">
        <div className="flex items-center gap-2 mb-3">
          {isTemplate
            ? <Library size={14} className="text-[#4a5a75]" />
            : <UserPlus size={14} className="text-[#4a5a75]" />
          }
          <p className="text-xs font-semibold text-[#8a9ab5] uppercase tracking-wide">
            {isTemplate ? 'New Template' : 'Assign New Task'}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder={isTemplate ? 'Template title…' : 'Task title…'}
            className="flex-1 px-3 py-2 text-sm bg-[#1e2535] border border-[#2e3a52] rounded-xl focus:outline-none focus:border-amber-400/50 text-[#c5cedb] placeholder-[#3a4a62]"
          />
          {!isTemplate && (
            <select
              value={assignTo}
              onChange={e => setAssignTo(e.target.value)}
              required={!isTemplate}
              className="px-3 py-2 text-sm bg-[#1e2535] border border-[#2e3a52] rounded-xl focus:outline-none focus:border-amber-400/50 text-[#c5cedb]"
            >
              <option value="">Select client…</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-3 mt-3">
          <select
            value={taskType}
            onChange={e => setTaskType(e.target.value as DbTask['type'])}
            className="px-3 py-2 text-sm bg-[#1e2535] border border-[#2e3a52] rounded-xl focus:outline-none focus:border-amber-400/50 text-[#c5cedb]"
          >
            {(['general', 'nutrition', 'workout', 'check_in', 'admin'] as DbTask['type'][]).map(t => (
              <option key={t} value={t}>{t.replace('_', ' ')}</option>
            ))}
          </select>
          {!isTemplate && (
            <input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="px-3 py-2 text-sm bg-[#1e2535] border border-[#2e3a52] rounded-xl focus:outline-none focus:border-amber-400/50 text-[#c5cedb]"
            />
          )}
          {metricDefs.length > 0 && (
            <select
              value={metricDefId}
              onChange={e => setMetricDefId(e.target.value)}
              className="px-3 py-2 text-sm bg-[#1e2535] border border-[#2e3a52] rounded-xl focus:outline-none focus:border-amber-400/50 text-[#c5cedb]"
            >
              <option value="">+ Link metric (optional)</option>
              {metricDefs.map(d => <option key={d.id} value={d.id}>{d.emoji} {d.name}{d.unit ? ` (${d.unit})` : ''}</option>)}
            </select>
          )}
          <button
            type="submit"
            disabled={!title.trim() || (!isTemplate && !assignTo) || creating}
            className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-black text-[#0d1117] bg-amber-400 rounded-xl hover:bg-amber-300 disabled:opacity-50 transition-all sm:ml-auto"
          >
            {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            {isTemplate ? 'Save Template' : 'Assign Task'}
          </button>
        </div>
      </form>

      {/* Search bar — shared */}
      <div className="relative mb-4 max-w-xs">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4a5a75]" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search…"
          className="w-full pl-9 pr-4 py-2 text-sm bg-[#1e2535] border border-[#2e3a52] rounded-xl focus:outline-none focus:border-amber-400/50 text-[#c5cedb] placeholder-[#3a4a62]"
        />
      </div>

      {/* ── Templates tab ── */}
      {isTemplate && (
        <>
          {templatesLoading ? (
            <div className="flex items-center justify-center py-16"><Loader2 size={24} className="animate-spin text-amber-400" /></div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-16">
              <Library size={32} className="mx-auto mb-3 text-[#2e3a52]" />
              <p className="text-sm font-medium text-[#3a4a62]">No templates yet</p>
              <p className="text-xs mt-1 text-[#3a4a62]">Save a template above — then assign it to any client.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTemplates.map(t => (
                <div key={t.id}
                  className="flex items-center gap-3 p-4 bg-[#161b27] rounded-xl border border-[#242d40] hover:bg-white/[0.03] transition-all">
                  <div className="w-7 h-7 rounded-lg bg-amber-400/10 border border-amber-400/20 flex items-center justify-center flex-shrink-0">
                    <CheckSquare size={13} className="text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#e8edf5] truncate">{t.title}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span className={clsx('text-[10px] font-semibold px-1.5 py-0.5 rounded capitalize', typeColor(t.type))}>
                        {t.type.replace('_', ' ')}
                      </span>
                      {t.metric_definition_id && metricDefs.find(d => d.id === t.metric_definition_id) && (() => {
                        const d = metricDefs.find(m => m.id === t.metric_definition_id)!
                        return <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-400/10 text-emerald-400 border border-emerald-400/20">{d.emoji} {d.name}</span>
                      })()}
                    </div>
                  </div>
                  <button
                    onClick={() => setAssigningTemplate(t)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-400 bg-amber-400/10 border border-amber-400/20 hover:bg-amber-400/20 rounded-lg transition-colors flex-shrink-0"
                  >
                    <UserPlus size={12} />
                    Assign
                  </button>
                  <button
                    onClick={() => deleteTask.mutate({ id: t.id, isTemplate: true })}
                    className="flex-shrink-0 p-1.5 rounded-lg text-[#3a4a62] hover:text-rose-400 hover:bg-rose-400/10 transition-colors"
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
              {(['all', 'pending', 'completed'] as Filter[]).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={clsx(
                    'px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-colors',
                    filter === f ? 'bg-amber-400/10 text-amber-400 border border-amber-400/20' : 'text-[#4a5a75] hover:bg-[#1e2535]'
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
            <div className="relative sm:ml-auto">
              <select
                value={clientFilter}
                onChange={e => setClientFilter(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 text-sm bg-[#1e2535] border border-[#2e3a52] rounded-xl focus:outline-none focus:border-amber-400/50 text-[#c5cedb]"
              >
                <option value="all">All clients</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#4a5a75] pointer-events-none" />
            </div>
          </div>

          {tasksLoading ? (
            <div className="flex items-center justify-center py-16"><Loader2 size={24} className="animate-spin text-amber-400" /></div>
          ) : filteredTasks.length === 0 ? (
            <div className="text-center py-16">
              <CheckSquare size={32} className="mx-auto mb-3 text-[#2e3a52]" />
              <p className="text-sm font-medium text-[#3a4a62]">No tasks found</p>
              <p className="text-xs mt-1 text-[#3a4a62]">Assign a task above or use a template.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTasks.map(task => (
                <div key={task.id}
                  className={clsx(
                    'flex items-center gap-3 p-4 rounded-xl border transition-all',
                    task.completed ? 'bg-[#161b27] border-[#1e2535] opacity-60' : 'bg-[#161b27] border-[#242d40] hover:bg-white/[0.03]'
                  )}>
                  <button
                    onClick={() => toggleTask.mutate({ id: task.id, completed: !task.completed })}
                    className={clsx(
                      'flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all',
                      task.completed ? 'bg-emerald-400 border-emerald-400' : 'border-[#2e3a52] hover:border-amber-400/50'
                    )}
                  >
                    {task.completed && <Check size={11} className="text-[#0d1117]" strokeWidth={3} />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={clsx('text-sm font-medium truncate', task.completed ? 'line-through text-[#4a5a75]' : 'text-[#e8edf5]')}>
                      {task.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className={clsx('text-[10px] font-semibold px-1.5 py-0.5 rounded capitalize', typeColor(task.type))}>
                        {task.type.replace('_', ' ')}
                      </span>
                      {(task as any).clients?.name && (
                        <span className="text-xs text-[#4a5a75]">{(task as any).clients.name}</span>
                      )}
                      {task.due_date && (
                        <span className="text-xs text-[#4a5a75]">
                          Due {new Date(task.due_date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => deleteTask.mutate({ id: task.id })}
                    className="flex-shrink-0 p-1.5 rounded-lg text-[#3a4a62] hover:text-rose-400 hover:bg-rose-400/10 transition-colors"
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

function typeColor(type: string) {
  const map: Record<string, string> = {
    general:   'bg-[#1e2535] text-[#8a9ab5] border border-[#2e3a52]',
    nutrition: 'bg-emerald-400/10 text-emerald-400 border border-emerald-400/20',
    workout:   'bg-amber-400/10 text-amber-400 border border-amber-400/20',
    check_in:  'bg-[#1e2535] text-[#8a9ab5] border border-[#2e3a52]',
    admin:     'bg-rose-400/10 text-rose-400 border border-rose-400/20',
  }
  return map[type] ?? map.general
}
