import { useCallback, useEffect, useMemo, useState } from 'react';
import Waveform from '../components/Waveform';
import { useAuth } from '../contexts/AuthContext';
import { useRecorder } from '../hooks/useRecorder';
import { listCaptures, saveCapture } from '../lib/db';
import { syncAll, pullFromServer, getOrFetchAudioBlob } from '../lib/sync';
import type { Capture } from '../lib/types';

const fmt = (s: number) => {
  const sec = Math.max(0, Math.floor(s));
  if (sec < 3600) {
    return `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
  }
  return `${Math.floor(sec / 3600)}:${String(Math.floor((sec % 3600) / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
};

const headerDate = new Date().toLocaleDateString('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
});

function startOfDay(t: number): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function groupLabel(ts: number): string {
  const today = startOfDay(Date.now());
  const cap = startOfDay(ts);
  if (cap === today) return 'Today';
  if (cap === today - 86400000) return 'Yesterday';
  return new Date(ts).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function timeLabel(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

interface AudioRowProps {
  capture: Capture;
  expanded: boolean;
  onToggle: () => void;
}

function AudioRow({ capture, expanded, onToggle }: AudioRowProps) {
  const [blob, setBlob] = useState<Blob | null>(capture.audioBlob ?? null);
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Sync local state when the capture prop's blob arrives (e.g. after a refresh)
  useEffect(() => {
    if (capture.audioBlob) setBlob(capture.audioBlob);
  }, [capture.audioBlob]);

  // Lazy-download the audio the first time the user expands a row that doesn't
  // have it cached locally. We deliberately don't include `fetching` or the
  // full `capture` object in the deps: state updates inside this effect would
  // otherwise cancel the in-flight download via the cleanup before it can
  // finish.
  useEffect(() => {
    if (!expanded || blob || !capture.audioPath) return;
    let cancelled = false;
    setFetching(true);
    setFetchError(null);
    getOrFetchAudioBlob(capture)
      .then((b) => {
        if (cancelled) return;
        setFetching(false);
        if (!b) {
          setFetchError('Audio unavailable.');
          return;
        }
        setBlob(b);
      })
      .catch(() => {
        if (cancelled) return;
        setFetching(false);
        setFetchError('Audio unavailable.');
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded, blob, capture.id, capture.audioPath]);

  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob]);
  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [url]);

  const label =
    capture.kind === 'voice'
      ? capture.transcript ?? `voice · ${fmt(capture.duration ?? 0)}`
      : (capture.text ?? '');
  const pending = !capture.syncedAt;

  return (
    <li className="border-b border-line">
      <button
        type="button"
        onClick={onToggle}
        className="grid w-full items-center gap-2.5 py-3.5 text-left"
        style={{ gridTemplateColumns: '46px auto 1fr auto' }}
      >
        <span className="mono text-[11px] text-ink-3">{timeLabel(capture.createdAt)}</span>
        <span
          className="flex h-[22px] w-[22px] items-center justify-center rounded-full text-[10px] text-accent"
          style={{
            background:
              capture.kind === 'voice' ? 'rgba(181, 107, 29, 0.12)' : '#ece6d8',
            fontFamily: 'JetBrains Mono, ui-monospace, monospace',
          }}
        >
          {capture.kind === 'voice' ? '◉' : '✎'}
        </span>
        <span className="truncate text-[13.5px] text-ink-2">{label}</span>
        {pending && (
          <span
            aria-label="Pending sync"
            className="ml-2 h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ background: 'rgba(26, 24, 21, 0.25)' }}
          />
        )}
      </button>
      {expanded && capture.kind === 'voice' && (
        <div className="pb-3 pl-[58px] pr-1">
          {url && <audio src={url} controls preload="metadata" className="w-full" />}
          {!url && fetching && (
            <p className="text-xs text-ink-3">Loading audio…</p>
          )}
          {!url && !fetching && fetchError && (
            <p className="text-xs text-[#b94d2b]">{fetchError}</p>
          )}
        </div>
      )}
    </li>
  );
}

export default function Today() {
  const { user } = useAuth();
  const [captures, setCaptures] = useState<Capture[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const recorder = useRecorder();

  const loadAll = useCallback(async () => {
    const all = await listCaptures();
    setCaptures(all);
  }, []);

  const sync = useCallback(async () => {
    if (!user) return;
    const result = await syncAll(user.id);
    if (result.ok > 0) await loadAll();
  }, [user, loadAll]);

  useEffect(() => {
    loadAll().finally(() => setLoaded(true));
  }, [loadAll]);

  // When a user becomes available (sign-in or app reopen), pull anything new
  // from the server first, then push any local-only pending captures up.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const { added } = await pullFromServer();
        if (cancelled) return;
        if (added > 0) await loadAll();
      } catch (e) {
        console.error('[pull] failed', e);
      }
      if (cancelled) return;
      void sync();
    })();
    return () => {
      cancelled = true;
    };
  }, [user, sync, loadAll]);

  const handleStart = useCallback(() => {
    void recorder.start();
  }, [recorder]);

  const handleStop = useCallback(async () => {
    const result = await recorder.stop();
    if (!result || result.duration < 0.6) return;
    const capture: Capture = {
      id: newId(),
      userId: user?.id,
      createdAt: Date.now(),
      kind: 'voice',
      audioBlob: result.blob,
      duration: result.duration,
      mimeType: result.mimeType,
    };
    await saveCapture(capture);
    await loadAll();
    void sync();
  }, [recorder, loadAll, sync, user]);

  const grouped = useMemo(() => {
    const groups: { label: string; items: Capture[] }[] = [];
    let currentLabel = '';
    for (const c of captures) {
      const label = groupLabel(c.createdAt);
      if (label !== currentLabel) {
        groups.push({ label, items: [] });
        currentLabel = label;
      }
      groups[groups.length - 1].items.push(c);
    }
    return groups;
  }, [captures]);

  return (
    <div className="screen">
      <div className="screen-content">
        <header className="pt-4">
          <p className="eyebrow">{headerDate}</p>
          <h1 className="display mt-1.5 text-[34px] leading-[1.05]">Today</h1>
        </header>

        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            handleStart();
          }}
          onPointerUp={() => {
            void handleStop();
          }}
          onPointerLeave={() => {
            if (recorder.isRecording) void handleStop();
          }}
          onPointerCancel={() => recorder.cancel()}
          onContextMenu={(e) => e.preventDefault()}
          className="mt-6 flex w-full select-none flex-col items-center gap-3 rounded-3xl border px-5 py-7 transition-all"
          style={{
            background: recorder.isRecording ? 'rgba(181, 107, 29, 0.12)' : '#fbf8f2',
            borderColor: recorder.isRecording ? '#b56b1d' : 'rgba(26, 24, 21, 0.10)',
            touchAction: 'none',
          }}
        >
          <span
            className="flex h-16 w-16 items-center justify-center rounded-full transition-all"
            style={{
              background: recorder.isRecording ? '#b56b1d' : '#1a1815',
              transform: recorder.isRecording ? 'scale(1.08)' : 'scale(1)',
              boxShadow: recorder.isRecording
                ? '0 0 0 8px rgba(181, 107, 29, 0.12)'
                : 'none',
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="#f6f2ea">
              <rect x="9" y="3" width="6" height="13" rx="3" />
              <path
                d="M5 11a7 7 0 0014 0M12 18v3"
                stroke="#f6f2ea"
                strokeWidth="1.6"
                fill="none"
                strokeLinecap="round"
              />
            </svg>
          </span>
          {recorder.isRecording ? (
            <>
              <Waveform />
              <span className="mono text-[13px] tracking-[0.05em] text-accent">
                ● Recording {fmt(recorder.duration)}
              </span>
              <span className="text-xs text-ink-3">Release to save</span>
            </>
          ) : (
            <>
              <span className="display text-lg font-medium">Hold to record</span>
              <span className="text-xs text-ink-3">or tap to type</span>
            </>
          )}
        </button>

        {recorder.error && (
          <p className="mt-3 text-center text-xs text-[#b94d2b]">{recorder.error}</p>
        )}

        {loaded && captures.length === 0 && !recorder.isRecording && (
          <div className="mt-10 text-center">
            <p className="display text-lg text-ink-2">Nothing here yet.</p>
            <p className="mt-2 text-sm text-ink-3">
              Press and hold the button above to record your first thought.
            </p>
          </div>
        )}

        {grouped.map((group) => (
          <section key={group.label} className="mt-7">
            <div className="mb-2 flex items-baseline justify-between">
              <span className="eyebrow">{group.label}</span>
              <span className="text-xs text-ink-3">
                {group.items.length} {group.items.length === 1 ? 'capture' : 'captures'}
              </span>
            </div>
            <ul className="flex flex-col border-t border-line">
              {group.items.map((c) => (
                <AudioRow
                  key={c.id}
                  capture={c}
                  expanded={expandedId === c.id}
                  onToggle={() => setExpandedId((cur) => (cur === c.id ? null : c.id))}
                />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
