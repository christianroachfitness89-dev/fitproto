import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Plus, X, Loader2, Trash2, Search,
  Dumbbell, Clock, ChevronLeft, ChevronRight, Minus, GripVertical,
} from 'lucide-react'
import clsx from 'clsx'
import {
  useProgramDetail, useUpdateProgram, useDeleteProgram,
  useAddProgramWorkout, useRemoveProgramWorkout, useMoveProgramWorkout,
  useWorkouts, useCreateWorkout,
} from '@/hooks/useWorkouts'

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// ─── Workout picker ───────────────────────────────────────────
function WorkoutPicker({
  week, day, isPending, onAdd, onClose,
}: {
  week: number; day: number; isPending: boolean
  onAdd: (workoutId: string) => void; onClose: () => void
}) {
  const [search, setSearch]     = useState('')
  const [creating, setCreating] = useState(false)
  const [newName, setNewName]   = useState('')
  const { data: workouts = [], isLoading } = useWorkouts(search.length >= 2 ? search : undefined)
  const createWorkout = useCreateWorkout()
  const inputRef   = useRef<HTMLInputElement>(null)
  const newNameRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])
  useEffect(() => { if (creating) newNameRef.current?.focus() }, [creating])

  async function handleCreate() {
    const name = newName.trim()
    if (!name) return
    const w = await createWorkout.mutateAsync({
      name, description: null, difficulty: null, category: null, duration_minutes: null,
    })
    onAdd(w.id)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-[#161b27] border border-[#242d40] rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col z-10">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e2535]">
          <div>
            {creating ? (
              <button onClick={() => setCreating(false)}
                className="flex items-center gap-1.5 text-sm text-[#6a7a95] hover:text-[#c5cedb] font-medium mb-0.5 transition-colors">
                <ArrowLeft size={14} /> Back
              </button>
            ) : (
              <>
                <h2 className="text-base font-bold text-[#e8edf5]">Add Workout</h2>
                <p className="text-xs text-[#4a5a75] mt-0.5">Week {week} · {DAY_NAMES[day - 1]}</p>
              </>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl text-[#3a4a62] hover:text-[#8a9ab5] hover:bg-white/5 transition-all">
            <X size={18} />
          </button>
        </div>

        {creating ? (
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-[#3a4a62] uppercase tracking-widest mb-2">
                Workout name
              </label>
              <input
                ref={newNameRef}
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCreate() }}
                placeholder="e.g. Upper Body Push"
                className="w-full px-3.5 py-2.5 text-sm bg-[#1e2535] border border-[#2e3a52] text-[#c5cedb] placeholder-[#3a4a62] rounded-xl focus:outline-none focus:border-amber-400/50"
              />
              <p className="text-xs text-[#4a5a75] mt-1.5">
                A blank workout will be created and added to this slot.
              </p>
            </div>
            <button
              onClick={handleCreate}
              disabled={!newName.trim() || createWorkout.isPending || isPending}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-amber-400 text-[#0d1117] text-sm font-black rounded-xl hover:bg-amber-300 transition-colors disabled:opacity-50">
              {(createWorkout.isPending || isPending) ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
              Create &amp; Add
            </button>
          </div>
        ) : (
          <>
            <div className="px-4 py-3 border-b border-[#1e2535]">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#3a4a62]" />
                <input ref={inputRef} value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search workouts..."
                  className="w-full pl-9 pr-4 py-2.5 text-sm bg-[#1e2535] border border-[#2e3a52] text-[#c5cedb] placeholder-[#3a4a62] rounded-xl focus:outline-none focus:border-amber-400/50" />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-1 min-h-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 size={20} className="animate-spin text-[#2e3a52]" />
                </div>
              ) : workouts.length === 0 ? (
                <p className="text-sm text-[#3a4a62] text-center py-10">
                  {search.length >= 2 ? 'No workouts match your search' : 'No workouts in your library yet'}
                </p>
              ) : (
                workouts.map(w => (
                  <button key={w.id} type="button"
                    onClick={() => onAdd(w.id)}
                    disabled={isPending}
                    className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.03] transition-colors group disabled:opacity-50">
                    <div className="w-9 h-9 rounded-xl bg-amber-400/10 flex items-center justify-center flex-shrink-0">
                      <Dumbbell size={15} className="text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#c5cedb] truncate">{w.name}</p>
                      <p className="text-xs text-[#4a5a75]">
                        {(w as any).workout_exercises?.length ?? 0} exercises
                        {w.difficulty ? ` · ${w.difficulty}` : ''}
                        {w.duration_minutes ? ` · ${w.duration_minutes}min` : ''}
                      </p>
                    </div>
                    {isPending
                      ? <Loader2 size={14} className="animate-spin text-[#3a4a62] flex-shrink-0" />
                      : <Plus size={14} className="text-[#3a4a62] group-hover:text-amber-400 transition-colors flex-shrink-0" />
                    }
                  </button>
                ))
              )}
            </div>

            <div className="px-4 py-3 border-t border-[#1e2535]">
              <button
                onClick={() => { setCreating(true); setNewName(search) }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-2 border-dashed border-[#2e3a52] text-[#4a5a75] hover:border-amber-400/40 hover:text-amber-400 transition-all text-sm font-medium">
                <Plus size={15} className="flex-shrink-0" />
                Create new workout{search.length >= 2 ? ` "${search}"` : ''}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Program Builder ──────────────────────────────────────────
export default function ProgramBuilder() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: program, isLoading } = useProgramDetail(id)
  const updateProgram = useUpdateProgram()
  const deleteProgram = useDeleteProgram()
  const addWorkout    = useAddProgramWorkout(id!)
  const removeWorkout = useRemoveProgramWorkout(id!)
  const moveWorkout   = useMoveProgramWorkout(id!)

  const [currentWeek, setCurrentWeek]     = useState(1)
  const [addingSlot, setAddingSlot]       = useState<{ week: number; day: number } | null>(null)
  const [name, setName]                   = useState('')
  const [savingName, setSavingName]       = useState(false)
  const [draggedSlotId, setDraggedSlotId] = useState<string | null>(null)
  const [dragTargetDay, setDragTargetDay] = useState<number | null>(null)
  const nameTimer = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => { if (program) setName(program.name) }, [program?.id])

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center py-32 bg-[#0d1117]">
        <Loader2 size={24} className="animate-spin text-[#2e3a52]" />
      </div>
    )
  }

  if (!program) {
    return <div className="p-8 text-center text-[#4a5a75] bg-[#0d1117] min-h-screen">Program not found.</div>
  }

  const totalWeeks = Math.max(program.duration_weeks ?? 1, 1)

  const slotMap: Record<number, Record<number, typeof program.program_workouts>> = {}
  for (const pw of program.program_workouts) {
    ;(slotMap[pw.week_number] ??= {})[pw.day_number] ??= []
    slotMap[pw.week_number][pw.day_number].push(pw)
  }

  function handleNameChange(val: string) {
    setName(val)
    clearTimeout(nameTimer.current)
    setSavingName(true)
    nameTimer.current = setTimeout(async () => {
      await updateProgram.mutateAsync({ id: program!.id, name: val.trim() || 'Untitled Program' })
      setSavingName(false)
    }, 600)
  }

  async function addWeek() {
    const next = totalWeeks + 1
    await updateProgram.mutateAsync({ id: program!.id, duration_weeks: next })
    setCurrentWeek(next)
  }

  async function removeLastWeek() {
    if (totalWeeks <= 1) return
    const toDelete = program!.program_workouts.filter(pw => pw.week_number === totalWeeks)
    for (const pw of toDelete) await removeWorkout.mutateAsync(pw.id)
    await updateProgram.mutateAsync({ id: program!.id, duration_weeks: totalWeeks - 1 })
    if (currentWeek >= totalWeeks) setCurrentWeek(totalWeeks - 1)
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${program!.name}"? This cannot be undone.`)) return
    await deleteProgram.mutateAsync(program!.id)
    navigate('/library/programs')
  }

  async function handleAddWorkout(workoutId: string) {
    if (!addingSlot) return
    await addWorkout.mutateAsync({
      workout_id: workoutId,
      week_number: addingSlot.week,
      day_number: addingSlot.day,
    })
    setAddingSlot(null)
  }

  const totalScheduled = program.program_workouts.length

  return (
    <div className="flex flex-col min-h-screen bg-[#0d1117]">
      {addingSlot && (
        <WorkoutPicker
          week={addingSlot.week} day={addingSlot.day}
          isPending={addWorkout.isPending}
          onAdd={handleAddWorkout} onClose={() => setAddingSlot(null)}
        />
      )}

      {/* ── Top bar ── */}
      <div className="bg-[#0d1117] border-b border-[#1e2535] px-6 py-4 flex items-center gap-4 sticky top-0 z-10">
        <button onClick={() => navigate('/library/programs')}
          className="flex items-center gap-1.5 text-sm text-[#4a5a75] hover:text-[#c5cedb] font-medium transition-colors flex-shrink-0">
          <ArrowLeft size={16} /> Programs
        </button>
        <div className="w-px h-5 bg-[#242d40] flex-shrink-0" />
        <input
          value={name}
          onChange={e => handleNameChange(e.target.value)}
          className="flex-1 text-lg font-black text-[#e8edf5] bg-transparent border-none outline-none placeholder-[#2e3a52] min-w-0"
          style={{ fontFamily: "'Syne', system-ui, sans-serif" }}
          placeholder="Program name…"
        />
        {savingName && <Loader2 size={14} className="animate-spin text-[#3a4a62] flex-shrink-0" />}
        <div className="flex items-center gap-1 text-[10px] text-[#3a4a62] flex-shrink-0 uppercase tracking-widest font-bold">
          <span className="text-[#8a9ab5]">{totalWeeks}</span> wks ·{' '}
          <span className="text-[#8a9ab5]">{totalScheduled}</span> sessions
        </div>
        <button onClick={handleDelete}
          className="p-2 rounded-xl text-[#3a4a62] hover:text-rose-400 hover:bg-rose-400/10 transition-all flex-shrink-0">
          <Trash2 size={16} />
        </button>
      </div>

      {/* ── Metadata bar ── */}
      <div className="bg-[#0d1117] border-b border-[#1e2535] px-6 py-3 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-[10px] font-bold text-[#3a4a62] uppercase tracking-widest">Level</label>
          <select
            value={program.difficulty ?? ''}
            onChange={e => updateProgram.mutate({ id: program.id, difficulty: (e.target.value as any) || null })}
            className="text-sm bg-[#1e2535] border border-[#2e3a52] text-[#c5cedb] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-amber-400/50">
            <option value="">Any</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[10px] font-bold text-[#3a4a62] uppercase tracking-widest">Category</label>
          <input
            key={program.id + '-cat'}
            defaultValue={program.category ?? ''}
            onBlur={e => updateProgram.mutate({ id: program.id, category: e.target.value.trim() || null })}
            placeholder="e.g. Strength"
            className="text-sm bg-[#1e2535] border border-[#2e3a52] text-[#c5cedb] placeholder-[#3a4a62] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-amber-400/50 w-32" />
        </div>
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <label className="text-[10px] font-bold text-[#3a4a62] uppercase tracking-widest flex-shrink-0">Description</label>
          <input
            key={program.id + '-desc'}
            defaultValue={program.description ?? ''}
            onBlur={e => updateProgram.mutate({ id: program.id, description: e.target.value.trim() || null })}
            placeholder="Brief description…"
            className="text-sm bg-[#1e2535] border border-[#2e3a52] text-[#c5cedb] placeholder-[#3a4a62] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-amber-400/50 flex-1 min-w-0" />
        </div>
      </div>

      {/* ── Week navigator ── */}
      <div className="bg-[#0d1117] border-b border-[#1e2535] px-6 py-3 flex items-center gap-2">
        <button onClick={() => setCurrentWeek(w => Math.max(1, w - 1))} disabled={currentWeek <= 1}
          className="p-1.5 rounded-lg text-[#4a5a75] hover:bg-white/5 hover:text-[#c5cedb] disabled:opacity-30 transition-all">
          <ChevronLeft size={16} />
        </button>

        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar flex-1">
          {Array.from({ length: totalWeeks }, (_, i) => i + 1).map(w => (
            <button key={w} onClick={() => setCurrentWeek(w)}
              className={clsx(
                'flex-shrink-0 px-3 py-1 rounded-lg text-xs font-bold transition-all',
                w === currentWeek
                  ? 'bg-amber-400 text-[#0d1117]'
                  : 'text-[#4a5a75] hover:bg-white/5 hover:text-[#8a9ab5]',
              )}>
              W{w}
            </button>
          ))}
        </div>

        <button onClick={() => setCurrentWeek(w => Math.min(totalWeeks, w + 1))} disabled={currentWeek >= totalWeeks}
          className="p-1.5 rounded-lg text-[#4a5a75] hover:bg-white/5 hover:text-[#c5cedb] disabled:opacity-30 transition-all">
          <ChevronRight size={16} />
        </button>

        <div className="w-px h-5 bg-[#242d40] mx-1" />

        <button onClick={addWeek} disabled={updateProgram.isPending}
          className="flex items-center gap-1 text-xs font-bold text-amber-400/70 hover:text-amber-400 hover:bg-amber-400/10 px-3 py-1.5 rounded-lg transition-all disabled:opacity-50">
          <Plus size={13} /> Week
        </button>
        {totalWeeks > 1 && (
          <button onClick={removeLastWeek} disabled={updateProgram.isPending || removeWorkout.isPending}
            className="flex items-center gap-1 text-xs font-bold text-[#4a5a75] hover:text-rose-400 hover:bg-rose-400/10 px-3 py-1.5 rounded-lg transition-all disabled:opacity-50">
            <Minus size={13} /> Week
          </button>
        )}
      </div>

      {/* ── Day grid ── */}
      <div className="flex-1 p-6 overflow-x-auto">
        <div className="grid grid-cols-7 gap-3 min-w-[700px]">
          {DAY_NAMES.map((dayName, idx) => {
            const dayNum    = idx + 1
            const slots     = slotMap[currentWeek]?.[dayNum] ?? []
            const isWeekend = dayNum >= 6
            const isTarget  = dragTargetDay === dayNum && draggedSlotId !== null

            return (
              <div
                key={dayNum}
                className={clsx(
                  'flex flex-col gap-2 rounded-xl transition-all',
                  isTarget && 'ring-2 ring-amber-400/40 ring-offset-1 ring-offset-[#0d1117] bg-amber-400/5',
                )}
                onDragOver={e => { e.preventDefault(); setDragTargetDay(dayNum) }}
                onDragLeave={e => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragTargetDay(null)
                }}
                onDrop={e => {
                  e.preventDefault()
                  if (draggedSlotId) {
                    moveWorkout.mutate({ id: draggedSlotId, week_number: currentWeek, day_number: dayNum })
                  }
                  setDraggedSlotId(null)
                  setDragTargetDay(null)
                }}
              >
                {/* Day header */}
                <div className={clsx(
                  'text-center py-2.5 rounded-xl',
                  isWeekend ? 'bg-[#1a1f2e]' : 'bg-amber-400/10',
                )}>
                  <p className={clsx(
                    'text-[10px] font-black uppercase tracking-widest',
                    isWeekend ? 'text-[#3a4a62]' : 'text-amber-400',
                  )}>{dayName}</p>
                </div>

                {/* Workout slots */}
                {slots.map(slot => (
                  <div
                    key={slot.id}
                    draggable
                    onDragStart={() => setDraggedSlotId(slot.id)}
                    onDragEnd={() => { setDraggedSlotId(null); setDragTargetDay(null) }}
                    className={clsx(
                      'group bg-[#161b27] border border-[#242d40] rounded-xl p-3 hover:border-amber-400/30 transition-all cursor-grab active:cursor-grabbing',
                      draggedSlotId === slot.id && 'opacity-40',
                    )}>
                    <div className="flex items-start justify-between gap-1 mb-1.5">
                      <GripVertical size={11} className="text-[#2e3a52] group-hover:text-[#4a5a75] mt-0.5 flex-shrink-0 transition-colors" />
                      <p className="text-xs font-semibold text-[#c5cedb] leading-tight line-clamp-2 flex-1">
                        {slot.workout?.name ?? 'Unnamed'}
                      </p>
                      <button
                        onClick={() => removeWorkout.mutate(slot.id)}
                        disabled={removeWorkout.isPending}
                        className="opacity-0 group-hover:opacity-100 flex-shrink-0 text-[#2e3a52] hover:text-rose-400 transition-all disabled:opacity-50 mt-0.5">
                        <X size={12} />
                      </button>
                    </div>
                    {slot.workout?.difficulty && (
                      <span className={clsx(
                        'inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                        slot.workout.difficulty === 'beginner'     ? 'bg-emerald-400/10 text-emerald-400' :
                        slot.workout.difficulty === 'intermediate' ? 'bg-amber-400/10 text-amber-400'    :
                                                                     'bg-rose-400/10 text-rose-400',
                      )}>
                        {slot.workout.difficulty}
                      </span>
                    )}
                    {slot.workout?.duration_minutes && (
                      <p className="text-[10px] text-[#4a5a75] mt-1 flex items-center gap-1">
                        <Clock size={9} />{slot.workout.duration_minutes}m
                      </p>
                    )}
                  </div>
                ))}

                {/* Add button */}
                <button
                  onClick={() => setAddingSlot({ week: currentWeek, day: dayNum })}
                  className="flex items-center justify-center gap-1 py-4 border-2 border-dashed border-[#1e2535] rounded-xl text-[#2e3a52] hover:border-amber-400/30 hover:text-amber-400 hover:bg-amber-400/5 transition-all">
                  <Plus size={14} />
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
