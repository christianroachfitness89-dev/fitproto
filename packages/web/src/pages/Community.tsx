import { useState, useEffect, useRef } from 'react'
import {
  Users2, Plus, Pin, PinOff, Trash2, Heart, MessageCircle,
  Video, FileText, Headphones, AlignLeft, ChevronDown, ChevronRight,
  Loader2, X, BookOpen, Eye, EyeOff, Clock, MoreVertical,
  Globe, Lock, Film,
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
  created_at: string
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
  // Lesson form
  const [lessonFor, setLessonFor]             = useState<string | null>(null) // module_id
  const [lessonDraft, setLessonDraft]         = useState<{
    title: string; description: string; content_type: CommunityLesson['content_type']
    content_url: string; body: string; drip_days: string; duration_minutes: string
  }>({ title: '', description: '', content_type: 'video', content_url: '', body: '', drip_days: '0', duration_minutes: '' })
  const [savingLesson, setSavingLesson]       = useState(false)

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
          />
        ))
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

              {(lessonDraft.content_type === 'video' || lessonDraft.content_type === 'audio') && (
                <input
                  value={lessonDraft.content_url}
                  onChange={e => setLessonDraft(d => ({ ...d, content_url: e.target.value }))}
                  placeholder={lessonDraft.content_type === 'video' ? 'YouTube / Vimeo embed URL…' : 'Audio URL…'}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400"
                />
              )}

              {(lessonDraft.content_type === 'document' || lessonDraft.content_type === 'text') && (
                <textarea
                  value={lessonDraft.body}
                  onChange={e => setLessonDraft(d => ({ ...d, body: e.target.value }))}
                  placeholder="Lesson content…"
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
              <button onClick={saveLesson} disabled={!lessonDraft.title.trim() || savingLesson}
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
  mod, lessons, expanded, onToggle, onPublish, onDelete, onAddLesson, onLessonPublish, onLessonDelete,
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
          <button
            onClick={onPublish}
            title={mod.published ? 'Unpublish' : 'Publish'}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
              mod.published
                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200',
            )}>
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

// ─── Page ───────────────────────────────────────────────────────

export default function Community() {
  const { profile } = useAuth()
  const [tab, setTab] = useState<'feed' | 'courses'>('feed')

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
          { id: 'feed' as const,    label: 'Feed',    Icon: MessageCircle },
          { id: 'courses' as const, label: 'Courses', Icon: BookOpen },
        ].map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={clsx(
              'flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all',
              tab === id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700',
            )}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {tab === 'feed'    && <FeedTab    orgId={profile.org_id} />}
      {tab === 'courses' && <CoursesTab orgId={profile.org_id} />}
    </div>
  )
}
