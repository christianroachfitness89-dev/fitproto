import { useState } from 'react'
import {
  Users, TrendingUp, MessageSquare, CheckCircle2, Clock,
  ChevronRight, ArrowUpRight, Loader2, UserPlus, CalendarClock,
  Calendar, LayoutDashboard,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { useAuth } from '@/contexts/AuthContext'
import { useClients } from '@/hooks/useClients'
import { useTasks, useToggleTask, useCreateTask } from '@/hooks/useTasks'
import { useConversations } from '@/hooks/useConversations'
import { useLeads } from '@/hooks/useLeads'
import type { LeadStatus } from '@/lib/database.types'

type Tab = 'overview' | 'clients' | 'leads' | 'messages'

// ─── Stat card ────────────────────────────────────────────────
function StatCard({ label, value, sub, icon, gradient, iconBg, trend }: {
  label: string; value: string | number; sub?: string
  icon: React.ReactNode; gradient: string; iconBg: string; trend?: number
}) {
  return (
    <div className={clsx('rounded-2xl p-5 text-white relative overflow-hidden shadow-card-lg', gradient)}>
      <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-white/10" />
      <div className="absolute -right-1 -bottom-6 w-16 h-16 rounded-full bg-white/5" />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-white/70 uppercase tracking-wider">{label}</p>
          <p className="text-3xl font-bold mt-1.5 tracking-tight">{value}</p>
          {sub && <p className="text-xs text-white/60 mt-0.5">{sub}</p>}
        </div>
        <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center', iconBg)}>{icon}</div>
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

// ─── Mini stat chip ───────────────────────────────────────────
function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-gray-50 rounded-xl px-4 py-3 text-center">
      <p className={clsx('text-2xl font-bold', color)}>{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  )
}

// ─── Add task inline form ─────────────────────────────────────
function AddTaskRow() {
  const [open, setOpen]   = useState(false)
  const [title, setTitle] = useState('')
  const create = useCreateTask()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    await create.mutateAsync({ title })
    setTitle('')
    setOpen(false)
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="w-full text-center text-sm text-brand-600 font-semibold hover:text-brand-700 transition-colors py-3 border-t border-gray-50">
        + Add new task
      </button>
    )
  }
  return (
    <form onSubmit={submit} className="px-5 py-3 border-t border-gray-50 flex gap-2">
      <input autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder="Task title..."
        className="flex-1 text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400" />
      <button type="submit" disabled={create.isPending}
        className="px-3 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-60">
        {create.isPending ? <Loader2 size={14} className="animate-spin" /> : 'Add'}
      </button>
      <button type="button" onClick={() => setOpen(false)} className="px-3 py-2 text-gray-500 text-sm hover:text-gray-700">
        Cancel
      </button>
    </form>
  )
}

// ─── Shared sub-components ────────────────────────────────────
function ClientRow({ client }: { client: any }) {
  const initials = client.name.split(' ').map((p: string) => p[0]).join('').slice(0, 2).toUpperCase()
  return (
    <Link to={`/clients/${client.id}`}
      className="flex items-center gap-3.5 px-5 py-3.5 hover:bg-surface-50 transition-colors group">
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm">
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 truncate group-hover:text-brand-700 transition-colors">{client.name}</p>
        <p className="text-xs text-gray-400 truncate">{client.goal ?? client.email ?? 'No goal set'}</p>
      </div>
      <div className={clsx('w-2 h-2 rounded-full flex-shrink-0',
        client.status === 'active' ? 'bg-emerald-400' : client.status === 'pending' ? 'bg-amber-400' : 'bg-gray-300')} />
    </Link>
  )
}

