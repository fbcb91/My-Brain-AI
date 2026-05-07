import { createClient } from '@supabase/supabase-js';

interface AiBinding {
  run(
    model: string,
    input: { audio: number[] }
  ): Promise<{ text?: string; vtt?: string; word_count?: number }>;
}

interface Env {
  AI: AiBinding;
  VITE_SUPABASE_URL: string;
  VITE_SUPABASE_ANON_KEY: string;
}

type PagesFunction<E> = (context: {
  request: Request;
  env: E;
}) => Promise<Response> | Response;

const WHISPER_MODEL = '@cf/openai/whisper';

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

function isLikelyHallucination(transcript: string): boolean {
  const trimmed = transcript.trim();
  if (!trimmed) return false;
  if (trimmed.length < 4) return true;
  const lower = trimmed.toLowerCase();
  if (KNOWN_HALLUCINATIONS.has(lower)) return true;
  if (/^\[.+\]$/.test(trimmed)) return true;
  if (/^\(.+\)$/.test(trimmed)) return true;
  if (/^[♪\s]+$/.test(trimmed)) return true;
  if (/^[　-鿿\s]+$/.test(trimmed)) return true;
  return false;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Missing auth header' }, 401);

  if (!env.AI || typeof env.AI.run !== 'function') {
    return json(
      {
        error:
          'Workers AI binding is missing. Add a binding named "AI" (type: Workers AI) to the Pages project and redeploy.',
      },
      500
    );
  }

  let body: { id?: string };
  try {
    body = (await request.json()) as { id?: string };
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  const captureId = body.id?.trim();
  if (!captureId) return json({ error: 'Missing capture id' }, 400);

  // Use the user's JWT so Postgres RLS still applies — they can only read /
  // update captures they own. If they pass someone else's id we get 0 rows.
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
    .select('id, audio_path, transcript, kind')
    .eq('id', captureId)
    .single();

  if (fetchError || !capture) {
    return json({ error: 'Capture not found' }, 404);
  }
  if (capture.kind !== 'voice') {
    return json({ error: 'Not a voice capture' }, 400);
  }
  if (typeof capture.transcript === 'string') {
    // Already transcribed (possibly to '' for silent audio). Don't redo.
    return json({ transcript: capture.transcript, cached: true });
  }
  if (!capture.audio_path) {
    return json({ error: 'No audio path for this capture' }, 400);
  }

  const { data: blob, error: downloadError } = await supabase.storage
    .from('audio')
    .download(capture.audio_path);

  if (downloadError || !blob) {
    console.error('[transcribe] download failed', downloadError);
    return json({ error: 'Could not fetch audio' }, 500);
  }

  let transcript = '';
  try {
    const buffer = await blob.arrayBuffer();
    const audioBytes = Array.from(new Uint8Array(buffer));
    const result = await env.AI.run(WHISPER_MODEL, { audio: audioBytes });
    transcript = (result.text ?? '').trim();
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('[transcribe] AI call failed', message, e);
    return json(
      {
        error: 'Transcription failed',
        detail: message,
        model: WHISPER_MODEL,
      },
      500
    );
  }

  // Drop common Whisper hallucinations on silent / near-silent audio.
  // We still mark the row as "transcribed" (empty string, not null) so we
  // don't retry forever.
  if (isLikelyHallucination(transcript)) {
    console.log(
      '[transcribe] dropping likely hallucination',
      JSON.stringify(transcript)
    );
    transcript = '';
  }

  const { error: updateError } = await supabase
    .from('captures')
    .update({ transcript })
    .eq('id', captureId);

  if (updateError) {
    console.error('[transcribe] update failed', updateError);
    // Don't fail the whole request — still return transcript so the client
    // can update its local cache.
  }

  return json({ transcript });
};

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
