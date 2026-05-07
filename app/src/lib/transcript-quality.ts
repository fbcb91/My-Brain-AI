/**
 * Whisper (and most ASR models) tend to hallucinate common short phrases
 * when fed silent or near-silent audio: "Thank you.", "you", "Bye.",
 * stray subtitle artifacts like "[Music]", and Chinese characters
 * (e.g. "找找找") inherited from the YouTube subtitle training data.
 *
 * We use this both server-side (to avoid storing the bogus transcript at
 * all — we save the empty string instead so the row is "transcribed but
 * silent" and we don't retry forever) and client-side (to hide legacy
 * bad transcripts that were saved before this filter existed).
 */

const KNOWN_HALLUCINATIONS = new Set<string>([
  'you',
  'you?',
  'you.',
  'thank you',
  'thank you.',
  'thanks',
  'thanks.',
  'thanks!',
  'thanks for watching',
  'thanks for watching.',
  'thanks for watching!',
  'bye',
  'bye.',
  'bye!',
  'goodbye',
  'goodbye.',
  'okay',
  'ok',
  'k.',
  'yes',
  'yes.',
  'no',
  'no.',
  '...',
  '. . .',
  'mm',
  'mm.',
  'mhm',
  'uh',
  'um',
]);

export function isLikelyHallucination(transcript: string | undefined | null): boolean {
  if (!transcript) return false;
  const trimmed = transcript.trim();
  if (!trimmed) return false;
  // Anything below 4 characters is hardly a real journal entry
  if (trimmed.length < 4) return true;
  const lower = trimmed.toLowerCase();
  if (KNOWN_HALLUCINATIONS.has(lower)) return true;
  // Subtitle-style artifacts: "[Music]", "(applause)", "♪ ♪"
  if (/^\[.+\]$/.test(trimmed)) return true;
  if (/^\(.+\)$/.test(trimmed)) return true;
  if (/^[♪\s]+$/.test(trimmed)) return true;
  // Ideograph-only tracks (Chinese hallucinations) — heuristic: if a track
  // is all CJK and the user's app language is English, it's likely bogus.
  // Mark as hallucination so we hide it. Real Italian / English captures
  // never land in this branch.
  const cjkOnly = /^[　-鿿\s]+$/.test(trimmed);
  if (cjkOnly) return true;
  return false;
}
