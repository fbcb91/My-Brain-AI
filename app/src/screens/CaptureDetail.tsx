import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import EntityChips from '../components/EntityChips';
import { listCaptures, saveCapture } from '../lib/db';
import { entitiesForCapture, type Entity } from '../lib/entities';
import { deleteCaptureFully, getOrFetchAudioBlob } from '../lib/sync';
import { isLikelyHallucination } from '../lib/transcript-quality';
import type { Capture } from '../lib/types';

const fmtDuration = (s: number) => {
  const sec = Math.max(0, Math.floor(s));
  if (sec < 3600) {
    return `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
  }
  return `${Math.floor(sec / 3600)}:${String(Math.floor((sec % 3600) / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
};

function fmtDate(ts: number): { day: string; time: string } {
  const d = new Date(ts);
  return {
    day: d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }),
    time: d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }),
  };
}

export default function CaptureDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [capture, setCapture] = useState<Capture | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Audio
  const [blob, setBlob] = useState<Blob | null>(null);
  const [audioFetching, setAudioFetching] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);

  // Editing
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  // Privacy
  const [updatingPrivacy, setUpdatingPrivacy] = useState(false);

  // Delete
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Linked entities (people / places / themes Niklaus extracted)
  const [entities, setEntities] = useState<Entity[]>([]);

  const loadFromDb = useCallback(async () => {
    if (!id) return;
    const all = await listCaptures();
    const found = all.find((c) => c.id === id) ?? null;
    setCapture(found);
    if (found?.audioBlob) setBlob(found.audioBlob);
    setLoaded(true);
  }, [id]);

  useEffect(() => {
    void loadFromDb();
  }, [loadFromDb]);

  // Load linked entities — best-effort, separate from the capture row
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    entitiesForCapture(id)
      .then((es) => {
        if (!cancelled) setEntities(es);
      })
      .catch((e) => console.error('[capture-detail] entities load failed', e));
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Lazy fetch audio if missing locally
  useEffect(() => {
    if (!capture) return;
    if (capture.kind !== 'voice') return;
    if (blob) return;
    if (!capture.audioPath) return;
    let cancelled = false;
    setAudioFetching(true);
    setAudioError(null);
    getOrFetchAudioBlob(capture)
      .then((b) => {
        if (cancelled) return;
        setAudioFetching(false);
        if (!b) {
          setAudioError('Audio unavailable.');
          return;
        }
        setBlob(b);
      })
      .catch(() => {
        if (cancelled) return;
        setAudioFetching(false);
        setAudioError('Audio unavailable.');
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capture?.id, capture?.audioPath, blob]);

  const audioUrl = useMemo(
    () => (blob ? URL.createObjectURL(blob) : null),
    [blob]
  );
  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const editableField: 'transcript' | 'text' = capture?.kind === 'note' ? 'text' : 'transcript';
  const currentText =
    capture?.kind === 'note'
      ? (capture.text ?? '')
      : isLikelyHallucination(capture?.transcript)
        ? ''
        : (capture?.transcript ?? '');

  const transcriptPlaceholder =
    capture?.kind === 'voice'
      ? capture.transcript === undefined
        ? 'Transcribing…'
        : '(no transcript)'
      : '(empty)';

  const startEdit = () => {
    if (!capture) return;
    setDraft(currentText);
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setDraft('');
  };

  const saveEdit = async () => {
    if (!capture || saving) return;
    setSaving(true);
    const updated: Capture = {
      ...capture,
      [editableField]: draft,
      // mark as needing re-sync; the next sync run will upsert it
      syncedAt: undefined,
    };
    await saveCapture(updated);
    setCapture(updated);
    setEditing(false);
    setSaving(false);
  };

  const togglePrivacy = async () => {
    if (!capture || updatingPrivacy) return;
    setUpdatingPrivacy(true);
    const updated: Capture = {
      ...capture,
      isPrivate: !capture.isPrivate,
      syncedAt: undefined,
    };
    await saveCapture(updated);
    setCapture(updated);
    setUpdatingPrivacy(false);
  };

  const handleDelete = async () => {
    if (!capture || deleting) return;
    setDeleting(true);
    try {
      await deleteCaptureFully(capture);
      navigate('/today', { replace: true });
    } catch (e) {
      console.error('[delete] failed', e);
      setDeleting(false);
      setConfirmingDelete(false);
    }
  };

  // Reset confirm when navigating away or back
  const navigatingAwayRef = useRef(false);
  useEffect(() => {
    return () => {
      navigatingAwayRef.current = true;
    };
  }, []);

  if (!loaded) {
    return (
      <div className="screen">
        <div className="screen-content">
          <header className="pt-4">
            <BackButton onClick={() => navigate(-1)} />
          </header>
          <div className="mt-10 animate-pulse space-y-3">
            <div className="h-4 w-2/3 rounded bg-paper-deep" />
            <div className="h-3 w-1/3 rounded bg-paper-deep" />
            <div className="mt-6 h-12 w-full rounded bg-paper-deep" />
          </div>
        </div>
      </div>
    );
  }

  if (!capture) {
    return (
      <div className="screen">
        <div className="screen-content">
          <header className="pt-4">
            <BackButton onClick={() => navigate(-1)} />
          </header>
          <div className="mt-12 text-center">
            <p className="display text-lg text-ink-2">Capture not found.</p>
            <p className="mt-2 text-sm text-ink-3">
              It may have been deleted on another device.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const { day, time } = fmtDate(capture.createdAt);
  const kindLabel = capture.kind === 'voice' ? 'voice' : 'note';
  const meta =
    capture.kind === 'voice' && capture.duration
      ? `${kindLabel} · ${fmtDuration(capture.duration)}`
      : kindLabel;

  return (
    <div className="screen">
      <div className="screen-content">
        <header className="pt-4">
          <BackButton onClick={() => navigate(-1)} />
        </header>

        <div className="mt-4">
          <p className="eyebrow">{day}</p>
          <h1 className="display mt-1 text-[28px] leading-tight">{time}</h1>
          <p className="mono mt-1 text-[11px] text-ink-3">{meta}</p>
        </div>

        {capture.questionText && (
          <div className="mt-5 rounded-2xl border border-line bg-paper-elev p-4">
            <p className="eyebrow mb-1.5" style={{ color: '#b56b1d' }}>
              In answer to
            </p>
            <p className="display text-[16px] leading-snug">
              {capture.questionText}
            </p>
          </div>
        )}

        {capture.kind === 'voice' && (
          <div className="mt-6">
            {audioUrl && (
              <audio src={audioUrl} controls preload="metadata" className="w-full" />
            )}
            {!audioUrl && audioFetching && (
              <p className="text-sm text-ink-3">Loading audio…</p>
            )}
            {!audioUrl && !audioFetching && audioError && (
              <p className="text-sm text-[#b94d2b]">{audioError}</p>
            )}
            {!audioUrl &&
              !audioFetching &&
              !audioError &&
              !capture.audioPath && (
                <p className="text-sm text-ink-3">No audio attached.</p>
              )}
          </div>
        )}

        <section className="mt-7">
          <p className="eyebrow mb-2">
            {capture.kind === 'voice' ? 'Transcript' : 'Note'}
          </p>
          {editing ? (
            <div className="flex flex-col gap-3 rounded-2xl border border-line bg-paper-elev p-4">
              <textarea
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={6}
                disabled={saving}
                className="w-full resize-none bg-transparent text-[15px] leading-relaxed text-ink outline-none disabled:opacity-60"
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                    e.preventDefault();
                    void saveEdit();
                  }
                  if (e.key === 'Escape') {
                    e.preventDefault();
                    cancelEdit();
                  }
                }}
              />
              <div className="flex items-center justify-end gap-2 border-t border-line pt-3">
                <button
                  type="button"
                  onClick={cancelEdit}
                  disabled={saving}
                  className="rounded-full px-4 py-2 text-[13px] text-ink-2 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void saveEdit()}
                  disabled={saving}
                  className="rounded-full bg-ink px-4 py-2 text-[13px] font-medium text-paper transition-opacity disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {currentText ? (
                <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-ink">
                  {currentText}
                </p>
              ) : (
                <p className="text-[14px] italic text-ink-3">
                  {transcriptPlaceholder}
                </p>
              )}
              <button
                type="button"
                onClick={startEdit}
                disabled={
                  capture.kind === 'voice' && capture.transcript === undefined
                }
                className="text-xs text-ink-3 underline-offset-2 hover:text-ink-2 hover:underline disabled:opacity-50"
              >
                Edit
              </button>
            </div>
          )}
        </section>

        {entities.length > 0 && (
          <section className="mt-7">
            <p className="eyebrow mb-2">Niklaus recognised</p>
            <EntityChips entities={entities} />
          </section>
        )}

        <section className="mt-7">
          <button
            type="button"
            onClick={togglePrivacy}
            disabled={updatingPrivacy}
            className="flex w-full items-start justify-between gap-4 rounded-2xl border border-line bg-paper-elev p-4 text-left disabled:opacity-50"
          >
            <div>
              <p className="text-[15px] font-medium text-ink">
                Mark as private
              </p>
              <p className="mt-0.5 text-xs text-ink-3">
                Hidden from chat answers and from heir access. You can still
                see it here.
              </p>
            </div>
            <span
              aria-hidden="true"
              className="mt-0.5 flex h-7 w-12 shrink-0 items-center rounded-full p-0.5 transition-colors"
              style={{
                background: capture.isPrivate ? '#b56b1d' : 'rgba(26, 24, 21, 0.18)',
              }}
            >
              <span
                className="h-6 w-6 rounded-full bg-paper transition-transform"
                style={{
                  transform: capture.isPrivate
                    ? 'translateX(20px)'
                    : 'translateX(0)',
                }}
              />
            </span>
          </button>
        </section>

        <section className="mt-7">
          {!confirmingDelete ? (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              disabled={deleting}
              className="text-sm text-[#b94d2b] underline-offset-2 hover:underline disabled:opacity-50"
            >
              Delete this capture
            </button>
          ) : (
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#b94d2b]/40 bg-[#b94d2b]/5 p-4">
              <p className="text-sm text-[#7a3320]">
                Delete forever? This cannot be undone.
              </p>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(false)}
                  disabled={deleting}
                  className="rounded-full px-3 py-1.5 text-xs text-ink-3 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleDelete()}
                  disabled={deleting}
                  className="rounded-full bg-[#b94d2b] px-3 py-1.5 text-xs font-medium text-paper transition-opacity disabled:opacity-50"
                >
                  {deleting ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Back"
      className="-ml-2 flex h-9 w-9 items-center justify-center rounded-full text-ink-2 hover:text-ink"
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M14 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
