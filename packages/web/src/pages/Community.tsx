import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Users2, Plus, Pin, PinOff, Trash2, Heart, MessageCircle,
  Video, FileText, Headphones, AlignLeft, ChevronDown, ChevronRight,
  Loader2, X, BookOpen, Eye, EyeOff, Clock, MoreVertical,
  Globe, Lock, Film, Users, UserCheck, Monitor, Settings2,
  Check, CheckCircle2, Circle, Search, UserPlus, UploadCloud, Hash, Pencil, Send, GripVertical,
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
  author_name?: string
  section_id: string | null
  community_id: string | null
  reaction_count: number
  comment_count: number
  coach_reacted?: boolean
}

interface CommunitySection {
  id: string
  name: string
  emoji: string
  position: number
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
  community_id: string | null
  community?: { id: string; name: string; emoji: string } | null
}

interface ClientRow {
  id: string
  name: string
  status: string
  email: string | null
}

interface CommunityGroup {
  id: string
  name: string
  emoji: string
  description: string | null
  position: number
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

// ─── Create Community Modal ─────────────────────────────────────

const COMMUNITY_EMOJIS = ['🏘️','🏋️','🥗','🎯','🔥','🏆','💪','🧘','🚀','⚡','🌱','✨','👥','🎉','💡']

function CreateCommunityModal({ orgId, onClose, onCreated }: {
  orgId: string
  onClose: () => void
  onCreated: (g: CommunityGroup) => void
}) {
  const [name, setName]         = useState('')
  const [description, setDesc]  = useState('')
  const [emoji, setEmoji]       = useState('🏘️')
  const [saving, setSaving]     = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  async function handleCreate() {
    if (!name.trim()) return
    setSaving(true)
    setErrorMsg('')
    const { data, error } = await supabase
      .from('communities')
      .insert({ org_id: orgId, name: name.trim(), description: description.trim() || null, emoji })
      .select()
      .single()
    setSaving(false)
    if (error) {
      console.error('Create community error:', error)
      setErrorMsg(error.message)
      return
    }
    if (data) onCreated(data as CommunityGroup)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <p className="font-bold text-gray-800">New Community</p>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={20} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-2">Icon</p>
            <div className="flex gap-1.5 flex-wrap">
              {COMMUNITY_EMOJIS.map(e => (
                <button key={e} onClick={() => setEmoji(e)}
                  className={clsx('w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all',
                    emoji === e ? 'bg-brand-100 ring-2 ring-brand-400 scale-110' : 'hover:bg-gray-100')}>
                  {e}
                </button>
              ))}
            </div>
          </div>
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            placeholder="Community name (e.g. 8 Week Challenge)…"
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400"
          />
          <textarea
            value={description}
            onChange={e => setDesc(e.target.value)}
            placeholder="Short description (optional)…"
            rows={2}
            className="w-full resize-none rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400"
          />
        </div>
        {errorMsg && (
          <p className="mt-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{errorMsg}</p>
        )}
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
          <button onClick={handleCreate} disabled={!name.trim() || saving}
            className="px-5 py-2 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-40 flex items-center gap-2 transition-colors">
            {saving && <Loader2 size={14} className="animate-spin" />} Create
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Feed Tab ───────────────────────────────────────────────────

const PAGE_SIZE = 20

function FeedTab({ orgId, communityId }: { orgId: string; communityId: string | null }) {
  const [posts, setPosts]           = useState<CommunityPost[]>([])
  const [sections, setSections]     = useState<CommunitySection[]>([])
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const [loading, setLoading]       = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore]       = useState(false)
  const [page, setPage]             = useState(0)
  const [refreshKey, setRefreshKey] = useState(0)
  // Composer
  const [content, setContent]       = useState('')
  const [mediaUrl, setMediaUrl]     = useState('')
  const [mediaType, setMediaType]   = useState<CommunityPost['media_type']>(null)
  const [postSection, setPostSection] = useState<string>('')
  const [posting, setPosting]       = useState(false)
  const [showMedia, setShowMedia]   = useState(false)
  const postMediaRef                = useRef<HTMLInputElement>(null)
  const [postMediaUploading, setPostMediaUploading] = useState(false)
  // Sections panel
  const [showSections, setShowSections] = useState(false)
  const [newSectionName, setNewSectionName] = useState('')
  const [newSectionEmoji, setNewSectionEmoji] = useState('💬')
  const [savingSection, setSavingSection] = useState(false)

  // Fetch sections when org or community changes
  useEffect(() => { fetchSections() }, [orgId, communityId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch posts (reset to page 0) whenever org, community, section, or a realtime event fires
  useEffect(() => {
    fetchPosts(true)
  }, [orgId, communityId, activeSection, refreshKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // Realtime: re-fetch on any insert/update/delete to community_posts for this org
  useEffect(() => {
    const ch = supabase
      .channel(`community_posts_${orgId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'community_posts',
        filter: `org_id=eq.${orgId}`,
      }, () => setRefreshKey(k => k + 1))
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [orgId])

  async function fetchSections() {
    let q = supabase
      .from('community_sections')
      .select('id,name,emoji,position')
      .eq('org_id', orgId)
      .order('position', { ascending: true })
    // Strict isolation: General = community_id IS NULL, community = exact match
    if (communityId) {
      q = q.eq('community_id', communityId) as typeof q
    } else {
      q = q.is('community_id', null) as typeof q
    }
    const { data } = await q
    setSections((data ?? []) as CommunitySection[])
    setActiveSection(prev => data?.find((s: any) => s.id === prev) ? prev : null)
  }

  async function fetchPosts(reset = false) {
    const p = reset ? 0 : page
    if (reset) setPage(0)
    setLoading(reset)
    const { data } = await supabase.rpc('get_community_feed_coach', {
      p_org_id:       orgId,
      p_section_id:   activeSection,
      p_community_id: communityId,
      p_limit:        PAGE_SIZE,
      p_offset:       p * PAGE_SIZE,
    })
    const rows = (data ?? []) as CommunityPost[]
    if (reset) {
      setPosts(rows)
    } else {
      setPosts(prev => [...prev, ...rows])
    }
    setHasMore(rows.length === PAGE_SIZE)
    setLoading(false)
  }

  async function loadMore() {
    const next = page + 1
    setPage(next)
    setLoadingMore(true)
    const { data } = await supabase.rpc('get_community_feed_coach', {
      p_org_id:       orgId,
      p_section_id:   activeSection,
      p_community_id: communityId,
      p_limit:        PAGE_SIZE,
      p_offset:       next * PAGE_SIZE,
    })
    const rows = (data ?? []) as CommunityPost[]
    setPosts(prev => [...prev, ...rows])
    setHasMore(rows.length === PAGE_SIZE)
    setLoadingMore(false)
  }

  async function handlePostMediaUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPostMediaUploading(true)
    const path = `posts/${orgId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const { error } = await supabase.storage.from('course-files').upload(path, file, { upsert: true, contentType: file.type })
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('course-files').getPublicUrl(path)
      setMediaUrl(publicUrl)
      setMediaType(file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'audio')
    }
    setPostMediaUploading(false)
    if (postMediaRef.current) postMediaRef.current.value = ''
  }

  async function handlePost() {
    if (!content.trim()) return
    setPosting(true)
    await supabase.from('community_posts').insert({
      org_id:       orgId,
      content:      content.trim(),
      media_url:    mediaUrl.trim() || null,
      media_type:   mediaUrl.trim() ? mediaType : null,
      section_id:   postSection || null,
      community_id: communityId,
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

  async function addSection() {
    if (!newSectionName.trim()) return
    setSavingSection(true)
    await supabase.from('community_sections').insert({
      org_id: orgId, name: newSectionName.trim(), emoji: newSectionEmoji, position: sections.length,
      community_id: communityId,
    })
    setNewSectionName(''); setNewSectionEmoji('💬')
    setSavingSection(false)
    fetchSections()
  }

  async function deleteSection(id: string) {
    await supabase.from('community_sections').delete().eq('id', id)
    setSections(prev => prev.filter(s => s.id !== id))
    if (activeSection === id) setActiveSection(null)
  }

  const QUICK_EMOJIS = ['💬','📢','🏋️','🥗','💡','🎯','🔥','❓','🏆','📚']

  return (
    <div className="space-y-4">
      {/* Section tabs + manage button */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 flex-wrap">
          <button
            onClick={() => setActiveSection(null)}
            className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all',
              activeSection === null ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
            All
          </button>
          {sections.map(s => (
            <button key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all',
                activeSection === s.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
              <span>{s.emoji}</span> {s.name}
            </button>
          ))}
        </div>
        <button onClick={() => setShowSections(v => !v)}
          className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-sm font-semibold transition-colors',
            showSections ? 'border-brand-300 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-500 hover:text-brand-600 hover:border-brand-300')}>
          <Hash size={14} /> Manage Sections
        </button>
      </div>

      {/* Sections management panel */}
      {showSections && (
        <div className="bg-white rounded-2xl border border-brand-200 p-5 shadow-sm space-y-4">
          <p className="text-sm font-semibold text-gray-700 flex items-center gap-2"><Hash size={15} className="text-brand-500" /> Feed Sections</p>
          <p className="text-xs text-gray-400 -mt-2">Create topic channels for your community. Clients can filter posts by section.</p>

          {/* Existing sections */}
          {sections.length > 0 && (
            <div className="space-y-1">
              {sections.map(s => (
                <div key={s.id} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-gray-50">
                  <span className="text-lg">{s.emoji}</span>
                  <span className="flex-1 text-sm font-semibold text-gray-700">{s.name}</span>
                  <button onClick={() => deleteSection(s.id)}
                    className="text-gray-300 hover:text-red-500 transition-colors p-1"><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          )}

          {/* New section form */}
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold text-gray-500 mb-2">New Section</p>
            <div className="flex gap-2 flex-wrap">
              <div className="flex gap-1 flex-wrap">
                {QUICK_EMOJIS.map(e => (
                  <button key={e} onClick={() => setNewSectionEmoji(e)}
                    className={clsx('w-8 h-8 rounded-lg text-base flex items-center justify-center transition-all',
                      newSectionEmoji === e ? 'bg-brand-100 ring-2 ring-brand-400' : 'hover:bg-gray-100')}>
                    {e}
                  </button>
                ))}
              </div>
              <div className="flex flex-1 gap-2">
                <input
                  value={newSectionName}
                  onChange={e => setNewSectionName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addSection()}
                  placeholder="Section name…"
                  className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400"
                />
                <button onClick={addSection} disabled={!newSectionName.trim() || savingSection}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold disabled:opacity-40 transition-colors">
                  {savingSection ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Add
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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

        <div className="mt-3 flex gap-2 flex-wrap">
          {sections.length > 0 && (
            <select value={postSection} onChange={e => setPostSection(e.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400">
              <option value="">No section</option>
              {sections.map(s => <option key={s.id} value={s.id}>{s.emoji} {s.name}</option>)}
            </select>
          )}
        </div>

        {showMedia && (
          <div className="mt-3">
            {/* Hidden file input */}
            <input ref={postMediaRef} type="file" accept="image/*,video/*,audio/*" onChange={handlePostMediaUpload} className="hidden" />

            {mediaUrl ? (
              /* Uploaded / URL set — show chip */
              <div className="flex items-center gap-2 bg-brand-50 border border-brand-200 rounded-xl px-4 py-2.5">
                {mediaType === 'image' ? <img src={mediaUrl} alt="" className="w-6 h-6 rounded object-cover flex-shrink-0" /> : <Film size={14} className="text-brand-600 flex-shrink-0" />}
                <span className="flex-1 text-xs text-brand-700 truncate">{mediaUrl.split('/').pop()}</span>
                <button onClick={() => { setMediaUrl(''); setMediaType(null) }} className="text-brand-400 hover:text-red-500 transition-colors flex-shrink-0"><X size={14} /></button>
              </div>
            ) : (
              /* URL + upload row */
              <div className="flex gap-2">
                <select value={mediaType ?? ''} onChange={e => setMediaType(e.target.value as CommunityPost['media_type'] || null)}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400">
                  <option value="">Type…</option>
                  <option value="image">Image</option>
                  <option value="video">Video</option>
                  <option value="audio">Audio</option>
                </select>
                <input value={mediaUrl} onChange={e => setMediaUrl(e.target.value)} placeholder="Paste URL…"
                  className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400" />
                <button type="button" onClick={() => postMediaRef.current?.click()} disabled={postMediaUploading}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-xs font-semibold text-gray-500 hover:border-brand-300 hover:text-brand-600 transition-colors">
                  {postMediaUploading ? <Loader2 size={13} className="animate-spin" /> : <UploadCloud size={13} />}
                  {postMediaUploading ? 'Uploading…' : 'Upload'}
                </button>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between mt-3">
          <button onClick={() => setShowMedia(v => !v)}
            className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-brand-600 transition-colors">
            <Film size={14} /> {showMedia ? 'Remove media' : 'Add media'}
          </button>
          <button onClick={handlePost} disabled={!content.trim() || posting}
            className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2">
            {posting && <Loader2 size={14} className="animate-spin" />} Post
          </button>
        </div>
      </div>

      {/* Posts */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-brand-500" /></div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <div className="w-12 h-12 rounded-2xl bg-brand-50 flex items-center justify-center mx-auto mb-3">
            <MessageCircle size={22} className="text-brand-500" />
          </div>
          <p className="font-semibold text-gray-700">No posts yet</p>
          <p className="text-sm text-gray-400 mt-1">{activeSection ? 'No posts in this section yet.' : 'Write your first community update above.'}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map(post => (
            <PostCard key={post.id} post={post} sections={sections} orgId={orgId} onPin={handlePin} onDelete={handleDelete}
              onReactionToggle={(id, reacted, count) => setPosts(ps => ps.map(p => p.id === id ? { ...p, coach_reacted: reacted, reaction_count: count } : p))}
              onCommentAdded={(id) => setPosts(ps => ps.map(p => p.id === id ? { ...p, comment_count: p.comment_count + 1 } : p))}
            />
          ))}

          {/* Load more */}
          {hasMore && (
            <div className="flex justify-center pt-2">
              <button onClick={loadMore} disabled={loadingMore}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors">
                {loadingMore ? <Loader2 size={14} className="animate-spin" /> : <ChevronDown size={14} />}
                {loadingMore ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface PostComment {
  id: string
  content: string
  author_type: string
  author_name: string
  created_at: string
}

function PostCard({ post, sections, orgId, onPin, onDelete, onReactionToggle, onCommentAdded }: {
  post: CommunityPost
  sections: CommunitySection[]
  orgId: string
  onPin: (id: string, current: boolean) => void
  onDelete: (id: string) => void
  onReactionToggle: (id: string, reacted: boolean, count: number) => void
  onCommentAdded: (id: string) => void
}) {
  const [menu, setMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const [pendingDelete, setPendingDelete] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState<PostComment[]>([])
  const [loadingComments, setLoadingComments] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [reacting, setReacting] = useState(false)

  useEffect(() => {
    function handler(e: MouseEvent) { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function loadComments() {
    setLoadingComments(true)
    const { data } = await supabase
      .from('community_comments')
      .select('id,content,author_type,author_client_id,author_org_id,created_at')
      .eq('post_id', post.id)
      .order('created_at', { ascending: true })
    if (data) {
      const enriched: PostComment[] = await Promise.all(data.map(async c => {
        let author_name = 'Coach'
        if (c.author_type === 'client' && c.author_client_id) {
          const { data: cl } = await supabase.from('clients').select('name').eq('id', c.author_client_id).single()
          author_name = cl?.name ?? 'Client'
        }
        return { id: c.id, content: c.content, author_type: c.author_type, author_name, created_at: c.created_at }
      }))
      setComments(enriched)
    }
    setLoadingComments(false)
  }

  async function toggleComments() {
    const next = !showComments
    setShowComments(next)
    if (next && comments.length === 0) loadComments()
  }

  async function toggleReaction() {
    if (reacting) return
    setReacting(true)
    if (post.coach_reacted) {
      await supabase.from('community_reactions')
        .delete()
        .eq('post_id', post.id)
        .eq('reactor_type', 'coach')
        .eq('reactor_org_id', orgId)
      onReactionToggle(post.id, false, Math.max(0, post.reaction_count - 1))
    } else {
      await supabase.from('community_reactions')
        .insert({ post_id: post.id, reactor_type: 'coach', reactor_org_id: orgId })
      onReactionToggle(post.id, true, post.reaction_count + 1)
    }
    setReacting(false)
  }

  async function deleteComment(id: string) {
    await supabase.from('community_comments').delete().eq('id', id)
    setComments(cs => cs.filter(c => c.id !== id))
  }

  async function submitComment(e: React.FormEvent) {
    e.preventDefault()
    const txt = commentText.trim()
    if (!txt || submitting) return
    setSubmitting(true)
    const ts = new Date().toISOString()
    const { data, error } = await supabase
      .from('community_comments')
      .insert({ post_id: post.id, author_type: 'coach', author_org_id: orgId, content: txt, created_at: ts })
      .select('id')
      .single()
    if (!error && data) {
      setComments(cs => [...cs, { id: data.id, content: txt, author_type: 'coach', author_name: 'Coach', created_at: ts }])
      setCommentText('')
      onCommentAdded(post.id)
    }
    setSubmitting(false)
  }

  return (
    <div className={clsx(
      'bg-white rounded-2xl border p-5 shadow-sm transition-all',
      post.pinned ? 'border-brand-200 bg-brand-50/30' : 'border-gray-100',
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className={clsx(
            'w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0',
            post.author_type === 'client'
              ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
              : 'bg-gradient-to-br from-brand-500 to-violet-600',
          )}>
            {(post.author_name ?? 'C').charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-gray-800">{post.author_name ?? 'Coach'}</p>
              {post.section_id && (() => {
                const sec = sections.find(s => s.id === post.section_id)
                return sec ? (
                  <span className="text-[10px] font-semibold bg-brand-50 text-brand-600 px-2 py-0.5 rounded-full">
                    {sec.emoji} {sec.name}
                  </span>
                ) : null
              })()}
            </div>
            <p className="text-xs text-gray-400">{timeAgo(post.created_at)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {post.pinned && (
            <span className="flex items-center gap-1 text-xs text-brand-600 font-semibold bg-brand-100 rounded-full px-2.5 py-0.5">
              <Pin size={10} /> Pinned
            </span>
          )}
          <div ref={menuRef} className="relative">
            <button onClick={() => setMenu(v => !v)}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100">
              <MoreVertical size={16} />
            </button>
            {menu && (
              <div className="absolute right-0 top-8 z-20 w-44 bg-white border border-gray-100 rounded-xl shadow-xl py-1 overflow-hidden">
                <button onClick={() => { onPin(post.id, post.pinned); setMenu(false) }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                  {post.pinned ? <PinOff size={14} /> : <Pin size={14} />}
                  {post.pinned ? 'Unpin' : 'Pin post'}
                </button>
                {pendingDelete ? (
                  <div className="px-3 py-2 border-t border-red-50">
                    <p className="text-xs text-red-600 font-semibold mb-1.5">Delete this post?</p>
                    <div className="flex gap-1.5">
                      <button onClick={() => { onDelete(post.id); setMenu(false); setPendingDelete(false) }}
                        className="flex-1 px-2 py-1 rounded-lg bg-red-500 text-white text-xs font-semibold hover:bg-red-600">Yes</button>
                      <button onClick={() => setPendingDelete(false)}
                        className="flex-1 px-2 py-1 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50">No</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setPendingDelete(true)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                    <Trash2 size={14} /> Delete
                  </button>
                )}
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

      {/* Actions row */}
      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-100 text-xs">
        <button
          onClick={toggleReaction}
          disabled={reacting}
          className={clsx(
            'flex items-center gap-1.5 transition-colors',
            post.coach_reacted
              ? 'text-rose-500 font-semibold'
              : 'text-gray-400 hover:text-rose-400',
          )}
        >
          <Heart size={13} fill={post.coach_reacted ? 'currentColor' : 'none'} />
          {post.reaction_count}
        </button>
        <button
          onClick={toggleComments}
          className={clsx(
            'flex items-center gap-1.5 transition-colors',
            showComments ? 'text-brand-500 font-semibold' : 'text-gray-400 hover:text-brand-400',
          )}
        >
          <MessageCircle size={13} /> {post.comment_count} {showComments ? 'Hide' : 'Reply'}
        </button>
      </div>

      {/* Comments section */}
      {showComments && (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
          {loadingComments ? (
            <div className="flex justify-center py-2"><Loader2 size={16} className="animate-spin text-gray-300" /></div>
          ) : comments.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-1">No comments yet. Be the first to reply.</p>
          ) : (
            comments.map(c => (
              <div key={c.id} className="flex gap-2.5">
                <div className={clsx(
                  'w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0',
                  c.author_type === 'client'
                    ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
                    : 'bg-gradient-to-br from-brand-500 to-violet-600',
                )}>
                  {c.author_name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 bg-gray-50 rounded-xl px-3 py-2">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-semibold text-gray-700">{c.author_name}</span>
                    <span className="text-[10px] text-gray-400">{timeAgo(c.created_at)}</span>
                    {c.author_type === 'coach' && (
                      <button onClick={() => deleteComment(c.id)}
                        className="ml-auto text-gray-300 hover:text-red-500 transition-colors p-0.5 rounded">
                        <Trash2 size={11} />
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">{c.content}</p>
                </div>
              </div>
            ))
          )}
          {/* Comment input */}
          <form onSubmit={submitComment} className="flex gap-2 mt-2">
            <input
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              placeholder="Write a reply…"
              className="flex-1 text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300 placeholder:text-gray-400"
            />
            <button
              type="submit"
              disabled={!commentText.trim() || submitting}
              className="flex items-center gap-1.5 px-3 py-2 bg-brand-600 text-white text-xs font-semibold rounded-xl hover:bg-brand-700 disabled:opacity-40 transition-colors"
            >
              {submitting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
            </button>
          </form>
        </div>
      )}
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

// ─── Assign Courses Modal ───────────────────────────────────────

function AssignCoursesModal({ orgId, communityId, communityName, onClose, onAssigned }: {
  orgId: string
  communityId: string
  communityName: string
  onClose: () => void
  onAssigned: () => void
}) {
  const [modules, setModules] = useState<CommunityModule[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    supabase
      .from('community_modules')
      .select('id,title,description,cover_url,position,published,access_type,auto_enroll_on_join,created_at,community_id')
      .eq('org_id', orgId)
      .is('community_id', null)
      .order('position', { ascending: true })
      .then(({ data }) => { setModules((data ?? []) as CommunityModule[]); setLoading(false) })
  }, [orgId])

  async function handleAssign() {
    if (selected.size === 0) return
    setSaving(true)
    await Promise.all(
      [...selected].map(id =>
        supabase.from('community_modules').update({ community_id: communityId }).eq('id', id)
      )
    )
    setSaving(false)
    onAssigned()
  }

  const filtered = modules.filter(m => m.title.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between mb-1">
          <p className="font-bold text-gray-800">Assign Courses</p>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={20} /></button>
        </div>
        <p className="text-xs text-gray-400 mb-4">Move General courses into <span className="font-semibold text-brand-600">{communityName}</span>. They'll only be visible to that community.</p>

        <div className="relative mb-3">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search courses…"
            className="w-full pl-8 pr-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400" />
        </div>

        <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-brand-500" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-8">
              {modules.length === 0 ? 'All courses are already assigned to communities.' : 'No courses match your search.'}
            </p>
          ) : filtered.map(m => (
            <button key={m.id}
              onClick={() => setSelected(prev => { const n = new Set(prev); n.has(m.id) ? n.delete(m.id) : n.add(m.id); return n })}
              className={clsx('w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left',
                selected.has(m.id) ? 'border-brand-400 bg-brand-50' : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50')}>
              <div className={clsx('w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                selected.has(m.id) ? 'bg-brand-500 border-brand-500' : 'border-gray-300')}>
                {selected.has(m.id) && <Check size={11} className="text-white" />}
              </div>
              {m.cover_url ? (
                <img src={m.cover_url} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
              ) : (
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-brand-600 flex items-center justify-center flex-shrink-0">
                  <BookOpen size={14} className="text-white" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{m.title}</p>
                {m.description && <p className="text-xs text-gray-400 truncate">{m.description}</p>}
              </div>
              <span className={clsx('text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0',
                m.published ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500')}>
                {m.published ? 'Live' : 'Draft'}
              </span>
            </button>
          ))}
        </div>

        <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100">
          <span className="text-xs text-gray-400">{selected.size} selected</span>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
            <button onClick={handleAssign} disabled={selected.size === 0 || saving}
              className="px-5 py-2 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-40 flex items-center gap-2 transition-colors">
              {saving && <Loader2 size={14} className="animate-spin" />} Assign {selected.size > 0 ? `(${selected.size})` : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Courses Tab ────────────────────────────────────────────────

export function CoursesTab({ orgId, communityId, communityName }: { orgId: string; communityId: string | null; communityName?: string }) {
  const [modules, setModules]       = useState<CommunityModule[]>([])
  const [lessons, setLessons]       = useState<Record<string, CommunityLesson[]>>({})
  const [expanded, setExpanded]     = useState<Set<string>>(new Set())
  const [loading, setLoading]       = useState(true)
  // Module form
  const [showModuleForm, setShowModuleForm]   = useState(false)
  const [moduleDraft, setModuleDraft]         = useState({ title: '', description: '', cover_url: '' })
  const [savingModule, setSavingModule]       = useState(false)
  const moduleCoverRef                        = useRef<HTMLInputElement>(null)
  const [coverUploading, setCoverUploading]   = useState(false)
  // Access modal
  const [accessModal, setAccessModal]         = useState<CommunityModule | null>(null)
  // Assign courses modal
  const [showAssignModal, setShowAssignModal] = useState(false)
  // Drag-to-reorder modules
  const [dragModIdx, setDragModIdx]           = useState<number | null>(null)
  // Drag-to-reorder lessons
  const [dragLsn, setDragLsn]                = useState<{ modId: string; idx: number } | null>(null)
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

  useEffect(() => { fetchModules() }, [orgId, communityId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchModules() {
    setLoading(true)
    let q = supabase
      .from('community_modules')
      .select('*, community:communities(id,name,emoji)')
      .eq('org_id', orgId)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true })
    if (communityId) {
      // Community view: show only this community's modules
      q = q.eq('community_id', communityId) as typeof q
    }
    // General view: show all modules (including community-assigned ones, with badge)
    const { data } = await q
    setModules((data ?? []) as CommunityModule[])
    setLoading(false)
  }

  async function removeFromCommunity(moduleId: string) {
    await supabase.from('community_modules').update({ community_id: null }).eq('id', moduleId)
    setModules(prev => prev.filter(m => m.id !== moduleId))
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

  async function handleModuleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setCoverUploading(true)
    const path = `covers/${orgId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const { error } = await supabase.storage.from('course-files').upload(path, file, { upsert: true, contentType: file.type })
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('course-files').getPublicUrl(path)
      setModuleDraft(d => ({ ...d, cover_url: publicUrl }))
    }
    setCoverUploading(false)
    if (moduleCoverRef.current) moduleCoverRef.current.value = ''
  }

  async function saveModule() {
    if (!moduleDraft.title.trim()) return
    setSavingModule(true)
    await supabase.from('community_modules').insert({
      org_id:       orgId,
      title:        moduleDraft.title.trim(),
      description:  moduleDraft.description.trim() || null,
      cover_url:    moduleDraft.cover_url.trim() || null,
      position:     modules.length,
      community_id: communityId,
    })
    setModuleDraft({ title: '', description: '', cover_url: '' })
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

  // ── Module drag-to-reorder ───────────────────────────────────
  function handleModDragOver(e: React.DragEvent, toIdx: number) {
    e.preventDefault()
    if (dragModIdx === null || dragModIdx === toIdx) return
    const next = [...modules]
    const [item] = next.splice(dragModIdx, 1)
    next.splice(toIdx, 0, item)
    setModules(next)
    setDragModIdx(toIdx)
  }
  async function handleModDragEnd() {
    setDragModIdx(null)
    await Promise.all(modules.map((m, i) =>
      supabase.from('community_modules').update({ position: i }).eq('id', m.id)
    ))
  }

  // ── Lesson drag-to-reorder ───────────────────────────────────
  function handleLsnDragOver(e: React.DragEvent, modId: string, toIdx: number) {
    e.preventDefault()
    if (!dragLsn || dragLsn.modId !== modId || dragLsn.idx === toIdx) return
    const ls = [...(lessons[modId] ?? [])]
    const [item] = ls.splice(dragLsn.idx, 1)
    ls.splice(toIdx, 0, item)
    setLessons(prev => ({ ...prev, [modId]: ls }))
    setDragLsn({ modId, idx: toIdx })
  }
  async function handleLsnDragEnd(modId: string) {
    setDragLsn(null)
    const ls = lessons[modId] ?? []
    await Promise.all(ls.map((l, i) =>
      supabase.from('community_lessons').update({ position: i }).eq('id', l.id)
    ))
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
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-gray-500">
          {communityId ? `Courses assigned to this community.` : 'All courses — build here and assign to communities.'}
        </p>
        <div className="flex items-center gap-2">
          {communityId && (
            <button onClick={() => setShowAssignModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-brand-300 bg-brand-50 hover:bg-brand-100 text-brand-700 text-sm font-semibold transition-colors">
              <Plus size={15} /> Assign Courses
            </button>
          )}
          <button onClick={() => setShowModuleForm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors">
            <Plus size={16} /> New Course
          </button>
        </div>
      </div>

      {/* New module form */}
      {showModuleForm && (
        <div className="bg-white rounded-2xl border border-brand-200 p-5 shadow-sm space-y-2">
          <p className="text-sm font-semibold text-gray-700 mb-1">New Module</p>
          <input
            autoFocus
            value={moduleDraft.title}
            onChange={e => setModuleDraft(d => ({ ...d, title: e.target.value }))}
            placeholder="Module title…"
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400"
          />
          <textarea
            value={moduleDraft.description}
            onChange={e => setModuleDraft(d => ({ ...d, description: e.target.value }))}
            placeholder="Short description (optional)…"
            rows={2}
            className="w-full resize-none rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400"
          />

          {/* Cover image upload */}
          <input ref={moduleCoverRef} type="file" accept="image/*" onChange={handleModuleCoverUpload} className="hidden" />
          {moduleDraft.cover_url ? (
            <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-3 py-2.5">
              <img src={moduleDraft.cover_url} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
              <span className="flex-1 text-xs text-green-700 truncate">Cover image set</span>
              <button onClick={() => setModuleDraft(d => ({ ...d, cover_url: '' }))}
                className="text-green-500 hover:text-red-500 transition-colors"><X size={14} /></button>
            </div>
          ) : (
            <button type="button" onClick={() => moduleCoverRef.current?.click()} disabled={coverUploading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-gray-200 text-gray-500 hover:border-brand-400 hover:text-brand-600 hover:bg-brand-50 transition-all text-sm font-semibold">
              {coverUploading ? <Loader2 size={15} className="animate-spin" /> : <UploadCloud size={15} />}
              {coverUploading ? 'Uploading cover…' : 'Upload cover image (optional)'}
            </button>
          )}

          <div className="flex justify-end gap-2 pt-1">
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
        modules.map((mod, modIdx) => (
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
            // Community assignment
            communityBadge={!communityId && mod.community ? `${mod.community.emoji} ${mod.community.name}` : undefined}
            onRemoveFromCommunity={communityId && mod.community_id ? () => removeFromCommunity(mod.id) : undefined}
            // Module drag
            modIdx={modIdx}
            isDraggingMod={dragModIdx === modIdx}
            onModDragStart={() => setDragModIdx(modIdx)}
            onModDragOver={(e) => handleModDragOver(e, modIdx)}
            onModDragEnd={handleModDragEnd}
            // Lesson drag
            dragLsnIdx={dragLsn?.modId === mod.id ? dragLsn.idx : null}
            onLsnDragStart={(idx) => setDragLsn({ modId: mod.id, idx })}
            onLsnDragOver={(e, idx) => handleLsnDragOver(e, mod.id, idx)}
            onLsnDragEnd={() => handleLsnDragEnd(mod.id)}
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

      {/* Assign Courses Modal */}
      {showAssignModal && communityId && (
        <AssignCoursesModal
          orgId={orgId}
          communityId={communityId}
          communityName={communityName ?? 'this community'}
          onClose={() => setShowAssignModal(false)}
          onAssigned={() => { setShowAssignModal(false); fetchModules() }}
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
  communityBadge, onRemoveFromCommunity,
  modIdx, isDraggingMod, onModDragStart, onModDragOver, onModDragEnd,
  dragLsnIdx, onLsnDragStart, onLsnDragOver, onLsnDragEnd,
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
  communityBadge?: string
  onRemoveFromCommunity?: () => void
  // module drag
  modIdx: number
  isDraggingMod: boolean
  onModDragStart: () => void
  onModDragOver: (e: React.DragEvent) => void
  onModDragEnd: () => void
  // lesson drag
  dragLsnIdx: number | null
  onLsnDragStart: (idx: number) => void
  onLsnDragOver: (e: React.DragEvent, idx: number) => void
  onLsnDragEnd: () => void
}) {
  const [pendingDeleteMod, setPendingDeleteMod] = useState(false)
  const [pendingDeleteLsn, setPendingDeleteLsn] = useState<string | null>(null)
  const [pendingRemove, setPendingRemove] = useState(false)

  return (
    <div
      draggable
      onDragStart={onModDragStart}
      onDragOver={onModDragOver}
      onDragEnd={onModDragEnd}
      className={clsx('bg-white rounded-2xl border shadow-sm overflow-hidden transition-opacity',
        isDraggingMod ? 'opacity-50 border-brand-300' : 'border-gray-100')}
    >
      {/* Module header */}
      <div className="flex items-center gap-2 px-3 py-4">
        {/* Drag handle */}
        <div className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-400 transition-colors flex-shrink-0 px-1">
          <GripVertical size={16} />
        </div>

        {/* Cover image or gradient icon */}
        <button onClick={onToggle} className="flex-1 flex items-center gap-3 text-left min-w-0">
          {mod.cover_url ? (
            <img src={mod.cover_url} alt="" className="w-9 h-9 rounded-xl object-cover flex-shrink-0" />
          ) : (
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-brand-600 flex items-center justify-center flex-shrink-0">
              <BookOpen size={16} className="text-white" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-gray-800 truncate">{mod.title}</p>
              {communityBadge && (
                <span className="text-[10px] font-semibold bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full flex-shrink-0">
                  {communityBadge}
                </span>
              )}
            </div>
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

          {/* Remove from community */}
          {onRemoveFromCommunity && (
            pendingRemove ? (
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-amber-600 font-semibold">Move to General?</span>
                <button onClick={() => { onRemoveFromCommunity(); setPendingRemove(false) }}
                  className="px-2 py-1 rounded-lg bg-amber-500 text-white text-[10px] font-semibold hover:bg-amber-600">Yes</button>
                <button onClick={() => setPendingRemove(false)}
                  className="px-2 py-1 rounded-lg border border-gray-200 text-[10px] text-gray-600 hover:bg-gray-50">No</button>
              </div>
            ) : (
              <button onClick={() => setPendingRemove(true)} title="Remove from community"
                className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors">
                <X size={14} />
              </button>
            )
          )}

          {/* Module delete with confirmation */}
          {pendingDeleteMod ? (
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-red-600 font-semibold">Delete?</span>
              <button onClick={() => { onDelete(); setPendingDeleteMod(false) }}
                className="px-2 py-1 rounded-lg bg-red-500 text-white text-[10px] font-semibold hover:bg-red-600">Yes</button>
              <button onClick={() => setPendingDeleteMod(false)}
                className="px-2 py-1 rounded-lg border border-gray-200 text-[10px] text-gray-600 hover:bg-gray-50">No</button>
            </div>
          ) : (
            <button onClick={() => setPendingDeleteMod(true)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
              <Trash2 size={14} />
            </button>
          )}
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
                    <div
                      key={lesson.id}
                      draggable
                      onDragStart={() => onLsnDragStart(i)}
                      onDragOver={(e) => onLsnDragOver(e, i)}
                      onDragEnd={onLsnDragEnd}
                      className={clsx('flex items-center gap-2 px-4 py-3 transition-opacity',
                        dragLsnIdx === i ? 'opacity-40' : '')}
                    >
                      {/* Lesson drag handle */}
                      <div className="cursor-grab active:cursor-grabbing text-gray-200 hover:text-gray-400 transition-colors flex-shrink-0">
                        <GripVertical size={14} />
                      </div>
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

                      {/* Lesson delete with confirmation */}
                      {pendingDeleteLsn === lesson.id ? (
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-red-600 font-semibold">Delete?</span>
                          <button onClick={() => { onLessonDelete(lesson); setPendingDeleteLsn(null) }}
                            className="px-2 py-1 rounded-lg bg-red-500 text-white text-[10px] font-semibold hover:bg-red-600">Yes</button>
                          <button onClick={() => setPendingDeleteLsn(null)}
                            className="px-2 py-1 rounded-lg border border-gray-200 text-[10px] text-gray-600 hover:bg-gray-50">No</button>
                        </div>
                      ) : (
                        <button onClick={() => setPendingDeleteLsn(lesson.id)}
                          className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      )}
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

function MembersTab({ orgId, communityId }: { orgId: string; communityId: string | null }) {
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
  // Community membership
  const [communityMembers, setCommunityMembers] = useState<Set<string>>(new Set())
  const [memberSearch, setMemberSearch]         = useState('')
  const [addingMember, setAddingMember]         = useState<string | null>(null)

  useEffect(() => { load() }, [orgId]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (communityId) loadCommunityMembers() }, [communityId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadCommunityMembers() {
    if (!communityId) return
    const { data } = await supabase
      .from('community_members')
      .select('client_id')
      .eq('community_id', communityId)
    setCommunityMembers(new Set((data ?? []).map((r: any) => r.client_id as string)))
  }

  async function addToCommunity(clientId: string) {
    if (!communityId) return
    setAddingMember(clientId)
    await supabase.from('community_members').upsert(
      { community_id: communityId, client_id: clientId },
      { onConflict: 'community_id,client_id', ignoreDuplicates: true }
    )
    setCommunityMembers(prev => new Set([...prev, clientId]))
    setAddingMember(null)
  }

  async function removeFromCommunity(clientId: string) {
    if (!communityId) return
    setAddingMember(clientId)
    await supabase.from('community_members')
      .delete()
      .eq('community_id', communityId)
      .eq('client_id', clientId)
    setCommunityMembers(prev => { const n = new Set(prev); n.delete(clientId); return n })
    setAddingMember(null)
  }

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
      {/* Community membership panel */}
      {communityId && (
        <div className="bg-white rounded-2xl border border-brand-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <p className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <Users size={15} className="text-brand-500" /> Community Members
            </p>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{communityMembers.size} members</span>
          </div>
          <div className="p-4">
            <div className="relative mb-3">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={memberSearch} onChange={e => setMemberSearch(e.target.value)} placeholder="Search clients to add/remove…"
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400" />
            </div>
            <div className="space-y-0.5 max-h-64 overflow-y-auto">
              {clients
                .filter(c => c.name.toLowerCase().includes(memberSearch.toLowerCase()))
                .map(client => {
                  const isMember = communityMembers.has(client.id)
                  const isPending = addingMember === client.id
                  return (
                    <div key={client.id} className={clsx('flex items-center gap-3 px-3 py-2 rounded-xl transition-colors',
                      isMember ? 'bg-brand-50' : 'hover:bg-gray-50')}>
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {client.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="flex-1 text-sm font-medium text-gray-700 truncate">{client.name}</span>
                      <span className={clsx('text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0',
                        client.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
                        {client.status}
                      </span>
                      {isMember ? (
                        <button onClick={() => removeFromCommunity(client.id)} disabled={isPending}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-40 flex-shrink-0">
                          {isPending ? <Loader2 size={11} className="animate-spin" /> : <X size={11} />} Remove
                        </button>
                      ) : (
                        <button onClick={() => addToCommunity(client.id)} disabled={isPending}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-brand-600 bg-brand-50 hover:bg-brand-100 transition-colors disabled:opacity-40 flex-shrink-0">
                          {isPending ? <Loader2 size={11} className="animate-spin" /> : <UserPlus size={11} />} Add
                        </button>
                      )}
                    </div>
                  )
                })}
            </div>
          </div>
        </div>
      )}

      {/* Course enrollment section */}
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

function PreviewTab({ orgId, communityId }: { orgId: string; communityId: string | null }) {
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
      supabase.rpc('get_community_feed',    { p_client_id: selectedId, p_community_id: communityId }),
      supabase.rpc('get_community_modules', { p_client_id: selectedId, p_community_id: communityId }),
    ]).then(([{ data: f }, { data: m }]) => {
      setPosts(f ?? []); setMods(m ?? []); setLoading(false)
    })
  }, [selectedId, communityId]) // eslint-disable-line react-hooks/exhaustive-deps

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

// ─── Community Courses View (read-only, shows assigned courses) ──

function CommunityCoursesView({ orgId, communityId, communityName }: { orgId: string; communityId: string; communityName: string }) {
  const [modules, setModules]       = useState<CommunityModule[]>([])
  const [loading, setLoading]       = useState(true)
  const [showAssignModal, setShowAssignModal] = useState(false)

  useEffect(() => { fetchModules() }, [communityId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchModules() {
    setLoading(true)
    const { data } = await supabase
      .from('community_modules')
      .select('id,title,description,cover_url,position,published,access_type,auto_enroll_on_join,created_at,community_id')
      .eq('org_id', orgId)
      .eq('community_id', communityId)
      .order('position', { ascending: true })
    setModules((data ?? []) as CommunityModule[])
    setLoading(false)
  }

  async function removeFromCommunity(moduleId: string) {
    if (!confirm('Move this course back to the Library (General)?')) return
    await supabase.from('community_modules').update({ community_id: null }).eq('id', moduleId)
    setModules(prev => prev.filter(m => m.id !== moduleId))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-gray-500">Courses active in <span className="font-semibold text-gray-700">{communityName}</span>. Build courses in the Library tab.</p>
        <button onClick={() => setShowAssignModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-brand-300 bg-brand-50 hover:bg-brand-100 text-brand-700 text-sm font-semibold transition-colors">
          <Plus size={15} /> Assign Courses
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-brand-500" /></div>
      ) : modules.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <div className="w-12 h-12 rounded-2xl bg-violet-50 flex items-center justify-center mx-auto mb-3">
            <BookOpen size={22} className="text-violet-500" />
          </div>
          <p className="font-semibold text-gray-700">No courses assigned</p>
          <p className="text-sm text-gray-400 mt-1">Assign courses from the Library to this community.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {modules.map(mod => (
            <div key={mod.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4 shadow-sm">
              {mod.cover_url ? (
                <img src={mod.cover_url} alt="" className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-violet-500 to-brand-600 flex items-center justify-center flex-shrink-0">
                  <BookOpen size={20} className="text-white" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 truncate">{mod.title}</p>
                {mod.description && <p className="text-xs text-gray-400 truncate mt-0.5">{mod.description}</p>}
                <div className="flex items-center gap-2 mt-1.5">
                  <span className={clsx('text-[10px] font-semibold px-2 py-0.5 rounded-full',
                    mod.published ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500')}>
                    {mod.published ? 'Live' : 'Draft'}
                  </span>
                  <span className="text-[10px] text-gray-400">{mod.access_type === 'all' ? 'Open access' : 'Enrolled only'}</span>
                </div>
              </div>
              <button onClick={() => removeFromCommunity(mod.id)}
                title="Move back to Library"
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-200 text-amber-600 hover:bg-amber-50 text-xs font-semibold transition-colors">
                <X size={12} /> Remove
              </button>
            </div>
          ))}
        </div>
      )}

      {showAssignModal && (
        <AssignCoursesModal
          orgId={orgId}
          communityId={communityId}
          communityName={communityName}
          onClose={() => setShowAssignModal(false)}
          onAssigned={() => { setShowAssignModal(false); fetchModules() }}
        />
      )}
    </div>
  )
}

// ─── Page ───────────────────────────────────────────────────────

export default function Community() {
  const { profile } = useAuth()
  const [tab, setTab]               = useState<'feed' | 'courses' | 'members' | 'preview'>('feed')
  const [communities, setCommunities] = useState<CommunityGroup[]>([])
  const [communityId, setCommunityId] = useState<string | null>(null)
  const [showCreateComm, setShowCreateComm] = useState(false)
  const [pendingDeleteComm, setPendingDeleteComm] = useState<string | null>(null)

  useEffect(() => {
    if (profile?.org_id) loadCommunities()
  }, [profile?.org_id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadCommunities() {
    const { data } = await supabase
      .from('communities')
      .select('id,name,emoji,description,position')
      .eq('org_id', profile!.org_id!)
      .order('position', { ascending: true })
    setCommunities((data ?? []) as CommunityGroup[])
  }

  async function deleteCommunity(id: string) {
    await supabase.from('communities').delete().eq('id', id)
    setCommunities(prev => prev.filter(c => c.id !== id))
    if (communityId === id) {
      setCommunityId(null)
      if (tab === 'courses') setTab('feed')
    }
    setPendingDeleteComm(null)
  }

  function handleSetCommunityId(id: string | null) {
    setCommunityId(id)
    // Courses tab only makes sense inside a community
    if (id === null && tab === 'courses') setTab('feed')
  }

  if (!profile?.org_id) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={24} className="animate-spin text-brand-500" />
    </div>
  )

  const activeCommunity = communities.find(c => c.id === communityId)

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-5">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center">
            <Users2 size={18} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Community</h1>
        </div>
        <p className="text-sm text-gray-500 ml-12">Engage your clients and deliver education.</p>
      </div>

      {/* Community selector */}
      <div className="flex items-center gap-2 flex-wrap mb-5">
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 flex-wrap">
          <button
            onClick={() => handleSetCommunityId(null)}
            className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all',
              communityId === null ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
            🌐 General
          </button>
          {communities.map(c => (
            <div key={c.id} className="relative group">
              <button
                onClick={() => handleSetCommunityId(c.id)}
                className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all pr-6',
                  communityId === c.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
                <span>{c.emoji}</span> {c.name}
              </button>
              {/* Delete button shown on hover when this community is active */}
              {communityId === c.id && (
                pendingDeleteComm === c.id ? (
                  <div className="absolute right-0.5 top-0.5 flex items-center gap-0.5 bg-white rounded-lg shadow-md px-1 py-0.5 z-10">
                    <span className="text-[9px] text-red-600 font-bold">Del?</span>
                    <button onClick={() => deleteCommunity(c.id)}
                      className="text-[9px] bg-red-500 text-white px-1 py-0.5 rounded font-bold">Y</button>
                    <button onClick={() => setPendingDeleteComm(null)}
                      className="text-[9px] text-gray-500 px-1 py-0.5 rounded font-bold">N</button>
                  </div>
                ) : (
                  <button onClick={() => setPendingDeleteComm(c.id)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-300 hover:text-red-500 transition-colors">
                    <X size={11} />
                  </button>
                )
              )}
            </div>
          ))}
        </div>
        <button onClick={() => setShowCreateComm(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-dashed border-gray-300 text-sm font-semibold text-gray-500 hover:border-brand-400 hover:text-brand-600 hover:bg-brand-50 transition-all">
          <Plus size={14} /> New Community
        </button>
      </div>

      {/* Active community banner */}
      {activeCommunity && (
        <div className="bg-gradient-to-r from-brand-50 to-violet-50 border border-brand-200/60 rounded-xl px-4 py-3 mb-5 flex items-center gap-3">
          <span className="text-2xl">{activeCommunity.emoji}</span>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-800 text-sm">{activeCommunity.name}</p>
            {activeCommunity.description && <p className="text-xs text-gray-500 truncate">{activeCommunity.description}</p>}
          </div>
          <span className="text-xs bg-brand-100 text-brand-700 font-semibold px-2 py-0.5 rounded-full">Active</span>
        </div>
      )}

      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit mb-6 flex-wrap">
        {([
          { id: 'feed'    as const, label: 'Feed',    Icon: MessageCircle, show: true },
          { id: 'courses' as const, label: 'Courses', Icon: BookOpen,      show: !!communityId },
          { id: 'members' as const, label: 'Members', Icon: Users,         show: true },
          { id: 'preview' as const, label: 'Preview', Icon: Monitor,       show: true },
        ] as const).filter(t => t.show).map(({ id, label, Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={clsx('flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all',
              tab === id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {tab === 'feed'    && <FeedTab    orgId={profile.org_id} communityId={communityId} />}
      {tab === 'courses' && communityId && (
        <CommunityCoursesView orgId={profile.org_id} communityId={communityId} communityName={activeCommunity?.name ?? 'Community'} />
      )}
      {tab === 'members' && <MembersTab orgId={profile.org_id} communityId={communityId} />}
      {tab === 'preview' && <PreviewTab orgId={profile.org_id} communityId={communityId} />}

      {showCreateComm && (
        <CreateCommunityModal
          orgId={profile.org_id}
          onClose={() => setShowCreateComm(false)}
          onCreated={g => {
            setCommunities(prev => [...prev, g])
            handleSetCommunityId(g.id)
            setShowCreateComm(false)
          }}
        />
      )}
    </div>
  )
}
