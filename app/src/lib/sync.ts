import { listUnsynced, listCaptures, markSynced, saveCapture, deleteCapture as deleteCaptureLocal } from './db';
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
      const message = error.message.toLowerCase();
      const isAlreadyExists =
        message.includes('already exists') || message.includes('duplicate');
      if (!isAlreadyExists) throw error;
    }
  }

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
      question_text: capture.questionText ?? null,
      is_private: capture.isPrivate ?? false,
    },
    { onConflict: 'id' }
  );
  if (insertError) {
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

interface ServerRow {
  id: string;
  user_id: string;
  kind: 'voice' | 'note';
  created_at: string;
  duration_seconds: number | null;
  mime_type: string | null;
  audio_path: string | null;
  text: string | null;
  transcript: string | null;
  question_text: string | null;
  is_private: boolean | null;
  entities_extracted: boolean | null;
}

function rowToCapture(row: ServerRow): Capture {
  return {
    id: row.id,
    userId: row.user_id,
    createdAt: new Date(row.created_at).getTime(),
    kind: row.kind,
    duration: row.duration_seconds ?? undefined,
    mimeType: row.mime_type ?? undefined,
    audioPath: row.audio_path ?? undefined,
    text: row.text ?? undefined,
    transcript: row.transcript ?? undefined,
    questionText: row.question_text ?? undefined,
    isPrivate: row.is_private ?? false,
    entitiesExtracted: row.entities_extracted ?? false,
    syncedAt: Date.now(),
    // audioBlob intentionally omitted — fetched lazily when the user opens
    // the capture detail view.
  };
}

/**
 * Pulls every capture row from Supabase for the current user and adds any
 * that aren't yet in the local IndexedDB. Audio blobs are not downloaded
 * here — they're fetched on demand from `getOrFetchAudioBlob` when the
 * user actually plays a clip.
 *
 * Also removes locally-cached captures that have been deleted on another
 * device: if a capture is locally-marked-as-synced but no longer present
 * on the server, we drop it from the local cache so deletions propagate.
 * Captures that are still pending upload (`syncedAt` undefined) are
 * never touched here.
 */
export async function pullFromServer(): Promise<{ added: number; removed: number }> {
  const { data, error } = await supabase
    .from('captures')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  const rows = (data as ServerRow[]) ?? [];

  const local = await listCaptures();
  const localIds = new Set(local.map((c) => c.id));
  const serverIds = new Set(rows.map((r) => r.id));

  let added = 0;
  for (const row of rows) {
    if (localIds.has(row.id)) continue;
    await saveCapture(rowToCapture(row));
    added++;
  }

  let removed = 0;
  for (const cap of local) {
    if (cap.syncedAt && !serverIds.has(cap.id)) {
      await deleteCaptureLocal(cap.id);
      removed++;
    }
  }

  return { added, removed };
}

/**
 * Removes a capture from every place it lives: Storage (audio file, if any),
 * Postgres (the metadata row, RLS-scoped to the current user), and the
 * local IndexedDB. Optimistic-friendly: callers usually update local state
 * first; this function then ensures everything else catches up.
 *
 * If the row was never synced we skip the server steps entirely — there's
 * nothing remote to clean up.
 */
export async function deleteCaptureFully(capture: Capture): Promise<void> {
  if (capture.syncedAt) {
    const { error: rowError } = await supabase
      .from('captures')
      .delete()
      .eq('id', capture.id);
    if (rowError) throw rowError;

    if (capture.audioPath) {
      const { error: storageError } = await supabase.storage
        .from(BUCKET)
        .remove([capture.audioPath]);
      if (storageError) {
        // Row is already gone — orphaned blob is annoying but not catastrophic.
        console.error('[delete] storage cleanup failed', storageError);
      }
    }
  }

  await deleteCaptureLocal(capture.id);
}

/**
 * Returns the audio blob for a capture, downloading from Supabase Storage
 * if it's not already cached locally. Caches the blob in IndexedDB on the
 * way back so subsequent playbacks are instant and offline-friendly.
 */
export async function getOrFetchAudioBlob(
  capture: Capture
): Promise<Blob | null> {
  if (capture.audioBlob) return capture.audioBlob;
  if (!capture.audioPath) return null;

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .download(capture.audioPath);
  if (error || !data) {
    console.error('[storage] download failed', error);
    return null;
  }

  await saveCapture({ ...capture, audioBlob: data });
  return data;
}
