// phone-screens.jsx — interactive iPhone demo screens for Niklaus
// Three screens: TodayScreen (capture+timeline), MemoryScreen (chat), HeritageScreen
// All screens self-contained, pure React (no external state).

const { useState, useEffect, useRef } = React;

// ───────────────────────────────────────────────────────
// Shared tokens — colors come from CSS vars on .phone-skin
// ───────────────────────────────────────────────────────
const phoneStyles = {
  screen: {
    width: '100%',
    height: '100%',
    background: 'var(--device-screen)',
    color: 'var(--ink)',
    fontFamily: 'var(--font-body)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    position: 'relative',
  },
  // Tab bar
  tabbar: {
    height: 78,
    paddingBottom: 28,
    borderTop: '1px solid var(--line)',
    background: 'color-mix(in srgb, var(--device-screen) 85%, transparent)',
    backdropFilter: 'blur(20px)',
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    flexShrink: 0,
  },
};

// ───────────────────────────────────────────────────────
// Status bar (compact, shared)
// ───────────────────────────────────────────────────────
function MiniStatusBar({ time = '9:41' }) {
  return (
    <div style={{
      height: 50, padding: '14px 28px 8px',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      fontSize: 15, fontWeight: 600, fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      flexShrink: 0,
    }}>
      <span style={{ color: 'var(--ink)' }}>{time}</span>
      <span style={{ display: 'inline-flex', gap: 5, alignItems: 'center' }}>
        <svg width="17" height="11" viewBox="0 0 17 11"><path d="M8.5 0a8.5 8.5 0 016 2.5l-1.5 1.5a6.4 6.4 0 00-9 0L2.5 2.5A8.5 8.5 0 018.5 0zm0 4a4.5 4.5 0 013 1.2l-1.5 1.5a2.4 2.4 0 00-3 0L5.5 5.2A4.5 4.5 0 018.5 4zm0 4a1.5 1.5 0 011.1.4L8.5 9.5 7.4 8.4A1.5 1.5 0 018.5 8z" fill="currentColor"/></svg>
        <svg width="16" height="11" viewBox="0 0 16 11" fill="none" stroke="currentColor" strokeWidth="1"><rect x="1" y="2" width="11" height="7" rx="2"/><rect x="2.5" y="3.5" width="8" height="4" rx="0.6" fill="currentColor" stroke="none"/><path d="M14 4v3" strokeLinecap="round"/></svg>
      </span>
    </div>
  );
}

