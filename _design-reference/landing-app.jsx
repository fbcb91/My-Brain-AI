// landing-app.jsx — Niklaus landing page
// Composes hero, principles, demos, heritage, pricing, FAQ, CTA, footer.

const { useState, useEffect, useRef } = React;

// ───────────────────────────────────────────────────────
// Tweak defaults — edited by host
// ───────────────────────────────────────────────────────
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "editorial",
  "density": "cozy",
  "accentEditorial": "#b56b1d",
  "accentCinematic": "#d4a253",
  "accentMinimal": "#1d3eff"
}/*EDITMODE-END*/;

// ───────────────────────────────────────────────────────
// Hero
// ───────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="hero">
      <div className="container">
        <div className="hero-grid">
          <div className="hero-text">
            <span className="hero-eyebrow">
              <span className="pulse" />
              <span className="t-mono" style={{ fontSize: 11 }}>Coming to iOS · 2026</span>
            </span>
            <h1>
              Your memory.<br/>
              That <em>talks back.</em>
            </h1>
            <p className="hero-sub">
              Niklaus ingests your voice, your notes, your daily thoughts —
              and becomes a searchable memory of you. Yours today. For someone
              you love, tomorrow.
            </p>
            <div className="hero-ctas">
              <a href="#waitlist" className="btn btn-primary">
                Join the waitlist
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
              </a>
              <a href="#how" className="btn btn-ghost">See how it works</a>
            </div>
            <div className="promise-strip">
              <div className="item"><strong>Yours.</strong> Export anything, anytime, free.</div>
              <div className="item"><strong>Forever.</strong> No ads. No selling data.</div>
              <div className="item"><strong>Transmissible.</strong> Designed for inheritance.</div>
            </div>
          </div>
          <div className="hero-device">
            <PhoneApp initial="today" scale={0.85} />
          </div>
        </div>
      </div>
    </section>
  );
}

