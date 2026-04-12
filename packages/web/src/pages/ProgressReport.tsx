import { useState, useEffect, useMemo, useRef } from 'react'
import {
  X, Printer, Loader2, TrendingUp, TrendingDown, Minus,
  Dumbbell, BarChart2, Heart, Scale, Zap, Moon, Calendar,
  CheckCircle2, XCircle, Clock,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'  // still used for habits
import { useCheckIns, useMetricDefinitions, useCustomMetricValues } from '@/hooks/useMetrics'
import { useClientWorkouts } from '@/hooks/useClientWorkouts'
import type { DbClient } from '@/lib/database.types'
import { useUnitSystem, weightLabel } from '@/lib/units'

// ─── Date range helpers ────────────────────────────────────────
type RangePreset = 'thisweek' | 'lastweek' | '14d' | '30d' | '60d' | '90d' | '180d' | 'custom'

interface DateRange { since: string; until: string; days: number }

function getMonday(d: Date): Date {
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const m = new Date(d)
  m.setDate(d.getDate() + diff)
  m.setHours(0, 0, 0, 0)
  return m
}

function computeRange(preset: RangePreset, customStart: string, customEnd: string): DateRange {
  const now   = new Date()
  const today = now.toISOString()

  if (preset === 'custom' && customStart && customEnd) {
    const s = new Date(customStart + 'T00:00:00')
    const e = new Date(customEnd   + 'T23:59:59')
    const days = Math.max(1, Math.round((e.getTime() - s.getTime()) / 86400_000))
    return { since: s.toISOString(), until: e.toISOString(), days }
  }
  if (preset === 'thisweek') {
    const monday = getMonday(now)
    const days = Math.max(1, Math.ceil((now.getTime() - monday.getTime()) / 86400_000))
    return { since: monday.toISOString(), until: today, days }
  }
  if (preset === 'lastweek') {
    const thisMonday = getMonday(now)
    const lastMonday = new Date(thisMonday); lastMonday.setDate(thisMonday.getDate() - 7)
    const lastSunday = new Date(thisMonday); lastSunday.setDate(thisMonday.getDate() - 1); lastSunday.setHours(23, 59, 59, 999)
    return { since: lastMonday.toISOString(), until: lastSunday.toISOString(), days: 7 }
  }
  const daysMap: Record<string, number> = { '14d': 14, '30d': 30, '60d': 60, '90d': 90, '180d': 180 }
  const days = daysMap[preset] ?? 30
  return { since: new Date(Date.now() - days * 86400_000).toISOString(), until: today, days }
}

const PRESETS: { key: RangePreset; label: string }[] = [
  { key: 'thisweek', label: 'This week'  },
  { key: 'lastweek', label: 'Last week'  },
  { key: '14d',      label: '2 weeks'    },
  { key: '30d',      label: '30 days'    },
  { key: '60d',      label: '60 days'    },
  { key: '90d',      label: '90 days'    },
  { key: '180d',     label: '6 months'   },
  { key: 'custom',   label: 'Custom'     },
]

// ─── Sparkline ─────────────────────────────────────────────────
function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const W = 120, H = 32
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * W
    const y = H - ((v - min) / range) * H
    return `${x},${y}`
  }).join(' ')
  return (
    <svg width={W} height={H} className="overflow-visible">
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ─── Stat card ─────────────────────────────────────────────────
function StatCard({ icon, label, value, unit, sub }: {
  icon: React.ReactNode; label: string; value: string | number; unit?: string; sub?: React.ReactNode
}) {
  return (
    <div className="bg-[#1e2535] rounded-2xl p-4 border border-[#242d40]">
      <div className="flex items-center gap-2 mb-2 text-[#8a9ab5]">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-2xl font-black text-[#e8edf5]">
        {value}{unit && <span className="text-sm font-normal text-[#8a9ab5] ml-1">{unit}</span>}
      </p>
      {sub && <div className="mt-1">{sub}</div>}
    </div>
  )
}

// ─── Trend badge ───────────────────────────────────────────────
function Trend({ first, last, unit, lowerIsBetter }: {
  first: number; last: number; unit: string; lowerIsBetter?: boolean
}) {
  const delta = last - first
  if (Math.abs(delta) < 0.01) return <span className="text-xs text-[#4a5a75] flex items-center gap-1"><Minus size={11} /> No change</span>
  const good = lowerIsBetter ? delta < 0 : delta > 0
  const Icon = delta > 0 ? TrendingUp : TrendingDown
  return (
    <span className={`text-xs flex items-center gap-1 ${good ? 'text-emerald-400' : 'text-rose-400'}`}>
      <Icon size={11} />
      {delta > 0 ? '+' : ''}{delta.toFixed(1)} {unit}
    </span>
  )
}

// ─── Compliance donut ──────────────────────────────────────────
function ComplianceDonut({ pct }: { pct: number }) {
  const r  = 36, cx = 44, cy = 44
  const circumference = 2 * Math.PI * r
  const dash = (pct / 100) * circumference
  const color = pct >= 80 ? '#34d399' : pct >= 50 ? '#fbbf24' : '#fb7185'
  return (
    <svg width={88} height={88} className="flex-shrink-0">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1e2535" strokeWidth={8} />
      <circle
        cx={cx} cy={cy} r={r} fill="none"
        stroke={color} strokeWidth={8}
        strokeDasharray={`${dash} ${circumference}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
      />
      <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle" fontSize={14} fontWeight={700} fill="#e8edf5">
        {Math.round(pct)}%
      </text>
    </svg>
  )
}

// ─── Main ProgressReport modal ─────────────────────────────────
interface HabitStat { name: string; emoji: string; completed: number; total: number }

export default function ProgressReport({ client, onClose }: {
  client: DbClient
  onClose: () => void
}) {
  const [preset,      setPreset]      = useState<RangePreset>('30d')
  const [customStart, setCustomStart] = useState('')
  const [customEnd,   setCustomEnd]   = useState('')
  const [habitStats,  setHabitStats]  = useState<HabitStat[]>([])
  const printRef = useRef<HTMLDivElement>(null)
  const unitSystem = useUnitSystem()

  const range = computeRange(preset, customStart, customEnd)
  const { since, until, days } = range

  // Check-ins (cached)
  const { data: allCheckIns = [] } = useCheckIns(client.id)
  const checkIns = allCheckIns.filter(c => c.checked_in_at >= since && c.checked_in_at <= until)

  // Custom metrics (cached)
  const { data: metricDefs = [] } = useMetricDefinitions()
  const { data: metricValues = [] } = useCustomMetricValues(client.id)
  const filteredMetricValues = metricValues.filter(v => v.logged_at >= since && v.logged_at <= until)

  // Workout compliance — derived from cached hook, no extra request
  const { data: allAssigned = [], isLoading: workoutLoad } = useClientWorkouts(client.id)
  const compliance = useMemo(() => {
    const inRange  = allAssigned.filter(w => w.assigned_at >= since && w.assigned_at <= until)
    const completed = inRange.filter(w => w.status === 'completed').length
    const skipped   = inRange.filter(w => w.status === 'skipped').length
    return { assigned: inRange.length, completed, skipped, pending: inRange.length - completed - skipped }
  }, [allAssigned, since, until])

  // Habits
  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data: habits } = await supabase
        .from('habits').select('id, name, emoji')
        .eq('client_id', client.id).eq('active', true)
      if (!habits?.length || cancelled) { setHabitStats([]); return }

      const { data: completions } = await supabase
        .from('habit_completions').select('habit_id, completed_date')
        .eq('client_id', client.id)
        .gte('completed_date', since.split('T')[0])
        .lte('completed_date', until.split('T')[0])

      const completionMap: Record<string, number> = {}
      completions?.forEach(c => { completionMap[c.habit_id] = (completionMap[c.habit_id] ?? 0) + 1 })

      if (!cancelled) {
        setHabitStats(habits.map(h => ({
          name: h.name, emoji: h.emoji,
          completed: completionMap[h.id] ?? 0, total: days,
        })))
      }
    }
    load()
    return () => { cancelled = true }
  }, [client.id, since, until, days])

  // Derived check-in series (sorted ascending for sparklines)
  const sortedCheckIns = [...checkIns].reverse()
  const weightSeries = sortedCheckIns.map(c => c.weight_kg).filter((v): v is number => v != null)
  const bfSeries     = sortedCheckIns.map(c => c.body_fat_pct).filter((v): v is number => v != null)
  const energySeries = sortedCheckIns.map(c => c.energy_level).filter((v): v is number => v != null)
  const sleepSeries  = sortedCheckIns.map(c => c.sleep_hours).filter((v): v is number => v != null)

  const displayWeight = (kg: number) =>
    unitSystem === 'imperial' ? (kg * 2.20462).toFixed(1) : kg.toFixed(1)

  const reportDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const sinceLabel = new Date(since).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const untilLabel = new Date(until).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  const compliancePct = compliance && compliance.assigned > 0
    ? (compliance.completed / compliance.assigned) * 100
    : null

  return (
    <>
      <style>{`
        @page {
          size: A4 portrait;
          margin: 1cm;
        }
        @media print {
          body * { visibility: hidden; }
          #progress-report-print,
          #progress-report-print * { visibility: visible; }
          #progress-report-print {
            position: fixed !important;
            inset: 0 !important;
            background: white !important;
            padding: 0.6cm 0.8cm !important;
            overflow: visible !important;
            z-index: 9999;
          }

          /* Scale entire report to fit one page */
          #progress-report-print > * {
            zoom: 0.78;
          }

          /* Tighten spacing */
          #progress-report-print .space-y-6 > * + * { margin-top: 0.6rem !important; }
          #progress-report-print .space-y-3 > * + * { margin-top: 0.35rem !important; }
          #progress-report-print .space-y-2 > * + * { margin-top: 0.25rem !important; }
          #progress-report-print .p-5 { padding: 0.5rem !important; }
          #progress-report-print .p-4 { padding: 0.4rem !important; }
          #progress-report-print .py-6 { padding-top: 0.5rem !important; padding-bottom: 0.5rem !important; }
          #progress-report-print .gap-6 { gap: 0.75rem !important; }
          #progress-report-print .gap-3 { gap: 0.4rem !important; }

          /* Two-column layout for stat sections */
          #progress-report-print .print-two-col {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 0.5rem !important;
          }

          /* Reduce heading sizes */
          #progress-report-print h1 { font-size: 1.1rem !important; }
          #progress-report-print h2 { font-size: 0.6rem !important; }
          #progress-report-print .text-2xl { font-size: 1.1rem !important; }
          #progress-report-print .text-sm { font-size: 0.7rem !important; }
          #progress-report-print .text-xs { font-size: 0.6rem !important; }

          /* Shrink donut */
          #progress-report-print svg[width="88"] { width: 60px !important; height: 60px !important; }

          .print-page { page-break-inside: avoid; }
        }
      `}</style>

      {/* Modal backdrop */}
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center overflow-y-auto py-8 px-4 no-print">
        <div className="w-full max-w-2xl bg-[#161b27] border border-[#242d40] rounded-3xl shadow-2xl overflow-hidden">

          {/* Toolbar */}
          <div className="flex items-center gap-2 px-5 py-4 border-b border-[#242d40] flex-wrap no-print">
            <div className="mr-1">
              <p className="text-base font-bold text-[#e8edf5] leading-none">Progress Report</p>
              <p className="text-xs text-[#8a9ab5] mt-0.5">{client.name}</p>
            </div>

            {/* Preset buttons */}
            <div className="flex gap-1 flex-wrap">
              {PRESETS.map(p => (
                <button
                  key={p.key}
                  onClick={() => setPreset(p.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    preset === p.key
                      ? 'bg-amber-400 text-[#0d1117]'
                      : 'bg-[#1e2535] text-[#8a9ab5] hover:bg-[#242d40] border border-[#2e3a52]'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2 bg-amber-400 text-[#0d1117] text-sm font-black rounded-xl hover:bg-amber-300 transition-colors"
              >
                <Printer size={14} /> Print / PDF
              </button>
              <button onClick={onClose} className="p-2 text-[#8a9ab5] hover:text-[#e8edf5] rounded-xl hover:bg-[#1e2535] transition-colors">
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Custom date pickers */}
          {preset === 'custom' && (
            <div className="flex items-center gap-3 px-5 py-3 bg-[#1e2535] border-b border-[#242d40] no-print">
              <Calendar size={14} className="text-[#8a9ab5]" />
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={customStart}
                  onChange={e => setCustomStart(e.target.value)}
                  className="text-sm bg-[#1e2535] border border-[#2e3a52] rounded-xl px-3 py-1.5 text-[#c5cedb] focus:outline-none focus:border-amber-400/50"
                />
                <span className="text-[#8a9ab5] text-sm">to</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={e => setCustomEnd(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="text-sm bg-[#1e2535] border border-[#2e3a52] rounded-xl px-3 py-1.5 text-[#c5cedb] focus:outline-none focus:border-amber-400/50"
                />
              </div>
              {(!customStart || !customEnd) && (
                <p className="text-xs text-[#4a5a75]">Select a start and end date</p>
              )}
            </div>
          )}

          {/* Report content */}
          <div id="progress-report-print" ref={printRef} className="px-6 py-6 space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between print-page">
              <div>
                <h1 className="text-2xl font-black text-[#e8edf5]">{client.name}</h1>
                <p className="text-[#8a9ab5] text-sm mt-0.5">Progress Report · {sinceLabel} – {untilLabel}</p>
                {client.goal && <p className="text-[#4a5a75] text-xs mt-1">Goal: {client.goal}</p>}
              </div>
              <div className="text-right">
                <p className="text-xs text-[#4a5a75]">Generated</p>
                <p className="text-sm text-[#8a9ab5] font-medium">{reportDate}</p>
              </div>
            </div>

            <div className="border-t border-[#242d40]" />

            {/* All sections in a two-column grid when printed */}
            <div className="print-two-col space-y-4">

            {/* Body metrics */}
            <div className="print-page space-y-3">
              <h2 className="text-sm font-bold text-[#8a9ab5] uppercase tracking-wider flex items-center gap-2">
                <Scale size={14} className="text-amber-400" /> Body Metrics
              </h2>
              {checkIns.length === 0 ? (
                <p className="text-[#4a5a75] text-sm">No check-ins in this period.</p>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {weightSeries.length > 0 && (
                    <StatCard
                      icon={<Scale size={14} />}
                      label={`Weight (${weightLabel(unitSystem)})`}
                      value={displayWeight(weightSeries[weightSeries.length - 1])}
                      unit={weightLabel(unitSystem)}
                      sub={weightSeries.length > 1
                        ? <div className="flex items-center justify-between">
                            <Trend first={weightSeries[0]} last={weightSeries[weightSeries.length - 1]} unit={weightLabel(unitSystem)} lowerIsBetter />
                            <Sparkline values={weightSeries} color="#fbbf24" />
                          </div>
                        : null}
                    />
                  )}
                  {bfSeries.length > 0 && (
                    <StatCard
                      icon={<TrendingUp size={14} />}
                      label="Body Fat"
                      value={bfSeries[bfSeries.length - 1].toFixed(1)}
                      unit="%"
                      sub={bfSeries.length > 1
                        ? <div className="flex items-center justify-between">
                            <Trend first={bfSeries[0]} last={bfSeries[bfSeries.length - 1]} unit="%" lowerIsBetter />
                            <Sparkline values={bfSeries} color="#34d399" />
                          </div>
                        : null}
                    />
                  )}
                  {energySeries.length > 0 && (
                    <StatCard
                      icon={<Zap size={14} />}
                      label="Avg Energy"
                      value={(energySeries.reduce((a, b) => a + b, 0) / energySeries.length).toFixed(1)}
                      unit="/ 10"
                      sub={<Sparkline values={energySeries} color="#fbbf24" />}
                    />
                  )}
                  {sleepSeries.length > 0 && (
                    <StatCard
                      icon={<Moon size={14} />}
                      label="Avg Sleep"
                      value={(sleepSeries.reduce((a, b) => a + b, 0) / sleepSeries.length).toFixed(1)}
                      unit="hrs"
                      sub={<Sparkline values={sleepSeries} color="#818cf8" />}
                    />
                  )}
                </div>
              )}
              {checkIns.length > 0 && (
                <p className="text-xs text-[#4a5a75]">{checkIns.length} check-in{checkIns.length !== 1 ? 's' : ''} logged</p>
              )}
            </div>

            {/* Custom metrics */}
            {metricDefs.length > 0 && filteredMetricValues.length > 0 && (
              <div className="print-page space-y-3">
                <h2 className="text-sm font-bold text-[#8a9ab5] uppercase tracking-wider flex items-center gap-2">
                  <BarChart2 size={14} className="text-amber-400" /> Custom Metrics
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  {metricDefs.map(def => {
                    const vals = filteredMetricValues
                      .filter(v => v.definition_id === def.id)
                      .sort((a, b) => a.logged_at.localeCompare(b.logged_at))
                    if (!vals.length) return null
                    const series = vals.map(v => v.value)
                    const latest = series[series.length - 1]
                    return (
                      <StatCard
                        key={def.id}
                        icon={<span className="text-sm">{def.emoji}</span>}
                        label={def.name}
                        value={latest.toFixed(1)}
                        unit={def.unit}
                        sub={series.length > 1
                          ? <div className="flex items-center justify-between">
                              <Trend first={series[0]} last={latest} unit={def.unit} />
                              <Sparkline values={series} color="#fbbf24" />
                            </div>
                          : null}
                      />
                    )
                  })}
                </div>
              </div>
            )}

            {/* Workout compliance */}
            <div className="print-page space-y-3">
              <h2 className="text-sm font-bold text-[#8a9ab5] uppercase tracking-wider flex items-center gap-2">
                <Dumbbell size={14} className="text-amber-400" /> Workout Compliance
              </h2>
              {workoutLoad ? (
                <div className="flex items-center gap-2 text-[#8a9ab5] text-sm">
                  <Loader2 size={14} className="animate-spin" /> Loading...
                </div>
              ) : compliance.assigned === 0 ? (
                <p className="text-[#4a5a75] text-sm">No workouts assigned in this period.</p>
              ) : (
                <div className="bg-[#1e2535] rounded-2xl border border-[#242d40] p-5">
                  <div className="flex items-center gap-6">
                    {/* Donut */}
                    <ComplianceDonut pct={compliancePct ?? 0} />

                    {/* Stats breakdown */}
                    <div className="flex-1 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-[#8a9ab5]">Assigned</span>
                        <span className="text-sm font-bold text-[#e8edf5]">{compliance.assigned}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-sm text-emerald-400">
                          <CheckCircle2 size={13} /> Completed
                        </span>
                        <span className="text-sm font-bold text-emerald-400">{compliance.completed}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-sm text-rose-400">
                          <XCircle size={13} /> Skipped
                        </span>
                        <span className="text-sm font-bold text-rose-400">{compliance.skipped}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-sm text-[#4a5a75]">
                          <Clock size={13} /> Pending
                        </span>
                        <span className="text-sm font-bold text-[#4a5a75]">{compliance.pending}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Habits */}
            {habitStats.length > 0 && (() => {
              const totalPossible  = habitStats.reduce((a, h) => a + h.total, 0)
              const totalCompleted = habitStats.reduce((a, h) => a + h.completed, 0)
              const overallPct     = totalPossible > 0 ? (totalCompleted / totalPossible) * 100 : 0
              const bestHabit      = [...habitStats].sort((a, b) => (b.completed / b.total) - (a.completed / a.total))[0]
              const worstHabit     = [...habitStats].sort((a, b) => (a.completed / a.total) - (b.completed / b.total))[0]

              return (
                <div className="print-page space-y-3">
                  <h2 className="text-sm font-bold text-[#8a9ab5] uppercase tracking-wider flex items-center gap-2">
                    <Heart size={14} className="text-amber-400" /> Habit Compliance
                  </h2>

                  {/* Overall summary card */}
                  <div className="bg-[#1e2535] rounded-2xl border border-[#242d40] p-5">
                    <div className="flex items-center gap-6">
                      <ComplianceDonut pct={overallPct} />
                      <div className="flex-1 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-[#8a9ab5]">Active habits</span>
                          <span className="text-sm font-bold text-[#e8edf5]">{habitStats.length}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-[#8a9ab5]">Total check-ins</span>
                          <span className="text-sm font-bold text-[#e8edf5]">{totalCompleted} / {totalPossible}</span>
                        </div>
                        {habitStats.length > 1 && (
                          <>
                            <div className="flex items-center justify-between pt-1 border-t border-[#242d40]">
                              <span className="text-xs text-emerald-400 flex items-center gap-1">
                                <CheckCircle2 size={12} /> Best
                              </span>
                              <span className="text-xs font-semibold text-[#8a9ab5] truncate ml-2 max-w-[150px]">
                                {bestHabit.emoji} {bestHabit.name}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-rose-400 flex items-center gap-1">
                                <XCircle size={12} /> Needs work
                              </span>
                              <span className="text-xs font-semibold text-[#8a9ab5] truncate ml-2 max-w-[150px]">
                                {worstHabit.emoji} {worstHabit.name}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Per-habit bars */}
                  <div className="space-y-2">
                    {habitStats.map(h => {
                      const pct = Math.round((h.completed / h.total) * 100)
                      return (
                        <div key={h.name} className="flex items-center gap-3">
                          <span className="text-lg w-6 text-center flex-shrink-0">{h.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm text-[#c5cedb] truncate">{h.name}</span>
                              <span className={`text-xs font-semibold ml-2 flex-shrink-0 ${pct >= 80 ? 'text-emerald-400' : pct >= 50 ? 'text-amber-400' : 'text-rose-400'}`}>
                                {pct}%
                              </span>
                            </div>
                            <div className="h-1.5 bg-[#1e2535] rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${pct >= 80 ? 'bg-emerald-400' : pct >= 50 ? 'bg-amber-400' : 'bg-rose-400'}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                          <span className="text-xs text-[#4a5a75] flex-shrink-0">{h.completed}/{h.total}d</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })()}

            </div>{/* end print-two-col */}

            {/* Footer */}
            <div className="border-t border-[#242d40] pt-4 text-center">
              <p className="text-xs text-[#3a4a62]">Generated by FitProto · {reportDate}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
