import { createClient } from '@supabase/supabase-js';

interface Env {
  VITE_SUPABASE_URL: string;
  VITE_SUPABASE_ANON_KEY: string;
  ANTHROPIC_API_KEY: string;
}

type PagesFunction<E> = (context: {
  request: Request;
  env: E;
}) => Promise<Response> | Response;

const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 400;

const SYSTEM_PROMPT = `You are Niklaus, the user's private memory. You're writing the user a short Weekly Mirror — a small reflection of what their past week looked like in their own writing.

Tone: sober, observational, second person. Like a thoughtful friend noting things back. Never preachy, never therapy, never coaching. Don't give advice unless they've explicitly asked. Don't praise or chide. No scores, no metrics-of-virtue.

Structure: 2–4 short paragraphs. Total under 150 words.

Content guidance:
- Open with a concrete observation grounded in the data (volume, time of day, recurring topic).
- Note 1–2 patterns or recurring people / themes if any.
- Mention one surprise — something new this week, or unusually frequent, or unusually absent.
- Optionally end with a small reflective sentence (not a question, not advice).

Strict rules:
- Use ONLY the user's actual data. No invention, no inferred emotions you can't back up from the text.
- If data is thin (one or two captures), keep the mirror short and honest about that.
- Match the language they use most in the captures (Italian or English most likely).
- Weave numbers into prose ("five times this week", not "5x").
- Don't use markdown headings or bullets. Plain paragraphs.

Output: just the mirror text. No quotes around it, no preamble, no closing line, no commentary.`;

interface CaptureRow {
  id: string;
  kind: 'voice' | 'note';
  created_at: string;
  transcript: string | null;
  text: string | null;
  question_text: string | null;
  is_private: boolean | null;
}

interface DailyQuestionRow {
  question: string;
}

function getLastCompletedWeekStart(d: Date = new Date()): string {
  // ISO week: Monday is the first day. Use UTC to keep things deterministic.
  const now = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  );
  const day = now.getUTCDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const daysFromMonday = day === 0 ? 6 : day - 1;
  // This week's Monday (UTC)
  const thisMonday = new Date(now);
  thisMonday.setUTCDate(now.getUTCDate() - daysFromMonday);
  // Last week's Monday
  const prevMonday = new Date(thisMonday);
  prevMonday.setUTCDate(thisMonday.getUTCDate() - 7);
  return prevMonday.toISOString().slice(0, 10);
}

function isoDatePlusDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Missing auth header' }, 401);
  if (!env.ANTHROPIC_API_KEY) {
    return json({ error: 'ANTHROPIC_API_KEY is not configured.' }, 500);
  }

  const supabase = createClient(
    env.VITE_SUPABASE_URL,
    env.VITE_SUPABASE_ANON_KEY,
    {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    }
  );

  const weekStart = getLastCompletedWeekStart();
  const weekEnd = isoDatePlusDays(weekStart, 7); // exclusive upper bound

  // 1. Return cached mirror if we already have one for this week
  const { data: cached } = await supabase
    .from('weekly_mirrors')
    .select('week_start, content, created_at')
    .eq('week_start', weekStart)
    .maybeSingle();
  if (cached?.content) {
    return json({
      mirror: {
        week_start: cached.week_start,
        content: cached.content,
        created_at: cached.created_at,
      },
      source: 'cached',
    });
  }

  // 2. Gather captures from the target week
  const { data: capRows } = await supabase
    .from('captures')
    .select(
      'id, kind, created_at, transcript, text, question_text, is_private'
    )
    .gte('created_at', `${weekStart}T00:00:00Z`)
    .lt('created_at', `${weekEnd}T00:00:00Z`)
    .eq('is_private', false)
    .order('created_at', { ascending: true });
  const captures = (capRows as CaptureRow[] | null) ?? [];

  if (captures.length === 0) {
    return json({ mirror: null, reason: 'no captures in the past week' });
  }

  // 3. Gather entities mentioned by those captures (top by mentions count)
  interface CapEntRow {
    entity: {
      name: string;
      kind: 'person' | 'place' | 'theme';
    } | { name: string; kind: 'person' | 'place' | 'theme' }[] | null;
  }
  const captureIds = captures.map((c) => c.id);
  const { data: entRows } = await supabase
    .from('capture_entities')
    .select('entity:entities (name, kind)')
    .in('capture_id', captureIds);
  const entityCounts = new Map<string, { name: string; kind: string; count: number }>();
  for (const row of ((entRows as CapEntRow[] | null) ?? [])) {
    const ent = Array.isArray(row.entity) ? row.entity[0] : row.entity;
    if (!ent) continue;
    const key = `${ent.kind}::${ent.name}`;
    const prev = entityCounts.get(key);
    if (prev) {
      prev.count++;
    } else {
      entityCounts.set(key, { name: ent.name, kind: ent.kind, count: 1 });
    }
  }
  const topEntities = Array.from(entityCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // 4. Gather daily questions answered during the week, for context
  const answeredQuestions = Array.from(
    new Set(
      captures
        .map((c) => c.question_text)
        .filter((q): q is string => Boolean(q && q.trim()))
    )
  );

  // 5. Build the user prompt for Claude
  const capturesText = captures
    .map((c) => {
      const content = c.kind === 'voice' ? c.transcript : c.text;
      if (!content || !content.trim()) return null;
      const day = new Date(c.created_at).toLocaleDateString('en-US', {
        weekday: 'long',
      });
      const hour = new Date(c.created_at).toISOString().slice(11, 16);
      const prefix = c.question_text
        ? `${day} ${hour} (in answer to "${c.question_text}")`
        : `${day} ${hour}`;
      return `${prefix}: ${content.trim()}`;
    })
    .filter((s): s is string => s !== null)
    .join('\n\n');

  const entitiesText = topEntities.length
    ? topEntities
        .map((e) => `- ${e.name} (${e.kind}, ${e.count} ${e.count === 1 ? 'mention' : 'mentions'})`)
        .join('\n')
    : 'No notable entities this week.';

  const questionsText = answeredQuestions.length
    ? answeredQuestions.map((q) => `- ${q}`).join('\n')
    : 'No daily questions answered this week.';

  const userPrompt = [
    `Week being summarised: ${weekStart} to ${isoDatePlusDays(weekStart, 6)} (Mon–Sun).`,
    `Captures (${captures.length}):\n${capturesText || '(empty)'}`,
    `Top entities:\n${entitiesText}`,
    `Daily questions answered:\n${questionsText}`,
    'Write the Weekly Mirror now.',
  ].join('\n\n');

  // 6. Call Claude
  let content = '';
  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });
    if (!anthropicRes.ok) {
      const detail = await anthropicRes.text().catch(() => '');
      console.error('[weekly-mirror] anthropic error', anthropicRes.status, detail);
      return json({ error: 'Mirror generation failed' }, 502);
    }
    interface AnthropicResponse {
      content?: { type?: string; text?: string }[];
    }
    const data = (await anthropicRes.json()) as AnthropicResponse;
    content = (data.content?.[0]?.text ?? '').trim();
  } catch (e) {
    console.error('[weekly-mirror] anthropic request failed', e);
    return json({ error: 'Mirror request failed' }, 502);
  }

  if (!content || content.length < 30) {
    return json({ error: 'Mirror generation returned empty content' }, 502);
  }

  // 7. Persist
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return json({ error: 'Not signed in' }, 401);

  const newId =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const { error: insertError } = await supabase.from('weekly_mirrors').insert({
    id: newId,
    user_id: user.id,
    week_start: weekStart,
    content,
  });

  // If a parallel request beat us to it, return the racing row instead
  if (insertError) {
    const { data: race } = await supabase
      .from('weekly_mirrors')
      .select('week_start, content, created_at')
      .eq('week_start', weekStart)
      .maybeSingle();
    if (race?.content) {
      return json({
        mirror: {
          week_start: race.week_start,
          content: race.content,
          created_at: race.created_at,
        },
        source: 'cached',
      });
    }
    console.error('[weekly-mirror] insert failed', insertError);
    return json({ error: 'Could not save mirror', detail: insertError.message }, 500);
  }

  return json({
    mirror: {
      week_start: weekStart,
      content,
      created_at: new Date().toISOString(),
    },
    source: 'generated',
  });
};

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