// ───────────────────────────────────────────────────────
// Three principles
// ───────────────────────────────────────────────────────
function Principles() {
  const items = [
    {
      n: '01',
      title: 'Yours, in raw form',
      body: 'Audio, transcripts, notes — all exportable in plain formats, free, without friction. Even on the free plan. Even if you cancel.',
    },
    {
      n: '02',
      title: 'Honest about what it is',
      body: 'When the model doesn\'t know, it says so. It never invents thoughts you didn\'t express, never simulates emotions the data doesn\'t support.',
    },
    {
      n: '03',
      title: 'Built for after you',
      body: 'Heir designation, time-locked messages, encrypted backups. Inheritance is not a feature added later — it\'s in the architecture from day one.',
    },
  ];
  return (
    <section id="principles">
      <div className="container">
        <div className="sec-head">
          <span className="t-eyebrow">The promise</span>
          <h2>Three things we will never compromise on.</h2>
        </div>
      </div>
      <div className="principles">
        {items.map((p) => (
          <div className="principle reveal" key={p.n}>
            <span className="num">{p.n}</span>
            <h3>{p.title}</h3>
            <p>{p.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ───────────────────────────────────────────────────────
// Demo 1 — capture
// ───────────────────────────────────────────────────────
function CaptureDemo() {
  return (
    <section id="how">
      <div className="container">
        <div className="demo-split">
          <div className="demo-text reveal">
            <span className="t-eyebrow">Capture · 1 of 4</span>
            <h3>Speak the thought before you lose it.</h3>
            <p>
              Hold to record. Niklaus transcribes on your device — your raw
              audio never leaves the phone unless you say so. Or just type a
              fragment: same pipeline, same memory.
            </p>
            <div className="features">
              <div className="feat">
                <span className="icn">●</span>
                <span><strong>On-device transcription.</strong> Apple Speech, local-first. Works offline.</span>
              </div>
              <div className="feat">
                <span className="icn">●</span>
                <span><strong>Encrypted at rest.</strong> SQLCipher locally, encrypted vector store remotely.</span>
              </div>
              <div className="feat">
                <span className="icn">●</span>
                <span><strong>One thought, one tap.</strong> Lock-screen shortcut. No menus, no friction.</span>
              </div>
            </div>
          </div>
          <div className="demo-stage">
            <PhoneApp initial="today" scale={0.82} label="Today · Capture" />
          </div>
        </div>
      </div>
    </section>
  );
}

// ───────────────────────────────────────────────────────
// Demo 2 — memory chat
// ───────────────────────────────────────────────────────
function ChatDemo() {
  return (
    <section>
      <div className="container">
        <div className="demo-split reverse">
          <div className="demo-text reveal">
            <span className="t-eyebrow">Memory · 2 of 4</span>
            <h3>Ask anything. Get an answer with receipts.</h3>
            <p>
              Niklaus reads back what you said, when you said it, and links to
              the original audio or note. If it doesn't know, it tells you so —
              never guesses, never invents.
            </p>
            <div className="features">
              <div className="feat">
                <span className="icn">●</span>
                <span><strong>Cited answers.</strong> Every claim is anchored to a source you can play back.</span>
              </div>
              <div className="feat">
                <span className="icn">●</span>
                <span><strong>Hybrid retrieval.</strong> Vector + keyword + temporal — finds things by meaning or by date.</span>
              </div>
              <div className="feat">
                <span className="icn">●</span>
                <span><strong>"I don't know" by design.</strong> Honest about limits — try asking something you never told it.</span>
              </div>
            </div>
            <p style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 18, fontStyle: 'italic' }}>
              ↓ The phone is live. Try a question.
            </p>
          </div>
          <div className="demo-stage">
            <PhoneApp initial="memory" scale={0.82} label="Memory · Chat" />
          </div>
        </div>
      </div>
    </section>
  );
}

// ───────────────────────────────────────────────────────
// Pillars (4 MVP features)
// ───────────────────────────────────────────────────────
function Pillars() {
  const items = [
    { tag: '01', title: 'Voice journal', desc: 'Short audios across the day. Transcribed locally. Always exportable.', visual: <PillarVoice /> },
    { tag: '02', title: 'Brain dump', desc: 'Ideas, fragments, "remember to". Voice or text — same memory.', visual: <PillarDump /> },
    { tag: '03', title: 'Memory chat', desc: 'Conversational search of everything you\'ve fed Niklaus. With citations.', visual: <PillarChat /> },
    { tag: '04', title: 'Daily question', desc: 'One question, every day. No streaks. No guilt. Skip if you want.', visual: <PillarDaily /> },
  ];
  return (
    <section>
      <div className="container">
        <div className="sec-head">
          <span className="t-eyebrow">The MVP · four pillars</span>
          <h2>Four ways your memory grows.</h2>
        </div>
        <div className="pillars">
          {items.map((p, i) => (
            <div className="pillar reveal" key={i}>
              <span className="badge">{p.tag}</span>
              <h4>{p.title}</h4>
              <p>{p.desc}</p>
              <div className="visual">{p.visual}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PillarVoice() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3, height: 36 }}>
      {Array.from({ length: 22 }).map((_, i) => (
        <span key={i} style={{
          width: 3, borderRadius: 2,
          background: 'var(--accent)',
          height: `${20 + Math.abs(Math.sin(i * 0.7)) * 70}%`,
          opacity: 0.7,
        }} />
      ))}
    </div>
  );
}
function PillarDump() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: 14, width: '100%' }}>
      <span style={{ height: 4, background: 'var(--ink-3)', opacity: 0.5, width: '78%', borderRadius: 2 }} />
      <span style={{ height: 4, background: 'var(--ink-3)', opacity: 0.5, width: '90%', borderRadius: 2 }} />
      <span style={{ height: 4, background: 'var(--ink-3)', opacity: 0.5, width: '60%', borderRadius: 2 }} />
      <span style={{ height: 4, background: 'var(--accent)', width: '40%', borderRadius: 2 }} />
    </div>
  );
}
function PillarChat() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 12 }}>
      <span style={{ alignSelf: 'flex-end', padding: '4px 10px', background: 'var(--ink)', color: 'var(--bg)', borderRadius: 10, fontSize: 10 }}>What about Marco?</span>
      <span style={{ alignSelf: 'flex-start', padding: '4px 10px', background: 'var(--accent-soft)', color: 'var(--accent)', borderRadius: 10, fontSize: 10, fontFamily: 'var(--font-display)' }}>On April 28…</span>
    </div>
  );
}
function PillarDaily() {
  return (
    <div style={{ textAlign: 'center', padding: 8 }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontStyle: 'italic', color: 'var(--ink)', lineHeight: 1.3, padding: '0 12px' }}>
        "What did you learn this week — about yourself?"
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────
// Heritage
// ───────────────────────────────────────────────────────
function HeritageSection() {
  return (
    <section className="heritage">
      <div className="container">
        <div className="sec-head">
          <span className="t-eyebrow">Heritage · the long arc</span>
          <h2>The part nobody else builds.</h2>
        </div>
        <div className="heritage-grid">
          <div className="reveal">
            <div className="heritage-quote">
              "If I were the heir, I'd want to know the truth."
            </div>
            <p style={{ fontSize: 17, color: 'var(--ink-2)', lineHeight: 1.55, maxWidth: '46ch' }}>
              Heritage isn't a feature we add later. It's the reason Niklaus
              exists. Designate heirs. Set access rules per person. Lock
              messages to be opened on a date, an age, an anniversary.
              Mark anything as private — and it stays private, forever.
            </p>
            <div className="heritage-list">
              <div className="row"><span className="label">Designate heirs</span><span className="desc">Per-person access rules</span><span className="status">5 min</span></div>
              <div className="row"><span className="label">Death verification</span><span className="desc">Periodic check-in + heir-confirmed path</span><span className="status">configured</span></div>
              <div className="row"><span className="label">Time-locked messages</span><span className="desc">"Open when she turns 18"</span><span className="status">3 ready</span></div>
              <div className="row"><span className="label">Privacy markers</span><span className="desc">Per-item, per-tag, per-person</span><span className="status">granular</span></div>
              <div className="row"><span className="label">Speak as you, or as a witness</span><span className="desc">First-person mode is opt-in only, while alive</span><span className="status">your choice</span></div>
            </div>
          </div>
          <div className="demo-stage">
            <PhoneApp initial="you" scale={0.82} label="You · Heritage" />
          </div>
        </div>
      </div>
    </section>
  );
}

// ───────────────────────────────────────────────────────
// Tenets
// ───────────────────────────────────────────────────────
function Tenets() {
  const items = [
    { n: '01', t: 'No ads, ever', d: 'Our only revenue is you. Anything else creates a conflict with your trust.' },
    { n: '02', t: 'No selling data', d: 'Not raw, not "anonymized," not aggregated. Not for any price.' },
    { n: '03', t: 'No affiliate links', d: 'We don\'t recommend things we earn from. You came here for clarity.' },
    { n: '04', t: 'No streaks, no guilt', d: 'No counters, no fire emojis, no "you missed yesterday." Skip whenever.' },
    { n: '05', t: 'No fake intimacy', d: 'Niklaus is sober. It\'s not your therapist, not your companion. It remembers.' },
    { n: '06', t: 'No invented words', d: 'When the model doesn\'t know, it says so. Especially in heritage mode.' },
    { n: '07', t: 'No lock-in', d: 'Plain-format export, free, in under 5 minutes. Test us.' },
    { n: '08', t: 'No empty privacy promises', d: 'Encryption is architecture, not a policy page. Verifiable, on-device where it matters.' },
  ];
  return (
    <section>
      <div className="container">
        <div className="sec-head">
          <span className="t-eyebrow">Non-negotiables</span>
          <h2>What you'll never see in Niklaus.</h2>
        </div>
        <div className="tenets">
          {items.map((t) => (
            <div className="tenet reveal" key={t.n}>
              <span className="num">{t.n}</span>
              <div>
                <h4>{t.t}</h4>
                <p>{t.d}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ───────────────────────────────────────────────────────
// Pricing
// ───────────────────────────────────────────────────────
function Pricing() {
  const tiers = [
    {
      name: 'Free',
      price: '€0',
      sub: 'Always free. Always exportable.',
      features: ['50 captures per month', '30 days of memory', 'Full export, anytime', 'One connected source'],
      cta: 'Start for free',
    },
    {
      name: 'Personal',
      price: '€9.99',
      sub: 'For your everyday memory.',
      features: ['Unlimited captures', 'Memory without time limits', 'All sources connected', 'Priority transcription'],
      cta: 'Choose Personal',
      featured: true,
    },
    {
      name: 'Legacy',
      price: '€19.99',
      sub: 'For what you leave behind.',
      features: ['Everything in Personal', 'Designate heirs', 'Time-locked messages', 'Voice clone (phase 2)', 'Advanced E2E backup'],
      cta: 'Choose Legacy',
    },
  ];
  return (
    <section id="pricing">
      <div className="container">
        <div className="sec-head">
          <span className="t-eyebrow">Pricing · honest, simple</span>
          <h2>Three tiers. No tricks.</h2>
        </div>
        <div className="pricing">
          {tiers.map((t) => (
            <div className={`tier reveal ${t.featured ? 'featured' : ''}`} key={t.name}>
              {t.featured && <span className="badge-feat">Most chosen</span>}
              <h3 className="tier-name">{t.name}</h3>
              <div className="tier-price">{t.price}<small>/month</small></div>
              <p className="tier-sub">{t.sub}</p>
              <ul>{t.features.map((f) => <li key={f}>{f}</li>)}</ul>
              <a href="#waitlist" className="btn btn-primary">{t.cta}</a>
            </div>
          ))}
        </div>
        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: 'var(--ink-3)' }}>
          Yearly plans coming. Save 20%. Lifetime Legacy under consideration — write us if you'd buy it.
        </p>
      </div>
    </section>
  );
}

// ───────────────────────────────────────────────────────
// FAQ
// ───────────────────────────────────────────────────────
function FAQ() {
  const [open, setOpen] = useState(0);
  const items = [
    {
      q: 'Is my data really mine?',
      a: 'Yes. Raw audio, transcripts, notes, metadata — all exportable in plain formats (M4A, Markdown, JSON), free, even on the free plan, even after you cancel. The intelligence is the service. Your data is yours.',
    },
    {
      q: 'What happens to my Niklaus when I die?',
      a: 'You designate heirs. They get raw export of everything, free, forever. To talk with your memory they need an active subscription — paid by them, or pre-paid by you (Legacy lifetime). You set per-heir rules: full access, topic-restricted, time-gated, layered release. By default Niklaus speaks about you in third person; first-person mode is opt-in only, while you\'re alive.',
    },
    {
      q: 'Will Niklaus pretend to be me?',
      a: 'Only if you explicitly choose it. By default, when speaking with heirs, Niklaus refers to you in the third person and quotes your words. First-person mode requires your active consent while alive — and even then, the model never invents thoughts you didn\'t express.',
    },
    {
      q: 'Where do my data live?',
      a: 'Recent memory and raw audio: on your device, encrypted. Long-term vector memory: in the cloud (Supabase, encrypted at rest). The traceable architecture is documented and auditable. We\'re moving more inference on-device as Apple Intelligence and local models improve — that\'s a roadmap, not the current state, and we\'ll always tell you which is which.',
    },
    {
      q: 'Why iOS first?',
      a: 'Our launch markets (US, UK, Nordics) are iOS-heavy in the paying segment. Apple Intelligence and Core ML give us a real on-device advantage. Android in phase 2 — sign up to be notified.',
    },
    {
      q: 'Will you ever sell my data?',
      a: 'Never. Not raw, not "anonymized," not aggregated. Our only revenue is your subscription. Anything that puts our incentives in conflict with your trust is excluded — written into the company\'s charter.',
    },
    {
      q: 'What if the model doesn\'t know?',
      a: 'It says so. Plainly: "I don\'t have anything from you about that." It never invents memories, never simulates emotions, never fills in gaps with plausible-sounding nonsense. Especially when speaking on your behalf to your heirs.',
    },
  ];
  return (
    <section id="faq">
      <div className="container">
        <div className="sec-head">
          <span className="t-eyebrow">Frequently asked</span>
          <h2>The real questions.</h2>
        </div>
        <div className="faq-list">
          {items.map((it, i) => (
            <div key={i} className={`faq-row ${open === i ? 'open' : ''}`} onClick={() => setOpen(open === i ? -1 : i)}>
              <h3 className="q">{it.q}</h3>
              <span className="toggle">+</span>
              <p className="a">{it.a}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ───────────────────────────────────────────────────────
// Waitlist CTA
// ───────────────────────────────────────────────────────
function CTA() {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);
  function submit(e) {
    e.preventDefault();
    if (!email.trim()) return;
    setDone(true);
  }
  return (
    <section id="waitlist" className="cta">
      <div className="cta-inner container">
        <span className="t-eyebrow" style={{ display: 'block', marginBottom: 20 }}>Join the early circle</span>
        <h2>Start building<br/>something that lasts.</h2>
        <p>
          We're inviting a small first cohort in early 2026 — people who want
          to shape Niklaus from the inside, not just use it. iOS only at launch.
        </p>
        {done ? (
          <div className="waitlist-success">
            Thank you. We'll write to {email} soon — quietly, never often.
          </div>
        ) : (
          <>
            <form className="waitlist-form" onSubmit={submit}>
              <input
                type="email" required placeholder="your@email"
                value={email} onChange={(e) => setEmail(e.target.value)}
              />
              <button type="submit" className="btn btn-primary">Request invite</button>
            </form>
            <div className="waitlist-meta">No spam. Unsubscribe in one tap. We won't share your address.</div>
          </>
        )}
      </div>
    </section>
  );
}

// ───────────────────────────────────────────────────────
// Footer
// ───────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <div className="wordmark">Niklaus<span className="dot" /></div>
            <p className="footer-tag">
              Your memory. That talks back.<br/>
              Yours today. For someone you love, tomorrow.
            </p>
          </div>
          <div>
            <h5>Product</h5>
            <ul>
              <li><a href="#how">How it works</a></li>
              <li><a href="#pricing">Pricing</a></li>
              <li><a href="#waitlist">Waitlist</a></li>
              <li><a href="#faq">FAQ</a></li>
            </ul>
          </div>
          <div>
            <h5>Heritage</h5>
            <ul>
              <li><a>Heir designation</a></li>
              <li><a>Time-locked messages</a></li>
              <li><a>Privacy by default</a></li>
              <li><a>Export, always free</a></li>
            </ul>
          </div>
          <div>
            <h5>Company</h5>
            <ul>
              <li><a>About</a></li>
              <li><a>Manifesto</a></li>
              <li><a>Privacy &amp; security</a></li>
              <li><a>Press</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 Niklaus · niklaus.app</span>
          <span>Made for people who want something to remain.</span>
        </div>
      </div>
    </footer>
  );
}

// ───────────────────────────────────────────────────────
// Theme switcher (floating)
// ───────────────────────────────────────────────────────
function ThemeSwitcher({ theme, onChange }) {
  const themes = [
    { id: 'editorial', label: 'Editorial' },
    { id: 'cinematic', label: 'Cinematic' },
    { id: 'minimal', label: 'Minimal' },
  ];
  return (
    <div className="theme-switcher">
      {themes.map((t) => (
        <button key={t.id}
          className={theme === t.id ? 'active' : ''}
          onClick={() => onChange(t.id)}>{t.label}</button>
      ))}
    </div>
  );
}

// ───────────────────────────────────────────────────────
// Tweaks panel
// ───────────────────────────────────────────────────────
function Tweaks({ tweaks, setTweak }) {
  return (
    <TweaksPanel title="Tweaks">
      <TweakSection title="Direction">
        <TweakRadio
          label="Theme"
          value={tweaks.theme}
          options={[
            { value: 'editorial', label: 'Editorial' },
            { value: 'cinematic', label: 'Cinematic' },
            { value: 'minimal', label: 'Minimal' },
          ]}
          onChange={(v) => setTweak('theme', v)}
        />
        <TweakRadio
          label="Density"
          value={tweaks.density}
          options={[
            { value: 'compact', label: 'Compact' },
            { value: 'cozy', label: 'Cozy' },
            { value: 'airy', label: 'Airy' },
          ]}
          onChange={(v) => setTweak('density', v)}
        />
      </TweakSection>
      <TweakSection title="Accent (per theme)">
        <TweakColor label="Editorial" value={tweaks.accentEditorial} onChange={(v) => setTweak('accentEditorial', v)} />
        <TweakColor label="Cinematic" value={tweaks.accentCinematic} onChange={(v) => setTweak('accentCinematic', v)} />
        <TweakColor label="Minimal" value={tweaks.accentMinimal} onChange={(v) => setTweak('accentMinimal', v)} />
      </TweakSection>
    </TweaksPanel>
  );
}

// ───────────────────────────────────────────────────────
// App shell
// ───────────────────────────────────────────────────────
function App() {
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [scrolled, setScrolled] = useState(false);

  // Apply theme + density
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', tweaks.theme);
    document.documentElement.setAttribute('data-density', tweaks.density);
  }, [tweaks.theme, tweaks.density]);

  // Apply per-theme accent overrides
  useEffect(() => {
    const map = {
      editorial: tweaks.accentEditorial,
      cinematic: tweaks.accentCinematic,
      minimal: tweaks.accentMinimal,
    };
    const accent = map[tweaks.theme];
    if (accent) {
      document.documentElement.style.setProperty('--accent', accent);
      // soft variant ~12% opacity
      const soft = hexToRgba(accent, 0.12);
      if (soft) document.documentElement.style.setProperty('--accent-soft', soft);
    }
  }, [tweaks.theme, tweaks.accentEditorial, tweaks.accentCinematic, tweaks.accentMinimal]);

  // Scroll-aware nav + reveal
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const els = document.querySelectorAll('.reveal');
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.12 });
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <>
      <nav className={`nav ${scrolled ? 'scrolled' : ''}`}>
        <div className="container nav-row">
          <a href="#" className="wordmark">Niklaus<span className="dot" /></a>
          <div className="nav-links">
            <a href="#how">How it works</a>
            <a href="#principles">Principles</a>
            <a href="#pricing">Pricing</a>
            <a href="#faq">FAQ</a>
          </div>
          <a href="#waitlist" className="btn btn-primary" style={{ padding: '10px 18px', fontSize: 13 }}>Get invite</a>
        </div>
      </nav>

      <Hero />
      <Principles />
      <CaptureDemo />
      <ChatDemo />
      <Pillars />
      <HeritageSection />
      <Tenets />
      <Pricing />
      <FAQ />
      <CTA />
      <Footer />

      <ThemeSwitcher theme={tweaks.theme} onChange={(v) => setTweak('theme', v)} />
      <Tweaks tweaks={tweaks} setTweak={setTweak} />
    </>
  );
}

// helper — hex to rgba
function hexToRgba(hex, a) {
  if (!hex) return null;
  const m = hex.replace('#', '');
  if (m.length !== 6) return null;
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
