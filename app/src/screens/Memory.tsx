import { useEffect, useRef, useState } from 'react';
import Markdown from '../components/Markdown';
import { useAuth } from '../contexts/AuthContext';
import {
  archiveCurrentConversation,
  loadChatMessages,
  saveChatMessage,
  stripChatMarkers,
  streamChatMessage,
  type ChatMessage,
} from '../lib/chat';
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
  sourceIds?: string[];
}

const SUGGESTIONS = [
  'What did I say last week?',
  'Summarize my recent thoughts.',
  'What have I been worried about?',
];

const LEGACY_STORAGE_PREFIX = 'niklaus_chat_';

function legacyStorageKey(userId: string | undefined): string | null {
  if (!userId) return null;
  return `${LEGACY_STORAGE_PREFIX}${userId}`;
}

interface LegacyMessage {
  role: 'user' | 'assistant';
  text: string;
  sources?: { id?: string }[];
}

function readLegacyChat(userId: string | undefined): LegacyMessage[] {
  const key = legacyStorageKey(userId);
  if (!key) return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as LegacyMessage[];
  } catch {
    return [];
  }
}

function clearLegacyChat(userId: string | undefined): void {
  const key = legacyStorageKey(userId);
  if (!key) return;
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

async function migrateLegacyIfNeeded(userId: string): Promise<boolean> {
  const legacy = readLegacyChat(userId);
  if (legacy.length === 0) return false;

  try {
    const existing = await loadChatMessages();
    if (existing.length > 0) {
      // Cloud already has data — abandon the local copy rather than risk
      // duplicating an older snapshot on top.
      clearLegacyChat(userId);
      return false;
    }
  } catch (e) {
    console.error('[migrate] cloud check failed', e);
    return false;
  }

  for (const m of legacy) {
    const role = m.role === 'user' ? 'user' : 'assistant';
    const text = typeof m.text === 'string' ? m.text : '';
    if (!text) continue;
    const sourceIds = Array.isArray(m.sources)
      ? m.sources
          .map((s) => (s && typeof s.id === 'string' ? s.id : null))
          .filter((v): v is string => Boolean(v))
      : undefined;
    try {
      await saveChatMessage(role, text, sourceIds);
    } catch (e) {
      console.error('[migrate] message upload failed', e);
    }
  }
  clearLegacyChat(userId);
  return true;
}

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

export default function Memory() {
  const { user } = useAuth();
  const [convo, setConvo] = useState<UiMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [captures, setCaptures] = useState<Capture[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void listCaptures().then(setCaptures);
  }, []);

  // Load chat from cloud on sign-in (and migrate any legacy localStorage chat
  // the first time round).
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        await migrateLegacyIfNeeded(user.id);
        if (cancelled) return;
        const stored = await loadChatMessages();
        if (cancelled) return;
        const ui: UiMessage[] = stored.map((m) => ({
          role: m.role,
          text: m.content,
          sourceIds: m.sources,
        }));
        setConvo(ui);
      } catch (e) {
        console.error('[memory] load failed', e);
        setError(
          e instanceof Error ? e.message : 'Could not load your chat.'
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

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

  async function startNewChat() {
    setError(null);
    setInput('');
    const previous = convo;
    setConvo([]);
    try {
      // Past messages aren't deleted — they're archived and remain part of
      // Niklaus's memory of you. Only the visible thread resets.
      await archiveCurrentConversation();
    } catch (e) {
      console.error('[memory] archive failed', e);
      setError('Could not start a new chat. Try again?');
      setConvo(previous);
    }
  }

  async function send(query?: string) {
    const q = (query ?? input).trim();
    if (!q || thinking) return;

    setInput('');
    setError(null);

    const userMsg: UiMessage = { role: 'user', text: q };
    const nextConvo: UiMessage[] = [...convo, userMsg];
    setConvo(nextConvo);

    try {
      await saveChatMessage('user', q);
    } catch (e) {
      console.error('[memory] save user message failed', e);
      setError('Could not save your message. Try again?');
      setConvo(convo); // roll back the optimistic add
      return;
    }

    setThinking(true);

    const apiMessages: ChatMessage[] = nextConvo.map((m) => ({
      role: m.role,
      content: m.text,
    }));

    let firstChunk = true;
    let raw = '';
    let finalSources: string[] = [];

    await streamChatMessage(apiMessages, {
      onText: (chunk) => {
        raw += chunk;
        const display = stripChatMarkers(raw);
        if (firstChunk) {
          firstChunk = false;
          setThinking(false);
          setConvo((c) => [
            ...c,
            { role: 'assistant', text: display, sourceIds: [] },
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
        finalSources = sourceIds;
        const finalText = stripChatMarkers(raw);
        setConvo((c) => {
          const next = [...c];
          const last = next[next.length - 1];
          if (last && last.role === 'assistant') {
            next[next.length - 1] = {
              ...last,
              text: finalText,
              sourceIds: finalSources,
            };
          }
          return next;
        });
        setThinking(false);
        // Persist the assistant message — fire-and-forget; on failure the
        // local UI still shows the reply, only the cloud copy is missing.
        void saveChatMessage('assistant', finalText, finalSources).catch(
          (e) => {
            console.error('[memory] save assistant message failed', e);
          }
        );
      },
      onError: (err) => {
        setError(err);
        setThinking(false);
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
            onClick={() => void startNewChat()}
            className="mt-2 shrink-0 text-xs text-ink-3 underline-offset-2 hover:text-ink hover:underline"
            title="Niklaus still remembers past conversations"
          >
            New chat
          </button>
        )}
      </header>

      <div
        ref={scrollRef}
        className="flex-1 overflow-auto border-t border-line px-6 py-5"
      >
        {loading ? (
          <div className="space-y-3">
            <div className="ml-10 h-9 w-3/5 animate-pulse rounded-[20px] bg-paper-deep" />
            <div className="h-5 w-2/3 animate-pulse rounded bg-paper-deep" />
            <div className="h-4 w-4/5 animate-pulse rounded bg-paper-deep" />
          </div>
        ) : (
          <>
            {convo.length === 0 && (
              <div>
                <p className="eyebrow mb-2">Try</p>
                <div className="flex flex-col gap-2">
                  {SUGGESTIONS.map((q) => (
                    <button
                      key={q}
                      onClick={() => void send(q)}
                      className="rounded-xl border border-line px-3.5 py-2.5 text-left text-[14px] text-ink-2 transition-colors hover:bg-paper-elev"
                    >
                      ▸ {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {convo.map((m, i) => {
              const sources =
                m.sourceIds && m.sourceIds.length > 0
                  ? resolveSources(m.sourceIds)
                  : [];
              return (
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
                      <Markdown
                        text={m.text}
                        className="display mb-2.5 mt-1.5 text-[15px] leading-relaxed"
                      />
                      {sources.length > 0 && (
                        <div className="flex flex-col gap-1.5">
                          {sources.map((s) => (
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
              );
            })}

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
          </>
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
            disabled={thinking || loading}
            className="min-w-0 flex-1 border-0 bg-transparent text-[14px] text-ink outline-none placeholder:text-ink-3 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={thinking || loading || !input.trim()}
            className="flex h-8 w-8 items-center justify-center rounded-full transition-colors disabled:opacity-50"
            style={{
              background:
                input.trim() && !thinking && !loading ? '#b56b1d' : '#ece6d8',
              color:
                input.trim() && !thinking && !loading ? '#f6f2ea' : '#807872',
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
