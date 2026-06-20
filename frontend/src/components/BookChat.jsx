import { useState, useEffect, useRef } from 'react'
import { Button, Spinner, Form } from 'react-bootstrap'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getBookChatHistory, clearBookChatHistory, streamBookChat, streamRecommendations } from '../api/books'

const TAB_CHAT   = 'chat'
const TAB_RECOMMEND = 'recommend'

const CHAT_SUGGESTIONS    = ['What is this book about?', 'Who should read this?', 'What are the key themes?']
const RECOMMEND_SUGGESTIONS = ['Recommend books like the ones I\'ve read', 'What should I read next?', 'Suggest something challenging']

export default function BookChat({ bookId, bookTitle }) {
  const [tab, setTab]         = useState(TAB_CHAT)
  const [messages, setMessages] = useState([])
  const [input, setInput]     = useState('')
  const [streaming, setStreaming] = useState(false)
  const [error, setError]     = useState(null)
  const messagesEndRef        = useRef(null)
  const queryClient           = useQueryClient()

  // Load chat history from server (book Q&A only)
  // Note: no default [] here — undefined keeps the effect from firing during load
  const { data: history, isLoading } = useQuery({
    queryKey: ['book-chat', bookId],
    queryFn:  () => getBookChatHistory(bookId),
    enabled:  tab === TAB_CHAT,
  })

  // Sync server history → local messages only when data is available
  // Using history directly (not []) avoids a new reference each render
  useEffect(() => {
    if (tab === TAB_CHAT && history != null) {
      setMessages(history)
    }
  }, [history, tab])

  // Auto-scroll to bottom on new content
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const switchTab = (next) => {
    setTab(next)
    setError(null)
    setInput('')
    if (next === TAB_RECOMMEND) setMessages([])
  }

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || streaming) return

    const userMsg      = { role: 'user',      content: text,  created_at: new Date().toISOString() }
    const assistantMsg = { role: 'assistant',  content: '',    created_at: new Date().toISOString() }

    setMessages(prev => [...prev, userMsg, assistantMsg])
    setInput('')
    setStreaming(true)
    setError(null)

    try {
      const gen = tab === TAB_CHAT
        ? streamBookChat(bookId, text)
        : streamRecommendations(text)

      for await (const chunk of gen) {
        setMessages(prev => {
          const next = [...prev]
          next[next.length - 1] = {
            ...next[next.length - 1],
            content: next[next.length - 1].content + chunk,
          }
          return next
        })
      }

      // Refresh server history so next load includes the new exchange
      if (tab === TAB_CHAT) {
        queryClient.invalidateQueries({ queryKey: ['book-chat', bookId] })
      }
    } catch (err) {
      setError(err.message ?? 'Something went wrong.')
      // Remove the empty assistant placeholder
      setMessages(prev => prev.slice(0, -1))
    } finally {
      setStreaming(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleClear = async () => {
    await clearBookChatHistory(bookId)
    setMessages([])
    queryClient.invalidateQueries({ queryKey: ['book-chat', bookId] })
  }

  const showEmpty = !isLoading && history != null && messages.length === 0

  return (
    <div className="mt-4 rounded-4 border overflow-hidden">
      {/* ── Header ── */}
      <div
        className="px-4 py-3 d-flex align-items-center justify-content-between"
        style={{ background: 'linear-gradient(90deg,#19875415,#0d6efd15)', borderBottom: '1px solid #dee2e6' }}
      >
        <div className="d-flex align-items-center gap-3">
          <span style={{ fontSize: 18 }}>💬</span>
          <span className="fw-semibold">AI Chat</span>
          <div className="d-flex gap-1">
            <TabButton active={tab === TAB_CHAT}       onClick={() => switchTab(TAB_CHAT)}>Book Q&amp;A</TabButton>
            <TabButton active={tab === TAB_RECOMMEND}  onClick={() => switchTab(TAB_RECOMMEND)}>Recommendations</TabButton>
          </div>
        </div>
        {tab === TAB_CHAT && messages.length > 0 && !streaming && (
          <Button variant="outline-secondary" size="sm" className="rounded-3" onClick={handleClear}>
            Clear
          </Button>
        )}
      </div>

      {/* ── Messages ── */}
      <div
        style={{ height: 380, overflowY: 'auto', background: 'var(--bs-body-bg)' }}
        className="p-3"
      >
        {isLoading && tab === TAB_CHAT ? (
          <div className="d-flex justify-content-center align-items-center h-100">
            <Spinner size="sm" animation="border" variant="secondary" />
          </div>
        ) : showEmpty ? (
          <EmptyState
            tab={tab}
            bookTitle={bookTitle}
            suggestions={tab === TAB_CHAT ? CHAT_SUGGESTIONS : RECOMMEND_SUGGESTIONS}
            onSuggestion={setInput}
          />
        ) : (
          <>
            {messages.map((msg, i) => (
              <MessageBubble
                key={i}
                msg={msg}
                isStreaming={streaming && i === messages.length - 1 && msg.role === 'assistant'}
              />
            ))}
            {error && (
              <div className="alert alert-danger py-2 small rounded-3 mt-2 mb-0">{error}</div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* ── Input ── */}
      <div className="p-3 border-top" style={{ background: 'var(--bs-tertiary-bg, #f8f9fa)' }}>
        <div className="d-flex gap-2">
          <Form.Control
            as="textarea"
            rows={1}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={tab === TAB_CHAT ? `Ask about "${bookTitle}"…` : 'Ask for recommendations…'}
            className="rounded-3"
            style={{ resize: 'none', fontSize: 14 }}
            disabled={streaming}
          />
          <Button
            variant="primary"
            className="rounded-3 px-3"
            onClick={sendMessage}
            disabled={!input.trim() || streaming}
          >
            {streaming
              ? <Spinner size="sm" animation="border" />
              : <SendIcon />}
          </Button>
        </div>
        <p className="mb-0 text-muted mt-1" style={{ fontSize: 11 }}>
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function TabButton({ active, onClick, children }) {
  return (
    <button
      className={`btn btn-sm rounded-3 ${active ? 'btn-primary' : 'btn-outline-secondary'}`}
      style={{ fontSize: 12, padding: '2px 10px' }}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

function EmptyState({ tab, bookTitle, suggestions, onSuggestion }) {
  return (
    <div className="d-flex flex-column align-items-center justify-content-center h-100 text-center px-3">
      <p className="text-muted small mb-3">
        {tab === TAB_CHAT
          ? `Ask anything about "${bookTitle}"`
          : 'Get personalised recommendations based on your reading history'}
      </p>
      <div className="d-flex flex-wrap gap-2 justify-content-center">
        {suggestions.map(s => (
          <button
            key={s}
            className="btn btn-sm btn-outline-secondary rounded-pill"
            style={{ fontSize: 12 }}
            onClick={() => onSuggestion(s)}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}

function MessageBubble({ msg, isStreaming }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`d-flex mb-3 ${isUser ? 'justify-content-end' : 'justify-content-start'}`}>
      {!isUser && (
        <span className="me-2 mt-1" style={{ fontSize: 16, flexShrink: 0 }}>🤖</span>
      )}
      <div
        className="px-3 py-2 rounded-3"
        style={{
          maxWidth: '80%',
          background: isUser ? '#0d6efd' : 'var(--bs-tertiary-bg, #f0f2f5)',
          color:      isUser ? '#fff' : 'inherit',
          fontSize:   14,
          lineHeight: 1.65,
          whiteSpace: 'pre-wrap',
          wordBreak:  'break-word',
        }}
      >
        {msg.content || (isStreaming ? null : '…')}
        {isStreaming && (
          <span style={{ display: 'inline-block', width: 2, height: '1em', background: 'currentColor', marginLeft: 2, animation: 'blink 1s step-end infinite', verticalAlign: 'text-bottom' }} />
        )}
      </div>
    </div>
  )
}

function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  )
}
