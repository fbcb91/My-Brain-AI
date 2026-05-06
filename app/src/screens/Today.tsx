import { useEffect, useState } from 'react';
import Waveform from '../components/Waveform';

interface CaptureItem {
  time: string;
  kind: 'voice' | 'note';
  label: string;
}

const fmt = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

const today = new Date().toLocaleDateString('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
});

export default function Today() {
  const [recording, setRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const [items, setItems] = useState<CaptureItem[]>([
    { time: '09:14', kind: 'voice', label: 'morning thoughts on the new role · 2:14' },
    { time: '12:30', kind: 'note', label: '"remember to ask Marco about Friday"' },
    { time: '18:42', kind: 'voice', label: 'after the call with mom · 0:45' },
  ]);

  useEffect(() => {
    if (!recording) return;
    const start = Date.now();
    const id = setInterval(
      () => setRecordTime(Math.floor((Date.now() - start) / 1000)),
      100
    );
    return () => clearInterval(id);
  }, [recording]);

  function startRec() {
    setRecording(true);
    setRecordTime(0);
  }
  function stopRec() {
    if (recordTime >= 1) {
      const now = new Date();
      const t = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      setItems([{ time: t, kind: 'voice', label: `just now · ${fmt(recordTime)}` }, ...items]);
    }
    setRecording(false);
  }

  return (
    <div className="screen">
      <div className="screen-content">
        <header className="pt-4">
          <p className="eyebrow">{today}</p>
          <h1 className="display mt-1.5 text-[34px] leading-[1.05]">Today</h1>
        </header>

        <button
          type="button"
          onMouseDown={startRec}
          onMouseUp={stopRec}
          onMouseLeave={() => recording && stopRec()}
          onTouchStart={(e) => {
            e.preventDefault();
            startRec();
          }}
          onTouchEnd={stopRec}
          className="mt-6 flex w-full select-none flex-col items-center gap-3 rounded-3xl border px-5 py-7 transition-all"
          style={{
            background: recording ? 'rgba(181, 107, 29, 0.12)' : '#fbf8f2',
            borderColor: recording ? '#b56b1d' : 'rgba(26, 24, 21, 0.10)',
          }}
        >
          <span
            className="flex h-16 w-16 items-center justify-center rounded-full transition-all"
            style={{
              background: recording ? '#b56b1d' : '#1a1815',
              transform: recording ? 'scale(1.08)' : 'scale(1)',
              boxShadow: recording ? '0 0 0 8px rgba(181, 107, 29, 0.12)' : 'none',
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
          {recording ? (
            <>
              <Waveform />
              <span className="mono text-[13px] tracking-[0.05em] text-accent">
                ● Recording {fmt(recordTime)}
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

        <section className="mt-7">
          <div className="mb-2 flex items-baseline justify-between">
            <span className="eyebrow">Today</span>
            <span className="text-xs text-ink-3">{items.length} captures</span>
          </div>
          <ul className="flex flex-col">
            {items.map((item, i) => (
              <li
                key={`${item.time}-${i}`}
                className={`grid items-center gap-2.5 border-line py-3.5 ${i === 0 ? 'border-t' : ''} border-b`}
                style={{ gridTemplateColumns: '46px auto 1fr' }}
              >
                <span className="mono text-[11px] text-ink-3">{item.time}</span>
                <span
                  className="flex h-[22px] w-[22px] items-center justify-center rounded-full text-[10px] text-accent"
                  style={{
                    background:
                      item.kind === 'voice' ? 'rgba(181, 107, 29, 0.12)' : '#ece6d8',
                    fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                  }}
                >
                  {item.kind === 'voice' ? '◉' : '✎'}
                </span>
                <span className="truncate text-[13.5px] text-ink-2">{item.label}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
