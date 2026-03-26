import { useState } from 'react'
import { CheckSquare, Plus, Trash2, Check, Search, ChevronDown, Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useTasks, useCreateTask, useToggleTask, useDeleteTask } from '@/hooks/useTasks'
import { useClients } from '@/hooks/useClients'
import type { DbTask } from '@/lib/database.types'
import clsx from 'clsx'

type Filter = 'all' | 'pending' | 'completed'

export default function TasksLibrary() {
  const { profile } = useAuth()
  const { data: tasks = [], isLoading } = useTasks()
  const { data: clients = [] } = useClients()
  const createTask = useCreateTask()
  const toggleTask = useToggleTask()
  const deleteTask = useDeleteTask()

  const [filter, setFilter] = useState<Filter>('all')
  const [clientFilter, setClientFilter] = useState<string>('all')
  const [search, setSearch] = useState('')

  // Create form state
  const [title, setTitle] = useState('')
  const [taskType, setTaskType] = useState<DbTask['type']>('general')
  const [dueDate, setDueDate] = useState('')
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
    if (!title.trim()) return
    setCreating(true)
    try {
      await createTask.mutateAsync({
        title: title.trim(),
        client_id: assignTo || undefined,
        type: taskType,
        due_date: dueDate || undefined,
      })
      setTitle('')
      setDueDate('')
      setAssignTo('')
      setTaskType('general')
    } finally {
      setCreating(false)
    }
  }

  const filtered = tasks.filter(t => {
    if (filter === 'pending' && t.completed) return false
    if (filter === 'completed' && !t.completed) return false
    if (clientFilter !== 'all' && t.client_id !== clientFilter) return false
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const pending = tasks.filter(t => !t.completed).length

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-brand-600 flex items-center justify-center">
            <CheckSquare size={18} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
          {pending > 0 && (
            <span className="text-xs font-semibold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-full">
              {pending} pending
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500 ml-12">Create and assign tasks to any client.</p>
      </div>

      {/* Create form */}
      <form onSubmit={handleCreate} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-5 mb-6">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Add New Task</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Task title…"
            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400"
          />
          <select
            value={assignTo}
            onChange={e => setAssignTo(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 bg-white"
          >
            <option value="">No client</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 mt-3">
          <select
            value={taskType}
            onChange={e => setTaskType(e.target.value as DbTask['type'])}
            className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 bg-white"
          >
            {(['general', 'nutrition', 'workout', 'check_in', 'admin'] as DbTask['type'][]).map(t => (
              <option key={t} value={t}>{t.replace('_', ' ')}</option>
            ))}
          </select>
          <input
            type="date"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400"
          />
          <button
            type="submit"
            disabled={!title.trim() || creating}
            className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-sky-600 to-brand-600 rounded-xl hover:from-sky-700 hover:to-brand-700 disabled:opacity-50 transition-all sm:ml-auto"
          >
            {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Add Task
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
            placeholder="Search tasks…"
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'pending', 'completed'] as Filter[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={clsx(
                'px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-colors',
                filter === f
                  ? 'bg-brand-100 text-brand-700'
                  : 'text-gray-500 hover:bg-gray-100'
              )}
            >
              {f}
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
            <option value="">No client</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Task list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-brand-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <CheckSquare size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No tasks found</p>
          <p className="text-xs mt-1">Create a task above to get started.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(task => (
            <TaskRow
              key={task.id}
              task={task}
              clientName={(task as any).clients?.name ?? null}
              onToggle={() => toggleTask.mutate({ id: task.id, completed: !task.completed })}
              onDelete={() => deleteTask.mutate(task.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function TaskRow({
  task,
  clientName,
  onToggle,
  onDelete,
}: {
  task: DbTask
  clientName: string | null
  onToggle: () => void
  onDelete: () => void
}) {
  const typeColors: Record<string, string> = {
    general: 'bg-gray-100 text-gray-600',
    nutrition: 'bg-emerald-100 text-emerald-700',
    workout: 'bg-blue-100 text-blue-700',
    check_in: 'bg-violet-100 text-violet-700',
    admin: 'bg-amber-100 text-amber-700',
  }

  return (
    <div className={clsx(
      'flex items-center gap-3 p-4 bg-white rounded-xl border transition-all',
      task.completed ? 'border-gray-100 opacity-60' : 'border-gray-200 shadow-sm hover:border-brand-200'
    )}>
      <button
        onClick={onToggle}
        className={clsx(
          'flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all',
          task.completed
            ? 'bg-emerald-500 border-emerald-500'
            : 'border-gray-300 hover:border-brand-400'
        )}
      >
        {task.completed && <Check size={11} className="text-white" strokeWidth={3} />}
      </button>

      <div className="flex-1 min-w-0">
        <p className={clsx('text-sm font-medium truncate', task.completed && 'line-through text-gray-400')}>
          {task.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className={clsx('text-[10px] font-semibold px-1.5 py-0.5 rounded capitalize', typeColors[task.type] ?? typeColors.general)}>
            {task.type.replace('_', ' ')}
          </span>
          {clientName && (
            <span className="text-xs text-gray-400">{clientName}</span>
          )}
          {task.due_date && (
            <span className="text-xs text-gray-400">
              Due {new Date(task.due_date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>
      </div>

      <button
        onClick={onDelete}
        className="flex-shrink-0 p-1.5 rounded-lg text-gray-300 hover:text-rose-500 hover:bg-rose-50 transition-colors"
      >
        <Trash2 size={14} />
      </button>
    </div>
  )
}
