import { useState, useEffect, useRef } from 'react'
import {
  X, Printer, Loader2, TrendingUp, TrendingDown, Minus,
  Dumbbell, BarChart2, Heart, Scale, Zap, Moon,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useCheckIns, useMetricDefinitions, useCustomMetricValues } from '@/hooks/useMetrics'
import type { DbClient } from '@/lib/database.types'
import { useUnitSystem, weightLabel } from '@/lib/units'

// ─── Types ─────────────────────────────────────────────────────
interface WorkoutSession {
  id: string
  completed_at: string
  workout_name: string
  set_count: number
}

interface HabitStat {
  name: string
  emoji: string
  completed: number
  total: number
}

const RANGES = [
  { label: 'Last 30 days', days: 30  },
  { label: 'Last 60 days', days: 60  },
  { label: 'Last 90 days', days: 90  },
  { label: 'Last 6 months', days: 180 },
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
  icon: React.ReactNode
  label: string
  value: string | number
  unit?: string
  sub?: React.ReactNode
}) {
  return (
    <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
      <div className="flex items-center gap-2 mb-2 text-gray-400">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900">
        {value}
        {unit && <span className="text-sm font-normal text-gray-400 ml-1">{unit}</span>}
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
  if (Math.abs(delta) < 0.01) return <span className="text-xs text-gray-400 flex items-center gap-1"><Minus size={11} /> No change</span>
  const good = lowerIsBetter ? delta < 0 : delta > 0
  const Icon = delta > 0 ? TrendingUp : TrendingDown
  return (
    <span className={`text-xs flex items-center gap-1 ${good ? 'text-emerald-600' : 'text-rose-500'}`}>
      <Icon size={11} />
      {delta > 0 ? '+' : ''}{delta.toFixed(1)} {unit}
    </span>
  )
}

// ─── Main ProgressReport modal ─────────────────────────────────
export default function ProgressReport({ client, onClose }: {
  client: DbClient
  onClose: () => void
}) {
  const [rangeDays,       setRangeDays]       = useState(30)
  const [sessions,        setSessions]        = useState<WorkoutSession[]>([])
  const [habitStats,      setHabitStats]      = useState<HabitStat[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const printRef = useRef<HTMLDivElement>(null)
  const unitSystem = useUnitSystem()

  // Date range
  const since = new Date(Date.now() - rangeDays * 86400_000).toISOString()

  // Check-ins
  const { data: allCheckIns = [] } = useCheckIns(client.id)
  const checkIns = allCheckIns.filter(c => c.checked_in_at >= since)

  // Custom metrics
  const { data: metricDefs = [] } = useMetricDefinitions()
  const { data: metricValues = [] } = useCustomMetricValues(client.id)
  const filteredMetricValues = metricValues.filter(v => v.logged_at >= since)

  // Workout sessions via the same RPC used by the history tab
  useEffect(() => {
    let cancelled = false
    async function load() {
      setSessionsLoading(true)
      const { data } = await supabase.rpc('get_portal_history', { p_client_id: client.id })
      if (!cancelled) {
        const all = (data as WorkoutSession[]) ?? []
        setSessions(all.filter(s => s.completed_at >= since))
        setSessionsLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [client.id, since])

  // Habits
  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data: habits } = await supabase
        .from('habits')
        .select('id, name, emoji')
        .eq('client_id', client.id)
        .eq('active', true)
      if (!habits?.length || cancelled) { setHabitStats([]); return }

      const { data: completions } = await supabase
        .from('habit_completions')
        .select('habit_id, completed_date')
        .eq('client_id', client.id)
        .gte('completed_date', since.split('T')[0])

      const completionMap: Record<string, number> = {}
      completions?.forEach(c => {
        completionMap[c.habit_id] = (completionMap[c.habit_id] ?? 0) + 1
      })

      if (!cancelled) {
        setHabitStats(habits.map(h => ({
          name:      h.name,
          emoji:     h.emoji,
          completed: completionMap[h.id] ?? 0,
          total:     rangeDays,
        })))
      }
    }
    load()
    return () => { cancelled = true }
  }, [client.id, since, rangeDays])

  // Derived check-in series
  const weightSeries = checkIns.map(c => c.weight_kg).filter((v): v is number => v != null)
  const bfSeries     = checkIns.map(c => c.body_fat_pct).filter((v): v is number => v != null)
  const energySeries = checkIns.map(c => c.energy_level).filter((v): v is number => v != null)
  const sleepSeries  = checkIns.map(c => c.sleep_hours).filter((v): v is number => v != null)

  const displayWeight = (kg: number) =>
    unitSystem === 'imperial' ? (kg * 2.20462).toFixed(1) : kg.toFixed(1)

  function handlePrint() {
    window.print()
  }

  const reportDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const sinceDate  = new Date(since).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const toDate     = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <>
      {/* Print styles injected in head */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #progress-report-print,
          #progress-report-print * { visibility: visible; }
          #progress-report-print {
            position: fixed !important;
            inset: 0 !important;
            background: white !important;
            padding: 2rem !important;
            overflow: visible !important;
            z-index: 9999;
          }
          .print-page { page-break-inside: avoid; }
        }
      `}</style>

      {/* Modal backdrop */}
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-start justify-center overflow-y-auto py-8 px-4 no-print">
        <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Modal toolbar */}
          <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 no-print">
            <div className="flex-1">
              <p className="text-base font-bold text-gray-900">Progress Report</p>
              <p className="text-xs text-gray-400">{client.name}</p>
            </div>
            {/* Range selector */}
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
              {RANGES.map(r => (
                <button
                  key={r.days}
                  onClick={() => setRangeDays(r.days)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    rangeDays === r.days
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {r.label.replace('Last ', '')}
                </button>
              ))}
            </div>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-700 transition-colors"
            >
              <Printer size={15} /> Print / PDF
            </button>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 transition-colors">
              <X size={18} />
            </button>
          </div>

          {/* Report content */}
          <div id="progress-report-print" ref={printRef} className="px-6 py-6 space-y-6">
            {/* Report header */}
            <div className="flex items-start justify-between print-page">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{client.name}</h1>
                <p className="text-gray-500 text-sm mt-0.5">
                  Progress Report · {sinceDate} – {toDate}
                </p>
                {client.goal && (
                  <p className="text-gray-400 text-xs mt-1">Goal: {client.goal}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">Generated</p>
                <p className="text-sm text-gray-600 font-medium">{reportDate}</p>
              </div>
            </div>

            <div className="border-t border-gray-100" />

            {/* Check-ins summary */}
            <div className="print-page space-y-3">
              <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                <Scale size={14} className="text-brand-600" /> Body Metrics
              </h2>
              {checkIns.length === 0 ? (
                <p className="text-gray-400 text-sm">No check-ins in this period.</p>
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
                            <Sparkline values={weightSeries} color="#6366f1" />
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
                            <Sparkline values={bfSeries} color="#14b8a6" />
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
                      sub={<Sparkline values={energySeries} color="#f59e0b" />}
                    />
                  )}
                  {sleepSeries.length > 0 && (
                    <StatCard
                      icon={<Moon size={14} />}
                      label="Avg Sleep"
                      value={(sleepSeries.reduce((a, b) => a + b, 0) / sleepSeries.length).toFixed(1)}
                      unit="hrs"
                      sub={<Sparkline values={sleepSeries} color="#8b5cf6" />}
                    />
                  )}
                </div>
              )}
              {checkIns.length > 0 && (
                <p className="text-xs text-gray-400">{checkIns.length} check-in{checkIns.length !== 1 ? 's' : ''} logged</p>
              )}
            </div>

            {/* Custom metrics */}
            {metricDefs.length > 0 && filteredMetricValues.length > 0 && (
              <div className="print-page space-y-3">
                <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                  <BarChart2 size={14} className="text-brand-600" /> Custom Metrics
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
                              <Sparkline values={series} color="#6366f1" />
                            </div>
                          : null}
                      />
                    )
                  })}
                </div>
              </div>
            )}

            {/* Workouts */}
            <div className="print-page space-y-3">
              <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                <Dumbbell size={14} className="text-brand-600" /> Workouts
              </h2>
              {sessionsLoading ? (
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <Loader2 size={14} className="animate-spin" /> Loading...
                </div>
              ) : sessions.length === 0 ? (
                <p className="text-gray-400 text-sm">No sessions logged in this period.</p>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <StatCard
                      icon={<Dumbbell size={14} />}
                      label="Sessions"
                      value={sessions.length}
                      sub={<p className="text-xs text-gray-400">
                        {(sessions.length / (rangeDays / 7)).toFixed(1)} per week
                      </p>}
                    />
                    <StatCard
                      icon={<BarChart2 size={14} />}
                      label="Total Sets"
                      value={sessions.reduce((a, s) => a + s.set_count, 0)}
                    />
                  </div>
                  <div className="bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Workout</th>
                          <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Date</th>
                          <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Sets</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {sessions.slice(-10).reverse().map(s => (
                          <tr key={s.id}>
                            <td className="px-4 py-2.5 text-gray-700 font-medium">{s.workout_name}</td>
                            <td className="px-4 py-2.5 text-gray-400 text-right text-xs">
                              {new Date(s.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </td>
                            <td className="px-4 py-2.5 text-gray-600 text-right">{s.set_count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {sessions.length > 10 && (
                      <p className="text-xs text-gray-400 px-4 py-2 border-t border-gray-100">
                        Showing last 10 of {sessions.length} sessions
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Habits */}
            {habitStats.length > 0 && (
              <div className="print-page space-y-3">
                <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                  <Heart size={14} className="text-brand-600" /> Habit Compliance
                </h2>
                <div className="space-y-2">
                  {habitStats.map(h => {
                    const pct = Math.round((h.completed / h.total) * 100)
                    return (
                      <div key={h.name} className="flex items-center gap-3">
                        <span className="text-lg w-6 text-center flex-shrink-0">{h.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-gray-700 truncate">{h.name}</span>
                            <span className={`text-xs font-semibold ml-2 flex-shrink-0 ${pct >= 80 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-500' : 'text-rose-500'}`}>
                              {pct}%
                            </span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-400' : 'bg-rose-400'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-xs text-gray-400 flex-shrink-0">{h.completed}/{h.total}d</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="border-t border-gray-100 pt-4 text-center">
              <p className="text-xs text-gray-300">Generated by FitProto · {reportDate}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
