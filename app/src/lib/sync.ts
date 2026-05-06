import { listUnsynced, markSynced } from './db';
import { supabase } from './supabase';
import type { Capture } from './types';

const BUCKET = 'audio';

function extForMime(mime: string | undefined): string {
  if (!mime) return 'webm';
  if (mime.includes('webm')) return 'webm';
  if (mime.includes('mp4')) return 'm4a';
  if (mime.includes('aac')) return 'aac';
  if (mime.includes('mpeg')) return 'mp3';
  if (mime.includes('ogg')) return 'ogg';
  return 'webm';
}

interface SyncResult {
  ok: number;
  failed: number;
}

export async function uploadCapture(
  capture: Capture,
  userId: string
): Promise<void> {
  let audioPath: string | undefined = capture.audioPath;

  // 1) For voice captures, upload the blob to Storage first
  if (capture.kind === 'voice' && capture.audioBlob && !audioPath) {
    const ext = extForMime(capture.mimeType);
    audioPath = `${userId}/${capture.id}.${ext}`;
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(audioPath, capture.audioBlob, {
        contentType: capture.mimeType ?? 'audio/webm',
        upsert: false,
      });
    if (error) {
      // If the file already exists (idempotent retry), keep going. Otherwise re-throw.
      const message = error.message.toLowerCase();
      const isAlreadyExists =
        message.includes('already exists') || message.includes('duplicate');
      if (!isAlreadyExists) throw error;
    }
  }

  // 2) Insert (or upsert) the metadata row
  const { error: insertError } = await supabase.from('captures').upsert(
    {
      id: capture.id,
      user_id: userId,
      kind: capture.kind,
      created_at: new Date(capture.createdAt).toISOString(),
      duration_seconds: capture.duration ?? null,
      mime_type: capture.mimeType ?? null,
      audio_path: audioPath ?? null,
      text: capture.text ?? null,
      transcript: capture.transcript ?? null,
    },
    { onConflict: 'id' }
  );
  if (insertError) {
    // If we just uploaded a fresh file but the row insert failed, try to clean up.
    if (audioPath && !capture.audioPath) {
      await supabase.storage.from(BUCKET).remove([audioPath]).catch(() => {});
    }
    throw insertError;
  }

  await markSynced(capture.id, { audioPath, userId });
}

export async function syncAll(userId: string): Promise<SyncResult> {
  const pending = await listUnsynced();
  let ok = 0;
  let failed = 0;
  for (const c of pending) {
    try {
      await uploadCapture(c, userId);
      ok++;
    } catch (e) {
      console.error('[sync] failed for', c.id, e);
      failed++;
    }
  }
  return { ok, failed };
}
