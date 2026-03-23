import { useState, useEffect, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Search, Send, MoreHorizontal, MessageSquare,
  ExternalLink, Check, CheckCheck, Loader2,
} from 'lucide-react'
import clsx from 'clsx'
import {
  useConversations, useMessages, useSendMessage, useMarkAsRead,
} from '@/hooks/useConversations'
import type { ConversationWithClient } from '@/hooks/useConversations'
import type { DbMessage } from '@/lib/database.types'

// ─── helpers ──────────────────────────────────────────────────
function initials(name: string) {
  return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2)
}

function formatTime(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  if (isToday) return d.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  if (now.getTime() - d.getTime() < 7 * 86400000)
    return d.toLocaleDateString('en-AU', { weekday: 'short' })
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
}

function formatMsgTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })
}

// Group messages by calendar date
function groupByDate(msgs: DbMessage[]) {
  const groups: { label: string; messages: DbMessage[] }[] = []
  let lastLabel = ''
  for (const m of msgs) {
    const d = new Date(m.created_at)
    const now = new Date()
    let label: string
    if (d.toDateString() === now.toDateString()) label = 'Today'
    else {
      const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1)
      label = d.toDateString() === yesterday.toDateString()
        ? 'Yesterday'
        : d.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })
    }
    if (label !== lastLabel) { groups.push({ label, messages: [] }); lastLabel = label }
    groups[groups.length - 1].messages.push(m)
  }
  return groups
}

