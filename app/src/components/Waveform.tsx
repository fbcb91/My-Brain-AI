import { useEffect, useRef, useState } from 'react';

interface WaveformProps {
  /** Live MediaStream to read amplitudes from. When omitted the bars
   *  fall back to a gentle randomised animation (used as a placeholder
   *  before the stream is ready). */
  stream?: MediaStream | null;
  bars?: number;
}

const DEFAULT_BARS = 28;

export default function Waveform({ stream, bars = DEFAULT_BARS }: WaveformProps) {
  const [levels, setLevels] = useState<number[]>(() =>
    Array.from({ length: bars }, () => 0.25)
  );
  const rafRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  useEffect(() => {
    if (!stream) {
      // Fallback: gentle random animation, used briefly before the
      // permission prompt resolves and the stream becomes available.
      const id = window.setInterval(() => {
        setLevels(
          Array.from({ length: bars }, () => 0.2 + Math.random() * 0.35)
        );
      }, 140);
      return () => window.clearInterval(id);
    }

    type AudioCtxConstructor = typeof AudioContext;
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: AudioCtxConstructor })
        .webkitAudioContext;
    if (!Ctor) return;
    const audioCtx = new Ctor();
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 64;
    analyser.smoothingTimeConstant = 0.7;
    source.connect(analyser);

    audioCtxRef.current = audioCtx;
    analyserRef.current = analyser;

    const buffer = new Uint8Array(analyser.frequencyBinCount);

    const tick = () => {
      analyser.getByteFrequencyData(buffer);
      const next: number[] = new Array(bars);
      const step = buffer.length / bars;
      for (let i = 0; i < bars; i++) {
        const idx = Math.floor(i * step);
        // Bias toward a visible minimum so the bars don't fully collapse on silence
        next[i] = Math.max(buffer[idx] / 255, 0.06);
      }
      setLevels(next);
      rafRef.current = window.requestAnimationFrame(tick);
    };
    rafRef.current = window.requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      try {
        source.disconnect();
        analyser.disconnect();
      } catch {
        // already disconnected
      }
      void audioCtx.close();
      audioCtxRef.current = null;
      analyserRef.current = null;
    };
  }, [stream, bars]);

  return (
    <div className="flex h-8 w-full items-center justify-center gap-[3px]">
      {levels.map((level, i) => (
        <span
          key={i}
          className="w-[3px] rounded-[2px] bg-accent"
          style={{
            height: `${Math.max(level * 100, 6)}%`,
            transition: 'height 60ms linear',
          }}
        />
      ))}
    </div>
  );
}
