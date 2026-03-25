import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Users2, Plus, Pin, PinOff, Trash2, Heart, MessageCircle,
  Video, FileText, Headphones, AlignLeft, ChevronDown, ChevronRight,
  Loader2, X, BookOpen, Eye, EyeOff, Clock, MoreVertical,
  Globe, Lock, Film, Users, UserCheck, Monitor, Settings2,
  Check, CheckCircle2, Circle, Search, UserPlus, UploadCloud,
} from 'lucide-react'
import clsx from 'clsx'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

// ─── Types ─────────────────────────────────────────────────────

interface CommunityPost {
  id: string
  content: string
  media_url: string | null
  media_type: 'image' | 'video' | 'audio' | null
  pinned: boolean
  created_at: string
  author_type: string
  reaction_count: number
  comment_count: number
}

interface CommunityModule {
  id: string
  title: string
  description: string | null
  cover_url: string | null
  position: number
  published: boolean
  access_type: 'all' | 'enrolled'
  auto_enroll_on_join: boolean
  created_at: string
}

interface ClientRow {
  id: string
  name: string
  status: string
  email: string | null
}

interface CommunityLesson {
  id: string
  module_id: string
  title: string
  description: string | null
  content_type: 'video' | 'audio' | 'document' | 'text'
  content_url: string | null
  body: string | null
  drip_days: number
  position: number
  published: boolean
  duration_minutes: number | null
  created_at: string
}

// ─── Content type helpers ───────────────────────────────────────

const CONTENT_TYPES: { value: CommunityLesson['content_type']; label: string; Icon: React.ElementType }[] = [
  { value: 'video',    label: 'Video',    Icon: Video },
  { value: 'audio',   label: 'Audio',    Icon: Headphones },
  { value: 'document', label: 'Document', Icon: FileText },
  { value: 'text',    label: 'Text',     Icon: AlignLeft },
]

function contentTypeIcon(type: CommunityLesson['content_type']) {
  const found = CONTENT_TYPES.find(c => c.value === type)
  const Icon = found?.Icon ?? AlignLeft
  return <Icon size={14} />
}

