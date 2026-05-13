import { supabase } from './supabase';

export interface TimeLockedMessage {
  id: string;
  title: string;
  body: string | null;
  audioPath: string | null;
  durationSeconds: number | null;
  mimeType: string | null;
  /** YYYY-MM-DD or null when an `unlockDescription` is used instead. */
  unlockAt: string | null;
  unlockDescription: string | null;
  recipientHeirId: string | null;
  recipientName: string | null;
  createdAt: number;
}

interface MessageRow {
  id: string;
  title: string;
  body: string | null;
  audio_path: string | null;
  duration_seconds: number | null;
  mime_type: string | null;
  unlock_at: string | null;
  unlock_description: string | null;
  recipient_heir_id: string | null;
  created_at: string;
  recipient?: { id: string; name: string } | { id: string; name: string }[] | null;
}

function unwrapRecipient(
  rec: MessageRow['recipient']
): { id: string; name: string } | null {
  if (!rec) return null;
  return Array.isArray(rec) ? rec[0] ?? null : rec;
}

function rowToMessage(row: MessageRow): TimeLockedMessage {
  const rec = unwrapRecipient(row.recipient);
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    audioPath: row.audio_path,
    durationSeconds: row.duration_seconds,
    mimeType: row.mime_type,
    unlockAt: row.unlock_at,
    unlockDescription: row.unlock_description,
    recipientHeirId: row.recipient_heir_id,
    recipientName: rec?.name ?? null,
    createdAt: new Date(row.created_at).getTime(),
  };
}

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function extForMime(mime: string | undefined): string {
  if (!mime) return 'webm';
  if (mime.includes('webm')) return 'webm';
  if (mime.includes('mp4')) return 'm4a';
  if (mime.includes('aac')) return 'aac';
  if (mime.includes('mpeg')) return 'mp3';
  if (mime.includes('ogg')) return 'ogg';
  return 'webm';
}

const BUCKET = 'audio';

export async function listTimeLockedMessages(): Promise<TimeLockedMessage[]> {
  const { data, error } = await supabase
    .from('time_locked_messages')
    .select(
      `id, title, body, audio_path, duration_seconds, mime_type,
       unlock_at, unlock_description, recipient_heir_id, created_at,
       recipient:heirs (id, name)`
    )
    .order('created_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as MessageRow[]).map(rowToMessage);
}

export async function getTimeLockedMessage(
  id: string
): Promise<TimeLockedMessage | null> {
  const { data, error } = await supabase
    .from('time_locked_messages')
    .select(
      `id, title, body, audio_path, duration_seconds, mime_type,
       unlock_at, unlock_description, recipient_heir_id, created_at,
       recipient:heirs (id, name)`
    )
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return rowToMessage(data as MessageRow);
}

export async function countTimeLockedMessages(): Promise<number> {
  const { count, error } = await supabase
    .from('time_locked_messages')
    .select('id', { count: 'exact', head: true });
  if (error) throw error;
  return count ?? 0;
}

export interface CreateMessageInput {
  title: string;
  body?: string | null;
  audioBlob?: Blob;
  audioMime?: string;
  durationSeconds?: number;
  unlockAt?: string | null;
  unlockDescription?: string | null;
  recipientHeirId?: string | null;
}

export async function createTimeLockedMessage(
  input: CreateMessageInput
): Promise<TimeLockedMessage> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in.');

  const id = newId();
  let audioPath: string | null = null;

  if (input.audioBlob) {
    const ext = extForMime(input.audioMime);
    audioPath = `${user.id}/time-locked/${id}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(audioPath, input.audioBlob, {
        contentType: input.audioMime ?? 'audio/webm',
        upsert: false,
      });
    if (uploadError) throw uploadError;
  }

  const row = {
    id,
    user_id: user.id,
    title: input.title.trim(),
    body: input.body?.trim() || null,
    audio_path: audioPath,
    duration_seconds: input.durationSeconds ?? null,
    mime_type: input.audioMime ?? null,
    unlock_at: input.unlockAt || null,
    unlock_description: input.unlockDescription?.trim() || null,
    recipient_heir_id: input.recipientHeirId || null,
  };
  const { data, error } = await supabase
    .from('time_locked_messages')
    .insert(row)
    .select(
      `id, title, body, audio_path, duration_seconds, mime_type,
       unlock_at, unlock_description, recipient_heir_id, created_at,
       recipient:heirs (id, name)`
    )
    .single();
  if (error) {
    // Clean up the orphan audio if we already uploaded one
    if (audioPath) {
      await supabase.storage.from(BUCKET).remove([audioPath]).catch(() => {});
    }
    throw error;
  }
  return rowToMessage(data as MessageRow);
}

export interface UpdateMessageInput {
  title: string;
  body?: string | null;
  /** A new audio blob; if present, replaces any existing audio. */
  audioBlob?: Blob;
  audioMime?: string;
  durationSeconds?: number;
  /** If true and no audioBlob is provided, the existing audio is cleared and
   *  the message becomes text-only. */
  clearAudio?: boolean;
  unlockAt?: string | null;
  unlockDescription?: string | null;
  recipientHeirId?: string | null;
}

export async function updateTimeLockedMessage(
  id: string,
  existing: TimeLockedMessage,
  input: UpdateMessageInput
): Promise<TimeLockedMessage> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in.');

  let audioPath: string | null = existing.audioPath;
  let mimeType: string | null = existing.mimeType;
  let durationSeconds: number | null = existing.durationSeconds;

  if (input.audioBlob) {
    if (audioPath) {
      await supabase.storage.from(BUCKET).remove([audioPath]).catch(() => {});
    }
    const ext = extForMime(input.audioMime);
    audioPath = `${user.id}/time-locked/${id}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(audioPath, input.audioBlob, {
        contentType: input.audioMime ?? 'audio/webm',
        upsert: true,
      });
    if (uploadError) throw uploadError;
    mimeType = input.audioMime ?? 'audio/webm';
    durationSeconds = input.durationSeconds ?? null;
  } else if (input.clearAudio && audioPath) {
    await supabase.storage.from(BUCKET).remove([audioPath]).catch(() => {});
    audioPath = null;
    mimeType = null;
    durationSeconds = null;
  }

  const { data, error } = await supabase
    .from('time_locked_messages')
    .update({
      title: input.title.trim(),
      body: input.body?.trim() || null,
      audio_path: audioPath,
      duration_seconds: durationSeconds,
      mime_type: mimeType,
      unlock_at: input.unlockAt || null,
      unlock_description: input.unlockDescription?.trim() || null,
      recipient_heir_id: input.recipientHeirId || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select(
      `id, title, body, audio_path, duration_seconds, mime_type,
       unlock_at, unlock_description, recipient_heir_id, created_at,
       recipient:heirs (id, name)`
    )
    .single();
  if (error) throw error;
  return rowToMessage(data as MessageRow);
}

export async function deleteTimeLockedMessage(
  message: TimeLockedMessage
): Promise<void> {
  if (message.audioPath) {
    await supabase.storage
      .from(BUCKET)
      .remove([message.audioPath])
      .catch(() => {});
  }
  const { error } = await supabase
    .from('time_locked_messages')
    .delete()
    .eq('id', message.id);
  if (error) throw error;
}

/**
 * Downloads the audio blob for a message. Returns null on failure (e.g. the
 * file has been manually removed from Storage).
 */
export async function fetchMessageAudio(audioPath: string): Promise<Blob | null> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .download(audioPath);
  if (error || !data) {
    console.error('[time-locked] audio fetch failed', error);
    return null;
  }
  return data;
}
