import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft, Mail, Phone, MessageSquare, Dumbbell,
  Calendar, Tag, MoreHorizontal, Plus, CheckCircle2,
  Clock, Loader2, X, ChevronDown, Trash2, Send,
} from 'lucide-react'
import clsx from 'clsx'
import { useClient, useUpdateClient } from '@/hooks/useClients'
import { useTasks, useCreateTask, useToggleTask } from '@/hooks/useTasks'
import { useClientWorkouts, useAssignWorkout, useUpdateClientWorkoutStatus, useRemoveClientWorkout } from '@/hooks/useClientWorkouts'
import { useWorkouts } from '@/hooks/useWorkouts'
import type { DbClient, DbTask, DbClientWorkoutWithWorkout } from '@/lib/database.types'

type Tab = 'overview' | 'workouts' | 'nutrition' | 'metrics' | 'notes'

// ─── Add task inline form ─────────────────────────────────────
function AddTaskRow({ clientId }: { clientId: string }) {
  const [open, setOpen]   = useState(false)
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')
  const create = useCreateTask()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    await create.mutateAsync({ title, client_id: clientId, due_date: dueDate || undefined })
    setTitle('')
    setDueDate('')
    setOpen(false)
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full text-left text-sm text-brand-600 font-semibold hover:text-brand-700 transition-colors py-3 flex items-center gap-1.5"
      >
        <Plus size={14} /> Add task
      </button>
    )
  }

  return (
    <form onSubmit={submit} className="mt-2 space-y-2">
      <input
        autoFocus
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Task title..."
        className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400"
      />
      <div className="flex gap-2">
        <input
          type="date"
          value={dueDate}
          onChange={e => setDueDate(e.target.value)}
          className="flex-1 text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400"
        />
        <button
          type="submit"
          disabled={create.isPending}
          className="px-3 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-60"
        >
          {create.isPending ? <Loader2 size={14} className="animate-spin" /> : 'Add'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="px-3 py-2 text-gray-400 hover:text-gray-600">
          <X size={14} />
        </button>
      </div>
    </form>
  )
}

