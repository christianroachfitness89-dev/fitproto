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

// ─── Stat card ─────────────────────────────────────────────────
function StatCard({ label, value, sub, icon, accent, trend }: {
  label: string
  value: string | number
  sub?: string
  icon: React.ReactNode
  accent: string
  trend?: number
}) {
  return (
    <div className="relative bg-[#161b27] rounded-2xl p-5 border border-[#242d40] hover:border-[#2e3a52] transition-all duration-200 overflow-hidden group">
      {/* Left accent bar */}
      <div className={clsx('absolute left-0 top-4 bottom-4 w-[3px] rounded-r-full', accent)} />

      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/5 border border-white/10">
          {icon}
        </div>
        {trend !== undefined && (
          <div className="flex items-center gap-1 text-emerald-400 bg-emerald-400/10 rounded-lg px-2 py-1">
            <ArrowUpRight size={10} />
            <span className="text-[11px] font-bold">+{trend}%</span>
          </div>
        )}
      </div>

      <p className="text-[2.25rem] font-black text-[#e8edf5] tracking-tight tabular-nums leading-none"
        style={{ fontFamily: "'Syne', system-ui, sans-serif" }}>
        {value}
      </p>
      <p className="text-[10px] font-bold uppercase tracking-widest text-[#3a4a62] mt-2">{label}</p>
      {sub && <p className="text-xs text-[#4a5a75] mt-0.5">{sub}</p>}
    </div>
  )
}

// ─── Mini stat ─────────────────────────────────────────────────
function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-[#161b27] border border-[#242d40] rounded-xl px-4 py-3 text-center">
      <p className={clsx('text-2xl font-black tabular-nums leading-none', color)}
        style={{ fontFamily: "'Syne', system-ui, sans-serif" }}>{value}</p>
      <p className="text-[10px] uppercase tracking-wider font-bold text-[#3a4a62] mt-1.5">{label}</p>
    </div>
  )
}

// ─── Add task row ───────────────────────────────────────────────
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
        className="w-full text-center text-[10px] font-bold uppercase tracking-widest text-[#3a4a62] hover:text-amber-400 transition-colors py-3 border-t border-[#1e2535]">
        + Add task
      </button>
    )
  }
  return (
    <form onSubmit={submit} className="px-5 py-3 border-t border-[#1e2535] flex gap-2">
      <input autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder="Task title..."
        className="flex-1 text-sm px-3 py-2 bg-[#1e2535] border border-[#2e3a52] text-[#c5cedb] placeholder-[#3a4a62] rounded-lg focus:outline-none focus:border-amber-400/50" />
      <button type="submit" disabled={create.isPending}
        className="px-3 py-2 bg-amber-400 text-[#0d1117] text-sm font-black rounded-lg hover:bg-amber-300 disabled:opacity-60 transition-colors">
        {create.isPending ? <Loader2 size={14} className="animate-spin" /> : 'Add'}
      </button>
      <button type="button" onClick={() => setOpen(false)}
        className="px-3 py-2 text-[#3a4a62] text-sm hover:text-[#8a9ab5] transition-colors">
        Cancel
      </button>
    </form>
  )
}

// ─── Row components ────────────────────────────────────────────
function ClientRow({ client }: { client: any }) {
  const initials = client.name.split(' ').map((p: string) => p[0]).join('').slice(0, 2).toUpperCase()
  return (
    <Link to={`/clients/${client.id}`}
      className="flex items-center gap-3.5 px-5 py-3.5 hover:bg-white/[0.03] transition-colors group border-b border-[#1e2535] last:border-0">
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-[#0d1117] text-[11px] font-black flex-shrink-0">
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[#c5cedb] truncate group-hover:text-amber-400 transition-colors">{client.name}</p>
        <p className="text-xs text-[#4a5a75] truncate">{client.goal ?? client.email ?? 'No goal set'}</p>
      </div>
      <div className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0',
        client.status === 'active' ? 'bg-emerald-400' : client.status === 'pending' ? 'bg-amber-400' : 'bg-[#2a3548]')} />
    </Link>
  )
}

