import { useEffect, useRef } from 'react';

interface CodeInputProps {
  value: string;
  onChange: (val: string) => void;
  length?: number;
  autoFocus?: boolean;
}

/**
 * iOS-style OTP input: a single accessible input with `one-time-code`
 * autocomplete (so iOS Mail can autofill the 6 digits) rendered as
 * `length` visible boxes on top.
 */
export default function CodeInput({
  value,
  onChange,
  length = 6,
  autoFocus = false,
}: CodeInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  const digits: string[] = [];
  for (let i = 0; i < length; i++) {
    digits.push(value[i] ?? '');
  }
  const activeIndex = Math.min(value.length, length - 1);

  return (
    <div
      className="relative"
      onClick={() => inputRef.current?.focus()}
      role="presentation"
    >
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        pattern="\d*"
        maxLength={length}
        autoComplete="one-time-code"
        autoCorrect="off"
        spellCheck={false}
        value={value}
        onChange={(e) =>
          onChange(e.target.value.replace(/\D/g, '').slice(0, length))
        }
        aria-label="Verification code"
        className="absolute inset-0 z-10 h-full w-full cursor-text bg-transparent text-transparent caret-transparent outline-none"
        style={{ WebkitTapHighlightColor: 'transparent' }}
      />
      <div className="pointer-events-none flex justify-between gap-2">
        {digits.map((d, i) => {
          const focused = activeIndex === i;
          const filled = Boolean(d);
          return (
            <div
              key={i}
              className="flex aspect-square w-full max-w-[56px] items-center justify-center rounded-xl border bg-paper-elev text-[26px] font-medium text-ink transition-colors"
              style={{
                borderColor: focused
                  ? '#b56b1d'
                  : filled
                    ? 'rgba(26, 24, 21, 0.18)'
                    : 'rgba(26, 24, 21, 0.10)',
              }}
            >
              {d || ''}
            </div>
          );
        })}
      </div>
    </div>
  );
}
