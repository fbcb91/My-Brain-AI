import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { stripChatMarkers, streamChatMessage, type ChatMessage } from '../lib/chat';
import { listCaptures } from '../lib/db';
import type { Capture } from '../lib/types';

interface SourceCitation {
  id: string;
  date: string;
  kind: 'voice' | 'note';
}

interface UiMessage {
  role: 'user' | 'assistant';
  text: string;
  sources?: SourceCitation[];
}

const SUGGESTIONS = [
  'What did I say last week?',
  'Summarize my recent thoughts.',
  'What have I been worried about?',
];

function formatSourceLabel(c: Capture): string {
  const d = new Date(c.createdAt);
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const time = d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return `${date}, ${time}`;
}

function storageKey(userId: string | undefined): string | null {
  if (!userId) return null;
  return `niklaus_chat_${userId}`;
}

function loadConvo(userId: string | undefined): UiMessage[] {
  const key = storageKey(userId);
  if (!key) return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as UiMessage[];
  } catch {
    return [];
  }
}

function saveConvoToStorage(userId: string | undefined, convo: UiMessage[]): void {
  const key = storageKey(userId);
  if (!key) return;
  try {
    localStorage.setItem(key, JSON.stringify(convo));
  } catch {
    // localStorage full or unavailable — fail silently
  }
}

export default function Memory() {
  const { user } = useAuth();
  const userId = user?.id;
  const [convo, setConvo] = useState<UiMessage[]>(() => loadConvo(userId));
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [captures, setCaptures] = useState<Capture[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Reload conversation when the signed-in user changes (e.g. after sign-in)
  useEffect(() => {
    setConvo(loadConvo(userId));
  }, [userId]);

  // Persist conversation locally on every change so we survive refreshes,
  // tab switches, and PWA restarts.
  useEffect(() => {
    saveConvoToStorage(userId, convo);
  }, [userId, convo]);

  useEffect(() => {
    void listCaptures().then(setCaptures);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [convo, thinking]);

  function resolveSources(ids: string[]): SourceCitation[] {
    const out: SourceCitation[] = [];
    for (const id of ids) {
      const cap = captures.find((c) => c.id === id);
      if (!cap) continue;
      out.push({ id, date: formatSourceLabel(cap), kind: cap.kind });
    }
    return out;
  }

  function clearConvo() {
    setConvo([]);
    setError(null);
    setInput('');
  }

  async function send(query?: string) {
    const q = (query ?? input).trim();
    if (!q || thinking) return;

    setInput('');
    setError(null);

    const nextConvo: UiMessage[] = [...convo, { role: 'user', text: q }];
    setConvo(nextConvo);
    setThinking(true);

    const apiMessages: ChatMessage[] = nextConvo.map((m) => ({
      role: m.role,
      content: m.text,
    }));

    let firstChunk = true;
    let raw = '';

    await streamChatMessage(apiMessages, {
      onText: (chunk) => {
        raw += chunk;
        const display = stripChatMarkers(raw);
        if (firstChunk) {
          firstChunk = false;
          setThinking(false);
          setConvo((c) => [
            ...c,
            { role: 'assistant', text: display, sources: [] },
          ]);
        } else {
          setConvo((c) => {
            const next = [...c];
            const last = next[next.length - 1];
            if (last && last.role === 'assistant') {
              next[next.length - 1] = { ...last, text: display };
            }
            return next;
          });
        }
      },
      onDone: (sourceIds) => {
        const sources = resolveSources(sourceIds);
        setConvo((c) => {
          const next = [...c];
          const last = next[next.length - 1];
          if (last && last.role === 'assistant') {
            next[next.length - 1] = {
              ...last,
              text: stripChatMarkers(raw),
              sources,
            };
          }
          return next;
        });
        setThinking(false);
      },
      onError: (err) => {
        setError(err);
        setThinking(false);
        if (!firstChunk) {
          // We had partial text — leave it but flag the error above.
        }
      },
    });
  }

  return (
    <div className="screen">
      <header
        className="flex items-start justify-between gap-3 px-6 pb-3 pt-4"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0) + 16px)' }}
      >
        <div>
          <p className="eyebrow">Memory</p>
          <h1 className="display mt-1.5 text-[28px] leading-[1.05]">
            Ask anything you've shared
          </h1>
        </div>
        {convo.length > 0 && (
          <button
            type="button"
            onClick={clearConvo}
            className="mt-2 shrink-0 text-xs text-ink-3 underline-offset-2 hover:text-ink hover:underline"
          >
            New chat
          </button>
        )}
      </header>

      <div
        ref={scrollRef}
        className="flex-1 overflow-auto border-t border-line px-6 py-5"
      >
        {convo.length === 0 && (
          <div>
            <p className="eyebrow mb-2">Try</p>
            <div className="flex flex-col gap-2">
              {SUGGESTIONS.map((q) => (
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
                <p className="mono text-[10px] tracking-[0.14em] text-accent">
                  Niklaus
                </p>
                <p className="display mb-2.5 mt-1.5 whitespace-pre-wrap text-[15px] leading-relaxed">
                  {m.text}
                </p>
                {m.sources && m.sources.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    {m.sources.map((s) => (
                      <span
                        key={s.id}
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

        {error && (
          <p className="mt-3 text-xs text-[#b94d2b]">{error}</p>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
        className="border-t border-line px-6 py-3"
      >
        <div className="flex items-center gap-2 rounded-full border border-line-2 bg-paper-elev py-1.5 pl-4 pr-1.5">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything..."
            disabled={thinking}
            className="min-w-0 flex-1 border-0 bg-transparent text-[14px] text-ink outline-none placeholder:text-ink-3 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={thinking || !input.trim()}
            className="flex h-8 w-8 items-center justify-center rounded-full transition-colors disabled:opacity-50"
            style={{
              background: input.trim() && !thinking ? '#b56b1d' : '#ece6d8',
              color: input.trim() && !thinking ? '#f6f2ea' : '#807872',
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
