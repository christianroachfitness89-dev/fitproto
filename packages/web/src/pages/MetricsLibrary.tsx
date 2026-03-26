import { useState } from 'react'
import { BarChart3, Plus, Trash2, Search, Loader2, ChevronDown } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import {
  useMetricDefinitions, useCreateMetricDefinition, useDeleteMetricDefinition,
  type MetricCategory, type DbMetricDefinition,
} from '@/hooks/useMetrics'
import clsx from 'clsx'

const CATEGORY_META: Record<MetricCategory, { label: string; color: string; bg: string }> = {
  body_composition: { label: 'Body Composition', color: 'text-emerald-700', bg: 'bg-emerald-50' },
  performance:      { label: 'Performance',       color: 'text-blue-700',    bg: 'bg-blue-50' },
  wellness:         { label: 'Wellness',           color: 'text-violet-700',  bg: 'bg-violet-50' },
  measurements:     { label: 'Measurements',       color: 'text-amber-700',   bg: 'bg-amber-50' },
  custom:           { label: 'Custom',             color: 'text-gray-600',    bg: 'bg-gray-100' },
}

const EMOJI_SUGGESTIONS = ['📊','⚖️','💪','📏','❤️','😴','⚡','🏃','🔥','🌡️','💧','🧠','📐','🦵','🫀']

const UNIT_PRESETS = ['kg', 'lbs', 'cm', 'in', '%', '/10', 'reps', 'min', 'hrs', 'mmHg', 'bpm', '']

export default function MetricsLibrary() {
  const { profile } = useAuth()
  const { data: definitions = [], isLoading } = useMetricDefinitions()
  const createDef = useCreateMetricDefinition()
  const deleteDef = useDeleteMetricDefinition()

  const [search, setSearch]       = useState('')
  const [catFilter, setCatFilter] = useState<MetricCategory | 'all'>('all')

  // Create form
  const [name, setName]           = useState('')
  const [unit, setUnit]           = useState('')
  const [emoji, setEmoji]         = useState('📊')
  const [category, setCategory]   = useState<MetricCategory>('custom')
  const [creating, setCreating]   = useState(false)

  if (!profile?.org_id) {
    return <div className="flex items-center justify-center h-64"><Loader2 size={24} className="animate-spin text-brand-500" /></div>
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setCreating(true)
    try {
      await createDef.mutateAsync({ name: name.trim(), unit: unit.trim(), emoji, category })
      setName(''); setUnit(''); setEmoji('📊'); setCategory('custom')
    } finally {
      setCreating(false)
    }
  }

  const filtered = definitions.filter(d => {
    if (catFilter !== 'all' && d.category !== catFilter) return false
    if (search && !d.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  // Group by category for display
  const grouped = Object.keys(CATEGORY_META).reduce((acc, cat) => {
    const items = filtered.filter(d => d.category === cat)
    if (items.length > 0) acc[cat as MetricCategory] = items
    return acc
  }, {} as Record<MetricCategory, DbMetricDefinition[]>)

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <BarChart3 size={18} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Metric Groups</h1>
          {definitions.length > 0 && (
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
              {definitions.length} defined
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500 ml-12">Define custom metrics to track for your clients across check-ins.</p>
      </div>

      {/* Create form */}
      <form onSubmit={handleCreate} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-5 mb-6">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">New Metric Definition</p>

        {/* Emoji picker */}
        <div className="flex gap-1.5 mb-3 flex-wrap">
          {EMOJI_SUGGESTIONS.map(e => (
            <button key={e} type="button" onClick={() => setEmoji(e)}
              className={clsx(
                'w-8 h-8 rounded-lg text-base flex items-center justify-center transition-all',
                emoji === e ? 'bg-emerald-100 ring-2 ring-emerald-400 ring-offset-1' : 'hover:bg-gray-100'
              )}>{e}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-3">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Metric name (e.g. Waist circumference)"
            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400"
          />
          <div className="relative sm:w-36">
            <select
              value={unit}
              onChange={e => setUnit(e.target.value)}
              className="w-full appearance-none pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 bg-white"
            >
              {UNIT_PRESETS.map(u => <option key={u} value={u}>{u || '(no unit)'}</option>)}
            </select>
            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
          <input
            value={unit}
            onChange={e => setUnit(e.target.value)}
            placeholder="Custom unit…"
            className="sm:w-28 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={category}
            onChange={e => setCategory(e.target.value as MetricCategory)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 bg-white"
          >
            {(Object.keys(CATEGORY_META) as MetricCategory[]).map(c => (
              <option key={c} value={c}>{CATEGORY_META[c].label}</option>
            ))}
          </select>
          <button
            type="submit"
            disabled={!name.trim() || creating}
            className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 transition-all sm:ml-auto"
          >
            {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Add Metric
          </button>
        </div>
      </form>

      {/* Search + category filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search metrics…"
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setCatFilter('all')}
            className={clsx(
              'px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors',
              catFilter === 'all' ? 'bg-emerald-100 text-emerald-700' : 'text-gray-500 hover:bg-gray-100'
            )}
          >All</button>
          {(Object.keys(CATEGORY_META) as MetricCategory[]).map(c => (
            <button
              key={c}
              onClick={() => setCatFilter(c)}
              className={clsx(
                'px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors',
                catFilter === c
                  ? `${CATEGORY_META[c].bg} ${CATEGORY_META[c].color}`
                  : 'text-gray-500 hover:bg-gray-100'
              )}
            >{CATEGORY_META[c].label}</button>
          ))}
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16"><Loader2 size={24} className="animate-spin text-brand-500" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <BarChart3 size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No metrics defined yet</p>
          <p className="text-xs mt-1">Create a metric above — then log values per client in their Metrics tab.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {(Object.keys(grouped) as MetricCategory[]).map(cat => (
            <div key={cat}>
              <p className={clsx('text-[10px] font-bold uppercase tracking-wider mb-2 px-1', CATEGORY_META[cat].color)}>
                {CATEGORY_META[cat].label}
              </p>
              <div className="space-y-2">
                {grouped[cat].map(def => (
                  <div key={def.id}
                    className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200 shadow-sm hover:border-emerald-200 transition-all">
                    <span className="text-xl flex-shrink-0">{def.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800">{def.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {def.unit && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                            {def.unit}
                          </span>
                        )}
                        <span className={clsx('text-[10px] font-semibold px-1.5 py-0.5 rounded', CATEGORY_META[def.category].bg, CATEGORY_META[def.category].color)}>
                          {CATEGORY_META[def.category].label}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteDef.mutate(def.id)}
                      className="flex-shrink-0 p-1.5 rounded-lg text-gray-300 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
