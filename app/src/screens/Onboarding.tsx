import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import Markdown from '../components/Markdown';
import Waveform from '../components/Waveform';
import { useAuth } from '../contexts/AuthContext';
import { useRecorder } from '../hooks/useRecorder';
import {
  saveChatMessage,
  streamChatMessage,
  stripChatMarkers,
} from '../lib/chat';
import { listCaptures, saveCapture } from '../lib/db';
import { markOnboarded, setWhy, type WhyAnswer } from '../lib/onboarding';
import { syncAll } from '../lib/sync';
import { transcribePending } from '../lib/transcribe';
import type { Capture } from '../lib/types';

type Step = 'welcome' | 'why' | 'capture' | 'memory' | 'done';

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const fmt = (s: number) => {
  const sec = Math.max(0, Math.floor(s));
  return `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
};

const WHY_OPTIONS: { value: WhyAnswer; label: string }[] = [
  { value: 'myself', label: 'For myself, in 30 years' },
  { value: 'children', label: 'For my children' },
  { value: 'loved-one', label: 'For someone I love' },
  { value: 'curious', label: "I'm just curious" },
];

export default function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('welcome');
  const [why, setWhyState] = useState<WhyAnswer | null>(null);

  // Step 3 — capture
  const recorder = useRecorder();
  const [captureMode, setCaptureMode] = useState<'voice' | 'text'>('voice');
  const [textValue, setTextValue] = useState('');
  const [savedId, setSavedId] = useState<string | null>(null);
  const [captureText, setCaptureText] = useState<string | null>(null);
  const [savingCapture, setSavingCapture] = useState(false);
  const [waitingTranscript, setWaitingTranscript] = useState(false);

  // Step 4 — memory chat
  const [chatRaw, setChatRaw] = useState('');
  const [chatThinking, setChatThinking] = useState(false);
  const [chatDone, setChatDone] = useState(false);
  const chatStartedRef = useRef(false);

  // Step 5 — notifications
  const [askingNotif, setAskingNotif] = useState(false);

  const goNext = useCallback(() => {
    if (step === 'welcome') setStep('why');
    else if (step === 'why') setStep('capture');
    else if (step === 'capture') setStep('memory');
    else if (step === 'memory') setStep('done');
    else if (step === 'done') {
      if (user) markOnboarded(user.id);
      navigate('/today', { replace: true });
    }
  }, [step, user, navigate]);

  const goBack = useCallback(() => {
    if (step === 'why') setStep('welcome');
    else if (step === 'capture') setStep('why');
    else if (step === 'memory') setStep('capture');
    else if (step === 'done') setStep('memory');
  }, [step]);

  const pickWhy = (w: WhyAnswer) => {
    setWhyState(w);
    if (user) setWhy(user.id, w);
  };

  // After recording, save capture + trigger sync + poll for transcript
  const handleVoiceStop = useCallback(async () => {
    const result = await recorder.stop();
    if (!result || result.duration < 1.0) return;
    const id = newId();
    const capture: Capture = {
      id,
      userId: user?.id,
      createdAt: Date.now(),
      kind: 'voice',
      audioBlob: result.blob,
      duration: result.duration,
      mimeType: result.mimeType,
    };
    setSavingCapture(true);
    await saveCapture(capture);
    setSavedId(id);
    setSavingCapture(false);
    setWaitingTranscript(true);
    // Trigger upload + transcribe asynchronously; we poll below for completion
    if (user) {
      void syncAll(user.id).then(() => transcribePending());
    }
  }, [recorder, user]);

  const handleTextSave = useCallback(async () => {
    const text = textValue.trim();
    if (!text || savingCapture) return;
    const id = newId();
    const capture: Capture = {
      id,
      userId: user?.id,
      createdAt: Date.now(),
      kind: 'note',
      text,
    };
    setSavingCapture(true);
    await saveCapture(capture);
    setSavedId(id);
    setCaptureText(text);
    setSavingCapture(false);
    // Notes don't need transcription, but they should still hit the server so
    // step 4's chat can see them.
    if (user) void syncAll(user.id);
  }, [textValue, user, savingCapture]);

  // Poll for transcript after voice save
  useEffect(() => {
    if (!savedId || captureText !== null || !waitingTranscript) return;
    let cancelled = false;
    let attempts = 0;
    const poll = async () => {
      if (cancelled) return;
      attempts++;
      const all = await listCaptures();
      const cap = all.find((c) => c.id === savedId);
      if (cap && typeof cap.transcript === 'string') {
        setCaptureText(cap.transcript || `voice · ${fmt(cap.duration ?? 0)}`);
        setWaitingTranscript(false);
        return;
      }
      // 20s timeout — allow Continue even without transcript
      if (attempts > 14) {
        setCaptureText(`voice · ${fmt(cap?.duration ?? 0)}`);
        setWaitingTranscript(false);
        return;
      }
      window.setTimeout(poll, 1500);
    };
    window.setTimeout(poll, 1500);
    return () => {
      cancelled = true;
    };
  }, [savedId, captureText, waitingTranscript]);

  // Step 4 — when entered, automatically ask Niklaus the prefilled question
  useEffect(() => {
    if (step !== 'memory' || chatStartedRef.current) return;
    chatStartedRef.current = true;
    const query = 'What did I just say?';
    setChatThinking(true);
    setChatDone(false);
    setChatRaw('');
    // Save the user message to cloud so it's part of memory going forward
    void saveChatMessage('user', query);
    void streamChatMessage([{ role: 'user', content: query }], {
      onText: (chunk) => {
        setChatRaw((r) => r + chunk);
        setChatThinking(false);
      },
      onDone: (_sources) => {
        setChatDone(true);
        setChatThinking(false);
        // Persist the assistant reply
        setChatRaw((r) => {
          const final = stripChatMarkers(r);
          void saveChatMessage('assistant', final, []);
          return r;
        });
      },
      onError: () => {
        setChatThinking(false);
        setChatDone(true);
      },
    });
  }, [step]);

  async function requestNotificationPermission() {
    if (typeof Notification === 'undefined') return;
    setAskingNotif(true);
    try {
      await Notification.requestPermission();
    } catch {
      // ignore
    }
    setAskingNotif(false);
  }

  return (
    <div className="screen">
      <div className="screen-content flex flex-1 flex-col">
        {step !== 'welcome' && (
          <header className="pt-3">
            <button
              type="button"
              onClick={goBack}
              aria-label="Back"
              className="-ml-2 flex h-9 w-9 items-center justify-center rounded-full text-ink-2 hover:text-ink"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M14 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </header>
        )}

        {step === 'welcome' && (
          <WelcomeStep onNext={goNext} />
        )}

        {step === 'why' && (
          <WhyStep
            selected={why}
            onPick={pickWhy}
            onSkip={goNext}
            onNext={goNext}
          />
        )}

        {step === 'capture' && (
          <CaptureStep
            recorder={recorder}
            captureMode={captureMode}
            setCaptureMode={setCaptureMode}
            textValue={textValue}
            setTextValue={setTextValue}
            handleVoiceStop={handleVoiceStop}
            handleTextSave={handleTextSave}
            captureText={captureText}
            savingCapture={savingCapture}
            waitingTranscript={waitingTranscript}
            onNext={goNext}
          />
        )}

        {step === 'memory' && (
          <MemoryStep
            chatRaw={chatRaw}
            chatThinking={chatThinking}
            chatDone={chatDone}
            onNext={goNext}
          />
        )}

        {step === 'done' && (
          <DoneStep
            onAskNotif={requestNotificationPermission}
            askingNotif={askingNotif}
            onComplete={goNext}
          />
        )}
      </div>
    </div>
  );
}

function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="mt-16 text-center">
        <h1 className="display text-[44px] leading-[1.05]">
          Niklaus<span aria-hidden className="text-accent">.</span>
        </h1>
        <p className="display mt-6 text-[22px] leading-snug text-ink-2">
          Your memory.
          <br />
          That talks back.
        </p>
      </div>

      <div className="mt-12 space-y-4">
        <Promise title="Yours, always." body="Export everything, anytime, in plain formats. No lock-in." />
        <Promise title="Private, by design." body="Encrypted. We don't sell, share, or train on your data." />
        <Promise title="Outlives you." body="Designed for inheritance from the first day." />
      </div>

      <div className="mt-auto pt-12 pb-8">
        <button
          type="button"
          onClick={onNext}
          className="w-full rounded-full bg-ink py-3.5 text-[14px] font-medium text-paper transition-opacity hover:opacity-90"
        >
          Begin
        </button>
      </div>
    </div>
  );
}

function Promise({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <p className="display text-[18px]">{title}</p>
      <p className="mt-0.5 text-sm text-ink-2">{body}</p>
    </div>
  );
}

function WhyStep({
  selected,
  onPick,
  onSkip,
  onNext,
}: {
  selected: WhyAnswer | null;
  onPick: (w: WhyAnswer) => void;
  onSkip: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="mt-6">
        <p className="eyebrow">A small question</p>
        <h2 className="display mt-2 text-[28px] leading-tight">
          Why are you here?
        </h2>
        <p className="mt-2 text-sm text-ink-3">
          We'll personalize a few things. Skip if you want.
        </p>
      </div>

      <div className="mt-8 flex flex-col gap-2">
        {WHY_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onPick(opt.value)}
            className="flex items-center justify-between rounded-2xl border px-4 py-3.5 text-left transition-all"
            style={{
              borderColor: selected === opt.value ? '#b56b1d' : 'rgba(26, 24, 21, 0.10)',
              background: selected === opt.value ? 'rgba(181, 107, 29, 0.08)' : '#fbf8f2',
            }}
          >
            <span className="text-[15px] text-ink">{opt.label}</span>
            {selected === opt.value && (
              <span
                aria-hidden
                className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-paper"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M5 12l5 5 9-9" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="mt-auto flex items-center gap-3 pt-12 pb-8">
        <button
          type="button"
          onClick={onSkip}
          className="text-sm text-ink-3 hover:text-ink-2"
        >
          Skip
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!selected}
          className="ml-auto rounded-full bg-ink px-6 py-3 text-[14px] font-medium text-paper transition-opacity disabled:opacity-40"
        >
          Continue →
        </button>
      </div>
    </div>
  );
}

interface CaptureStepProps {
  recorder: ReturnType<typeof useRecorder>;
  captureMode: 'voice' | 'text';
  setCaptureMode: (m: 'voice' | 'text') => void;
  textValue: string;
  setTextValue: (v: string) => void;
  handleVoiceStop: () => Promise<void>;
  handleTextSave: () => Promise<void>;
  captureText: string | null;
  savingCapture: boolean;
  waitingTranscript: boolean;
  onNext: () => void;
}

function CaptureStep({
  recorder,
  captureMode,
  setCaptureMode,
  textValue,
  setTextValue,
  handleVoiceStop,
  handleTextSave,
  captureText,
  savingCapture,
  waitingTranscript,
  onNext,
}: CaptureStepProps) {
  const captured = captureText !== null;

  return (
    <div className="flex flex-1 flex-col">
      <div className="mt-6">
        <p className="eyebrow">Step 1 of 3</p>
        <h2 className="display mt-2 text-[28px] leading-tight">
          Talk to Niklaus.
        </h2>
        <p className="mt-2 text-sm text-ink-2">
          Tell me something you want to remember. Anything — a thought, a
          feeling, something that happened today.
        </p>
      </div>

      {!captured && captureMode === 'voice' && (
        <div
          className="mt-8 flex w-full flex-col items-center gap-3 rounded-3xl border px-5 py-7 transition-all"
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
            disabled={savingCapture}
            className="flex w-full select-none flex-col items-center gap-3 disabled:opacity-50"
            style={{ touchAction: 'none' }}
          >
            <span
              className="flex h-16 w-16 items-center justify-center rounded-full transition-all"
              style={{
                background: recorder.isRecording ? '#b56b1d' : '#1a1815',
                transform: recorder.isRecording ? 'scale(1.08)' : 'scale(1)',
                boxShadow: recorder.isRecording ? '0 0 0 8px rgba(181, 107, 29, 0.12)' : 'none',
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
          {!recorder.isRecording && !savingCapture && (
            <button
              type="button"
              onClick={() => setCaptureMode('text')}
              className="text-xs text-ink-3 underline-offset-2 hover:underline"
            >
              or tap to type
            </button>
          )}
          {recorder.error && (
            <p className="mt-1 text-xs text-[#b94d2b]">{recorder.error}</p>
          )}
        </div>
      )}

      {!captured && captureMode === 'text' && (
        <div
          className="mt-8 flex w-full flex-col rounded-3xl border bg-paper-elev px-5 py-5"
          style={{ borderColor: 'rgba(26, 24, 21, 0.18)' }}
        >
          <textarea
            autoFocus
            value={textValue}
            onChange={(e) => setTextValue(e.target.value)}
            placeholder="What's on your mind?"
            rows={5}
            disabled={savingCapture}
            className="w-full resize-none bg-transparent text-[15px] leading-relaxed text-ink outline-none disabled:opacity-60"
          />
          <div className="mt-3 flex items-center justify-end gap-2 border-t border-line pt-3">
            <button
              type="button"
              onClick={() => setCaptureMode('voice')}
              disabled={savingCapture}
              className="rounded-full px-4 py-2 text-[13px] text-ink-2 disabled:opacity-50"
            >
              Back to voice
            </button>
            <button
              type="button"
              onClick={() => void handleTextSave()}
              disabled={!textValue.trim() || savingCapture}
              className="rounded-full bg-ink px-4 py-2 text-[13px] font-medium text-paper transition-opacity disabled:opacity-50"
            >
              {savingCapture ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {captured && (
        <div className="mt-8 rounded-2xl border border-line bg-paper-elev p-4">
          <p className="mono text-[10px] text-accent">Captured</p>
          <p className="mt-2 text-[15px] leading-relaxed text-ink">
            {captureText}
          </p>
        </div>
      )}

      {!captured && waitingTranscript && (
        <p className="mt-4 text-center text-xs italic text-ink-3">
          Transcribing your voice…
        </p>
      )}

      <div className="mt-auto pt-12 pb-8">
        <button
          type="button"
          onClick={onNext}
          disabled={!captured}
          className="w-full rounded-full bg-ink py-3.5 text-[14px] font-medium text-paper transition-opacity disabled:opacity-40"
        >
          Continue →
        </button>
      </div>
    </div>
  );
}

function MemoryStep({
  chatRaw,
  chatThinking,
  chatDone,
  onNext,
}: {
  chatRaw: string;
  chatThinking: boolean;
  chatDone: boolean;
  onNext: () => void;
}) {
  const display = stripChatMarkers(chatRaw);
  return (
    <div className="flex flex-1 flex-col">
      <div className="mt-6">
        <p className="eyebrow">Step 2 of 3</p>
        <h2 className="display mt-2 text-[28px] leading-tight">
          Ask Niklaus what you just said.
        </h2>
        <p className="mt-2 text-sm text-ink-2">
          This is how memory works. You tell. You ask. Niklaus answers from
          your own words.
        </p>
      </div>

      <div className="mt-8">
        <div className="ml-10 inline-block rounded-[20px] rounded-br-[4px] bg-ink px-4 py-3 text-[14.5px] leading-relaxed text-paper">
          What did I just say?
        </div>
      </div>

      <div className="mt-5">
        <p className="mono text-[10px] tracking-[0.14em] text-accent">Niklaus</p>
        {chatThinking && !display && (
          <div className="mt-2 flex items-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="onb-dot h-1.5 w-1.5 rounded-full bg-ink-3"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
            <style>
              {`@keyframes onbThink {
                0%, 80%, 100% { opacity: .3; transform: scale(.7); }
                40% { opacity: 1; transform: scale(1.1); }
              }
              .onb-dot {
                animation: onbThink 1.4s ease-in-out infinite;
              }`}
            </style>
          </div>
        )}
        {display && (
          <Markdown
            text={display}
            className="display mt-1.5 text-[15px] leading-relaxed"
          />
        )}
      </div>

      <div className="mt-auto pt-12 pb-8">
        <button
          type="button"
          onClick={onNext}
          disabled={!chatDone}
          className="w-full rounded-full bg-ink py-3.5 text-[14px] font-medium text-paper transition-opacity disabled:opacity-40"
        >
          Continue →
        </button>
      </div>
    </div>
  );
}

function DoneStep({
  onAskNotif,
  askingNotif,
  onComplete,
}: {
  onAskNotif: () => void;
  askingNotif: boolean;
  onComplete: () => void;
}) {
  const hasNotif = typeof Notification !== 'undefined';
  const denied = hasNotif && Notification.permission === 'denied';
  const granted = hasNotif && Notification.permission === 'granted';

  return (
    <div className="flex flex-1 flex-col">
      <div className="mt-12 text-center">
        <p className="eyebrow">Step 3 of 3</p>
        <h2 className="display mt-3 text-[32px] leading-tight">
          You're all set.
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
          Niklaus will be here when you want to talk.
        </p>
      </div>

      {hasNotif && !granted && !denied && (
        <div className="mt-12 rounded-2xl border border-line bg-paper-elev p-4 text-center">
          <p className="text-[14px] text-ink">
            We'll nudge you once a day. No streaks, no guilt.
          </p>
          <button
            type="button"
            onClick={onAskNotif}
            disabled={askingNotif}
            className="mt-3 rounded-full bg-ink px-5 py-2 text-[13px] font-medium text-paper transition-opacity disabled:opacity-50"
          >
            {askingNotif ? 'Asking…' : 'Allow notifications'}
          </button>
        </div>
      )}
      {granted && (
        <p className="mt-12 text-center text-xs text-ink-3">
          Notifications enabled. We'll be gentle.
        </p>
      )}

      <div className="mt-auto pt-12 pb-8">
        <button
          type="button"
          onClick={onComplete}
          className="w-full rounded-full bg-ink py-3.5 text-[14px] font-medium text-paper transition-opacity hover:opacity-90"
        >
          Start using Niklaus →
        </button>
      </div>
    </div>
  );
}
