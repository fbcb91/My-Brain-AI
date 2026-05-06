import { useEffect, useState } from 'react';

export default function Waveform() {
  const [bars, setBars] = useState<number[]>(() =>
    Array.from({ length: 28 }, () => 0.3 + Math.random() * 0.7)
  );

  useEffect(() => {
    const id = setInterval(() => {
      setBars((prev) => prev.map(() => 0.2 + Math.random() * 0.8));
    }, 120);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex h-8 w-full items-center justify-center gap-[3px]">
      {bars.map((b, i) => (
        <span
          key={i}
          className="w-[3px] rounded-[2px] bg-accent transition-[height]"
          style={{ height: `${b * 100}%`, transitionDuration: '120ms' }}
        />
      ))}
    </div>
  );
}
