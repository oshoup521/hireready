import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import './CoachChat.css'

/**
 * CoachChat — inline chatbot panel rendered below the ReportCard.
 * Sends the full score report with every request so the backend's system
 * prompt can reference the user's actual numbers.
 *
 * Session-scoped: no persistence. Cleared when a new report is generated
 * (parent passes a different `reportKey`, which remounts the component).
 */

// Starter chips are mode-aware — ATS-only mode has no JD, so JD-comparison
// chips don't make sense and are swapped out.
const CHIPS_WITH_JD = [
  { id: 'why-score', label: 'Why is my score where it is?' },
  { id: 'rewrite-bullets', label: 'Rewrite my experience bullets for this JD' },
  { id: 'top-missing', label: 'Which missing keywords matter most?' },
  { id: 'sections', label: 'What sections should I add?' },
]

const CHIPS_ATS_ONLY = [
  { id: 'why-score-ats', label: 'Why is my ATS-readiness score this?' },
  { id: 'strengthen-experience', label: 'How can I strengthen my experience section?' },
  { id: 'skills-breadth', label: 'Are my skills broad enough?' },
  { id: 'sections', label: 'What sections should I add?' },
]

const CHIP_PROMPTS = {
  'why-score': 'Looking at my score report, explain in plain language why my overall score is what it is — call out the 2-3 biggest drags.',
  'rewrite-bullets': 'Pick 2-3 weak bullets from my experience section and rewrite them to better match this job description. Show before → after with quantified impact.',
  'top-missing': 'Of my missing keywords, which 5 should I prioritize adding, and why? Tell me where in my resume each one would naturally fit.',
  'sections': 'Which resume sections am I missing or under-using? For each, tell me what to put in it.',
  'why-score-ats': 'Explain why my ATS-readiness score is what it is. Focus on section completeness, skills breadth, experience, and education — no JD was uploaded, so skip any keyword-matching discussion.',
  'strengthen-experience': 'Review my experience section. Point out 2-3 specific bullets that are weak (vague, no numbers, passive voice) and rewrite them to be stronger. Show before → after.',
  'skills-breadth': 'Look at the skills in my resume. Are they broad and current enough for my target roles? Suggest specific skills I should add based on what experienced candidates in my field typically list.',
}

