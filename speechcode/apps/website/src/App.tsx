const steps = [
  {
    title: "Speak your idea",
    copy: "Use a hotkey or quick trigger and describe the feature in plain language."
  },
  {
    title: "SpeechCode sharpens it",
    copy: "The request becomes a cleaner prompt that keeps your intent but removes friction."
  },
  {
    title: "Your coding tool takes over",
    copy: "SpeechCode opens the target, inserts the prompt, and keeps the progress easy to follow."
  }
];

const benefits = [
  "Voice-first flow that feels instant",
  "Plain-English progress instead of logs",
  "Quiet interface you can leave open all day"
];

export function App() {
  return (
    <main className="site-shell">
      <section className="site-hero">
        <header className="site-nav">
          <div className="site-brand">
            <span className="site-brand-mark" aria-hidden="true" />
            <span>SpeechCode</span>
          </div>
          <a href="#download">Download</a>
        </header>

        <div className="hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">Voice-first coding</p>
            <h1>Don’t type. Build.</h1>
            <p className="hero-subtext">Speak your idea. Watch it happen.</p>
            <div className="hero-actions">
              <button>Download for macOS</button>
              <span>Windows support included</span>
            </div>
          </div>
          <div className="hero-stage" aria-hidden="true">
            <div className="wave-orb">
              <span className="wave-ring wave-ring-one" />
              <span className="wave-ring wave-ring-two" />
              <span className="wave-core" />
            </div>
            <div className="wave-bars">
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
            <div className="status-stack">
              <div>Preparing prompt</div>
              <div>Opening coding tool</div>
              <div>Creating components</div>
            </div>
          </div>
        </div>
      </section>

      <section className="site-section steps-section">
        <div className="section-intro">
          <p className="eyebrow">How it works</p>
          <h2>Three calm steps from thought to build.</h2>
        </div>
        <div className="step-grid">
          {steps.map((step, index) => (
            <article key={step.title} className="step-card">
              <span>0{index + 1}</span>
              <h3>{step.title}</h3>
              <p>{step.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="site-section benefits-section">
        <div className="section-intro">
          <p className="eyebrow">Benefits</p>
          <h2>Feels more like dictation than setup.</h2>
        </div>
        <div className="benefit-list">
          {benefits.map((benefit) => (
            <article key={benefit} className="benefit-row">
              <span className="benefit-dot" aria-hidden="true" />
              <p>{benefit}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="site-section pricing-section">
        <div className="section-intro">
          <p className="eyebrow">Pricing</p>
          <h2>Start free. Upgrade when you want more control.</h2>
        </div>
        <div className="pricing-grid">
          <article className="price-card">
            <span>Free</span>
            <strong>$0</strong>
            <p>Voice-first capture, core prompt cleanup, browser and Cursor targeting.</p>
          </article>
          <article className="price-card featured">
            <span>Pro</span>
            <strong>$9.99 / month</strong>
            <p>Includes a 7-day free trial and the richer orchestration layer as it expands.</p>
          </article>
        </div>
      </section>

      <section id="download" className="site-section download-section">
        <p className="eyebrow">Download</p>
        <h2>Keep your coding tool. Change how you talk to it.</h2>
        <button>Download for macOS</button>
      </section>
    </main>
  );
}
