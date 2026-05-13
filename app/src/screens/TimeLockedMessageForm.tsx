import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import Waveform from '../components/Waveform';
import { useRecorder } from '../hooks/useRecorder';
import { listHeirs, type Heir } from '../lib/heirs';
import {
  createTimeLockedMessage,
  deleteTimeLockedMessage,
  fetchMessageAudio,
  getTimeLockedMessage,
  updateTimeLockedMessage,
  type TimeLockedMessage,
} from '../lib/timeLockedMessages';

type BodyMode = 'voice' | 'text';
type UnlockMode = 'date' | 'occasion';

const fmt = (s: number) => {
  const sec = Math.max(0, Math.floor(s));
  return `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
};

export default function TimeLockedMessageForm() {
  const { id: paramId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = paramId && paramId !== 'new';

  const [existing, setExisting] = useState<TimeLockedMessage | null>(null);
  const [loading, setLoading] = useState<boolean>(!!isEdit);
  const [heirs, setHeirs] = useState<Heir[]>([]);

  // Form fields
  const [title, setTitle] = useState('');
  const [recipientHeirId, setRecipientHeirId] = useState<string>('');
  const [unlockMode, setUnlockMode] = useState<UnlockMode>('date');
  const [unlockAt, setUnlockAt] = useState<string>('');
  const [unlockDescription, setUnlockDescription] = useState<string>('');
  const [bodyMode, setBodyMode] = useState<BodyMode>('voice');
  const [textBody, setTextBody] = useState('');

  // Voice recording state
  const recorder = useRecorder();
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioMime, setAudioMime] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState<number | null>(null);
  const [existingAudioBlob, setExistingAudioBlob] = useState<Blob | null>(null);
  const [audioLoading, setAudioLoading] = useState(false);

  // UI state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Load heirs once
  useEffect(() => {
    let cancelled = false;
    listHeirs()
      .then((h) => {
        if (!cancelled) setHeirs(h);
      })
      .catch((e) => console.error('[message-form] heirs load failed', e));
    return () => {
      cancelled = true;
    };
  }, []);

  // Load existing message for edit
  useEffect(() => {
    if (!isEdit || !paramId) return;
    let cancelled = false;
    getTimeLockedMessage(paramId)
      .then((m) => {
        if (cancelled) return;
        if (!m) {
          setError('Message not found.');
          setLoading(false);
          return;
        }
        setExisting(m);
        setTitle(m.title);
        setRecipientHeirId(m.recipientHeirId ?? '');
        if (m.unlockAt) {
          setUnlockMode('date');
          setUnlockAt(m.unlockAt);
        } else if (m.unlockDescription) {
          setUnlockMode('occasion');
          setUnlockDescription(m.unlockDescription);
        }
        if (m.audioPath) {
          setBodyMode('voice');
        } else {
          setBodyMode('text');
          setTextBody(m.body ?? '');
        }
        setLoading(false);
      })
      .catch((e) => {
        console.error('[message-form] load failed', e);
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Could not load message.');
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isEdit, paramId]);

  // Fetch existing audio blob for playback on edit
  useEffect(() => {
    if (!existing?.audioPath || audioBlob || existingAudioBlob) return;
    let cancelled = false;
    setAudioLoading(true);
    fetchMessageAudio(existing.audioPath)
      .then((b) => {
        if (cancelled) return;
        setExistingAudioBlob(b);
        setAudioLoading(false);
      })
      .catch(() => {
        if (!cancelled) setAudioLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [existing, audioBlob, existingAudioBlob]);

  const audioUrl = useMemo(() => {
    const blob = audioBlob ?? existingAudioBlob;
    if (!blob) return null;
    return URL.createObjectURL(blob);
  }, [audioBlob, existingAudioBlob]);

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  async function handleVoiceStop() {
    const result = await recorder.stop();
    if (!result || result.duration < 1.0) return;
    setAudioBlob(result.blob);
    setAudioMime(result.mimeType);
    setAudioDuration(result.duration);
  }

  function discardAudio() {
    setAudioBlob(null);
    setAudioMime(null);
    setAudioDuration(null);
    setExistingAudioBlob(null);
  }

  const canSave = (() => {
    if (!title.trim()) return false;
    if (unlockMode === 'date' && !unlockAt) return false;
    if (unlockMode === 'occasion' && !unlockDescription.trim()) return false;
    if (bodyMode === 'text') return textBody.trim().length > 0;
    // voice
    if (audioBlob) return true;
    if (existing?.audioPath && !audioBlob) return true; // editing without changing audio
    return false;
  })();

  async function save() {
    if (saving || !canSave) return;
    setSaving(true);
    setError(null);
    try {
      const sharedFields = {
        title,
        unlockAt: unlockMode === 'date' ? unlockAt : null,
        unlockDescription:
          unlockMode === 'occasion' ? unlockDescription : null,
        recipientHeirId: recipientHeirId || null,
      };
      if (isEdit && existing) {
        await updateTimeLockedMessage(existing.id, existing, {
          ...sharedFields,
          body: bodyMode === 'text' ? textBody : null,
          audioBlob: audioBlob ?? undefined,
          audioMime: audioMime ?? undefined,
          durationSeconds: audioDuration ?? undefined,
          clearAudio: bodyMode === 'text',
        });
      } else {
        await createTimeLockedMessage({
          ...sharedFields,
          body: bodyMode === 'text' ? textBody : null,
          audioBlob: audioBlob ?? undefined,
          audioMime: audioMime ?? undefined,
          durationSeconds: audioDuration ?? undefined,
        });
      }
      navigate('/heritage/messages', { replace: true });
    } catch (e) {
      console.error('[message-form] save failed', e);
      setError(e instanceof Error ? e.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!existing) return;
    setSaving(true);
    setError(null);
    try {
      await deleteTimeLockedMessage(existing);
      navigate('/heritage/messages', { replace: true });
    } catch (e) {
      console.error('[message-form] delete failed', e);
      setError(e instanceof Error ? e.message : 'Could not delete.');
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="screen">
        <div className="screen-content">
          <header className="pt-3">
            <BackButton onClick={() => navigate(-1)} />
          </header>
          <div className="mt-10 space-y-3 animate-pulse">
            <div className="h-4 w-1/3 rounded bg-paper-deep" />
            <div className="h-10 w-full rounded bg-paper-deep" />
            <div className="h-10 w-full rounded bg-paper-deep" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="screen-content">
        <header className="pt-3">
          <BackButton onClick={() => navigate(-1)} />
        </header>

        <div className="mt-3">
          <p className="eyebrow">Heritage</p>
          <h1 className="display mt-1.5 text-[28px] leading-tight">
            {isEdit ? 'Edit message' : 'New time-locked message'}
          </h1>
        </div>

        <section className="mt-7 space-y-4">
          <div>
            <label htmlFor="title" className="eyebrow block pb-1.5">
              Title
            </label>
            <input
              id="title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Sofia's 18th birthday"
              className="w-full border-b border-ink bg-transparent py-2 text-[15px] text-ink outline-none placeholder:text-ink-3 focus:border-accent"
            />
          </div>

          <div>
            <label htmlFor="recipient" className="eyebrow block pb-1.5">
              For
            </label>
            <select
              id="recipient"
              value={recipientHeirId}
              onChange={(e) => setRecipientHeirId(e.target.value)}
              className="w-full border-b border-ink bg-transparent py-2 text-[15px] text-ink outline-none focus:border-accent"
            >
              <option value="">Anyone (no specific heir)</option>
              {heirs.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                  {h.relationship ? ` · ${h.relationship}` : ''}
                </option>
              ))}
            </select>
            {heirs.length === 0 && (
              <p className="mt-2 text-xs text-ink-3">
                You haven't designated any heirs yet. The message will still
                be saved — assign it to someone later from{' '}
                <button
                  type="button"
                  onClick={() => navigate('/heritage/heirs')}
                  className="underline"
                >
                  Heirs
                </button>
                .
              </p>
            )}
          </div>

          <div>
            <p className="eyebrow pb-1.5">Unlocks</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setUnlockMode('date')}
                className="flex-1 rounded-full px-3 py-2 text-[13px] font-medium transition-colors"
                style={{
                  background: unlockMode === 'date' ? '#1a1815' : 'transparent',
                  color: unlockMode === 'date' ? '#f6f2ea' : '#4b4640',
                  border:
                    unlockMode === 'date'
                      ? '1px solid #1a1815'
                      : '1px solid rgba(26, 24, 21, 0.18)',
                }}
              >
                On a date
              </button>
              <button
                type="button"
                onClick={() => setUnlockMode('occasion')}
                className="flex-1 rounded-full px-3 py-2 text-[13px] font-medium transition-colors"
                style={{
                  background: unlockMode === 'occasion' ? '#1a1815' : 'transparent',
                  color: unlockMode === 'occasion' ? '#f6f2ea' : '#4b4640',
                  border:
                    unlockMode === 'occasion'
                      ? '1px solid #1a1815'
                      : '1px solid rgba(26, 24, 21, 0.18)',
                }}
              >
                On an occasion
              </button>
            </div>
            <div className="mt-3">
              {unlockMode === 'date' ? (
                <input
                  type="date"
                  value={unlockAt}
                  onChange={(e) => setUnlockAt(e.target.value)}
                  className="w-full border-b border-ink bg-transparent py-2 text-[15px] text-ink outline-none focus:border-accent"
                />
              ) : (
                <input
                  type="text"
                  value={unlockDescription}
                  onChange={(e) => setUnlockDescription(e.target.value)}
                  placeholder="When Sofia turns 18"
                  className="w-full border-b border-ink bg-transparent py-2 text-[15px] text-ink outline-none placeholder:text-ink-3 focus:border-accent"
                />
              )}
            </div>
          </div>

          <div>
            <p className="eyebrow pb-1.5">Message</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setBodyMode('voice')}
                className="flex-1 rounded-full px-3 py-2 text-[13px] font-medium transition-colors"
                style={{
                  background: bodyMode === 'voice' ? '#1a1815' : 'transparent',
                  color: bodyMode === 'voice' ? '#f6f2ea' : '#4b4640',
                  border:
                    bodyMode === 'voice'
                      ? '1px solid #1a1815'
                      : '1px solid rgba(26, 24, 21, 0.18)',
                }}
              >
                Voice
              </button>
              <button
                type="button"
                onClick={() => setBodyMode('text')}
                className="flex-1 rounded-full px-3 py-2 text-[13px] font-medium transition-colors"
                style={{
                  background: bodyMode === 'text' ? '#1a1815' : 'transparent',
                  color: bodyMode === 'text' ? '#f6f2ea' : '#4b4640',
                  border:
                    bodyMode === 'text'
                      ? '1px solid #1a1815'
                      : '1px solid rgba(26, 24, 21, 0.18)',
                }}
              >
                Text
              </button>
            </div>

            {bodyMode === 'voice' && (
              <div className="mt-3">
                {audioUrl ? (
                  <div className="space-y-2 rounded-2xl border border-line bg-paper-elev p-4">
                    <p className="mono text-[11px] text-accent">
                      {audioBlob ? 'Just recorded' : 'Saved message'}
                    </p>
                    <audio src={audioUrl} controls preload="metadata" className="w-full" />
                    <button
                      type="button"
                      onClick={discardAudio}
                      className="text-xs text-ink-3 underline-offset-2 hover:text-ink-2 hover:underline"
                    >
                      Discard and record again
                    </button>
                  </div>
                ) : audioLoading ? (
                  <p className="mt-2 text-sm text-ink-3">Loading audio…</p>
                ) : (
                  <div
                    className="flex w-full flex-col items-center gap-3 rounded-3xl border px-5 py-7 transition-all"
                    style={{
                      background: recorder.isRecording ? 'rgba(181, 107, 29, 0.12)' : '#fbf8f2',
                      borderColor: recorder.isRecording ? '#b56b1d' : 'rgba(26, 24, 21, 0.10)',
                    }}
                  >
                    <button
                      type="button"
                      onPointerDown={(e) => {
                        e.preventDefault();
                        void recorder.start();
                      }}
                      onPointerUp={() => void handleVoiceStop()}
                      onPointerLeave={() => {
                        if (recorder.isRecording) void handleVoiceStop();
                      }}
                      onPointerCancel={() => recorder.cancel()}
                      onContextMenu={(e) => e.preventDefault()}
                      className="flex w-full select-none flex-col items-center gap-3"
                      style={{ touchAction: 'none' }}
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
                          <Waveform stream={recorder.stream} />
                          <span className="mono text-[13px] tracking-[0.05em] text-accent">
                            ● Recording {fmt(recorder.duration)}
                          </span>
                          <span className="text-xs text-ink-3">Release to save</span>
                        </>
                      ) : (
                        <span className="display text-lg font-medium">Hold to record</span>
                      )}
                    </button>
                    {recorder.error && (
                      <p className="mt-1 text-xs text-[#b94d2b]">{recorder.error}</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {bodyMode === 'text' && (
              <textarea
                value={textBody}
                onChange={(e) => setTextBody(e.target.value)}
                placeholder="What do you want them to read?"
                rows={6}
                className="mt-3 w-full resize-none rounded-2xl border border-line bg-paper-elev p-4 text-[15px] leading-relaxed text-ink outline-none focus:border-accent"
              />
            )}
          </div>
        </section>

        {error && <p className="mt-4 text-sm text-[#b94d2b]">{error}</p>}

        <div className="mt-8 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => navigate('/heritage/messages')}
            disabled={saving}
            className="rounded-full px-4 py-2 text-[13px] text-ink-2 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!canSave || saving}
            className="rounded-full bg-ink px-5 py-2.5 text-[13px] font-medium text-paper transition-opacity disabled:opacity-50"
          >
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Lock it'}
          </button>
        </div>

        {isEdit && (
          <section className="mt-8 border-t border-line pt-4">
            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                disabled={saving}
                className="text-xs text-[#b94d2b] underline-offset-2 hover:underline disabled:opacity-50"
              >
                Delete this message
              </button>
            ) : (
              <div className="flex items-center justify-between gap-3 rounded-xl bg-[#b94d2b]/5 p-3">
                <p className="text-xs text-[#7a3320]">
                  Delete forever? It won't reach anyone.
                </p>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    disabled={saving}
                    className="rounded-full px-3 py-1 text-xs text-ink-3 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={saving}
                    className="rounded-full bg-[#b94d2b] px-3 py-1 text-xs font-medium text-paper transition-opacity disabled:opacity-50"
                  >
                    {saving ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              </div>
            )}
          </section>
        )}
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