// ─── Edit client modal ────────────────────────────────────────
function EditClientModal({ client, onClose }: { client: DbClient; onClose: () => void }) {
  const update = useUpdateClient()
  const [form, setForm] = useState({
    name:       client.name,
    email:      client.email ?? '',
    phone:      client.phone ?? '',
    goal:       client.goal ?? '',
    category:   client.category ?? '',
    group_name: client.group_name ?? '',
    status:     client.status,
  })
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Name is required'); return }
    setError(null)
    try {
      await update.mutateAsync({
        id:         client.id,
        name:       form.name,
        email:      form.email || null,
        phone:      form.phone || null,
        goal:       form.goal || null,
        category:   form.category || null,
        group_name: form.group_name || null,
        status:     form.status,
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
          <h2 className="text-lg font-bold text-gray-900">Edit Client</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        {error && <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700">{error}</div>}

        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Full Name *</label>
            <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Email</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Phone</label>
              <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Primary Goal</label>
            <input type="text" value={form.goal} onChange={e => setForm(f => ({ ...f, goal: e.target.value }))}
              placeholder="Weight Loss, Muscle Gain..."
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Category</label>
              <input type="text" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                placeholder="Premium..."
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Group</label>
              <input type="text" value={form.group_name} onChange={e => setForm(f => ({ ...f, group_name: e.target.value }))}
                placeholder="Morning..."
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as DbClient['status'] }))}
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 bg-white">
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={update.isPending}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-brand-600 to-violet-600 rounded-xl hover:from-brand-700 hover:to-violet-700 disabled:opacity-60 transition-all">
              {update.isPending ? <Loader2 size={15} className="animate-spin" /> : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Assign workout modal ─────────────────────────────────────
function AssignWorkoutModal({ clientId, onClose }: { clientId: string; onClose: () => void }) {
  const { data: workouts = [], isLoading } = useWorkouts()
  const assign = useAssignWorkout()
  const [search, setSearch]   = useState('')
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes]     = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [error, setError]       = useState<string | null>(null)

  const filtered = workouts.filter(w =>
    w.name.toLowerCase().includes(search.toLowerCase())
  )

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) { setError('Please select a workout'); return }
    setError(null)
    try {
      await assign.mutateAsync({
        client_id:  clientId,
        workout_id: selected,
        due_date:   dueDate || undefined,
        notes:      notes   || undefined,
      })
      onClose()
    } catch (err: any) {
      setError(err.message)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 z-10 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Assign Workout</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"><X size={18} /></button>
        </div>

        {error && <div className="mb-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700">{error}</div>}

        {/* Workout search */}
        <div className="relative mb-3">
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search workouts..."
            className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400"
          />
        </div>

        {/* Workout list */}
        <div className="flex-1 overflow-y-auto space-y-1.5 mb-4 min-h-0" style={{ maxHeight: 260 }}>
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 size={20} className="animate-spin text-gray-300" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No workouts found</p>
          ) : filtered.map(w => (
            <button
              key={w.id}
              type="button"
              onClick={() => setSelected(w.id)}
              className={clsx(
                'w-full text-left px-4 py-3 rounded-xl border-2 transition-all',
                selected === w.id
                  ? 'border-brand-500 bg-brand-50'
                  : 'border-transparent bg-gray-50 hover:bg-gray-100',
              )}
            >
              <div className="flex items-center gap-3">
                <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                  selected === w.id ? 'bg-brand-600' : 'bg-gray-200')}>
                  <Dumbbell size={15} className={selected === w.id ? 'text-white' : 'text-gray-500'} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{w.name}</p>
                  <p className="text-xs text-gray-500">
                    {(w as any).workout_exercises?.length ?? 0} exercises
                    {w.duration_minutes ? ` · ${w.duration_minutes} min` : ''}
                    {w.difficulty ? ` · ${w.difficulty}` : ''}
                  </p>
                </div>
                {selected === w.id && <CheckCircle2 size={16} className="text-brand-600 flex-shrink-0" />}
              </div>
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-3 border-t border-gray-100 pt-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Due Date</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Notes</label>
              <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional..."
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400" />
            </div>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={!selected || assign.isPending}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-brand-600 to-violet-600 rounded-xl hover:from-brand-700 hover:to-violet-700 disabled:opacity-50 transition-all">
              {assign.isPending ? <Loader2 size={15} className="animate-spin" /> : <><Send size={14} /> Assign</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Workouts tab ─────────────────────────────────────────────
const STATUS_STYLES: Record<DbClientWorkoutWithWorkout['status'], string> = {
  assigned:  'bg-brand-50 text-brand-700',
  completed: 'bg-emerald-50 text-emerald-700',
  skipped:   'bg-gray-100 text-gray-500',
}

function WorkoutsTab({ clientId }: { clientId: string }) {
  const { data: assignments = [], isLoading } = useClientWorkouts(clientId)
  const updateStatus = useUpdateClientWorkoutStatus()
  const remove       = useRemoveClientWorkout()
  const [showAssign, setShowAssign] = useState(false)

  if (isLoading) {
    return <div className="flex items-center justify-center py-16"><Loader2 size={22} className="animate-spin text-gray-300" /></div>
  }

  return (
    <div>
      {showAssign && <AssignWorkoutModal clientId={clientId} onClose={() => setShowAssign(false)} />}

      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="text-sm font-semibold text-gray-800">{assignments.length} workout{assignments.length !== 1 ? 's' : ''} assigned</span>
          {assignments.filter(a => a.status === 'completed').length > 0 && (
            <span className="ml-2 text-xs text-emerald-600 font-medium">
              · {assignments.filter(a => a.status === 'completed').length} completed
            </span>
          )}
        </div>
        <button
          onClick={() => setShowAssign(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-brand-600 to-violet-600 text-white text-xs font-semibold rounded-xl hover:from-brand-700 hover:to-violet-700 transition-all shadow-sm"
        >
          <Plus size={13} /> Assign Workout
        </button>
      </div>

      {assignments.length === 0 ? (
        <div className="text-center py-14">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <Dumbbell size={28} className="text-gray-300" />
          </div>
          <p className="text-gray-500 font-medium mb-1">No workouts assigned yet</p>
          <p className="text-xs text-gray-400 mb-4">Push a workout from your library to this client</p>
          <button onClick={() => setShowAssign(true)}
            className="px-4 py-2 bg-brand-50 text-brand-600 text-sm font-semibold rounded-xl hover:bg-brand-100 transition-colors">
            + Assign Workout
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {assignments.map(a => (
            <div key={a.id} className="flex items-center gap-3 p-3.5 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors group">
              <div className={clsx('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0',
                a.status === 'completed' ? 'bg-emerald-100' : 'bg-brand-100')}>
                {a.status === 'completed'
                  ? <CheckCircle2 size={16} className="text-emerald-600" />
                  : <Dumbbell size={16} className="text-brand-600" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className={clsx('text-sm font-semibold truncate',
                  a.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-800')}>
                  {a.workout.name}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium', STATUS_STYLES[a.status])}>
                    {a.status.charAt(0).toUpperCase() + a.status.slice(1)}
                  </span>
                  {a.due_date && (
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock size={10} /> Due {new Date(a.due_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                    </span>
                  )}
                  {a.workout.difficulty && (
                    <span className="text-xs text-gray-400">{a.workout.difficulty}</span>
                  )}
                </div>
                {a.notes && <p className="text-xs text-gray-400 italic mt-0.5">{a.notes}</p>}
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                {a.status !== 'completed' && (
                  <button
                    onClick={() => updateStatus.mutate({ id: a.id, status: 'completed', clientId })}
                    disabled={updateStatus.isPending}
                    title="Mark complete"
                    className="p-1.5 rounded-lg hover:bg-emerald-50 text-gray-400 hover:text-emerald-600 transition-colors"
                  >
                    <CheckCircle2 size={14} />
                  </button>
                )}
                {a.status !== 'skipped' && a.status !== 'completed' && (
                  <button
                    onClick={() => updateStatus.mutate({ id: a.id, status: 'skipped', clientId })}
                    disabled={updateStatus.isPending}
                    title="Mark skipped"
                    className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X size={14} />
                  </button>
                )}
                <button
                  onClick={() => remove.mutate({ id: a.id, clientId })}
                  disabled={remove.isPending}
                  title="Remove"
                  className="p-1.5 rounded-lg hover:bg-rose-50 text-gray-300 hover:text-rose-500 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Placeholder tab ──────────────────────────────────────────
function ComingSoon({ label }: { label: string }) {
  return (
    <div className="text-center py-16">
      <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
        <Dumbbell size={28} className="text-gray-300" />
      </div>
      <p className="text-gray-500 font-medium">{label}</p>
      <p className="text-xs text-gray-400 mt-1">Coming soon</p>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────
export default function ClientDetail() {
  const { id } = useParams<{ id: string }>()
  const { data: client, isLoading, error } = useClient(id!)
  const { data: tasks = [], isLoading: loadingTasks } = useTasks(id)
  const toggleTask = useToggleTask()
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [showEdit, setShowEdit] = useState(false)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 size={24} className="animate-spin text-gray-300" />
      </div>
    )
  }

  if (error || !client) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">Client not found.</p>
        <Link to="/clients" className="text-brand-600 mt-2 inline-block hover:underline">Back to clients</Link>
      </div>
    )
  }

  const initials = client.name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
  const pendingTasks = tasks.filter(t => !t.completed).length

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview',  label: 'Overview' },
    { key: 'workouts',  label: 'Workouts' },
    { key: 'nutrition', label: 'Nutrition' },
    { key: 'metrics',   label: 'Metrics' },
    { key: 'notes',     label: 'Notes' },
  ]

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {showEdit && <EditClientModal client={client} onClose={() => setShowEdit(false)} />}

      {/* Back */}
      <Link to="/clients" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">
        <ArrowLeft size={16} />
        Back to Clients
      </Link>

      {/* Profile header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6">
        <div className="flex flex-col sm:flex-row items-start gap-5">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0 shadow-md">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <h2 className="text-2xl font-bold text-gray-900">{client.name}</h2>
              <span className={clsx(
                'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold w-fit',
                client.status === 'active'   && 'bg-emerald-50 text-emerald-700',
                client.status === 'pending'  && 'bg-amber-50 text-amber-700',
                client.status === 'inactive' && 'bg-gray-100 text-gray-600',
              )}>
                <span className={clsx('w-1.5 h-1.5 rounded-full',
                  client.status === 'active'   && 'bg-emerald-500',
                  client.status === 'pending'  && 'bg-amber-500',
                  client.status === 'inactive' && 'bg-gray-400',
                )} />
                {client.status.charAt(0).toUpperCase() + client.status.slice(1)}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-4 mt-2">
              {client.email && (
                <div className="flex items-center gap-1.5 text-sm text-gray-500">
                  <Mail size={14} />{client.email}
                </div>
              )}
              {client.phone && (
                <div className="flex items-center gap-1.5 text-sm text-gray-500">
                  <Phone size={14} />{client.phone}
                </div>
              )}
              <div className="flex items-center gap-1.5 text-sm text-gray-500">
                <Calendar size={14} />
                Joined {new Date(client.joined_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </div>
            </div>
            {client.tags?.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {client.tags.map(tag => (
                  <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                    <Tag size={10} />{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-brand-600 to-violet-600 text-white text-sm font-semibold rounded-xl hover:from-brand-700 hover:to-violet-700 transition-all shadow-sm">
              <MessageSquare size={15} />
              Message
            </button>
            <button
              onClick={() => setShowEdit(true)}
              className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
            >
              <MoreHorizontal size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Status',        value: client.status.charAt(0).toUpperCase() + client.status.slice(1), icon: <span className={clsx('w-3 h-3 rounded-full', client.status === 'active' ? 'bg-emerald-500' : client.status === 'pending' ? 'bg-amber-500' : 'bg-gray-400')} /> },
          { label: 'Category',      value: client.category ?? '—',     icon: <Tag size={16} className="text-brand-500" /> },
          { label: 'Group',         value: client.group_name ?? '—',   icon: <ChevronDown size={16} className="text-violet-500" /> },
          { label: 'Pending Tasks', value: loadingTasks ? '—' : pendingTasks, icon: <Clock size={16} className="text-amber-500" /> },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-card">
            <div className="flex items-center gap-2 mb-1.5">{stat.icon}<span className="text-xs text-gray-500">{stat.label}</span></div>
            <p className="text-lg font-bold text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-card overflow-hidden">
        <div className="border-b border-gray-100">
          <div className="flex overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={clsx(
                  'flex-shrink-0 px-5 py-3.5 text-sm font-medium border-b-2 transition-colors',
                  activeTab === tab.key
                    ? 'border-brand-600 text-brand-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Client info */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-800">Client Info</h3>
                <div className="space-y-1">
                  {[
                    { label: 'Primary Goal', value: client.goal },
                    { label: 'Category',     value: client.category },
                    { label: 'Group',        value: client.group_name },
                    { label: 'Email',        value: client.email },
                    { label: 'Phone',        value: client.phone },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between py-2.5 border-b border-gray-50">
                      <span className="text-sm text-gray-500">{item.label}</span>
                      <span className="text-sm font-medium text-gray-800">{item.value || '—'}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-800">Assigned Program</h3>
                    <button className="flex items-center gap-1 text-xs text-brand-600 font-medium hover:text-brand-700">
                      <Plus size={12} />Assign
                    </button>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 text-center">
                    <Dumbbell size={24} className="mx-auto text-gray-300 mb-2" />
                    <p className="text-sm text-gray-500">No program assigned</p>
                    <button className="mt-1 text-xs text-brand-600 font-medium hover:text-brand-700">
                      Assign a program
                    </button>
                  </div>
                </div>
              </div>

              {/* Tasks */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-800">Tasks</h3>
                  <span className="text-xs font-semibold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">
                    {pendingTasks} pending
                  </span>
                </div>

                {loadingTasks ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 size={18} className="animate-spin text-gray-300" />
                  </div>
                ) : (
                  <>
                    <div className="space-y-2 max-h-72 overflow-y-auto">
                      {tasks.map(task => (
                        <div key={task.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                          <button
                            onClick={() => toggleTask.mutate({ id: task.id, completed: !task.completed })}
                            className={clsx(
                              'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all',
                              task.completed
                                ? 'bg-emerald-500 border-emerald-500 shadow-sm shadow-emerald-200'
                                : 'border-gray-300 hover:border-brand-400',
                            )}
                          >
                            {task.completed && <CheckCircle2 size={11} className="text-white" />}
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className={clsx('text-sm font-medium truncate', task.completed ? 'line-through text-gray-400' : 'text-gray-700')}>
                              {task.title}
                            </p>
                            {task.due_date && (
                              <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                                <Clock size={10} />
                                {new Date(task.due_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                      {tasks.length === 0 && (
                        <p className="text-sm text-gray-400 text-center py-4">No tasks yet</p>
                      )}
                    </div>
                    <AddTaskRow clientId={client.id} />
                  </>
                )}
              </div>
            </div>
          )}

          {activeTab === 'workouts'  && <WorkoutsTab clientId={client.id} />}
          {activeTab === 'nutrition' && <ComingSoon label="Nutrition plans" />}
          {activeTab === 'metrics'   && <ComingSoon label="Client metrics" />}
          {activeTab === 'notes'     && <ComingSoon label="Coach notes" />}
        </div>
      </div>
    </div>
  )
}
