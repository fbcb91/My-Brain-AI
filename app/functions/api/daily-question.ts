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

const MODEL = 'claude-haiku-4-5-20251001';
const MAX_TOKENS = 80;

const SYSTEM_PROMPT = `You design a single daily question for the user of Niklaus, a private memory app.

Tone: a gentle invitation. Like a thoughtful friend asking out of curiosity, never an interrogation, never a therapist. Second-person ("you"). 8–15 words. Avoid yes/no, compound questions, leading phrasing ("don't you think…"), and any "should/shouldn't".

Goal: build a richer picture of who the user is over time.
- If they have many memories about a topic, ask about a related-but-unexplored facet.
- If they have very few memories, ask a foundation question (origins, important people, daily rhythm).
- Don't repeat themes from questions they've recently answered.
- Match the language they mostly use (Italian or English).
- Keep it abstract enough that they can interpret it freely — don't name specific people, places, or events from their memories inside the question itself.

Output: ONLY the question. No quotes, no commentary, no leading or trailing text. One line, ending in a question mark.`;

interface RequestBody {
  date?: string; // YYYY-MM-DD; defaults to server UTC date
  why?: string;
}

const WHY_TO_PROMPT: Record<string, string> = {
  myself: 'For myself, in 30 years.',
  children: 'For my children.',
  'loved-one': 'For someone I love.',
  curious: "I'm just curious.",
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Missing auth header' }, 401);
  if (!env.ANTHROPIC_API_KEY) {
    return json(
      {
        error:
          'ANTHROPIC_API_KEY is not configured on the Pages project.',
      },
      500
    );
  }

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    body = {};
  }

  const today = body.date && /^\d{4}-\d{2}-\d{2}$/.test(body.date)
    ? body.date
    : new Date().toISOString().slice(0, 10);

  const supabase = createClient(
    env.VITE_SUPABASE_URL,
    env.VITE_SUPABASE_ANON_KEY,
    {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    }
  );

  // 1. Return cached question if we already generated one for today
  const { data: cached } = await supabase
    .from('daily_questions')
    .select('question')
    .eq('date', today)
    .maybeSingle();
  if (cached?.question) {
    return json({ question: cached.question, source: 'cached' });
  }

  // 2. Gather context — recent memories and recently-asked questions
  interface CapRow {
    kind: 'voice' | 'note';
    transcript: string | null;
    text: string | null;
    question_text: string | null;
    created_at: string;
  }
  const { data: capRows } = await supabase
    .from('captures')
    .select('kind, transcript, text, question_text, created_at')
    .eq('is_private', false)
    .order('created_at', { ascending: false })
    .limit(30);
  const caps = (capRows as CapRow[] | null) ?? [];

  const memoriesText = caps
    .map((c) => {
      const content = c.kind === 'voice' ? c.transcript : c.text;
      if (!content || !content.trim()) return null;
      const date = new Date(c.created_at).toISOString().slice(0, 10);
      const prefix = c.question_text
        ? `${date} (answer to "${c.question_text}")`
        : date;
      return `${prefix}: ${content.trim()}`;
    })
    .filter((s): s is string => s !== null)
    .join('\n');

  // Pull recently asked daily questions (last 14 days) to avoid repetition.
  const fourteenDaysAgo = new Date(Date.now() - 14 * 86_400_000)
    .toISOString()
    .slice(0, 10);
  const { data: pastQuestions } = await supabase
    .from('daily_questions')
    .select('question')
    .gte('date', fourteenDaysAgo)
    .order('date', { ascending: false })
    .limit(14);
  const recentQuestionsText = ((pastQuestions ?? []) as { question: string }[])
    .map((r) => `- ${r.question}`)
    .join('\n');

  // 3. Build the user prompt
  const whyLine = body.why && WHY_TO_PROMPT[body.why]
    ? `User's stated reason for using Niklaus: ${WHY_TO_PROMPT[body.why]}`
    : 'User has not declared why they use Niklaus.';

  const userPrompt = [
    whyLine,
    memoriesText
      ? `Recent memories (newest first):\n${memoriesText}`
      : 'The user has no memories yet. Ask a foundation question that helps them start.',
    recentQuestionsText
      ? `Recently asked daily questions (avoid repeating these):\n${recentQuestionsText}`
      : null,
    "Generate today's question now. Output the question only.",
  ]
    .filter((s): s is string => Boolean(s))
    .join('\n\n');

  // 4. Call Claude Haiku
  let generated: string | null = null;
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
    if (anthropicRes.ok) {
      interface AnthropicResponse {
        content?: { type?: string; text?: string }[];
      }
      const data = (await anthropicRes.json()) as AnthropicResponse;
      const raw = (data.content?.[0]?.text ?? '').trim();
      // Strip surrounding quotes if Claude added them
      generated = raw.replace(/^["']|["']$/g, '').trim();
      // Reject suspicious outputs (multi-line, too long, etc.)
      if (
        generated.length < 6 ||
        generated.length > 240 ||
        generated.split('\n').length > 1
      ) {
        generated = null;
      }
    } else {
      const detail = await anthropicRes.text().catch(() => '');
      console.error('[daily-question] Anthropic error', anthropicRes.status, detail);
    }
  } catch (e) {
    console.error('[daily-question] Anthropic request failed', e);
  }

  if (!generated) {
    return json(
      {
        error: 'Question generation failed',
      },
      502
    );
  }

  // 5. Persist for the day — best-effort
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { error: insertError } = await supabase
      .from('daily_questions')
      .insert({
        user_id: user.id,
        date: today,
        question: generated,
      });
    if (insertError) {
      // If a parallel request beat us to the insert, fetch and return that.
      const { data: race } = await supabase
        .from('daily_questions')
        .select('question')
        .eq('date', today)
        .maybeSingle();
      if (race?.question) {
        return json({ question: race.question, source: 'cached' });
      }
      console.error('[daily-question] insert failed', insertError);
    }
  }

  return json({ question: generated, source: 'generated' });
};

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
