import './Hero.css'

export default function Hero({ onStart }) {
  return (
    <section className="hero">
      <div className="hero-badge">
        <span className="badge-dot" />
        Auto-Reply Engine for Instagram Reels
      </div>

      <h1 className="hero-title">
        Your Reels Deserve
        <span className="gradient-text"> Replies with Personality</span>
      </h1>

      <p className="hero-subtitle">
        Take a 4-question personality test and we'll craft the perfect
        auto-replies for every reel that hits your feed. Authentic, on-brand,
        and totally you.
      </p>

      <button className="cta-button" onClick={onStart}>
        <span>Discover Your Reply Style</span>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M4 10h12m0 0l-4-4m4 4l-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      <div className="hero-stats">
        <div className="stat">
          <span className="stat-number">4</span>
          <span className="stat-label">Quick Questions</span>
        </div>
        <div className="stat-divider" />
        <div className="stat">
          <span className="stat-number">4</span>
          <span className="stat-label">Personality Types</span>
        </div>
        <div className="stat-divider" />
        <div className="stat">
          <span className="stat-number">∞</span>
          <span className="stat-label">Perfect Replies</span>
        </div>
      </div>

      <div className="hero-preview">
        <div className="preview-card">
          <div className="preview-header">
            <div className="preview-avatar">🔥</div>
            <div>
              <div className="preview-name">The Hype Machine</div>
              <div className="preview-handle">auto-reply active</div>
            </div>
          </div>
          <div className="preview-bubble">"THIS IS EVERYTHING 🔥🔥🔥"</div>
        </div>
        <div className="preview-card">
          <div className="preview-header">
            <div className="preview-avatar">😏</div>
            <div>
              <div className="preview-name">The Witty Observer</div>
              <div className="preview-handle">auto-reply active</div>
            </div>
          </div>
          <div className="preview-bubble">"My therapist is going to hear about this 😂"</div>
        </div>
        <div className="preview-card">
          <div className="preview-header">
            <div className="preview-avatar">💛</div>
            <div>
              <div className="preview-name">The Cheerleader</div>
              <div className="preview-handle">auto-reply active</div>
            </div>
          </div>
          <div className="preview-bubble">"You are so talented, never stop! ✨"</div>
        </div>
      </div>
    </section>
  )
}
