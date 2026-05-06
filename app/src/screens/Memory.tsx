import { useEffect, useRef, useState } from 'react';

interface QA {
  q: string;
  a: string;
  sources: { date: string; kind: 'voice' | 'note' }[];
}

const SAMPLE_QA: QA[] = [
  {
    q: 'What was I worried about last week?',
    a: 'On April 28 you mentioned that Marco was stressed about the new project. You also said you were proud of how he handled the meeting on Friday — you wrote that you felt "finally, someone gets it."',
    sources: [
      { date: 'Apr 28, 18:42', kind: 'voice' },
      { date: 'May 1, 09:10', kind: 'note' },
    ],
  },
  {
    q: 'What did I say about my mom?',
    a: "You spoke about her three times this month. The clearest moment was April 12, after the phone call — you said you wanted to call her more often, and that you'd been thinking about the summer in Sicily.",
    sources: [
      { date: 'Apr 12, 21:14', kind: 'voice' },
      { date: 'Apr 23, 08:30', kind: 'note' },
    ],
  },
  {
    q: 'Have I been sleeping well?',
    a: "I don't have anything from you about that. You haven't shared anything about sleep this month — you might want to mention it next time we talk.",
    sources: [],
  },
];

interface Message {
  role: 'user' | 'assistant';
  text: string;
  sources?: { date: string; kind: 'voice' | 'note' }[];
}

export default function Memory() {
  const [convo, setConvo] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [convo, thinking]);

  function send(query?: string) {
    const q = (query ?? input).trim();
    if (!q || thinking) return;
    setInput('');
    setConvo((c) => [...c, { role: 'user', text: q }]);
    setThinking(true);
    const match =
      SAMPLE_QA.find((s) => s.q.toLowerCase() === q.toLowerCase()) ||
      SAMPLE_QA[Math.floor(Math.random() * SAMPLE_QA.length)];
    setTimeout(
      () => {
        setThinking(false);
        setConvo((c) => [...c, { role: 'assistant', text: match.a, sources: match.sources }]);
      },
      1000 + Math.random() * 600
    );
  }

  const suggestions = SAMPLE_QA.map((s) => s.q);

  return (
    <div className="screen">
      <header className="px-6 pb-3 pt-4" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0) + 16px)' }}>
        <p className="eyebrow">Memory</p>
        <h1 className="display mt-1.5 text-[28px] leading-[1.05]">
          Ask anything you've shared
        </h1>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-auto border-t border-line px-6 py-5">
        {convo.length === 0 && (
          <div>
            <p className="eyebrow mb-2">Try</p>
            <div className="flex flex-col gap-2">
              {suggestions.map((q) => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  className="rounded-xl border border-line px-3.5 py-2.5 text-left text-[14px] text-ink-2 transition-colors hover:bg-paper-elev"
                >
                  ▸ {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {convo.map((m, i) => (
          <div key={i} className="mb-5">
            {m.role === 'user' ? (
              <div className="ml-10 inline-block rounded-[20px] rounded-br-[4px] bg-ink px-4 py-3 text-[14.5px] leading-relaxed text-paper">
                {m.text}
              </div>
            ) : (
              <div>
                <p className="mono text-[10px] tracking-[0.14em] text-accent">Niklaus</p>
                <p className="display mb-2.5 mt-1.5 text-[15px] leading-relaxed">{m.text}</p>
                {m.sources && m.sources.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    {m.sources.map((s, j) => (
                      <span
                        key={j}
                        className="mono inline-flex w-fit items-center gap-2 rounded-[10px] border border-line bg-paper-elev px-3 py-2 text-[11.5px] tracking-normal normal-case text-ink-2"
                      >
                        <span className="text-accent">▶</span>
                        {s.date} · {s.kind}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {thinking && (
          <div className="flex items-center gap-1.5 py-1">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="thinking-dot h-1.5 w-1.5 rounded-full bg-ink-3"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
            <style>
              {`@keyframes nklThinking {
                0%, 80%, 100% { opacity: .3; transform: scale(.7); }
                40% { opacity: 1; transform: scale(1.1); }
              }
              .thinking-dot {
                animation: nklThinking 1.4s ease-in-out infinite;
              }`}
            </style>
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="border-t border-line px-6 py-3"
      >
        <div className="flex items-center gap-2 rounded-full border border-line-2 bg-paper-elev py-1.5 pl-4 pr-1.5">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything..."
            className="min-w-0 flex-1 border-0 bg-transparent text-[14px] text-ink outline-none placeholder:text-ink-3"
          />
          <button
            type="submit"
            className="flex h-8 w-8 items-center justify-center rounded-full transition-colors"
            style={{
              background: input.trim() ? '#b56b1d' : '#ece6d8',
              color: input.trim() ? '#f6f2ea' : '#807872',
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}