// ─── Conversation row ──────────────────────────────────────────
function ConvoRow({ convo, active, onClick }: {
  convo: ConversationWithClient
  active: boolean
  onClick: () => void
}) {
  const name    = convo.clients.name
  const preview = convo.latest_message?.content ?? 'No messages yet'
  const sentByCoach = convo.latest_message?.sender_type === 'coach'

  return (
    <button
      onClick={onClick}
      className={clsx(
        'w-full flex items-start gap-3 px-4 py-3.5 text-left transition-colors border-b border-gray-50',
        active ? 'bg-brand-50' : 'hover:bg-gray-50',
      )}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div className={clsx(
          'w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold',
          active ? 'bg-brand-600' : 'bg-gray-500',
        )}>
          {initials(name)}
        </div>
        {convo.unread_count > 0 && (
          <div className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-brand-500 border-2 border-white flex items-center justify-center">
            <span className="text-white text-[9px] font-bold leading-none">
              {convo.unread_count > 9 ? '9+' : convo.unread_count}
            </span>
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <p className={clsx('text-sm truncate', convo.unread_count > 0 ? 'font-bold text-gray-900' : 'font-medium text-gray-800')}>
            {name}
          </p>
          {convo.last_message_at && (
            <p className="text-[11px] text-gray-400 flex-shrink-0">{formatTime(convo.last_message_at)}</p>
          )}
        </div>
        <p className={clsx('text-xs truncate mt-0.5', convo.unread_count > 0 ? 'text-gray-700 font-medium' : 'text-gray-400')}>
          {sentByCoach && <span className="text-gray-400">You: </span>}
          {preview}
        </p>
      </div>
    </button>
  )
}

// ─── Message bubble ────────────────────────────────────────────
function Bubble({ msg, showTime }: { msg: DbMessage; showTime: boolean }) {
  const isCoach = msg.sender_type === 'coach'
  return (
    <div className={clsx('flex', isCoach ? 'justify-end' : 'justify-start')}>
      <div className={clsx('max-w-[72%] lg:max-w-[60%]')}>
        <div className={clsx(
          'px-4 py-2.5 rounded-2xl text-sm leading-relaxed',
          isCoach
            ? 'bg-brand-600 text-white rounded-br-sm'
            : 'bg-white text-gray-800 rounded-bl-sm shadow-sm border border-gray-100',
        )}>
          {msg.content}
        </div>
        {showTime && (
          <p className={clsx('text-[11px] mt-1', isCoach ? 'text-right text-gray-400' : 'text-gray-400')}>
            {formatMsgTime(msg.created_at)}
            {isCoach && (
              <span className="ml-1 inline-flex items-center">
                {msg.read ? <CheckCheck size={11} className="text-brand-400" /> : <Check size={11} className="text-gray-300" />}
              </span>
            )}
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Main Inbox ────────────────────────────────────────────────
export default function Inbox() {
  const [searchParams] = useSearchParams()
  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get('c'))
  const [draft, setDraft]           = useState('')
  const [search, setSearch]         = useState('')
  const bottomRef                   = useRef<HTMLDivElement>(null)
  const inputRef                    = useRef<HTMLInputElement>(null)

  const { data: conversations = [], isLoading } = useConversations()
  const { data: messages = [], isLoading: loadingMsgs } = useMessages(selectedId)
  const sendMessage = useSendMessage()
  const markAsRead  = useMarkAsRead()

  const selectedConvo = conversations.find(c => c.id === selectedId) ?? null

  const filtered = conversations.filter(c =>
    c.clients.name.toLowerCase().includes(search.toLowerCase())
  )

  const totalUnread = conversations.reduce((n, c) => n + c.unread_count, 0)

  // Sync URL param → selected
  useEffect(() => {
    const c = searchParams.get('c')
    if (c) setSelectedId(c)
  }, [searchParams])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Mark as read when opening a conversation
  useEffect(() => {
    if (selectedId && selectedConvo && selectedConvo.unread_count > 0) {
      markAsRead.mutate(selectedId)
    }
  }, [selectedId])

  function send() {
    const text = draft.trim()
    if (!text || !selectedId || sendMessage.isPending) return
    sendMessage.mutate({ conversationId: selectedId, content: text })
    setDraft('')
    inputRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const grouped = groupByDate(messages)

  return (
    <div className="flex bg-white" style={{ height: 'calc(100vh - 64px)' }}>

      {/* ── Sidebar ─────────────────────────────────────────── */}
      <div className="w-[300px] flex-shrink-0 border-r border-gray-100 flex flex-col">
        {/* Header */}
        <div className="px-4 pt-5 pb-3 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-900 text-lg">Messages</h2>
            {totalUnread > 0 && (
              <span className="text-xs font-bold text-white bg-brand-500 px-2 py-0.5 rounded-full">
                {totalUnread}
              </span>
            )}
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search clients…"
              className="w-full pl-8 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-colors"
            />
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={20} className="text-gray-300 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
                <MessageSquare size={20} className="text-gray-300" />
              </div>
              <p className="text-sm text-gray-500 font-medium">
                {search ? 'No matching clients' : 'No conversations yet'}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {!search && 'Message a client from their profile page.'}
              </p>
            </div>
          ) : (
            filtered.map(c => (
              <ConvoRow
                key={c.id}
                convo={c}
                active={c.id === selectedId}
                onClick={() => setSelectedId(c.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* ── Chat area ───────────────────────────────────────── */}
      {selectedConvo ? (
        <div className="flex-1 flex flex-col min-w-0 bg-gray-50">
          {/* Header */}
          <div className="bg-white border-b border-gray-100 px-6 py-3.5 flex items-center gap-3 flex-shrink-0">
            <div className="w-9 h-9 rounded-full bg-brand-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {initials(selectedConvo.clients.name)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 leading-tight">{selectedConvo.clients.name}</p>
              {selectedConvo.clients.email && (
                <p className="text-xs text-gray-400 truncate">{selectedConvo.clients.email}</p>
              )}
            </div>
            <Link
              to={`/clients/${selectedConvo.client_id}`}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-brand-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-100"
            >
              <ExternalLink size={13} /> View profile
            </Link>
            <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
              <MoreHorizontal size={18} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-1">
            {loadingMsgs ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 size={24} className="text-gray-300 animate-spin" />
              </div>
            ) : grouped.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
                <div className="w-14 h-14 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-center justify-center">
                  <MessageSquare size={22} className="text-gray-300" />
                </div>
                <p className="text-gray-500 font-medium text-sm">No messages yet</p>
                <p className="text-gray-400 text-xs">Send the first message to {selectedConvo.clients.name}.</p>
              </div>
            ) : (
              grouped.map(group => (
                <div key={group.label}>
                  {/* Date divider */}
                  <div className="flex items-center gap-3 my-4">
                    <div className="flex-1 h-px bg-gray-200" />
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{group.label}</p>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>
                  <div className="space-y-1.5">
                    {group.messages.map((msg, idx) => {
                      const next = group.messages[idx + 1]
                      const showTime = !next || next.sender_type !== msg.sender_type
                        || new Date(next.created_at).getTime() - new Date(msg.created_at).getTime() > 5 * 60 * 1000
                      return <Bubble key={msg.id} msg={msg} showTime={showTime} />
                    })}
                  </div>
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="bg-white border-t border-gray-100 px-6 py-4 flex-shrink-0">
            <div className="flex items-end gap-3 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-500/15 transition-all">
              <input
                ref={inputRef}
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Message ${selectedConvo.clients.name}…`}
                className="flex-1 bg-transparent text-sm outline-none text-gray-800 placeholder-gray-400 resize-none"
              />
              <button
                onClick={send}
                disabled={!draft.trim() || sendMessage.isPending}
                className={clsx(
                  'w-8 h-8 rounded-xl flex items-center justify-center transition-all flex-shrink-0',
                  draft.trim()
                    ? 'bg-brand-600 hover:bg-brand-700 text-white shadow-sm active:scale-95'
                    : 'bg-gray-200 text-gray-400 cursor-default',
                )}
              >
                {sendMessage.isPending
                  ? <Loader2 size={14} className="animate-spin" />
                  : <Send size={14} />
                }
              </button>
            </div>
            <p className="text-[11px] text-gray-400 mt-1.5 text-center">Enter to send</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 bg-gray-50">
          <div className="w-16 h-16 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-center justify-center">
            <MessageSquare size={26} className="text-gray-300" />
          </div>
          <p className="text-gray-500 font-medium">Select a conversation</p>
          <p className="text-xs text-gray-400">Or message a client from their profile.</p>
        </div>
      )}
    </div>
  )
}