function TaskRow({ task, onToggle }: { task: any; onToggle: () => void }) {
  return (
    <div className="flex items-center gap-3.5 px-5 py-3.5 hover:bg-white/[0.03] transition-colors border-b border-[#1e2535] last:border-0">
      <button onClick={onToggle}
        className={clsx('w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all',
          task.completed ? 'bg-emerald-400 border-emerald-400' : 'border-[#2e3a52] hover:border-amber-400')}>
        {task.completed && <CheckCircle2 size={10} className="text-[#0d1117]" />}
      </button>
      <div className="flex-1 min-w-0">
        <p className={clsx('text-sm font-medium truncate',
          task.completed ? 'line-through text-[#2e3a52]' : 'text-[#c5cedb]')}>
          {task.title}
        </p>
        <p className="text-xs text-[#4a5a75] truncate">{task.clients?.name ?? 'General'}</p>
      </div>
      {task.due_date && (
        <div className="flex items-center gap-1 text-xs text-[#4a5a75] flex-shrink-0 bg-[#1e2535] px-2 py-1 rounded-lg">
          <Clock size={10} />
          {new Date(task.due_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
        </div>
      )}
    </div>
  )
}

function ConsultRow({ lead }: { lead: any }) {
  return (
    <Link to="/leads"
      className="flex items-center gap-3.5 px-5 py-3.5 hover:bg-white/[0.03] transition-colors group border-b border-[#1e2535] last:border-0">
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center text-white text-[11px] font-black flex-shrink-0">
        {lead.name.split(' ').map((p: string) => p[0]).join('').slice(0, 2).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[#c5cedb] truncate group-hover:text-amber-400 transition-colors">{lead.name}</p>
        <p className="text-xs text-[#4a5a75] truncate">{lead.email ?? lead.phone ?? 'No contact'}</p>
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <span className="text-xs font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-lg tabular-nums">
          {new Date(lead.consult_scheduled_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
        </span>
        {lead.consult_calendar_booked && (
          <span className="text-[10px] text-emerald-400 flex items-center gap-0.5">
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
      className="flex items-center gap-3.5 px-5 py-3.5 hover:bg-white/[0.03] transition-colors group border-b border-[#1e2535] last:border-0">
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-[#0d1117] text-[11px] font-black flex-shrink-0">
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[#c5cedb] group-hover:text-amber-400 transition-colors">{conv.clients.name}</p>
        <p className="text-xs text-[#4a5a75] truncate">{conv.latest_message?.content ?? 'No messages yet'}</p>
      </div>
      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
        {conv.last_message_at && (
          <p className="text-xs text-[#3a4a62] tabular-nums">{new Date(conv.last_message_at).toLocaleDateString()}</p>
        )}
        {conv.unread_count > 0 && (
          <span className="w-5 h-5 rounded-full bg-amber-400 text-[#0d1117] text-[10px] font-black flex items-center justify-center">
            {conv.unread_count}
          </span>
        )}
      </div>
    </Link>
  )
}

// ─── Card shell ────────────────────────────────────────────────
function Card({ header, children }: { header: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-[#161b27] rounded-2xl border border-[#242d40] overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#1e2535]">
        {header}
      </div>
      {children}
    </div>
  )
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="font-bold text-[#b0bccc] text-sm tracking-tight">{children}</h3>
}

function ViewAllLink({ to, label = 'View all' }: { to: string; label?: string }) {
  return (
    <Link to={to} className="text-amber-400/60 text-xs font-bold hover:text-amber-400 flex items-center gap-0.5 transition-colors uppercase tracking-wider">
      {label} <ChevronRight size={11} />
    </Link>
  )
}

function EmptyState({ icon, text, linkTo, linkLabel }: {
  icon: React.ReactNode; text: string; linkTo?: string; linkLabel?: string
}) {
  return (
    <div className="text-center py-10">
      <div className="opacity-20 flex justify-center mb-2 text-[#8a9ab5]">{icon}</div>
      <p className="text-sm font-medium text-[#3a4a62]">{text}</p>
      {linkTo && linkLabel && (
        <Link to={linkTo} className="text-xs text-amber-400/60 mt-1 block hover:text-amber-400 transition-colors">{linkLabel}</Link>
      )}
    </div>
  )
}

function DotAccent({ color }: { color: string }) {
  return <span className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', color)} />
}

// ─── Main page ─────────────────────────────────────────────────
export default function Dashboard() {
  const { profile } = useAuth()
  const [tab, setTab] = useState<Tab>('overview')

  const { data: clients = [], isLoading: loadingClients }  = useClients()
  const { data: tasks = [],   isLoading: loadingTasks }    = useTasks()
  const { data: convos = [],  isLoading: loadingMessages } = useConversations()
  const { data: leads = [],   isLoading: loadingLeads }    = useLeads()
  const toggleTask = useToggleTask()

  const activeClients   = clients.filter(c => c.status === 'active').length
  const pendingClients  = clients.filter(c => c.status === 'pending').length
  const inactiveClients = clients.filter(c => c.status === 'inactive').length
  const pendingTasks    = tasks.filter(t => !t.completed).length
  const unreadMessages  = convos.reduce((sum, c) => sum + c.unread_count, 0)

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

  const PIPELINE_STAGES: { status: LeadStatus; label: string; bar: string }[] = [
    { status: 'new',               label: 'New',          bar: 'bg-slate-400'   },
    { status: 'called',            label: 'Called',        bar: 'bg-sky-400'     },
    { status: 'booked',            label: 'Booked',        bar: 'bg-violet-400'  },
    { status: 'preq_completed',    label: 'PreQ Done',     bar: 'bg-indigo-400'  },
    { status: 'consult_completed', label: 'Consult Done',  bar: 'bg-amber-400'   },
    { status: 'converted',         label: 'Converted',     bar: 'bg-emerald-400' },
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
    { id: 'overview',  label: 'Overview',  icon: <LayoutDashboard size={13} /> },
    { id: 'clients',   label: 'Clients',   icon: <Users size={13} />,          badge: activeClients || undefined },
    { id: 'leads',     label: 'Leads',     icon: <UserPlus size={13} />,       badge: todayConsults.length || undefined },
    { id: 'messages',  label: 'Messages',  icon: <MessageSquare size={13} />,  badge: unreadMessages || undefined },
  ]

  return (
    <div className="flex flex-col h-full bg-[#0d1117]">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="bg-[#0d1117] border-b border-[#1e2535] px-6 pt-6 pb-0 flex-shrink-0">
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#2e3a52] mb-1.5">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
            <h1 className="text-[1.75rem] font-black text-[#e8edf5] tracking-tight leading-none"
              style={{ fontFamily: "'Syne', system-ui, sans-serif" }}>
              {greeting}, {firstName}
            </h1>
          </div>
          {todayConsults.length > 0 && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-amber-400/10 border border-amber-400/20 rounded-xl">
              <CalendarClock size={14} className="text-amber-400" />
              <span className="text-xs font-bold text-amber-400">
                {todayConsults.length} consult{todayConsults.length > 1 ? 's' : ''} today
              </span>
            </div>
          )}
        </div>

        {/* Tab bar */}
        <div className="flex gap-0.5">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={clsx(
                'flex items-center gap-2 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-t-xl transition-all border-b-2',
                tab === t.id
                  ? 'text-amber-400 border-amber-400 bg-amber-400/5'
                  : 'text-[#2e3a52] border-transparent hover:text-[#6a7a95]'
              )}
            >
              {t.icon}
              {t.label}
              {t.badge !== undefined && (
                <span className={clsx(
                  'text-[9px] font-black rounded-full min-w-[15px] h-[15px] flex items-center justify-center px-1 leading-none',
                  tab === t.id ? 'bg-amber-400 text-[#0d1117]' : 'bg-[#1e2535] text-[#4a5a75]'
                )}>
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">

        {/* ─── OVERVIEW ─── */}
        {tab === 'overview' && (
          <div className="max-w-7xl mx-auto space-y-5">

            {/* Stat grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <StatCard label="Total Clients" value={loadingClients ? '—' : clients.length}
                sub={loadingClients ? undefined : `${activeClients} active`}
                icon={<Users size={17} className="text-amber-400" />}
                accent="bg-amber-400" />
              <StatCard label="Active Leads" value={loadingLeads ? '—' : activeLeads.length}
                sub={loadingLeads ? undefined : `${newLeadsCount} new`}
                icon={<UserPlus size={17} className="text-emerald-400" />}
                accent="bg-emerald-400" />
              <StatCard label="Pending Tasks" value={loadingTasks ? '—' : pendingTasks}
                sub={loadingTasks ? undefined : `${tasks.length} total`}
                icon={<TrendingUp size={17} className="text-rose-400" />}
                accent="bg-rose-400" />
              <StatCard label="Unread" value={loadingMessages ? '—' : unreadMessages}
                sub={loadingMessages ? undefined : `${convos.length} conversations`}
                icon={<MessageSquare size={17} className="text-violet-400" />}
                accent="bg-violet-400" />
            </div>

            {/* Cards row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

              {/* Today's Consults */}
              <Card header={
                <>
                  <div className="flex items-center gap-2">
                    <DotAccent color="bg-amber-400" />
                    <CardTitle>Today's Consults</CardTitle>
                    {todayConsults.length > 0 && (
                      <span className="text-[10px] font-black text-amber-400 bg-amber-400/10 rounded-full px-1.5 py-0.5 leading-none">
                        {todayConsults.length}
                      </span>
                    )}
                  </div>
                  <ViewAllLink to="/leads" />
                </>
              }>
                {loadingLeads
                  ? <div className="flex justify-center py-8"><Loader2 size={18} className="animate-spin text-[#2e3a52]" /></div>
                  : todayConsults.length === 0
                    ? <EmptyState icon={<Calendar size={28} />} text="No consults today" />
                    : <div>{todayConsults.map(l => <ConsultRow key={l.id} lead={l} />)}</div>
                }
              </Card>

              {/* Recent Clients */}
              <Card header={
                <>
                  <div className="flex items-center gap-2">
                    <DotAccent color="bg-amber-400" />
                    <CardTitle>Recent Clients</CardTitle>
                  </div>
                  <ViewAllLink to="/clients" />
                </>
              }>
                {loadingClients
                  ? <div className="flex justify-center py-8"><Loader2 size={18} className="animate-spin text-[#2e3a52]" /></div>
                  : clients.length === 0
                    ? <EmptyState icon={<Users size={28} />} text="No clients yet" linkTo="/clients" linkLabel="Add your first client" />
                    : <div>{clients.slice(0, 4).map(c => <ClientRow key={c.id} client={c} />)}</div>
                }
              </Card>

              {/* Tasks */}
              <Card header={
                <>
                  <div className="flex items-center gap-2">
                    <DotAccent color="bg-rose-400" />
                    <CardTitle>Upcoming Tasks</CardTitle>
                  </div>
                  <span className="text-[10px] font-black text-rose-400 bg-rose-400/10 px-2 py-0.5 rounded-full leading-none">
                    {pendingTasks} pending
                  </span>
                </>
              }>
                {loadingTasks
                  ? <div className="flex justify-center py-8"><Loader2 size={18} className="animate-spin text-[#2e3a52]" /></div>
                  : <>
                    <div className="max-h-56 overflow-y-auto">
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

        {/* ─── CLIENTS ─── */}
        {tab === 'clients' && (
          <div className="max-w-7xl mx-auto space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <MiniStat label="Total"    value={clients.length}  color="text-amber-400" />
              <MiniStat label="Active"   value={activeClients}   color="text-emerald-400" />
              <MiniStat label="Pending"  value={pendingClients}  color="text-amber-400" />
              <MiniStat label="Inactive" value={inactiveClients} color="text-[#2e3a52]" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <Card header={
                <>
                  <div className="flex items-center gap-2">
                    <DotAccent color="bg-amber-400" />
                    <CardTitle>All Clients</CardTitle>
                  </div>
                  <ViewAllLink to="/clients" />
                </>
              }>
                {loadingClients
                  ? <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-[#2e3a52]" /></div>
                  : clients.length === 0
                    ? <EmptyState icon={<Users size={32} />} text="No clients yet" linkTo="/clients" linkLabel="Add your first client" />
                    : <div className="max-h-[520px] overflow-y-auto">
                        {clients.map(c => <ClientRow key={c.id} client={c} />)}
                      </div>
                }
              </Card>

              <Card header={
                <>
                  <div className="flex items-center gap-2">
                    <DotAccent color="bg-rose-400" />
                    <CardTitle>Tasks</CardTitle>
                  </div>
                  <span className="text-[10px] font-black text-rose-400 bg-rose-400/10 px-2 py-0.5 rounded-full leading-none">
                    {pendingTasks} pending
                  </span>
                </>
              }>
                {loadingTasks
                  ? <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-[#2e3a52]" /></div>
                  : <>
                    <div className="max-h-[520px] overflow-y-auto">
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

        {/* ─── LEADS ─── */}
        {tab === 'leads' && (
          <div className="max-w-7xl mx-auto space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <MiniStat label="Active"         value={activeLeads.length}   color="text-amber-400" />
              <MiniStat label="New"             value={newLeadsCount}        color="text-emerald-400" />
              <MiniStat label="Consults Today"  value={todayConsults.length} color="text-violet-400" />
              <MiniStat label="Converted"       value={convertedLeads}       color="text-emerald-400" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <Card header={
                <>
                  <div className="flex items-center gap-2">
                    <DotAccent color="bg-amber-400" />
                    <CardTitle>Today's Consults</CardTitle>
                    {todayConsults.length > 0 && (
                      <span className="text-[10px] font-black text-amber-400 bg-amber-400/10 rounded-full px-1.5 py-0.5 leading-none">
                        {todayConsults.length}
                      </span>
                    )}
                  </div>
                  <ViewAllLink to="/leads" />
                </>
              }>
                {loadingLeads
                  ? <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-[#2e3a52]" /></div>
                  : todayConsults.length === 0
                    ? <EmptyState icon={<Calendar size={32} />} text="No consults scheduled today" />
                    : <div>{todayConsults.map(l => <ConsultRow key={l.id} lead={l} />)}</div>
                }
              </Card>

              <Card header={
                <>
                  <div className="flex items-center gap-2">
                    <DotAccent color="bg-emerald-400" />
                    <CardTitle>Pipeline</CardTitle>
                  </div>
                  <ViewAllLink to="/leads" />
                </>
              }>
                {loadingLeads
                  ? <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-[#2e3a52]" /></div>
                  : leads.length === 0
                    ? <EmptyState icon={<UserPlus size={32} />} text="No leads yet" linkTo="/leads" linkLabel="Add your first lead" />
                    : <div className="px-5 py-5 space-y-3.5">
                        {PIPELINE_STAGES.map(s => {
                          const count = pipelineCounts[s.status] ?? 0
                          const max = Math.max(...PIPELINE_STAGES.map(st => pipelineCounts[st.status] ?? 0), 1)
                          return (
                            <div key={s.status} className="flex items-center gap-3">
                              <p className="text-[11px] font-bold w-28 flex-shrink-0 text-[#5a6a85] uppercase tracking-wider">{s.label}</p>
                              <div className="flex-1 h-1 bg-[#1e2535] rounded-full overflow-hidden">
                                <div className={clsx('h-full rounded-full transition-all duration-700', s.bar)}
                                  style={{ width: count === 0 ? '0%' : `${Math.max(Math.round((count / max) * 100), 4)}%` }} />
                              </div>
                              <span className="text-xs font-black text-[#6a7a95] w-5 text-right flex-shrink-0 tabular-nums">{count}</span>
                            </div>
                          )
                        })}
                        <div className="pt-3 border-t border-[#1e2535] flex items-center justify-between text-[11px] text-[#2e3a52] font-bold uppercase tracking-wider">
                          <span>{activeLeads.length} active</span>
                          <span>{leads.filter(l => l.status === 'lost').length} lost</span>
                        </div>
                      </div>
                }
              </Card>
            </div>
          </div>
        )}

        {/* ─── MESSAGES ─── */}
        {tab === 'messages' && (
          <div className="max-w-3xl mx-auto">
            <Card header={
              <>
                <div className="flex items-center gap-2">
                  <DotAccent color="bg-violet-400" />
                  <CardTitle>All Conversations</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  {unreadMessages > 0 && (
                    <span className="text-[10px] font-black text-amber-400 bg-amber-400/10 rounded-full px-2 py-0.5 leading-none">
                      {unreadMessages} unread
                    </span>
                  )}
                  <ViewAllLink to="/inbox" label="Open inbox" />
                </div>
              </>
            }>
              {loadingMessages
                ? <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-[#2e3a52]" /></div>
                : convos.length === 0
                  ? <EmptyState icon={<MessageSquare size={32} />} text="No messages yet" />
                  : <div>{convos.map(c => <ConvoRow key={c.id} conv={c} />)}</div>
              }
            </Card>
          </div>
        )}

      </div>
    </div>
  )
}
