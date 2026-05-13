import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  listTimeLockedMessages,
  type TimeLockedMessage,
} from '../lib/timeLockedMessages';

function fmtUnlock(m: TimeLockedMessage): string {
  if (m.unlockAt) {
    const d = new Date(`${m.unlockAt}T00:00:00.000Z`);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    });
  }
  if (m.unlockDescription) return m.unlockDescription;
  return 'No unlock condition';
}

export default function TimeLockedMessages() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<TimeLockedMessage[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listTimeLockedMessages()
      .then((m) => {
        if (!cancelled) setMessages(m);
      })
      .catch((e) => {
        console.error('[time-locked] list failed', e);
        if (!cancelled) setError('Could not load your messages.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="screen">
      <div className="screen-content">
        <header className="pt-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Back"
            className="-ml-2 flex h-9 w-9 items-center justify-center rounded-full text-ink-2 hover:text-ink"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M14 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </header>

        <div className="mt-3">
          <p className="eyebrow">Heritage</p>
          <h1 className="display mt-1.5 text-[32px] leading-tight">
            Time-locked messages
          </h1>
          <p className="mt-2 text-sm text-ink-2">
            Words you write or record now, to be opened by someone you love at
            a moment you choose — a birthday, an anniversary, a graduation.
          </p>
        </div>

        {messages === null && !error && (
          <div className="mt-8 space-y-3">
            {[0, 1].map((i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-2xl bg-paper-deep"
              />
            ))}
          </div>
        )}

        {error && <p className="mt-4 text-sm text-[#b94d2b]">{error}</p>}

        {messages && messages.length === 0 && (
          <div className="mt-10 text-center">
            <p className="display text-lg text-ink-2">Nothing locked yet.</p>
            <p className="mt-2 text-sm text-ink-3">
              Write something Niklaus will keep for the right moment.
            </p>
          </div>
        )}

        {messages && messages.length > 0 && (
          <ul className="mt-8 overflow-hidden rounded-2xl border border-line bg-paper-elev">
            {messages.map((m, i) => {
              const isVoice = !!m.audioPath;
              return (
                <li
                  key={m.id}
                  className={
                    i < messages.length - 1 ? 'border-b border-line' : ''
                  }
                >
                  <button
                    type="button"
                    onClick={() => navigate(`/heritage/messages/${m.id}`)}
                    className="grid w-full grid-cols-[24px_1fr_auto] items-center gap-3 px-4 py-3.5 text-left"
                  >
                    <span
                      className="flex h-[22px] w-[22px] items-center justify-center rounded-full text-[10px] text-accent"
                      style={{
                        background: 'rgba(181, 107, 29, 0.12)',
                        fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                      }}
                    >
                      {isVoice ? '◉' : '✎'}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-medium text-ink">
                        {m.title}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-ink-3">
                        {m.recipientName ? `For ${m.recipientName} · ` : ''}
                        {fmtUnlock(m)}
                      </p>
                    </div>
                    <span className="text-lg text-ink-3">›</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <button
          type="button"
          onClick={() => navigate('/heritage/messages/new')}
          className="mt-6 w-full rounded-full border border-line bg-paper-elev py-3 text-[14px] text-ink-2 hover:bg-highlight"
        >
          + New message
        </button>
      </div>
    </div>
  );
}
