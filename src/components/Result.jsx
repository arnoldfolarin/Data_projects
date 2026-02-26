import { useState, useEffect } from 'react'
import './Result.css'

export default function Result({ result, onRestart }) {
  const [visibleReplies, setVisibleReplies] = useState(0)
  const [copied, setCopied] = useState(null)

  useEffect(() => {
    const timers = result.replies.map((_, i) =>
      setTimeout(() => setVisibleReplies(i + 1), 300 + i * 200)
    )
    return () => timers.forEach(clearTimeout)
  }, [result])

  const handleCopy = (text, index) => {
    navigator.clipboard.writeText(text)
    setCopied(index)
    setTimeout(() => setCopied(null), 1500)
  }

  return (
    <section className="result">
      <div className="result-badge">Your Reply Personality</div>

      <div className="result-icon" style={{ background: `${result.color}20` }}>
        {result.emoji}
      </div>

      <h2 className="result-title">
        You are <span style={{ color: result.color }}>{result.name}</span>
      </h2>

      <p className="result-description">{result.description}</p>

      <div className="replies-section">
        <h3 className="replies-heading">
          <span className="replies-icon">💬</span>
          Your Auto-Replies Preview
        </h3>

        <div className="replies-list">
          {result.replies.map((reply, i) => (
            <div
              key={i}
              className={`reply-card ${i < visibleReplies ? 'visible' : ''}`}
              style={{ transitionDelay: `${i * 0.1}s` }}
            >
              <div className="reply-content">
                <div className="reply-dot" style={{ background: result.color }} />
                <span className="reply-text">{reply}</span>
              </div>
              <button
                className={`copy-btn ${copied === i ? 'copied' : ''}`}
                onClick={() => handleCopy(reply, i)}
                title="Copy reply"
              >
                {copied === i ? (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8l3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <rect x="5" y="5" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M3 11V3.5A.5.5 0 013.5 3H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="result-cta">
        <div className="cta-card">
          <div className="cta-card-icon">🚀</div>
          <h4>Ready to automate?</h4>
          <p>Connect your Instagram to start auto-replying to reels with your unique personality style.</p>
          <button className="connect-btn" style={{ background: result.color }}>
            Connect Instagram
          </button>
        </div>
      </div>

      <button className="restart-btn" onClick={onRestart}>
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M3 3v5h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M3.5 8A6.5 6.5 0 1 1 3 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        Retake the Quiz
      </button>
    </section>
  )
}