// ───────────────────────────────────────────────────────
// Tab bar (3 tabs)
// ───────────────────────────────────────────────────────
function TabBar({ active, onChange }) {
  const tabs = [
    { id: 'today', label: 'Today', icon: (a) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={a ? 'var(--accent)' : 'var(--ink-3)'} strokeWidth="1.6">
        <circle cx="12" cy="12" r="9"/>
        <path d="M12 6v6l4 2" strokeLinecap="round"/>
      </svg>
    )},
    { id: 'memory', label: 'Memory', icon: (a) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={a ? 'var(--accent)' : 'var(--ink-3)'} strokeWidth="1.6">
        <path d="M3 12l9-9 9 9-9 9z" strokeLinejoin="round"/>
      </svg>
    )},
    { id: 'you', label: 'You', icon: (a) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={a ? 'var(--accent)' : 'var(--ink-3)'} strokeWidth="1.6">
        <circle cx="12" cy="9" r="3.5"/>
        <path d="M5 20c1.5-3.5 4-5 7-5s5.5 1.5 7 5" strokeLinecap="round"/>
      </svg>
    )},
  ];
  return (
    <div style={phoneStyles.tabbar}>
      {tabs.map(t => {
        const a = active === t.id;
        return (
          <button key={t.id} onClick={() => onChange?.(t.id)} style={{
            background: 'none', border: 0, cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            padding: '4px 12px',
          }}>
            {t.icon(a)}
            <span style={{
              fontSize: 10, fontWeight: 500,
              color: a ? 'var(--accent)' : 'var(--ink-3)',
              letterSpacing: '0.02em',
            }}>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ───────────────────────────────────────────────────────
// TodayScreen — capture + timeline, with hold-to-record
// ───────────────────────────────────────────────────────
function TodayScreen({ onTab }) {
  const [recording, setRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const [items, setItems] = useState([
    { time: '09:14', kind: 'voice', label: 'morning thoughts on the new role · 2:14' },
    { time: '12:30', kind: 'note',  label: '"remember to ask Marco about Friday"' },
    { time: '18:42', kind: 'voice', label: 'after the call with mom · 0:45' },
  ]);

  useEffect(() => {
    if (!recording) return;
    const start = Date.now();
    const id = setInterval(() => setRecordTime(Math.floor((Date.now() - start) / 1000)), 100);
    return () => clearInterval(id);
  }, [recording]);

  const fmt = (s) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

  function startRec() { setRecording(true); setRecordTime(0); }
  function stopRec() {
    if (recordTime >= 1) {
      const now = new Date();
      const t = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
      setItems([{ time: t, kind: 'voice', label: `just now · ${fmt(recordTime)}` }, ...items]);
    }
    setRecording(false);
  }

  return (
    <div style={phoneStyles.screen}>
      <MiniStatusBar />
      <div style={{ flex: 1, overflow: 'auto', padding: '8px 24px 16px' }}>
        <div style={{ marginTop: 4, marginBottom: 18 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: 'var(--ink-3)' }}>Tuesday, May 5</div>
          <h2 style={{
            fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 400,
            letterSpacing: 'var(--display-tracking)', margin: '6px 0 0', lineHeight: 1.05,
          }}>Today</h2>
        </div>

        {/* Capture card */}
        <div
          onMouseDown={startRec} onMouseUp={stopRec} onMouseLeave={() => recording && stopRec()}
          onTouchStart={(e) => { e.preventDefault(); startRec(); }} onTouchEnd={stopRec}
          style={{
            background: recording ? 'var(--accent-soft)' : 'var(--bg-elev)',
            border: `1px solid ${recording ? 'var(--accent)' : 'var(--line)'}`,
            borderRadius: 24,
            padding: '28px 20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 14,
            transition: 'all .25s var(--ease)',
            cursor: 'pointer',
            userSelect: 'none',
          }}
        >
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: recording ? 'var(--accent)' : 'var(--ink)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transform: recording ? 'scale(1.08)' : 'scale(1)',
            transition: 'transform .25s var(--ease), background .25s var(--ease)',
            boxShadow: recording ? '0 0 0 8px var(--accent-soft)' : 'none',
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="var(--bg)">
              <rect x="9" y="3" width="6" height="13" rx="3"/>
              <path d="M5 11a7 7 0 0014 0M12 18v3" stroke="var(--bg)" strokeWidth="1.6" fill="none" strokeLinecap="round"/>
            </svg>
          </div>
          {recording ? (
            <>
              <Waveform />
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--accent)', letterSpacing: '0.05em' }}>
                ● Recording  {fmt(recordTime)}
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>Release to save</div>
            </>
          ) : (
            <>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 500 }}>Hold to record</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>or tap to type</div>
            </>
          )}
        </div>

        {/* Timeline */}
        <div style={{ marginTop: 24 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.12em',
              textTransform: 'uppercase', color: 'var(--ink-3)' }}>Today</span>
            <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{items.length} captures</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {items.map((item, i) => (
              <div key={i} style={{
                display: 'grid', gridTemplateColumns: '46px auto 1fr',
                gap: 10, alignItems: 'center',
                padding: '14px 0',
                borderTop: i === 0 ? '1px solid var(--line)' : 0,
                borderBottom: '1px solid var(--line)',
              }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>{item.time}</span>
                <span style={{
                  width: 22, height: 22, borderRadius: '50%',
                  background: item.kind === 'voice' ? 'var(--accent-soft)' : 'var(--bg-deep)',
                  color: 'var(--accent)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontFamily: 'var(--font-mono)',
                }}>
                  {item.kind === 'voice' ? '◉' : '✎'}
                </span>
                <span style={{ fontSize: 13.5, color: 'var(--ink-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <TabBar active="today" onChange={onTab} />
    </div>
  );
}

function Waveform() {
  const [bars, setBars] = useState(() => Array.from({ length: 28 }, () => 0.3 + Math.random() * 0.7));
  useEffect(() => {
    const id = setInterval(() => {
      setBars((prev) => prev.map(() => 0.2 + Math.random() * 0.8));
    }, 120);
    return () => clearInterval(id);
  }, []);
  return (
    <div style={{ display: 'flex', gap: 3, alignItems: 'center', height: 32, width: '100%', justifyContent: 'center' }}>
      {bars.map((b, i) => (
        <span key={i} style={{
          width: 3,
          height: `${b * 100}%`,
          background: 'var(--accent)',
          borderRadius: 2,
          transition: 'height .12s ease',
        }} />
      ))}
    </div>
  );
}

// ───────────────────────────────────────────────────────
// MemoryScreen — chat with citations, supports custom prompts
// ───────────────────────────────────────────────────────
const SAMPLE_QA = [
  {
    q: "What was I worried about last week?",
    a: "On April 28 you mentioned that Marco was stressed about the new project. You also said you were proud of how he handled the meeting on Friday — you wrote that you felt \"finally, someone gets it.\"",
    sources: [
      { date: 'Apr 28, 18:42', kind: 'voice' },
      { date: 'May 1, 09:10', kind: 'note' },
    ],
  },
  {
    q: "What did I say about my mom?",
    a: "You spoke about her three times this month. The clearest moment was April 12, after the phone call — you said you wanted to call her more often, and that you'd been thinking about the summer in Sicily.",
    sources: [
      { date: 'Apr 12, 21:14', kind: 'voice' },
      { date: 'Apr 23, 08:30', kind: 'note' },
    ],
  },
  {
    q: "Have I been sleeping well?",
    a: "I don't have anything from you about that. You haven't shared anything about sleep this month — you might want to mention it next time we talk.",
    sources: [],
  },
];

function MemoryScreen({ onTab }) {
  const [convo, setConvo] = useState([
    { role: 'user', text: SAMPLE_QA[0].q },
    { role: 'assistant', text: SAMPLE_QA[0].a, sources: SAMPLE_QA[0].sources },
  ]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [convo, thinking]);

  function send(query) {
    const q = (query ?? input).trim();
    if (!q || thinking) return;
    setInput('');
    setConvo((c) => [...c, { role: 'user', text: q }]);
    setThinking(true);
    // pick a canned answer or fall back to "don't know"
    const match = SAMPLE_QA.find(s => s.q.toLowerCase() === q.toLowerCase())
      || SAMPLE_QA[Math.floor(Math.random() * SAMPLE_QA.length)];
    setTimeout(() => {
      setThinking(false);
      setConvo((c) => [...c, { role: 'assistant', text: match.a, sources: match.sources }]);
    }, 1200 + Math.random() * 600);
  }

  const suggestions = SAMPLE_QA.slice(1).map(s => s.q);

  return (
    <div style={phoneStyles.screen}>
      <MiniStatusBar />
      <div style={{ padding: '4px 24px 16px', borderBottom: '1px solid var(--line)' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.12em',
          textTransform: 'uppercase', color: 'var(--ink-3)' }}>Memory</div>
        <h2 style={{
          fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 400,
          letterSpacing: 'var(--display-tracking)', margin: '6px 0 8px', lineHeight: 1.05,
        }}>Ask anything you've shared</h2>
      </div>

      <div ref={scrollRef} style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
        {convo.map((m, i) => (
          <div key={i} style={{ marginBottom: 18 }}>
            {m.role === 'user' ? (
              <div style={{
                background: 'var(--ink)', color: 'var(--bg)',
                padding: '12px 16px', borderRadius: '20px 20px 4px 20px',
                marginLeft: 40, fontSize: 14.5, lineHeight: 1.45, alignSelf: 'flex-end',
              }}>
                {m.text}
              </div>
            ) : (
              <div>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.14em',
                  textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 6,
                }}>Niklaus</div>
                <div style={{
                  fontSize: 14.5, color: 'var(--ink)', lineHeight: 1.5, marginBottom: 10,
                  fontFamily: 'var(--font-display)', fontWeight: 400,
                }}>{m.text}</div>
                {m.sources?.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {m.sources.map((s, j) => (
                      <div key={j} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 8,
                        padding: '8px 12px',
                        background: 'var(--bg-elev)',
                        border: '1px solid var(--line)',
                        borderRadius: 10,
                        fontSize: 11.5, color: 'var(--ink-2)',
                        fontFamily: 'var(--font-mono)',
                        width: 'fit-content',
                      }}>
                        <span style={{ color: 'var(--accent)' }}>▶</span>
                        {s.date} · {s.kind}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        {thinking && (
          <div style={{ display: 'flex', gap: 4, alignItems: 'center', padding: '4px 0' }}>
            {[0, 1, 2].map(i => (
              <span key={i} style={{
                width: 6, height: 6, borderRadius: '50%', background: 'var(--ink-3)',
                animation: `dot 1.4s ease-in-out ${i * 0.2}s infinite`,
              }} />
            ))}
            <style>{`@keyframes dot { 0%,80%,100%{opacity:.3;transform:scale(.7)} 40%{opacity:1;transform:scale(1.1)} }`}</style>
          </div>
        )}

        {convo.length <= 2 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em',
              textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 8 }}>Try</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {suggestions.map((q) => (
                <button key={q} onClick={() => send(q)} style={{
                  textAlign: 'left',
                  padding: '10px 14px',
                  border: '1px solid var(--line)',
                  borderRadius: 12,
                  background: 'transparent',
                  color: 'var(--ink-2)',
                  fontSize: 13.5,
                  cursor: 'pointer',
                }}>
                  ▸ {q}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{ padding: '12px 24px 8px', borderTop: '1px solid var(--line)', flexShrink: 0 }}>
        <form onSubmit={(e) => { e.preventDefault(); send(); }} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--bg-elev)',
          border: '1px solid var(--line-2)',
          borderRadius: 999,
          padding: '6px 6px 6px 14px',
        }}>
          <input
            value={input} onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything..."
            style={{
              flex: 1, border: 0, background: 'transparent', outline: 'none',
              fontSize: 14, color: 'var(--ink)', fontFamily: 'var(--font-body)',
              minWidth: 0,
            }}
          />
          <button type="submit" style={{
            width: 32, height: 32, borderRadius: '50%',
            background: input.trim() ? 'var(--accent)' : 'var(--bg-deep)',
            color: input.trim() ? 'var(--bg)' : 'var(--ink-3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: 0, cursor: 'pointer', transition: 'all .2s var(--ease)',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 6l6 6-6 6"/>
            </svg>
          </button>
        </form>
      </div>
      <TabBar active="memory" onChange={onTab} />
    </div>
  );
}

// ───────────────────────────────────────────────────────
// HeritageScreen — You → Heritage section
// ───────────────────────────────────────────────────────
function HeritageScreen({ onTab }) {
  const rows = [
    { label: 'Designate heirs', desc: '2 designated', status: 'configured' },
    { label: 'Death verification', desc: 'monthly check-in', status: 'default' },
    { label: 'Access rules', desc: 'full access, no filters', status: 'default' },
    { label: 'Time-locked messages', desc: '3 letters · for Sofia', status: 'configured' },
    { label: 'Privacy markers', desc: '12 items marked private', status: 'configured' },
  ];
  return (
    <div style={phoneStyles.screen}>
      <MiniStatusBar />
      <div style={{ padding: '4px 24px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button style={{ background: 'none', border: 0, fontSize: 22, color: 'var(--ink-2)', padding: 0, cursor: 'pointer' }}>‹</button>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: 'var(--ink-3)' }}>You</span>
        </div>
        <h2 style={{
          fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 400,
          letterSpacing: 'var(--display-tracking)', margin: '6px 0 16px', lineHeight: 1.0,
        }}>Heritage</h2>
        <p style={{
          fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.5, margin: '0 0 6px',
          maxWidth: 32,
        }}>
          Decide what happens to your memory when you're no longer here.
        </p>
        <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: '0 0 24px', lineHeight: 1.5 }}>
          You don't need to decide everything now. Come back any time.
        </p>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: '0 24px 16px' }}>
        <div style={{
          background: 'var(--bg-elev)',
          border: '1px solid var(--line)',
          borderRadius: 18,
          overflow: 'hidden',
        }}>
          {rows.map((r, i) => (
            <div key={i} style={{
              padding: '16px 18px',
              borderBottom: i < rows.length - 1 ? '1px solid var(--line)' : 0,
              display: 'grid', gridTemplateColumns: '8px 1fr auto', gap: 14, alignItems: 'center',
            }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: r.status === 'configured' ? 'var(--accent)' : 'transparent',
                border: r.status === 'configured' ? 0 : '1px solid var(--ink-3)',
              }} />
              <div>
                <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink)' }}>{r.label}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>{r.desc}</div>
              </div>
              <span style={{ color: 'var(--ink-3)', fontSize: 18 }}>›</span>
            </div>
          ))}
        </div>
        <div style={{
          marginTop: 16, padding: '14px 18px',
          background: 'var(--bg-elev)', border: '1px solid var(--line)', borderRadius: 14,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>Last reviewed</div>
            <div style={{ fontSize: 13.5, color: 'var(--ink), fontWeight: 500' }}>14 days ago</div>
          </div>
          <button style={{
            background: 'var(--ink)', color: 'var(--bg)', border: 0,
            padding: '8px 14px', borderRadius: 999, fontSize: 12, cursor: 'pointer',
            fontFamily: 'var(--font-body)',
          }}>Review</button>
        </div>
      </div>
      <TabBar active="you" onChange={onTab} />
    </div>
  );
}

// ───────────────────────────────────────────────────────
// PhoneFrame — minimal device shell (no external dep)
// ───────────────────────────────────────────────────────
function PhoneFrame({ children, scale = 1, label }) {
  const W = 380;
  const H = 800;
  return (
    <div style={{
      width: W * scale, height: H * scale,
      position: 'relative',
      transform: `scale(${1})`, // sized via width/height
    }}>
      <div style={{
        width: W, height: H,
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
        background: 'var(--device-bezel)',
        borderRadius: 56,
        padding: 11,
        boxShadow: '0 30px 80px -20px rgba(0,0,0,0.35), 0 6px 14px rgba(0,0,0,0.18), inset 0 0 0 1px rgba(255,255,255,0.05)',
        position: 'relative',
      }}>
        {/* Side buttons */}
        <span style={{ position: 'absolute', left: -2, top: 110, width: 3, height: 32, background: 'var(--device-bezel)', borderRadius: '2px 0 0 2px' }} />
        <span style={{ position: 'absolute', left: -2, top: 170, width: 3, height: 56, background: 'var(--device-bezel)', borderRadius: '2px 0 0 2px' }} />
        <span style={{ position: 'absolute', left: -2, top: 240, width: 3, height: 56, background: 'var(--device-bezel)', borderRadius: '2px 0 0 2px' }} />
        <span style={{ position: 'absolute', right: -2, top: 180, width: 3, height: 90, background: 'var(--device-bezel)', borderRadius: '0 2px 2px 0' }} />

        <div style={{
          width: '100%', height: '100%',
          borderRadius: 46,
          overflow: 'hidden',
          background: 'var(--device-screen)',
          position: 'relative',
        }}>
          {/* Dynamic island */}
          <div style={{
            position: 'absolute',
            top: 11,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 110,
            height: 32,
            background: '#000',
            borderRadius: 20,
            zIndex: 50,
          }} />
          <div className="phone-skin" style={{ width: '100%', height: '100%' }}>
            {children}
          </div>
          {/* Home indicator */}
          <div style={{
            position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)',
            width: 134, height: 5, borderRadius: 3,
            background: 'var(--ink)', opacity: 0.3, zIndex: 50,
          }} />
        </div>
      </div>
      {label && (
        <div style={{
          position: 'absolute', bottom: -34, left: 0, right: 0,
          textAlign: 'center',
          fontFamily: 'var(--font-mono)', fontSize: 11,
          letterSpacing: '0.14em', textTransform: 'uppercase',
          color: 'var(--ink-3)',
        }}>{label}</div>
      )}
    </div>
  );
}

// Multi-tab phone — cycles between today/memory/heritage
function PhoneApp({ initial = 'today', scale = 1, label }) {
  const [tab, setTab] = useState(initial);
  return (
    <PhoneFrame scale={scale} label={label}>
      {tab === 'today' && <TodayScreen onTab={setTab} />}
      {tab === 'memory' && <MemoryScreen onTab={setTab} />}
      {tab === 'you' && <HeritageScreen onTab={setTab} />}
    </PhoneFrame>
  );
}

Object.assign(window, {
  PhoneFrame, PhoneApp,
  TodayScreen, MemoryScreen, HeritageScreen,
});
