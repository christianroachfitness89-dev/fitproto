import { useState } from 'react'
import { Search, Send, Paperclip, Smile, MoreHorizontal } from 'lucide-react'
import { mockMessages } from '../data/mockData'
import clsx from 'clsx'

export default function Inbox() {
  const [selected, setSelected] = useState(mockMessages[0]?.id)
  const [message, setMessage] = useState('')
  const selectedConvo = mockMessages.find(m => m.id === selected)

  const mockThread = [
    { id: 'a', from: 'client', text: "Hey coach! Just finished the leg day session. Feeling great!", time: '10:28 AM' },
    { id: 'b', from: 'coach', text: "Amazing work! How did the squats feel? Any knee discomfort?", time: '10:32 AM' },
    { id: 'c', from: 'client', text: selectedConvo?.content ?? '', time: '10:34 AM' },
  ]

  return (
    <div className="h-full flex" style={{ height: 'calc(100vh - 64px)' }}>
      {/* Conversation list */}
      <div className="w-80 flex-shrink-0 border-r border-gray-100 bg-white flex flex-col">
        <div className="p-4 border-b border-gray-100">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              placeholder="Search messages..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
          {mockMessages.map(msg => (
            <button
              key={msg.id}
              onClick={() => setSelected(msg.id)}
              className={clsx(
                'w-full flex items-start gap-3 p-4 text-left hover:bg-gray-50 transition-colors',
                selected === msg.id && 'bg-brand-50 hover:bg-brand-50'
              )}
            >
              <div className="w-10 h-10 rounded-full bg-brand-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                {msg.clientInitials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-800 truncate">{msg.clientName}</p>
                  <p className="text-xs text-gray-400 flex-shrink-0 ml-2">
                    {new Date(msg.timestamp).toLocaleDateString()}
                  </p>
                </div>
                <p className="text-xs text-gray-500 truncate mt-0.5">{msg.content}</p>
              </div>
              {!msg.read && <div className="w-2 h-2 rounded-full bg-brand-500 mt-1.5 flex-shrink-0" />}
            </button>
          ))}
        </div>
      </div>

      {/* Chat area */}
      {selectedConvo ? (
        <div className="flex-1 flex flex-col bg-gray-50">
          {/* Chat header */}
          <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-brand-600 flex items-center justify-center text-white text-sm font-bold">
              {selectedConvo.clientInitials}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-800">{selectedConvo.clientName}</p>
              <p className="text-xs text-emerald-500 font-medium">Online</p>
            </div>
            <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
              <MoreHorizontal size={18} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {mockThread.map(msg => (
              <div key={msg.id} className={clsx('flex', msg.from === 'coach' ? 'justify-end' : 'justify-start')}>
                <div className={clsx(
                  'max-w-xs lg:max-w-md px-4 py-2.5 rounded-2xl',
                  msg.from === 'coach'
                    ? 'bg-brand-600 text-white rounded-br-sm'
                    : 'bg-white text-gray-800 rounded-bl-sm shadow-sm border border-gray-100'
                )}>
                  <p className="text-sm">{msg.text}</p>
                  <p className={clsx('text-[11px] mt-1', msg.from === 'coach' ? 'text-brand-200' : 'text-gray-400')}>
                    {msg.time}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="bg-white border-t border-gray-100 px-6 py-4">
            <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
              <button className="text-gray-400 hover:text-gray-600 transition-colors">
                <Paperclip size={18} />
              </button>
              <input
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 bg-transparent text-sm outline-none text-gray-800 placeholder-gray-400"
                onKeyDown={e => { if (e.key === 'Enter') setMessage('') }}
              />
              <button className="text-gray-400 hover:text-gray-600 transition-colors">
                <Smile size={18} />
              </button>
              <button
                onClick={() => setMessage('')}
                className="w-9 h-9 rounded-lg bg-brand-600 hover:bg-brand-700 text-white flex items-center justify-center transition-colors flex-shrink-0"
              >
                <Send size={15} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <p className="text-gray-400">Select a conversation</p>
        </div>
      )}
    </div>
  )
}
