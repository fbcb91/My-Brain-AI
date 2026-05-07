import { useState } from 'react';
import { useRecorder } from '../hooks/useRecorder';
import { saveCapture } from '../lib/db';
import type { Capture } from '../lib/types';
import Waveform from './Waveform';

interface DailyAnswerModalProps {
  question: string;
  userId: string | undefined;
  onAnswered: () => void;
  onClose: () => void;
}

const fmt = (s: number) => {
  const sec = Math.max(0, Math.floor(s));
  return `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
};

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const eyebrow = (() => {
  const now = new Date();
  const weekday = now.toLocaleDateString('en-US', { weekday: 'long' });
  const partOfDay =
    now.getHours() < 12 ? 'morning' : now.getHours() < 18 ? 'afternoon' : 'evening';
  return `Niklaus, ${weekday} ${partOfDay}`;
})();

export default function DailyAnswerModal({
  question,
  userId,
  onAnswered,
  onClose,
}: DailyAnswerModalProps) {
  const recorder = useRecorder();
  const [textMode, setTextMode] = useState(false);
  const [textValue, setTextValue] = useState('');
  const [saving, setSaving] = useState(false);

  async function commit(capture: Capture): Promise<void> {
    setSaving(true);
    await saveCapture(capture);
    setSaving(false);
    onAnswered();
  }

  async function handleVoiceStop() {
    const result = await recorder.stop();
    // Match Today.tsx — anything shorter than a second is almost certainly
    // an accidental press, not a real answer.
    if (!result || result.duration < 1.0) return;
    await commit({
      id: newId(),
      userId,
      createdAt: Date.now(),
      kind: 'voice',
      audioBlob: result.blob,
      duration: result.duration,
      mimeType: result.mimeType,
      questionText: question,
    });
  }

  async function handleTextSave() {
    const text = textValue.trim();
    if (!text || saving) return;
    await commit({
      id: newId(),
      userId,
      createdAt: Date.now(),
      kind: 'note',
      text,
      questionText: question,
    });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Daily question"
      className="fixed inset-0 z-50 flex flex-col bg-paper"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0)',
        paddingBottom: 'env(safe-area-inset-bottom, 0)',
      }}
    >
      <div className="flex items-center justify-between px-6 pt-3">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="-ml-2 flex h-9 w-9 items-center justify-center rounded-full text-ink-3 hover:text-ink"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>
        <span className="eyebrow" style={{ color: '#b56b1d' }}>
          Daily question
        </span>
        <span className="w-9" />
      </div>

      <div className="flex-1 overflow-auto px-6">
        <div className="mt-12">
          <p className="eyebrow">{eyebrow}</p>
          <p className="display mt-3 text-[28px] leading-snug text-ink">
            {question}
          </p>
        </div>

        <div className="mt-12">
          {textMode ? (
            <div
              className="flex w-full flex-col rounded-3xl border bg-paper-elev px-5 py-5"
              style={{ borderColor: 'rgba(26, 24, 21, 0.18)' }}
            >
              <textarea
                autoFocus
                value={textValue}
                onChange={(e) => setTextValue(e.target.value)}
                placeholder="Type your answer..."
                rows={6}
                disabled={saving}
                className="w-full resize-none bg-transparent text-[15px] leading-relaxed text-ink outline-none placeholder:text-ink-3 disabled:opacity-60"
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                    e.preventDefault();
                    void handleTextSave();
                  }
                  if (e.key === 'Escape') {
                    e.preventDefault();
                    setTextMode(false);
                    setTextValue('');
                  }
                }}
              />
              <div className="mt-3 flex items-center justify-end gap-2 border-t border-line pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setTextMode(false);
                    setTextValue('');
                  }}
                  disabled={saving}
                  className="rounded-full px-4 py-2 text-[13px] text-ink-2 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleTextSave()}
                  disabled={!textValue.trim() || saving}
                  className="rounded-full bg-ink px-4 py-2 text-[13px] font-medium text-paper transition-opacity disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
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
                onPointerUp={() => {
                  void handleVoiceStop();
                }}
                onPointerLeave={() => {
                  if (recorder.isRecording) void handleVoiceStop();
                }}
                onPointerCancel={() => recorder.cancel()}
                onContextMenu={(e) => e.preventDefault()}
                disabled={saving}
                className="flex w-full select-none flex-col items-center gap-3 disabled:opacity-50"
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
                    <Waveform />
                    <span className="mono text-[13px] tracking-[0.05em] text-accent">
                      ● Recording {fmt(recorder.duration)}
                    </span>
                    <span className="text-xs text-ink-3">Release to save</span>
                  </>
                ) : (
                  <span className="display text-lg font-medium">
                    {saving ? 'Saving…' : 'Hold to answer'}
                  </span>
                )}
              </button>
              {!recorder.isRecording && !saving && (
                <button
                  type="button"
                  onClick={() => setTextMode(true)}
                  className="text-xs text-ink-3 underline-offset-2 hover:underline"
                >
                  or tap to type
                </button>
              )}
            </div>
          )}

          {recorder.error && (
            <p className="mt-3 text-center text-xs text-[#b94d2b]">{recorder.error}</p>
          )}
        </div>
      </div>

      <div className="flex justify-center px-6 pb-8 pt-4">
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="text-xs text-ink-3 underline-offset-2 hover:underline disabled:opacity-50"
        >
          Skip for today
        </button>
      </div>
    </div>
  );
}
