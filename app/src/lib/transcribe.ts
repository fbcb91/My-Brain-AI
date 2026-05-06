import { listCaptures, saveCapture } from './db';
import { supabase } from './supabase';

interface TranscribeResponse {
  transcript?: string;
  cached?: boolean;
  error?: string;
}

export async function transcribeCapture(
  captureId: string
): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return null;

  let res: Response;
  try {
    res = await fetch('/api/transcribe', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ id: captureId }),
    });
  } catch (e) {
    console.error('[transcribe] network error', e);
    return null;
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    console.error('[transcribe] failed', res.status, detail);
    return null;
  }

  const data = (await res.json()) as TranscribeResponse;
  const transcript = data.transcript ?? '';

  // Update local cache with the transcript (even when empty, so we don't retry
  // forever on silent audio).
  const all = await listCaptures();
  const local = all.find((c) => c.id === captureId);
  if (local) {
    await saveCapture({ ...local, transcript });
  }

  return transcript;
}

interface TranscribeBatchResult {
  ok: number;
  failed: number;
}

/**
 * Transcribes any synced voice capture that doesn't yet have a transcript at
 * all. Runs sequentially to be gentle on the Workers AI quota and to keep
 * the network usage predictable on slow connections.
 */
export async function transcribePending(): Promise<TranscribeBatchResult> {
  const all = await listCaptures();
  const pending = all.filter(
    (c) =>
      c.kind === 'voice' &&
      Boolean(c.audioPath) &&
      Boolean(c.syncedAt) &&
      typeof c.transcript !== 'string'
  );
  let ok = 0;
  let failed = 0;
  for (const c of pending) {
    const result = await transcribeCapture(c.id);
    if (result !== null) ok++;
    else failed++;
  }
  return { ok, failed };
}
