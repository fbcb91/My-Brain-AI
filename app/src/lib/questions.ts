import { getWhy } from './onboarding';
import { supabase } from './supabase';

/**
 * Foundation pool for the Daily Question. Used as a fallback when
 * /api/daily-question can't generate a personalised question — for example
 * offline, on the first run when the user has no memories yet, or if the
 * Anthropic call fails. In normal operation Claude Haiku produces the
 * question of the day based on the user's memories and their stated
 * "why" from onboarding.
 *
 * Tone:
 * - never therapeutic, never cliché
 * - mix of light, sensory, reflective, prospective
 * - no religious / political / contentious topics
 * - second-person, casual
 */
export const FOUNDATION_QUESTIONS: string[] = [
  "What's something from your childhood that still makes you smile?",
  "Who is the most important person in your life right now, and why?",
  "What do you do when you're alone and happy?",
  'Where did you grow up, and what does that place still mean to you?',
  "What's a moment from this past week you don't want to forget?",
  "What's something you believed strongly five years ago that you don't believe now?",
  "What's the last thing that made you genuinely laugh?",
  "What's a small kindness someone showed you recently?",
  'What did today smell like?',
  "What's a song that always brings you back somewhere?",
  "Who in your life are you grateful for but haven't told?",
  "What's something you're avoiding, and why?",
  "What's a fear you've outgrown?",
  "What's something you'd want a future child of yours to know about you?",
  'What is one thing you do that makes you feel most like yourself?',
  "What's a question you keep asking yourself lately?",
  "What's something you noticed today that other people probably didn't?",
  "What's a place you want to return to, and what would you say to it?",
  'Who do you miss?',
  "What's a piece of advice you'd give your younger self?",
  "What's something that's been on your mind for days?",
  'What did you eat today that you actually enjoyed?',
  "What's a sound you find comforting?",
  "What's something you've changed your mind about recently?",
  "What's a story your family tells about you?",
  'What does your morning actually look like?',
  "What's something you're proud of that nobody knows about?",
  "What's the smallest thing that could make tomorrow better?",
  "What's a place you only ever go alone?",
  'Who do you feel most yourself around?',
  "What's something you want to say but haven't found the right moment for?",
  "What's a habit you're trying to keep?",
  "What's a habit you're trying to break?",
  'What does your laugh sound like?',
  "What's something you wish you could relive once more?",
  'Who taught you the most important thing you know?',
  'What did you think about while falling asleep last night?',
  "What's a small disappointment from this week?",
  "What's a small joy from this week?",
  'If today had a title, what would it be?',
];

const SKIP_PREFIX = 'niklaus_question_skipped_';

function todayDateKey(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

function dayIndex(d: Date = new Date()): number {
  // Days since the unix epoch in UTC. Stable for any timezone since we only
  // need a deterministic integer that increases by 1 each calendar day.
  return Math.floor(d.getTime() / 86_400_000);
}

/** Deterministic fallback question — used only when the API call to
 *  /api/daily-question fails or the user is offline. */
export function fallbackTodaysQuestion(d: Date = new Date()): string {
  const idx = dayIndex(d) % FOUNDATION_QUESTIONS.length;
  return FOUNDATION_QUESTIONS[idx];
}

/**
 * Fetches today's question. Hits /api/daily-question which generates a
 * personalised question via Claude Haiku and caches it for the day in
 * Postgres. Returns the deterministic fallback question if anything goes
 * wrong so the card never breaks.
 */
export async function fetchTodaysQuestion(
  userId: string | undefined,
  d: Date = new Date()
): Promise<string> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return fallbackTodaysQuestion(d);

    const why = userId ? getWhy(userId) : null;

    const res = await fetch('/api/daily-question', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        date: d.toISOString().slice(0, 10),
        why: why ?? undefined,
      }),
    });
    if (!res.ok) {
      console.error('[daily-question] fetch failed', res.status);
      return fallbackTodaysQuestion(d);
    }
    const data = (await res.json()) as { question?: string };
    if (!data.question) return fallbackTodaysQuestion(d);
    return data.question;
  } catch (e) {
    console.error('[daily-question] network error', e);
    return fallbackTodaysQuestion(d);
  }
}

/** Returns true if the user has already explicitly skipped today's question. */
export function isQuestionSkippedToday(d: Date = new Date()): boolean {
  if (typeof localStorage === 'undefined') return false;
  return localStorage.getItem(SKIP_PREFIX + todayDateKey(d)) === '1';
}

export function markQuestionSkippedToday(d: Date = new Date()): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(SKIP_PREFIX + todayDateKey(d), '1');
}

/** Returns true if any of the supplied captures already answers the
 * given question on the same calendar day. */
export function hasAnsweredToday(
  captures: { questionText?: string; createdAt: number }[],
  question: string,
  d: Date = new Date()
): boolean {
  const startOfDay = new Date(d);
  startOfDay.setHours(0, 0, 0, 0);
  const startMs = startOfDay.getTime();
  return captures.some(
    (c) => c.questionText === question && c.createdAt >= startMs
  );
}
