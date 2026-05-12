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
const MAX_TOKENS = 400;

const SYSTEM_PROMPT = `You extract entities from personal writing for a memory app.

Given a single piece of personal writing (a transcribed voice note or a typed note), return three lists:

- people: proper names ("Marco"), or roles when no name is given ("mom", "boss", "wife"). Use the most identifying form. Translate roles to English ("la mamma" → "mom", "il mio capo" → "boss"). Skip generic refs like "people" or "everyone".
- places: actual place names ("Roma", "the office", "Sicilia"). Skip vague locations ("home", "out").
- themes: 1–2 word lowercase tags for what the writing is about ("work", "sleep", "anxiety", "running", "kids", "money").

Strict rules:
- Only entities clearly present in the text. No guessing, no inference.
- Maximum 8 entities total across all three lists.
- If nothing extractable, return empty arrays.

Output format: ONLY a JSON object, no commentary, no markdown, no preamble:
{"people":["Marco"],"places":["Roma"],"themes":["work","tired"]}`;

interface ExtractRequest {
  id?: string;
}

interface CaptureRow {
  id: string;
  user_id: string;
  kind: 'voice' | 'note';
  transcript: string | null;
  text: string | null;
  created_at: string;
  entities_extracted: boolean;
}

interface ExtractedEntities {
  people?: unknown;
  places?: unknown;
  themes?: unknown;
}

function asStringArray(v: unknown, max = 8): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const item of v) {
    if (typeof item !== 'string') continue;
    const trimmed = item.trim();
    if (!trimmed || trimmed.length > 60) continue;
    if (out.length >= max) break;
    out.push(trimmed);
  }
  return out;
}

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Missing auth header' }, 401);
  if (!env.ANTHROPIC_API_KEY) {
    return json({ error: 'ANTHROPIC_API_KEY is not configured.' }, 500);
  }

  let body: ExtractRequest;
  try {
    body = (await request.json()) as ExtractRequest;
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }
  const id = body.id?.trim();
  if (!id) return json({ error: 'Missing capture id' }, 400);

  const supabase = createClient(
    env.VITE_SUPABASE_URL,
    env.VITE_SUPABASE_ANON_KEY,
    {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    }
  );

  const { data: capture, error: fetchError } = await supabase
    .from('captures')
    .select('id, user_id, kind, transcript, text, created_at, entities_extracted')
    .eq('id', id)
    .single();

  if (fetchError || !capture) {
    return json({ error: 'Capture not found' }, 404);
  }

  const cap = capture as CaptureRow;
  if (cap.entities_extracted) {
    return json({ skipped: true, reason: 'already extracted' });
  }

  const content =
    cap.kind === 'voice' ? cap.transcript ?? '' : cap.text ?? '';
  const trimmed = content.trim();
  if (!trimmed) {
    // Nothing to extract — mark as done so we don't retry.
    await supabase
      .from('captures')
      .update({ entities_extracted: true })
      .eq('id', cap.id);
    return json({ extracted: { people: [], places: [], themes: [] } });
  }

  // Call Claude Haiku
  let parsed: ExtractedEntities | null = null;
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
        messages: [{ role: 'user', content: trimmed }],
      }),
    });

    if (!anthropicRes.ok) {
      const detail = await anthropicRes.text().catch(() => '');
      console.error('[extract] anthropic error', anthropicRes.status, detail);
      return json({ error: 'Extraction failed' }, 502);
    }

    interface AnthropicResponse {
      content?: { type?: string; text?: string }[];
    }
    const data = (await anthropicRes.json()) as AnthropicResponse;
    const raw = (data.content?.[0]?.text ?? '').trim();
    // Strip markdown fences if Claude added any
    const cleaned = raw.replace(/^```(?:json)?\s*/, '').replace(/```\s*$/, '').trim();
    try {
      parsed = JSON.parse(cleaned) as ExtractedEntities;
    } catch (e) {
      console.error('[extract] JSON parse failed', cleaned, e);
      return json({ error: 'Bad model output' }, 502);
    }
  } catch (e) {
    console.error('[extract] anthropic request failed', e);
    return json({ error: 'Extraction request failed' }, 502);
  }

  const people = asStringArray(parsed?.people);
  const places = asStringArray(parsed?.places);
  const themes = asStringArray(parsed?.themes);
  const flat: { name: string; kind: 'person' | 'place' | 'theme' }[] = [
    ...people.map((n) => ({ name: n, kind: 'person' as const })),
    ...places.map((n) => ({ name: n, kind: 'place' as const })),
    ...themes.map((n) => ({ name: n.toLowerCase(), kind: 'theme' as const })),
  ];

  // Upsert each entity (find-or-create), then link to capture
  for (const e of flat) {
    let entityId: string;
    const { data: existing } = await supabase
      .from('entities')
      .select('id, mentions_count')
      .eq('user_id', cap.user_id)
      .eq('name', e.name)
      .eq('kind', e.kind)
      .maybeSingle();

    if (existing) {
      entityId = existing.id as string;
      await supabase
        .from('entities')
        .update({
          mentions_count: (existing.mentions_count as number) + 1,
          last_mention_at: cap.created_at,
          updated_at: new Date().toISOString(),
        })
        .eq('id', entityId);
    } else {
      entityId = newId();
      const { error: insertErr } = await supabase.from('entities').insert({
        id: entityId,
        user_id: cap.user_id,
        name: e.name,
        kind: e.kind,
        mentions_count: 1,
        first_mention_at: cap.created_at,
        last_mention_at: cap.created_at,
      });
      if (insertErr) {
        // Likely a parallel insert lost the race against the unique constraint
        const { data: race } = await supabase
          .from('entities')
          .select('id, mentions_count')
          .eq('user_id', cap.user_id)
          .eq('name', e.name)
          .eq('kind', e.kind)
          .maybeSingle();
        if (race) {
          entityId = race.id as string;
          await supabase
            .from('entities')
            .update({
              mentions_count: (race.mentions_count as number) + 1,
              last_mention_at: cap.created_at,
              updated_at: new Date().toISOString(),
            })
            .eq('id', entityId);
        } else {
          console.error('[extract] entity insert failed', insertErr);
          continue;
        }
      }
    }

    await supabase.from('capture_entities').upsert(
      {
        capture_id: cap.id,
        entity_id: entityId,
        user_id: cap.user_id,
      },
      { ignoreDuplicates: true }
    );
  }

  // Mark the capture as processed so we don't retry it
  await supabase
    .from('captures')
    .update({ entities_extracted: true })
    .eq('id', cap.id);

  return json({ extracted: { people, places, themes } });
};

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