function TaskRow({ task, onToggle }: { task: any; onToggle: () => void }) {
  return (
    <div className="flex items-center gap-3.5 px-5 py-3.5 hover:bg-surface-50 transition-colors">
      <button onClick={onToggle}
        className={clsx('w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all',
          task.completed ? 'bg-emerald-500 border-emerald-500 shadow-sm shadow-emerald-200' : 'border-gray-200 hover:border-brand-400')}>
        {task.completed && <CheckCircle2 size={11} className="text-white" />}
      </button>
      <div className="flex-1 min-w-0">
        <p className={clsx('text-sm font-medium truncate', task.completed ? 'line-through text-gray-300' : 'text-gray-800')}>
          {task.title}
        </p>
        <p className="text-xs text-gray-400 truncate">{task.clients?.name ?? 'General'}</p>
      </div>
      {task.due_date && (
        <div className="flex items-center gap-1 text-xs text-gray-400 flex-shrink-0 bg-gray-50 px-2 py-1 rounded-lg">
          <Clock size={11} />
          {new Date(task.due_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
        </div>
      )}
    </div>
  )
}

function ConsultRow({ lead }: { lead: any }) {
  return (
    <Link to="/leads"
      className="flex items-center gap-3.5 px-5 py-3.5 hover:bg-surface-50 transition-colors group">
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm">
        {lead.name.split(' ').map((p: string) => p[0]).join('').slice(0, 2).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 truncate group-hover:text-brand-700 transition-colors">{lead.name}</p>
        <p className="text-xs text-gray-400 truncate">{lead.email ?? lead.phone ?? 'No contact'}</p>
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <span className="text-xs font-semibold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-lg">
          {new Date(lead.consult_scheduled_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
        </span>
        {lead.consult_calendar_booked && (
          <span className="text-[10px] text-emerald-600 flex items-center gap-0.5">
            <CheckCircle2 size={9} /> In calendar
          </span>
        )}
      </div>
    </Link>
  )
}

function ConvoRow({ conv }: { conv: any }) {
  const initials = conv.clients.name.split(' ').map((p: string) => p[0]).join('').slice(0, 2).toUpperCase()
  return (
    <Link to="/inbox"
      className="flex items-center gap-3.5 px-5 py-3.5 hover:bg-surface-50 transition-colors group">
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm">
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 group-hover:text-brand-700 transition-colors">{conv.clients.name}</p>
        <p className="text-xs text-gray-500 truncate">{conv.latest_message?.content ?? 'No messages yet'}</p>
      </div>
      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
        {conv.last_message_at && (
          <p className="text-xs text-gray-400">{new Date(conv.last_message_at).toLocaleDateString()}</p>
        )}
        {conv.unread_count > 0 && (
          <span className="w-4 h-4 rounded-full bg-brand-500 text-white text-[10px] font-bold flex items-center justify-center">
            {conv.unread_count}
          </span>
        )}
      </div>
    </Link>
  )
}

function Card({ header, children }: { header: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-card">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">{header}</div>
      {children}
    </div>
  )
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="font-semibold text-gray-900 text-sm">{children}</h3>
}

function ViewAllLink({ to, label = 'View all' }: { to: string; label?: string }) {
  return (
    <Link to={to} className="text-brand-600 text-xs font-semibold hover:text-brand-700 flex items-center gap-0.5">
      {label} <ChevronRight size={13} />
    </Link>
  )
}

function EmptyState({ icon, text, linkTo, linkLabel }: { icon: React.ReactNode; text: string; linkTo?: string; linkLabel?: string }) {
  return (
    <div className="text-center py-10 text-gray-400">
      <div className="opacity-20 flex justify-center mb-2">{icon}</div>
      <p className="text-sm font-medium">{text}</p>
      {linkTo && linkLabel && (
        <Link to={linkTo} className="text-xs text-brand-600 mt-1 block hover:underline">{linkLabel}</Link>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────
export default function Dashboard() {
  const { profile } = useAuth()
  const [tab, setTab] = useState<Tab>('overview')

  const { data: clients = [], isLoading: loadingClients }  = useClients()
  const { data: tasks = [],   isLoading: loadingTasks }    = useTasks()
  const { data: convos = [],  isLoading: loadingMessages } = useConversations()
  const { data: leads = [],   isLoading: loadingLeads }    = useLeads()
  const toggleTask = useToggleTask()

  // Derived values
  const activeClients  = clients.filter(c => c.status === 'active').length
  const pendingClients = clients.filter(c => c.status === 'pending').length
  const inactiveClients = clients.filter(c => c.status === 'inactive').length
  const pendingTasks   = tasks.filter(t => !t.completed).length
  const unreadMessages = convos.reduce((sum, c) => sum + c.unread_count, 0)

  const activeLeads    = leads.filter(l => l.status !== 'converted' && l.status !== 'lost')
  const newLeadsCount  = leads.filter(l => l.status === 'new').length
  const convertedLeads = leads.filter(l => l.status === 'converted').length

  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
  const todayEnd   = new Date(); todayEnd.setHours(23, 59, 59, 999)
  const todayConsults = leads
    .filter(l => {
      if (!l.consult_scheduled_at) return false
      const d = new Date(l.consult_scheduled_at)
      return d >= todayStart && d <= todayEnd
    })
    .sort((a, b) => new Date(a.consult_scheduled_at!).getTime() - new Date(b.consult_scheduled_at!).getTime())

  const PIPELINE_STAGES: { status: LeadStatus; label: string; color: string; bar: string }[] = [
    { status: 'new',               label: 'New',          color: 'text-gray-600',    bar: 'bg-gray-400'    },
    { status: 'called',            label: 'Called',        color: 'text-sky-600',     bar: 'bg-sky-400'     },
    { status: 'booked',            label: 'Booked',        color: 'text-violet-600',  bar: 'bg-violet-400'  },
    { status: 'preq_completed',    label: 'PreQ Done',     color: 'text-indigo-600',  bar: 'bg-indigo-400'  },
    { status: 'consult_completed', label: 'Consult Done',  color: 'text-amber-600',   bar: 'bg-amber-400'   },
    { status: 'converted',         label: 'Converted',     color: 'text-emerald-600', bar: 'bg-emerald-500' },
  ]
  const pipelineCounts = PIPELINE_STAGES.reduce((acc, s) => {
    acc[s.status] = leads.filter(l => l.status === s.status).length
    return acc
  }, {} as Record<string, number>)

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  })()
  const firstName = profile?.full_name?.split(' ')[0] ?? 'Coach'

  const TABS: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'overview',  label: 'Overview',  icon: <LayoutDashboard size={14} /> },
    { id: 'clients',   label: 'Clients',   icon: <Users size={14} />,         badge: activeClients || undefined },
    { id: 'leads',     label: 'Leads',     icon: <UserPlus size={14} />,      badge: todayConsults.length || undefined },
    { id: 'messages',  label: 'Messages',  icon: <MessageSquare size={14} />, badge: unreadMessages || undefined },
  ]

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 px-6 pt-5 pb-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">{greeting}, {firstName} 👋</h2>
            <p className="text-gray-500 text-sm mt-0.5">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
          {todayConsults.length > 0 && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-violet-50 border border-violet-200 rounded-xl text-sm text-violet-700 font-medium">
              <CalendarClock size={15} className="text-violet-500" />
              {todayConsults.length} consult{todayConsults.length > 1 ? 's' : ''} today
            </div>
          )}
        </div>

        {/* Tab bar */}
        <div className="flex gap-1">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={clsx(
                'flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-xl border-b-2 transition-all relative',
                tab === t.id
                  ? 'text-brand-600 border-brand-600 bg-brand-50/50'
                  : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50'
              )}
            >
              {t.icon}
              {t.label}
              {t.badge !== undefined && (
                <span className={clsx(
                  'text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 leading-none',
                  tab === t.id ? 'bg-brand-600 text-white' : 'bg-gray-200 text-gray-600'
                )}>
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ─────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">

        {/* ────────── OVERVIEW ────────── */}
        {tab === 'overview' && (
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <StatCard label="Total Clients" value={loadingClients ? '—' : clients.length}
                sub={loadingClients ? undefined : `${activeClients} active`}
                icon={<Users size={20} className="text-white" />}
                gradient="bg-gradient-to-br from-brand-500 to-violet-600" iconBg="bg-white/20" />
              <StatCard label="Active Leads" value={loadingLeads ? '—' : activeLeads.length}
                sub={loadingLeads ? undefined : `${newLeadsCount} new`}
                icon={<UserPlus size={20} className="text-white" />}
                gradient="bg-gradient-to-br from-violet-500 to-purple-600" iconBg="bg-white/20" />
              <StatCard label="Pending Tasks" value={loadingTasks ? '—' : pendingTasks}
                sub={loadingTasks ? undefined : `${tasks.length} total`}
                icon={<TrendingUp size={20} className="text-white" />}
                gradient="bg-gradient-to-br from-amber-500 to-orange-500" iconBg="bg-white/20" />
              <StatCard label="Unread Messages" value={loadingMessages ? '—' : unreadMessages}
                sub={loadingMessages ? undefined : `${convos.length} conversations`}
                icon={<MessageSquare size={20} className="text-white" />}
                gradient="bg-gradient-to-br from-rose-500 to-pink-600" iconBg="bg-white/20" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Today's Consults */}
              <Card header={
                <>
                  <div className="flex items-center gap-2">
                    <CalendarClock size={15} className="text-violet-500" />
                    <CardTitle>Today's Consults</CardTitle>
                    {todayConsults.length > 0 && (
                      <span className="text-[10px] font-bold text-white bg-violet-500 rounded-full px-1.5 py-0.5 leading-none">{todayConsults.length}</span>
                    )}
                  </div>
                  <ViewAllLink to="/leads" />
                </>
              }>
                {loadingLeads
                  ? <div className="flex justify-center py-8"><Loader2 size={18} className="animate-spin text-gray-300" /></div>
                  : todayConsults.length === 0
                    ? <EmptyState icon={<Calendar size={28} />} text="No consults today" />
                    : <div className="divide-y divide-gray-50">{todayConsults.map(l => <ConsultRow key={l.id} lead={l} />)}</div>
                }
              </Card>

              {/* Recent Clients */}
              <Card header={<><CardTitle>Recent Clients</CardTitle><ViewAllLink to="/clients" /></>}>
                {loadingClients
                  ? <div className="flex justify-center py-8"><Loader2 size={18} className="animate-spin text-gray-300" /></div>
                  : clients.length === 0
                    ? <EmptyState icon={<Users size={28} />} text="No clients yet" linkTo="/clients" linkLabel="Add your first client" />
                    : <div className="divide-y divide-gray-50">{clients.slice(0, 4).map(c => <ClientRow key={c.id} client={c} />)}</div>
                }
              </Card>

              {/* Tasks */}
              <Card header={<><CardTitle>Upcoming Tasks</CardTitle><span className="text-xs font-semibold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">{pendingTasks} pending</span></>}>
                {loadingTasks
                  ? <div className="flex justify-center py-8"><Loader2 size={18} className="animate-spin text-gray-300" /></div>
                  : <>
                    <div className="divide-y divide-gray-50 max-h-56 overflow-y-auto">
                      {tasks.slice(0, 6).map(t => (
                        <TaskRow key={t.id} task={t} onToggle={() => toggleTask.mutate({ id: t.id, completed: !t.completed })} />
                      ))}
                      {tasks.length === 0 && <EmptyState icon={<TrendingUp size={24} />} text="No tasks yet" />}
                    </div>
                    <AddTaskRow />
                  </>
                }
              </Card>
            </div>
          </div>
        )}

        {/* ────────── CLIENTS ────────── */}
        {tab === 'clients' && (
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Mini stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <MiniStat label="Total"    value={clients.length}  color="text-brand-600" />
              <MiniStat label="Active"   value={activeClients}   color="text-emerald-600" />
              <MiniStat label="Pending"  value={pendingClients}  color="text-amber-600" />
              <MiniStat label="Inactive" value={inactiveClients} color="text-gray-400" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* All clients */}
              <Card header={<><CardTitle>All Clients</CardTitle><ViewAllLink to="/clients" /></>}>
                {loadingClients
                  ? <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-gray-300" /></div>
                  : clients.length === 0
                    ? <EmptyState icon={<Users size={32} />} text="No clients yet" linkTo="/clients" linkLabel="Add your first client" />
                    : <div className="divide-y divide-gray-50 max-h-[520px] overflow-y-auto">
                        {clients.map(c => <ClientRow key={c.id} client={c} />)}
                      </div>
                }
              </Card>

              {/* Tasks */}
              <Card header={<><CardTitle>Tasks</CardTitle><span className="text-xs font-semibold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">{pendingTasks} pending</span></>}>
                {loadingTasks
                  ? <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-gray-300" /></div>
                  : <>
                    <div className="divide-y divide-gray-50 max-h-[520px] overflow-y-auto">
                      {tasks.map(t => (
                        <TaskRow key={t.id} task={t} onToggle={() => toggleTask.mutate({ id: t.id, completed: !t.completed })} />
                      ))}
                      {tasks.length === 0 && <EmptyState icon={<TrendingUp size={24} />} text="No tasks yet" />}
                    </div>
                    <AddTaskRow />
                  </>
                }
              </Card>
            </div>
          </div>
        )}

        {/* ────────── LEADS ────────── */}
        {tab === 'leads' && (
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Mini stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <MiniStat label="Active"         value={activeLeads.length}    color="text-brand-600" />
              <MiniStat label="New"             value={newLeadsCount}         color="text-indigo-600" />
              <MiniStat label="Consults Today"  value={todayConsults.length}  color="text-violet-600" />
              <MiniStat label="Converted"       value={convertedLeads}        color="text-emerald-600" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Today's Consults */}
              <Card header={
                <>
                  <div className="flex items-center gap-2">
                    <CalendarClock size={15} className="text-violet-500" />
                    <CardTitle>Today's Consults</CardTitle>
                    {todayConsults.length > 0 && (
                      <span className="text-[10px] font-bold text-white bg-violet-500 rounded-full px-1.5 py-0.5 leading-none">{todayConsults.length}</span>
                    )}
                  </div>
                  <ViewAllLink to="/leads" />
                </>
              }>
                {loadingLeads
                  ? <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-gray-300" /></div>
                  : todayConsults.length === 0
                    ? <EmptyState icon={<Calendar size={32} />} text="No consults scheduled today" />
                    : <div className="divide-y divide-gray-50">{todayConsults.map(l => <ConsultRow key={l.id} lead={l} />)}</div>
                }
              </Card>

              {/* Lead Pipeline */}
              <Card header={
                <><div className="flex items-center gap-2"><UserPlus size={15} className="text-brand-500" /><CardTitle>Pipeline</CardTitle></div><ViewAllLink to="/leads" /></>
              }>
                {loadingLeads
                  ? <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-gray-300" /></div>
                  : leads.length === 0
                    ? <EmptyState icon={<UserPlus size={32} />} text="No leads yet" linkTo="/leads" linkLabel="Add your first lead" />
                    : <div className="px-5 py-5 space-y-3">
                        {PIPELINE_STAGES.map(s => {
                          const count = pipelineCounts[s.status] ?? 0
                          const max = Math.max(...PIPELINE_STAGES.map(st => pipelineCounts[st.status] ?? 0), 1)
                          return (
                            <div key={s.status} className="flex items-center gap-3">
                              <p className={clsx('text-xs font-semibold w-28 flex-shrink-0', s.color)}>{s.label}</p>
                              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div className={clsx('h-full rounded-full transition-all duration-500', s.bar)}
                                  style={{ width: count === 0 ? '0%' : `${Math.max(Math.round((count / max) * 100), 4)}%` }} />
                              </div>
                              <span className="text-xs font-bold text-gray-700 w-6 text-right flex-shrink-0">{count}</span>
                            </div>
                          )
                        })}
                        <div className="pt-2 border-t border-gray-50 flex items-center justify-between text-xs text-gray-400">
                          <span>{activeLeads.length} active</span>
                          <span>{leads.filter(l => l.status === 'lost').length} lost</span>
                        </div>
                      </div>
                }
              </Card>
            </div>
          </div>
        )}

        {/* ────────── MESSAGES ────────── */}
        {tab === 'messages' && (
          <div className="max-w-3xl mx-auto">
            <Card header={
              <>
                <CardTitle>All Conversations</CardTitle>
                <div className="flex items-center gap-2">
                  {unreadMessages > 0 && (
                    <span className="text-xs font-bold text-white bg-brand-500 rounded-full px-2 py-0.5 leading-none">{unreadMessages} unread</span>
                  )}
                  <ViewAllLink to="/inbox" label="Open inbox" />
                </div>
              </>
            }>
              {loadingMessages
                ? <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-gray-300" /></div>
                : convos.length === 0
                  ? <EmptyState icon={<MessageSquare size={32} />} text="No messages yet" />
                  : <div className="divide-y divide-gray-50">
                      {convos.map(c => <ConvoRow key={c.id} conv={c} />)}
                    </div>
              }
            </Card>
          </div>
        )}

      </div>
    </div>
  )
}