export default function CoachChat({ report, apiUrl }) {
  const [messages, setMessages] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  // Pick the right chip set for this report. Fallback to JD mode if the
  // backend ever omits the field (older reports in localStorage history).
  const isAtsOnly = report?.mode === 'resume_only'
  const starterChips = isAtsOnly ? CHIPS_ATS_ONLY : CHIPS_WITH_JD
  // Show hint on mount; once dismissed (X clicked or panel opened) it stays gone.
  const [showHint, setShowHint] = useState(true)
  const scrollRef = useRef(null)

  function dismissHint() {
    setShowHint(false)
  }

  // Auto-scroll chat to the newest message (only when the panel is open)
  useEffect(() => {
    if (!isOpen) return
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading, isOpen])

  // Lock body scroll while the panel is open (prevents background scroll on mobile)
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  // Escape key closes the panel — standard chat-widget UX
  useEffect(() => {
    if (!isOpen) return
    const handler = (e) => { if (e.key === 'Escape') setIsOpen(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen])

  async function sendMessage(text) {
    const trimmed = text.trim()
    if (!trimmed || isLoading) return

    const nextMessages = [...messages, { role: 'user', content: trimmed }]
    setMessages(nextMessages)
    setIsLoading(true)

    try {
      const response = await fetch(`${apiUrl}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages,
          report,
        }),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.detail || `Server error ${response.status}`)
      }

      const data = await response.json()
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.reply, modelUsed: data.model_used },
      ])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: err.message || 'Something went wrong. Please try again.',
          isError: true,
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      {/* First-time intro hint — speech-bubble next to the FAB */}
      {showHint && !isOpen && (
        <div className="coach-hint" role="status">
          <button
            type="button"
            className="coach-hint__close"
            onClick={dismissHint}
            aria-label="Dismiss tip"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none"/>
            </svg>
          </button>
          <div className="coach-hint__title">Need help improving your score?</div>
          <div className="coach-hint__body">
            Ask HireReady Coach for tailored tips based on your report.
          </div>
        </div>
      )}

      {/* Floating action button — always visible when a report exists */}
      <button
        type="button"
        className={`coach-fab${isOpen ? ' coach-fab--hidden' : ''}`}
        onClick={() => { dismissHint(); setIsOpen(true) }}
        aria-label="Open HireReady Coach"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M12 3C6.48 3 2 6.94 2 11.5c0 2.05.9 3.93 2.4 5.38L3 21l4.56-1.3c1.36.52 2.88.8 4.44.8 5.52 0 10-3.94 10-8.5S17.52 3 12 3Zm-3.5 9.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm3.5 0a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm3.5 0a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z" />
        </svg>
        <span className="coach-fab__label">Coach</span>
      </button>

      {/* Backdrop — only rendered on mobile (CSS controls visibility).
          Tapping it closes the drawer, same as pressing Escape. */}
      {isOpen && (
        <div
          className="coach-backdrop"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Expandable chat panel */}
      <section
        className={`coach-panel${isOpen ? ' coach-panel--open' : ''}`}
        aria-label="HireReady Coach"
        aria-hidden={!isOpen}
      >
        <div className="coach-panel__header">
          <div>
            <h2 className="coach-panel__title">HireReady Coach</h2>
            <p className="coach-panel__subtitle">
              Ask about your report or tap a prompt.
            </p>
          </div>
          <button
            type="button"
            className="coach-panel__close"
            onClick={() => setIsOpen(false)}
            aria-label="Close coach"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none"/>
            </svg>
          </button>
        </div>

        {messages.length === 0 && (
          <div className="coach-panel__chips" role="list">
            {starterChips.map((chip) => (
              <button
                key={chip.id}
                type="button"
                className="coach-chip"
                onClick={() => sendMessage(CHIP_PROMPTS[chip.id])}
                disabled={isLoading}
              >
                {chip.label}
              </button>
            ))}
          </div>
        )}

        <div className="coach-panel__messages">
          {messages.map((msg, i) => (
            <CoachMessage key={i} {...msg} />
          ))}

          {isLoading && (
            <div className="coach-msg coach-msg--assistant">
              <span className="coach-msg__label">Coach</span>
              <div className="coach-typing">
                <span /><span /><span />
              </div>
            </div>
          )}

          <div ref={scrollRef} />
        </div>

        <CoachInput onSend={sendMessage} disabled={isLoading} />
      </section>
    </>
  )
}

/* ---------- Internal: message bubble ---------- */
function CoachMessage({ role, content, isError, modelUsed }) {
  const isUser = role === 'user'
  return (
    <div
      className={`coach-msg ${isUser ? 'coach-msg--user' : 'coach-msg--assistant'}${
        isError ? ' coach-msg--error' : ''
      }`}
    >
      <span className="coach-msg__label">{isUser ? 'You' : 'Coach'}</span>
      <div className="coach-msg__bubble">
        {isUser ? (
          content
        ) : (
          <div className="coach-markdown">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        )}
      </div>
      {!isUser && modelUsed && (
        <span className="coach-msg__model">via {modelUsed.replace(':free', '')}</span>
      )}
    </div>
  )
}

/* ---------- Internal: input bar ---------- */
function CoachInput({ onSend, disabled }) {
  const [value, setValue] = useState('')
  const textareaRef = useRef(null)

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [value])

  function handleSend() {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setValue('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="coach-input">
      <textarea
        ref={textareaRef}
        className="coach-input__textarea"
        rows={1}
        placeholder="Ask about your score, keywords, sections…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
      />
      <button
        type="button"
        className="coach-input__send"
        onClick={handleSend}
        disabled={disabled || !value.trim()}
        aria-label="Send message"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M4 12 20 4l-5 16-3.2-6.8L4 12Zm8.8-.9 1.2 2.5 1.8-5.4-5.6 2.8 2.6.1Z" />
        </svg>
      </button>
    </div>
  )
}