function contentTypeBg(type: CommunityLesson['content_type']) {
  return {
    video:    'bg-violet-100 text-violet-700',
    audio:    'bg-pink-100 text-pink-700',
    document: 'bg-blue-100 text-blue-700',
    text:     'bg-gray-100 text-gray-600',
  }[type]
}

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60)    return 'just now'
  if (diff < 3600)  return `${Math.floor(diff/60)}m ago`
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`
  return `${Math.floor(diff/86400)}d ago`
}

// ─── Feed Tab ───────────────────────────────────────────────────

function FeedTab({ orgId }: { orgId: string }) {
  const [posts, setPosts]       = useState<CommunityPost[]>([])
  const [loading, setLoading]   = useState(true)
  const [content, setContent]   = useState('')
  const [mediaUrl, setMediaUrl] = useState('')
  const [mediaType, setMediaType] = useState<CommunityPost['media_type']>(null)
  const [posting, setPosting]   = useState(false)
  const [showMedia, setShowMedia] = useState(false)

  useEffect(() => { fetchPosts() }, [orgId])

  async function fetchPosts() {
    setLoading(true)
    const { data } = await supabase
      .from('community_posts')
      .select('id,content,media_url,media_type,pinned,created_at,author_type,author_client_id')
      .eq('org_id', orgId)
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false })
    if (data) {
      // Enrich with counts
      const enriched: CommunityPost[] = await Promise.all(data.map(async p => {
        const [{ count: rc }, { count: cc }] = await Promise.all([
          supabase.from('community_reactions').select('*', { count: 'exact', head: true }).eq('post_id', p.id),
          supabase.from('community_comments').select('*',  { count: 'exact', head: true }).eq('post_id', p.id),
        ])
        return { ...p, reaction_count: rc ?? 0, comment_count: cc ?? 0 } as CommunityPost
      }))
      setPosts(enriched)
    }
    setLoading(false)
  }

  async function handlePost() {
    if (!content.trim()) return
    setPosting(true)
    await supabase.from('community_posts').insert({
      org_id: orgId,
      content: content.trim(),
      media_url:  mediaUrl.trim() || null,
      media_type: mediaUrl.trim() ? mediaType : null,
    })
    setContent(''); setMediaUrl(''); setMediaType(null); setShowMedia(false)
    setPosting(false)
    fetchPosts()
  }

  async function handlePin(id: string, current: boolean) {
    await supabase.from('community_posts').update({ pinned: !current }).eq('id', id)
    setPosts(prev => prev.map(p => p.id === id ? { ...p, pinned: !current } : p)
      .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || new Date(b.created_at).getTime() - new Date(a.created_at).getTime()))
  }

  async function handleDelete(id: string) {
    await supabase.from('community_posts').delete().eq('id', id)
    setPosts(prev => prev.filter(p => p.id !== id))
  }

  return (
    <div className="space-y-6">
      {/* Composer */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <p className="text-sm font-semibold text-gray-700 mb-3">New Post</p>
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Share an update, tip, or announcement with your community…"
          rows={3}
          className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400"
        />

        {showMedia && (
          <div className="mt-3 flex gap-2">
            <select
              value={mediaType ?? ''}
              onChange={e => setMediaType(e.target.value as CommunityPost['media_type'] || null)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400"
            >
              <option value="">Type…</option>
              <option value="image">Image</option>
              <option value="video">Video</option>
              <option value="audio">Audio</option>
            </select>
            <input
              value={mediaUrl}
              onChange={e => setMediaUrl(e.target.value)}
              placeholder="Paste URL…"
              className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400"
            />
          </div>
        )}

        <div className="flex items-center justify-between mt-3">
          <button
            onClick={() => setShowMedia(v => !v)}
            className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-brand-600 transition-colors"
          >
            <Film size={14} />
            {showMedia ? 'Remove media' : 'Add media'}
          </button>
          <button
            onClick={handlePost}
            disabled={!content.trim() || posting}
            className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {posting && <Loader2 size={14} className="animate-spin" />}
            Post
          </button>
        </div>
      </div>

      {/* Posts */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 size={24} className="animate-spin text-brand-500" />
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <div className="w-12 h-12 rounded-2xl bg-brand-50 flex items-center justify-center mx-auto mb-3">
            <MessageCircle size={22} className="text-brand-500" />
          </div>
          <p className="font-semibold text-gray-700">No posts yet</p>
          <p className="text-sm text-gray-400 mt-1">Write your first community update above.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map(post => (
            <PostCard key={post.id} post={post} onPin={handlePin} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  )
}

function PostCard({ post, onPin, onDelete }: {
  post: CommunityPost
  onPin: (id: string, current: boolean) => void
  onDelete: (id: string) => void
}) {
  const [menu, setMenu] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function handler(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setMenu(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className={clsx(
      'bg-white rounded-2xl border p-5 shadow-sm transition-all',
      post.pinned ? 'border-brand-200 bg-brand-50/30' : 'border-gray-100',
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            C
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">Coach</p>
            <p className="text-xs text-gray-400">{timeAgo(post.created_at)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {post.pinned && (
            <span className="flex items-center gap-1 text-xs text-brand-600 font-semibold bg-brand-100 rounded-full px-2.5 py-0.5">
              <Pin size={10} /> Pinned
            </span>
          )}
          <div ref={ref} className="relative">
            <button onClick={() => setMenu(v => !v)}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100">
              <MoreVertical size={16} />
            </button>
            {menu && (
              <div className="absolute right-0 top-8 z-20 w-40 bg-white border border-gray-100 rounded-xl shadow-xl py-1 overflow-hidden">
                <button onClick={() => { onPin(post.id, post.pinned); setMenu(false) }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                  {post.pinned ? <PinOff size={14} /> : <Pin size={14} />}
                  {post.pinned ? 'Unpin' : 'Pin post'}
                </button>
                <button onClick={() => { onDelete(post.id); setMenu(false) }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <p className="text-sm text-gray-700 mt-3 leading-relaxed whitespace-pre-wrap">{post.content}</p>

      {/* Media preview */}
      {post.media_url && post.media_type === 'image' && (
        <img src={post.media_url} alt="" className="mt-3 rounded-xl max-h-64 object-cover w-full" />
      )}
      {post.media_url && post.media_type === 'video' && (
        <div className="mt-3 rounded-xl overflow-hidden aspect-video bg-black">
          <iframe src={post.media_url} className="w-full h-full" allowFullScreen />
        </div>
      )}
      {post.media_url && post.media_type === 'audio' && (
        <audio src={post.media_url} controls className="mt-3 w-full" />
      )}

      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-100 text-xs text-gray-400">
        <span className="flex items-center gap-1.5"><Heart size={13} /> {post.reaction_count}</span>
        <span className="flex items-center gap-1.5"><MessageCircle size={13} /> {post.comment_count}</span>
      </div>
    </div>
  )
}

// ─── Module Access Modal ────────────────────────────────────────

function ModuleAccessModal({ mod, orgId, onClose, onUpdated }: {
  mod: CommunityModule
  orgId: string
  onClose: () => void
  onUpdated: (id: string, updates: Partial<CommunityModule>) => void
}) {
  const [accessType, setAccessType] = useState<'all' | 'enrolled'>(mod.access_type)
  const [autoEnroll, setAutoEnroll] = useState(mod.auto_enroll_on_join)
  const [clients, setClients] = useState<ClientRow[]>([])
  const [enrolled, setEnrolled] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    Promise.all([
      supabase.from('clients').select('id,name,status,email').eq('org_id', orgId).order('name'),
      supabase.from('community_module_enrollments').select('client_id').eq('module_id', mod.id),
    ]).then(([{ data: c }, { data: e }]) => {
      setClients((c ?? []) as ClientRow[])
      setEnrolled(new Set((e ?? []).map((x: any) => x.client_id as string)))
      setLoading(false)
    })
  }, [mod.id, orgId])

  async function handleSave() {
    setSaving(true)
    await supabase.from('community_modules').update({ access_type: accessType, auto_enroll_on_join: autoEnroll }).eq('id', mod.id)
    if (accessType === 'enrolled') {
      const { data: current } = await supabase.from('community_module_enrollments').select('client_id').eq('module_id', mod.id)
      const currentSet = new Set((current ?? []).map((x: any) => x.client_id as string))
      const toAdd = [...enrolled].filter(id => !currentSet.has(id))
      const toRemove = [...currentSet].filter(id => !enrolled.has(id))
      if (toAdd.length > 0) await supabase.from('community_module_enrollments').insert(toAdd.map(client_id => ({ module_id: mod.id, client_id })))
      if (toRemove.length > 0) await supabase.from('community_module_enrollments').delete().eq('module_id', mod.id).in('client_id', toRemove)
    }
    setSaving(false)
    onUpdated(mod.id, { access_type: accessType, auto_enroll_on_join: autoEnroll })
    onClose()
  }

  const filtered = clients.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="font-bold text-gray-800">Manage Access</p>
            <p className="text-xs text-gray-400 mt-0.5">{mod.title}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={20} /></button>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4">
          {([
            { value: 'all' as const,      label: 'All Members',   desc: 'Every client automatically has access', Icon: Users },
            { value: 'enrolled' as const, label: 'Enrolled Only', desc: 'Only clients you specifically enroll',  Icon: UserCheck },
          ]).map(({ value, label, desc, Icon }) => (
            <button key={value} onClick={() => setAccessType(value)}
              className={clsx('flex flex-col gap-1 p-3 rounded-xl border text-left transition-all',
                accessType === value ? 'border-brand-400 bg-brand-50' : 'border-gray-200 hover:border-gray-300')}>
              <div className="flex items-center gap-2">
                <Icon size={14} className={accessType === value ? 'text-brand-600' : 'text-gray-400'} />
                <span className={clsx('text-sm font-semibold', accessType === value ? 'text-brand-700' : 'text-gray-700')}>{label}</span>
              </div>
              <p className="text-xs text-gray-400">{desc}</p>
            </button>
          ))}
        </div>

        <label className="flex items-center justify-between py-3 border-t border-gray-100 mb-4 cursor-pointer">
          <div>
            <p className="text-sm font-semibold text-gray-700">Auto-enroll new clients</p>
            <p className="text-xs text-gray-400 mt-0.5">Automatically enroll clients when they join</p>
          </div>
          <div onClick={() => setAutoEnroll(v => !v)}
            className={clsx('w-10 h-6 rounded-full transition-colors relative flex-shrink-0 cursor-pointer', autoEnroll ? 'bg-brand-500' : 'bg-gray-200')}>
            <span className={clsx('absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform', autoEnroll ? 'translate-x-5' : 'translate-x-1')} />
          </div>
        </label>

        {accessType === 'enrolled' && (
          <div className="flex-1 overflow-hidden flex flex-col min-h-0 border-t border-gray-100 pt-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Enrolled Clients</p>
              <span className="text-xs text-gray-400">{enrolled.size} enrolled</span>
            </div>
            <div className="relative mb-2">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search clients…"
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400" />
            </div>
            {loading ? (
              <div className="flex justify-center py-6"><Loader2 size={18} className="animate-spin text-brand-500" /></div>
            ) : (
              <div className="overflow-y-auto flex-1 space-y-0.5">
                {filtered.length === 0
                  ? <p className="text-center text-sm text-gray-400 py-4">No clients found</p>
                  : filtered.map(client => (
                    <button key={client.id}
                      onClick={() => setEnrolled(prev => { const n = new Set(prev); n.has(client.id) ? n.delete(client.id) : n.add(client.id); return n })}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors">
                      <div className={clsx('w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                        enrolled.has(client.id) ? 'bg-brand-500 border-brand-500' : 'border-gray-300')}>
                        {enrolled.has(client.id) && <Check size={11} className="text-white" />}
                      </div>
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {client.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="flex-1 text-sm text-gray-700 text-left">{client.name}</span>
                      <span className={clsx('text-[11px] font-semibold px-2 py-0.5 rounded-full',
                        client.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>{client.status}</span>
                    </button>
                  ))}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-40 flex items-center gap-2 transition-colors">
            {saving && <Loader2 size={14} className="animate-spin" />} Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Client Courses Modal ───────────────────────────────────────

function ClientCoursesModal({ client, modules, enrollments, onClose, onSaved }: {
  client: ClientRow
  modules: CommunityModule[]
  enrollments: Record<string, Set<string>>
  onClose: () => void
  onSaved: () => void
}) {
  const [localEnrolled, setLocalEnrolled] = useState<Set<string>>(
    new Set(modules.filter(m => m.access_type === 'enrolled' && enrollments[m.id]?.has(client.id)).map(m => m.id))
  )
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    for (const m of modules.filter(x => x.access_type === 'enrolled')) {
      const was = enrollments[m.id]?.has(client.id) ?? false
      const is  = localEnrolled.has(m.id)
      if (!was && is)  await supabase.from('community_module_enrollments').insert({ module_id: m.id, client_id: client.id })
      if (was  && !is) await supabase.from('community_module_enrollments').delete().eq('module_id', m.id).eq('client_id', client.id)
    }
    setSaving(false)
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="font-bold text-gray-800">Assign Courses</p>
            <p className="text-xs text-gray-400 mt-0.5">{client.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto space-y-2">
          {modules.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No courses created yet.</p>}
          {modules.map(m => {
            const isAll     = m.access_type === 'all'
            const isChecked = isAll || localEnrolled.has(m.id)
            return (
              <div key={m.id} className={clsx('flex items-center gap-3 px-4 py-3 rounded-xl border transition-all',
                isChecked ? 'border-brand-200 bg-brand-50/50' : 'border-gray-200 hover:border-gray-300')}>
                <button disabled={isAll}
                  onClick={() => setLocalEnrolled(prev => { const n = new Set(prev); n.has(m.id) ? n.delete(m.id) : n.add(m.id); return n })}
                  className={clsx('w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                    isChecked ? 'bg-brand-500 border-brand-500' : 'border-gray-300', isAll && 'cursor-default opacity-70')}>
                  {isChecked && <Check size={11} className="text-white" />}
                </button>
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-brand-600 flex items-center justify-center flex-shrink-0">
                  <BookOpen size={14} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-700 truncate">{m.title}</p>
                  <p className="text-xs text-gray-400">{isAll ? 'All members • Always accessible' : 'Enrolled only'}</p>
                </div>
                {isAll && <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold flex-shrink-0">All Access</span>}
              </div>
            )
          })}
        </div>
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-40 flex items-center gap-2 transition-colors">
            {saving && <Loader2 size={14} className="animate-spin" />} Save
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Courses Tab ────────────────────────────────────────────────

function CoursesTab({ orgId }: { orgId: string }) {
  const [modules, setModules]       = useState<CommunityModule[]>([])
  const [lessons, setLessons]       = useState<Record<string, CommunityLesson[]>>({})
  const [expanded, setExpanded]     = useState<Set<string>>(new Set())
  const [loading, setLoading]       = useState(true)
  // Module form
  const [showModuleForm, setShowModuleForm]   = useState(false)
  const [moduleDraft, setModuleDraft]         = useState({ title: '', description: '' })
  const [savingModule, setSavingModule]       = useState(false)
  // Access modal
  const [accessModal, setAccessModal]         = useState<CommunityModule | null>(null)
  // Lesson form
  const [lessonFor, setLessonFor]             = useState<string | null>(null) // module_id
  const [lessonDraft, setLessonDraft]         = useState<{
    title: string; description: string; content_type: CommunityLesson['content_type']
    content_url: string; body: string; drip_days: string; duration_minutes: string
  }>({ title: '', description: '', content_type: 'video', content_url: '', body: '', drip_days: '0', duration_minutes: '' })
  const [savingLesson, setSavingLesson]       = useState(false)
  const [uploading, setUploading]             = useState(false)
  const [uploadProgress, setUploadProgress]   = useState(0)
  const fileInputRef                          = useRef<HTMLInputElement>(null)

  useEffect(() => { fetchModules() }, [orgId])

  async function fetchModules() {
    setLoading(true)
    const { data } = await supabase
      .from('community_modules')
      .select('*')
      .eq('org_id', orgId)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true })
    setModules(data ?? [])
    setLoading(false)
  }

  async function fetchLessons(moduleId: string) {
    const { data } = await supabase
      .from('community_lessons')
      .select('*')
      .eq('module_id', moduleId)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true })
    setLessons(prev => ({ ...prev, [moduleId]: data ?? [] }))
  }

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) }
      else { next.add(id); if (!lessons[id]) fetchLessons(id) }
      return next
    })
  }

  async function saveModule() {
    if (!moduleDraft.title.trim()) return
    setSavingModule(true)
    await supabase.from('community_modules').insert({
      org_id: orgId,
      title: moduleDraft.title.trim(),
      description: moduleDraft.description.trim() || null,
      position: modules.length,
    })
    setModuleDraft({ title: '', description: '' })
    setShowModuleForm(false)
    setSavingModule(false)
    fetchModules()
  }

  async function toggleModulePublish(m: CommunityModule) {
    await supabase.from('community_modules').update({ published: !m.published }).eq('id', m.id)
    setModules(prev => prev.map(x => x.id === m.id ? { ...x, published: !x.published } : x))
  }

  async function deleteModule(id: string) {
    await supabase.from('community_modules').delete().eq('id', id)
    setModules(prev => prev.filter(m => m.id !== id))
  }

  function openLessonForm(moduleId: string) {
    setLessonFor(moduleId)
    setLessonDraft({ title: '', description: '', content_type: 'video', content_url: '', body: '', drip_days: '0', duration_minutes: '' })
    setUploadProgress(0)
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !lessonFor) return
    setUploading(true)
    setUploadProgress(0)
    const ext  = file.name.split('.').pop() ?? 'bin'
    const path = `${orgId}/${lessonFor}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const { data, error } = await supabase.storage
      .from('course-files')
      .upload(path, file, { upsert: true, contentType: file.type })
    if (error) { alert(`Upload failed: ${error.message}`); setUploading(false); return }
    const { data: { publicUrl } } = supabase.storage.from('course-files').getPublicUrl(path)
    setLessonDraft(d => ({ ...d, content_url: publicUrl }))
    setUploadProgress(100)
    setUploading(false)
    // reset input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function saveLesson() {
    if (!lessonFor || !lessonDraft.title.trim()) return
    setSavingLesson(true)
    await supabase.from('community_lessons').insert({
      module_id:        lessonFor,
      title:            lessonDraft.title.trim(),
      description:      lessonDraft.description.trim() || null,
      content_type:     lessonDraft.content_type,
      content_url:      lessonDraft.content_url.trim() || null,
      body:             lessonDraft.body.trim() || null,
      drip_days:        parseInt(lessonDraft.drip_days) || 0,
      duration_minutes: lessonDraft.duration_minutes ? parseInt(lessonDraft.duration_minutes) : null,
      position:         (lessons[lessonFor]?.length ?? 0),
    })
    setSavingLesson(false)
    setLessonFor(null)
    fetchLessons(lessonFor)
  }

  async function toggleLessonPublish(l: CommunityLesson) {
    await supabase.from('community_lessons').update({ published: !l.published }).eq('id', l.id)
    setLessons(prev => ({
      ...prev,
      [l.module_id]: (prev[l.module_id] ?? []).map(x => x.id === l.id ? { ...x, published: !x.published } : x),
    }))
  }

  async function deleteLesson(l: CommunityLesson) {
    await supabase.from('community_lessons').delete().eq('id', l.id)
    setLessons(prev => ({
      ...prev,
      [l.module_id]: (prev[l.module_id] ?? []).filter(x => x.id !== l.id),
    }))
  }

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">Organise your content into modules and lessons.</p>
        <button
          onClick={() => setShowModuleForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors"
        >
          <Plus size={16} /> New Module
        </button>
      </div>

      {/* New module form */}
      {showModuleForm && (
        <div className="bg-white rounded-2xl border border-brand-200 p-5 shadow-sm">
          <p className="text-sm font-semibold text-gray-700 mb-3">New Module</p>
          <input
            autoFocus
            value={moduleDraft.title}
            onChange={e => setModuleDraft(d => ({ ...d, title: e.target.value }))}
            placeholder="Module title…"
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 mb-2"
          />
          <textarea
            value={moduleDraft.description}
            onChange={e => setModuleDraft(d => ({ ...d, description: e.target.value }))}
            placeholder="Short description (optional)…"
            rows={2}
            className="w-full resize-none rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400"
          />
          <div className="flex justify-end gap-2 mt-3">
            <button onClick={() => setShowModuleForm(false)}
              className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button onClick={saveModule} disabled={!moduleDraft.title.trim() || savingModule}
              className="px-5 py-2 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-40 flex items-center gap-2 transition-colors">
              {savingModule && <Loader2 size={14} className="animate-spin" />} Save
            </button>
          </div>
        </div>
      )}

      {/* Module list */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-brand-500" /></div>
      ) : modules.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <div className="w-12 h-12 rounded-2xl bg-violet-50 flex items-center justify-center mx-auto mb-3">
            <BookOpen size={22} className="text-violet-500" />
          </div>
          <p className="font-semibold text-gray-700">No modules yet</p>
          <p className="text-sm text-gray-400 mt-1">Create your first module to get started.</p>
        </div>
      ) : (
        modules.map(mod => (
          <ModuleCard
            key={mod.id}
            mod={mod}
            lessons={lessons[mod.id]}
            expanded={expanded.has(mod.id)}
            onToggle={() => toggleExpand(mod.id)}
            onPublish={() => toggleModulePublish(mod)}
            onDelete={() => deleteModule(mod.id)}
            onAddLesson={() => openLessonForm(mod.id)}
            onLessonPublish={toggleLessonPublish}
            onLessonDelete={deleteLesson}
            onManageAccess={() => setAccessModal(mod)}
          />
        ))
      )}

      {/* Module Access Modal */}
      {accessModal && (
        <ModuleAccessModal
          mod={accessModal}
          orgId={orgId}
          onClose={() => setAccessModal(null)}
          onUpdated={(id, updates) => {
            setModules(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m))
            setAccessModal(null)
          }}
        />
      )}

      {/* Add Lesson Dialog */}
      {lessonFor && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="font-bold text-gray-800">Add Lesson</p>
              <button onClick={() => setLessonFor(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">
              <input
                autoFocus
                value={lessonDraft.title}
                onChange={e => setLessonDraft(d => ({ ...d, title: e.target.value }))}
                placeholder="Lesson title…"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400"
              />

              {/* Type selector */}
              <div className="grid grid-cols-4 gap-2">
                {CONTENT_TYPES.map(({ value, label, Icon }) => (
                  <button
                    key={value}
                    onClick={() => setLessonDraft(d => ({ ...d, content_type: value }))}
                    className={clsx(
                      'flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs font-semibold transition-all',
                      lessonDraft.content_type === value
                        ? 'border-brand-400 bg-brand-50 text-brand-700'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300',
                    )}>
                    <Icon size={18} />
                    {label}
                  </button>
                ))}
              </div>

              {/* File upload — document and video */}
              {(lessonDraft.content_type === 'document' || lessonDraft.content_type === 'video') && (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={lessonDraft.content_type === 'document'
                      ? '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip'
                      : '.mp4,.mov,.webm'}
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  {lessonDraft.content_url && !uploading ? (
                    /* Uploaded / URL set — show preview chip */
                    <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5">
                      <FileText size={14} className="text-green-600 flex-shrink-0" />
                      <span className="flex-1 text-xs text-green-700 truncate">{lessonDraft.content_url.split('/').pop()}</span>
                      <button onClick={() => setLessonDraft(d => ({ ...d, content_url: '' }))}
                        className="text-green-500 hover:text-red-500 transition-colors flex-shrink-0">
                        <X size={14} />
                      </button>
                    </div>
                  ) : uploading ? (
                    /* Upload progress */
                    <div className="flex items-center gap-3 bg-brand-50 border border-brand-200 rounded-xl px-4 py-2.5">
                      <Loader2 size={14} className="animate-spin text-brand-500 flex-shrink-0" />
                      <span className="text-sm text-brand-600 font-medium">Uploading…</span>
                    </div>
                  ) : (
                    /* Upload button */
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-gray-200 text-gray-500 hover:border-brand-400 hover:text-brand-600 hover:bg-brand-50 transition-all text-sm font-semibold"
                    >
                      <UploadCloud size={18} />
                      {lessonDraft.content_type === 'document' ? 'Upload File (PDF, Word, Excel, PPT…)' : 'Upload Video (.mp4, .mov)'}
                    </button>
                  )}
                </div>
              )}

              {/* URL field — all media types (fallback / alternative) */}
              {(lessonDraft.content_type === 'video' || lessonDraft.content_type === 'audio' || lessonDraft.content_type === 'document') && (
                <div>
                  <input
                    value={lessonDraft.content_url}
                    onChange={e => setLessonDraft(d => ({ ...d, content_url: e.target.value }))}
                    placeholder={
                      lessonDraft.content_type === 'video'
                        ? 'Or paste YouTube, Vimeo, Loom, or .mp4 URL…'
                        : lessonDraft.content_type === 'document'
                        ? 'Or paste Google Drive / Dropbox URL…'
                        : 'Audio URL (.mp3, .wav, SoundCloud, etc.)…'
                    }
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400"
                  />
                  {lessonDraft.content_type === 'video' && (
                    <p className="text-[11px] text-gray-400 mt-1.5 ml-1">
                      YouTube/Vimeo/Loom embed inline. Direct .mp4 plays natively.
                    </p>
                  )}
                </div>
              )}

              {/* Body text — document and text types */}
              {(lessonDraft.content_type === 'document' || lessonDraft.content_type === 'text') && (
                <textarea
                  value={lessonDraft.body}
                  onChange={e => setLessonDraft(d => ({ ...d, body: e.target.value }))}
                  placeholder={lessonDraft.content_type === 'document' ? 'Additional notes or instructions (optional)…' : 'Lesson content…'}
                  rows={5}
                  className="w-full resize-none rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400"
                />
              )}

              <textarea
                value={lessonDraft.description}
                onChange={e => setLessonDraft(d => ({ ...d, description: e.target.value }))}
                placeholder="Short description (optional)…"
                rows={2}
                className="w-full resize-none rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400"
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Drip delay (days)</label>
                  <input
                    type="number" min="0"
                    value={lessonDraft.drip_days}
                    onChange={e => setLessonDraft(d => ({ ...d, drip_days: e.target.value }))}
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Duration (min)</label>
                  <input
                    type="number" min="1"
                    value={lessonDraft.duration_minutes}
                    onChange={e => setLessonDraft(d => ({ ...d, duration_minutes: e.target.value }))}
                    placeholder="Optional"
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setLessonFor(null)}
                className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button onClick={saveLesson} disabled={!lessonDraft.title.trim() || savingLesson || uploading}
                className="px-5 py-2 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-40 flex items-center gap-2 transition-colors">
                {savingLesson && <Loader2 size={14} className="animate-spin" />} Add Lesson
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ModuleCard({
  mod, lessons, expanded, onToggle, onPublish, onDelete, onAddLesson, onLessonPublish, onLessonDelete, onManageAccess,
}: {
  mod: CommunityModule
  lessons: CommunityLesson[] | undefined
  expanded: boolean
  onToggle: () => void
  onPublish: () => void
  onDelete: () => void
  onAddLesson: () => void
  onLessonPublish: (l: CommunityLesson) => void
  onLessonDelete:  (l: CommunityLesson) => void
  onManageAccess: () => void
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Module header */}
      <div className="flex items-center gap-3 px-5 py-4">
        <button onClick={onToggle} className="flex-1 flex items-center gap-3 text-left">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-brand-600 flex items-center justify-center flex-shrink-0">
            <BookOpen size={16} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-800 truncate">{mod.title}</p>
            {mod.description && <p className="text-xs text-gray-400 truncate mt-0.5">{mod.description}</p>}
          </div>
          {expanded ? <ChevronDown size={16} className="text-gray-400 flex-shrink-0" /> : <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />}
        </button>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Access badge */}
          <span className={clsx('text-[10px] font-semibold px-2 py-1 rounded-full flex items-center gap-1',
            mod.access_type === 'all' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700')}>
            {mod.access_type === 'all' ? <><Globe size={9} /> All</> : <><UserCheck size={9} /> Enrolled</>}
          </span>
          <button onClick={onManageAccess} title="Manage access"
            className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors">
            <Settings2 size={14} />
          </button>
          <button onClick={onPublish} title={mod.published ? 'Unpublish' : 'Publish'}
            className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
              mod.published ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-gray-100 text-gray-500 hover:bg-gray-200')}>
            {mod.published ? <><Globe size={12} /> Live</> : <><Lock size={12} /> Draft</>}
          </button>
          <button onClick={onDelete}
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Expanded lessons */}
      {expanded && (
        <div className="border-t border-gray-100">
          {lessons === undefined ? (
            <div className="flex justify-center py-6"><Loader2 size={18} className="animate-spin text-brand-500" /></div>
          ) : (
            <>
              {lessons.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-6">No lessons yet.</p>
              ) : (
                <div className="divide-y divide-gray-50">
                  {lessons.map((lesson, i) => (
                    <div key={lesson.id} className="flex items-center gap-3 px-5 py-3">
                      <span className="text-xs text-gray-300 w-5 text-center font-bold">{i + 1}</span>
                      <span className={clsx('flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0', contentTypeBg(lesson.content_type))}>
                        {contentTypeIcon(lesson.content_type)} {lesson.content_type}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-700 truncate">{lesson.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {lesson.duration_minutes && (
                            <span className="flex items-center gap-1 text-[10px] text-gray-400">
                              <Clock size={9} /> {lesson.duration_minutes}min
                            </span>
                          )}
                          {lesson.drip_days > 0 && (
                            <span className="text-[10px] text-amber-600 font-semibold">Drip +{lesson.drip_days}d</span>
                          )}
                        </div>
                      </div>
                      <button onClick={() => onLessonPublish(lesson)}
                        className={clsx('p-1.5 rounded-lg transition-colors', lesson.published ? 'text-emerald-500 hover:bg-emerald-50' : 'text-gray-300 hover:bg-gray-100')}>
                        {lesson.published ? <Eye size={14} /> : <EyeOff size={14} />}
                      </button>
                      <button onClick={() => onLessonDelete(lesson)}
                        className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="px-5 py-3 border-t border-gray-50">
                <button onClick={onAddLesson}
                  className="flex items-center gap-2 text-sm font-semibold text-brand-600 hover:text-brand-700 transition-colors">
                  <Plus size={15} /> Add lesson
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Members Tab ────────────────────────────────────────────────

function MembersTab({ orgId }: { orgId: string }) {
  const [clients, setClients]         = useState<ClientRow[]>([])
  const [modules, setModules]         = useState<CommunityModule[]>([])
  const [enrollments, setEnrollments] = useState<Record<string, Set<string>>>({})
  const [lessonCounts, setLessonCounts] = useState<Record<string, number>>({})
  const [progress, setProgress]       = useState<Record<string, Record<string, number>>>({})
  const [loading, setLoading]         = useState(true)
  const [selected, setSelected]       = useState<Set<string>>(new Set())
  const [bulkPicker, setBulkPicker]   = useState(false)
  const [clientModal, setClientModal] = useState<ClientRow | null>(null)
  const [search, setSearch]           = useState('')

  useEffect(() => { load() }, [orgId])

  async function load() {
    setLoading(true)
    const [{ data: c }, { data: m }] = await Promise.all([
      supabase.from('clients').select('id,name,status,email').eq('org_id', orgId).order('name'),
      supabase.from('community_modules').select('id,title,access_type,published,auto_enroll_on_join,description,cover_url,position,created_at').eq('org_id', orgId).order('position'),
    ])
    if (!c || !m) { setLoading(false); return }
    setClients(c as ClientRow[])
    setModules(m as CommunityModule[])
    const moduleIds = m.map(x => x.id)
    if (moduleIds.length === 0) { setLoading(false); return }
    const [{ data: e }, { data: lessons }, { data: p }] = await Promise.all([
      supabase.from('community_module_enrollments').select('module_id,client_id').in('module_id', moduleIds),
      supabase.from('community_lessons').select('id,module_id').in('module_id', moduleIds),
      supabase.from('community_lesson_progress').select('lesson_id,client_id').eq('completed', true),
    ])
    const eMap: Record<string, Set<string>> = {}
    for (const row of e ?? []) { if (!eMap[row.module_id]) eMap[row.module_id] = new Set(); eMap[row.module_id].add(row.client_id) }
    setEnrollments(eMap)
    const lCounts: Record<string, number> = {}
    const lessonToMod: Record<string, string> = {}
    for (const l of lessons ?? []) { lCounts[l.module_id] = (lCounts[l.module_id] ?? 0) + 1; lessonToMod[l.id] = l.module_id }
    setLessonCounts(lCounts)
    const pMap: Record<string, Record<string, number>> = {}
    for (const row of p ?? []) {
      const mod = lessonToMod[row.lesson_id]; if (!mod) continue
      if (!pMap[row.client_id]) pMap[row.client_id] = {}
      pMap[row.client_id][mod] = (pMap[row.client_id][mod] ?? 0) + 1
    }
    setProgress(pMap)
    setLoading(false)
  }

  async function bulkEnroll(moduleId: string) {
    await supabase.from('community_module_enrollments').upsert(
      [...selected].map(client_id => ({ module_id: moduleId, client_id })),
      { onConflict: 'module_id,client_id', ignoreDuplicates: true }
    )
    setBulkPicker(false); setSelected(new Set()); load()
  }

  const filtered = clients.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search members…"
            className="w-full pl-8 pr-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400" />
        </div>
        {selected.size > 0 && (
          <button onClick={() => setBulkPicker(v => !v)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors">
            <UserPlus size={15} /> Enroll {selected.size}
          </button>
        )}
      </div>

      {bulkPicker && (
        <div className="bg-white rounded-2xl border border-brand-200 p-4 shadow-sm">
          <p className="text-sm font-semibold text-gray-700 mb-3">Choose a course to enroll selected clients:</p>
          {modules.filter(m => m.access_type === 'enrolled').length === 0
            ? <p className="text-sm text-gray-400 text-center py-2">No enrolled-only courses. Set a course to "Enrolled Only" first.</p>
            : modules.filter(m => m.access_type === 'enrolled').map(m => (
              <button key={m.id} onClick={() => bulkEnroll(m.id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-brand-50 border border-transparent hover:border-brand-200 transition-colors text-left">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-brand-600 flex items-center justify-center flex-shrink-0">
                  <BookOpen size={14} className="text-white" />
                </div>
                <span className="text-sm font-medium text-gray-700">{m.title}</span>
              </button>
            ))
          }
          <button onClick={() => setBulkPicker(false)} className="mt-2 text-xs text-gray-400 hover:text-gray-600 transition-colors">Cancel</button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-brand-500" /></div>
      ) : clients.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <div className="w-12 h-12 rounded-2xl bg-brand-50 flex items-center justify-center mx-auto mb-3"><Users size={22} className="text-brand-500" /></div>
          <p className="font-semibold text-gray-700">No clients yet</p>
          <p className="text-sm text-gray-400 mt-1">Add clients to see their community progress here.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="grid grid-cols-[auto_1fr_auto_auto] gap-4 px-5 py-3 border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wide">
            <input type="checkbox"
              checked={selected.size === filtered.length && filtered.length > 0}
              onChange={e => setSelected(e.target.checked ? new Set(filtered.map(c => c.id)) : new Set())}
              className="w-4 h-4 rounded" />
            <div>Member</div><div>Courses &amp; Progress</div><div></div>
          </div>
          <div className="divide-y divide-gray-50">
            {filtered.map(client => {
              const clientMods = modules.filter(m => m.access_type === 'all' || enrollments[m.id]?.has(client.id))
              return (
                <div key={client.id} className="grid grid-cols-[auto_1fr_auto_auto] gap-4 items-center px-5 py-3.5">
                  <input type="checkbox" checked={selected.has(client.id)}
                    onChange={e => setSelected(prev => { const n = new Set(prev); e.target.checked ? n.add(client.id) : n.delete(client.id); return n })}
                    className="w-4 h-4 rounded" />
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {client.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{client.name}</p>
                      <span className={clsx('text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
                        client.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>{client.status}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 justify-end flex-wrap">
                    {clientMods.length === 0
                      ? <span className="text-xs text-gray-300">No courses</span>
                      : clientMods.slice(0, 3).map(m => {
                          const done  = progress[client.id]?.[m.id] ?? 0
                          const total = lessonCounts[m.id] ?? 0
                          const pct   = total > 0 ? Math.round((done / total) * 100) : 0
                          return (
                            <div key={m.id} className="flex flex-col items-end gap-0.5">
                              <span className="text-[10px] font-medium text-gray-500 truncate max-w-[80px]">{m.title}</span>
                              <div className="flex items-center gap-1">
                                <div className="w-14 h-1 bg-gray-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-brand-500 rounded-full" style={{ width: `${pct}%` }} />
                                </div>
                                <span className="text-[10px] text-gray-400">{pct}%</span>
                              </div>
                            </div>
                          )
                        })
                    }
                    {clientMods.length > 3 && <span className="text-xs text-gray-400">+{clientMods.length - 3}</span>}
                  </div>
                  <button onClick={() => setClientModal(client)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-brand-50 hover:border-brand-200 hover:text-brand-700 transition-colors flex-shrink-0">
                    <UserPlus size={13} /> Assign
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {clientModal && (
        <ClientCoursesModal client={clientModal} modules={modules} enrollments={enrollments}
          onClose={() => setClientModal(null)} onSaved={() => { setClientModal(null); load() }} />
      )}
    </div>
  )
}

// ─── Preview Tab ────────────────────────────────────────────────

function PreviewTab({ orgId }: { orgId: string }) {
  const [clients, setClients]       = useState<ClientRow[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [posts, setPosts]           = useState<any[]>([])
  const [mods, setMods]             = useState<any[]>([])
  const [loading, setLoading]       = useState(false)
  const [subTab, setSubTab]         = useState<'feed' | 'courses'>('feed')

  useEffect(() => {
    supabase.from('clients').select('id,name,status').eq('org_id', orgId).order('name')
      .then(({ data }) => setClients((data ?? []) as ClientRow[]))
  }, [orgId])

  useEffect(() => {
    if (!selectedId) return
    setLoading(true)
    Promise.all([
      supabase.rpc('get_community_feed',    { p_client_id: selectedId }),
      supabase.rpc('get_community_modules', { p_client_id: selectedId }),
    ]).then(([{ data: f }, { data: m }]) => {
      setPosts(f ?? []); setMods(m ?? []); setLoading(false)
    })
  }, [selectedId])

  const selectedClient = clients.find(c => c.id === selectedId)

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-violet-50 to-brand-50 border border-brand-200/60 rounded-2xl p-4 flex items-center gap-3">
        <Monitor size={18} className="text-brand-600 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-800">Community Preview</p>
          <p className="text-xs text-gray-500">See the community exactly as a client would.</p>
        </div>
        <select value={selectedId} onChange={e => setSelectedId(e.target.value)}
          className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 bg-white min-w-[160px]">
          <option value="">Select client…</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {!selectedId ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <Monitor size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="font-semibold text-gray-600">Select a client to preview</p>
          <p className="text-sm text-gray-400 mt-1">See their personalised view including course access and progress.</p>
        </div>
      ) : loading ? (
        <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-brand-500" /></div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="bg-gradient-to-r from-brand-600 to-violet-600 px-5 py-3 flex items-center justify-between">
            <p className="text-white text-sm font-semibold">Viewing as: {selectedClient?.name}</p>
            <span className="text-xs text-white/70 bg-white/10 px-2 py-1 rounded-full">Preview Mode</span>
          </div>
          <div className="flex gap-1 p-3 border-b border-gray-100">
            {([{ id: 'feed', label: 'Feed', Icon: MessageCircle }, { id: 'courses', label: 'Courses', Icon: BookOpen }] as const).map(({ id, label, Icon }) => (
              <button key={id} onClick={() => setSubTab(id)}
                className={clsx('flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all',
                  subTab === id ? 'bg-brand-50 text-brand-700' : 'text-gray-500 hover:text-gray-700')}>
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>
          <div className="p-4">
            {subTab === 'feed' ? (
              <div className="space-y-3">
                {posts.length === 0
                  ? <p className="text-center text-sm text-gray-400 py-8">No posts visible to this client.</p>
                  : posts.slice(0, 6).map((post: any) => (
                    <div key={post.id} className={clsx('rounded-xl border p-4', post.pinned ? 'border-brand-200 bg-brand-50/30' : 'border-gray-100')}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold">
                          {(post.author_name ?? 'C').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-700">{post.author_name ?? 'Coach'}</p>
                          <p className="text-[10px] text-gray-400">{timeAgo(post.created_at)}</p>
                        </div>
                        {post.pinned && <span className="ml-auto text-[10px] bg-brand-100 text-brand-600 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1"><Pin size={8} /> Pinned</span>}
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed line-clamp-3">{post.content}</p>
                      <div className="flex items-center gap-3 mt-3 pt-2 border-t border-gray-100 text-xs text-gray-400">
                        <span className={clsx('flex items-center gap-1', post.client_reacted && 'text-red-500')}>
                          <Heart size={12} fill={post.client_reacted ? 'currentColor' : 'none'} /> {post.reaction_count}
                        </span>
                        <span className="flex items-center gap-1"><MessageCircle size={12} /> {post.comment_count}</span>
                      </div>
                    </div>
                  ))
                }
              </div>
            ) : (
              <div className="space-y-3">
                {mods.length === 0
                  ? <p className="text-center text-sm text-gray-400 py-8">No courses accessible to this client.</p>
                  : mods.map((m: any) => {
                    const done  = (m.lessons ?? []).filter((l: any) => l.completed).length
                    const total = (m.lessons ?? []).length
                    const pct   = total > 0 ? Math.round((done / total) * 100) : 0
                    return (
                      <div key={m.id} className="rounded-xl border border-gray-100 overflow-hidden">
                        <div className="px-4 py-3 flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-brand-600 flex items-center justify-center flex-shrink-0">
                            <BookOpen size={15} className="text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate">{m.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full bg-brand-500 rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-[10px] text-gray-500 font-semibold">{done}/{total}</span>
                            </div>
                          </div>
                        </div>
                        {(m.lessons ?? []).slice(0, 4).map((l: any, i: number) => (
                          <div key={l.id} className="flex items-center gap-3 px-4 py-2 border-t border-gray-50">
                            <span className="text-xs text-gray-300 w-4 font-bold text-center">{i + 1}</span>
                            {l.completed ? <CheckCircle2 size={14} className="text-brand-500 flex-shrink-0" />
                              : l.locked ? <Lock size={14} className="text-gray-300 flex-shrink-0" />
                              : <Circle size={14} className="text-gray-300 flex-shrink-0" />}
                            <span className={clsx('text-xs flex-1 truncate', l.locked ? 'text-gray-300' : 'text-gray-600')}>{l.title}</span>
                            {l.locked && <span className="text-[10px] text-amber-500 font-semibold">+{l.drip_days}d</span>}
                          </div>
                        ))}
                        {(m.lessons ?? []).length > 4 && (
                          <div className="px-4 py-2 border-t border-gray-50 text-xs text-gray-400 text-center">
                            +{m.lessons.length - 4} more lessons
                          </div>
                        )}
                      </div>
                    )
                  })
                }
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Page ───────────────────────────────────────────────────────

export default function Community() {
  const { profile } = useAuth()
  const [tab, setTab] = useState<'feed' | 'courses' | 'members' | 'preview'>('feed')

  if (!profile?.org_id) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={24} className="animate-spin text-brand-500" />
    </div>
  )

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center">
            <Users2 size={18} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Community</h1>
        </div>
        <p className="text-sm text-gray-500 ml-12">Engage your clients and deliver education.</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit mb-6">
        {[
          { id: 'feed'    as const, label: 'Feed',    Icon: MessageCircle },
          { id: 'courses' as const, label: 'Courses', Icon: BookOpen },
          { id: 'members' as const, label: 'Members', Icon: Users },
          { id: 'preview' as const, label: 'Preview', Icon: Monitor },
        ].map(({ id, label, Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={clsx('flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all',
              tab === id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {tab === 'feed'    && <FeedTab    orgId={profile.org_id} />}
      {tab === 'courses' && <CoursesTab orgId={profile.org_id} />}
      {tab === 'members' && <MembersTab orgId={profile.org_id} />}
      {tab === 'preview' && <PreviewTab orgId={profile.org_id} />}
    </div>
  )
}
