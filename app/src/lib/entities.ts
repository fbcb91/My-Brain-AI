import { listCaptures, saveCapture } from './db';
import { supabase } from './supabase';
import type { Capture } from './types';

export type EntityKind = 'person' | 'place' | 'theme';

export interface Entity {
  id: string;
  name: string;
  kind: EntityKind;
  mentionsCount: number;
  firstMentionAt: number | null;
  lastMentionAt: number | null;
  summary: string | null;
}

interface EntityRow {
  id: string;
  name: string;
  kind: EntityKind;
  mentions_count: number | null;
  first_mention_at: string | null;
  last_mention_at: string | null;
  summary: string | null;
}

function rowToEntity(row: EntityRow): Entity {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    mentionsCount: row.mentions_count ?? 0,
    firstMentionAt: row.first_mention_at
      ? new Date(row.first_mention_at).getTime()
      : null,
    lastMentionAt: row.last_mention_at
      ? new Date(row.last_mention_at).getTime()
      : null,
    summary: row.summary ?? null,
  };
}

/** Loads all of the current user's entities, most recently mentioned first. */
export async function listEntities(): Promise<Entity[]> {
  const { data, error } = await supabase
    .from('entities')
    .select('id, name, kind, mentions_count, first_mention_at, last_mention_at, summary')
    .order('last_mention_at', { ascending: false, nullsFirst: false });
  if (error) throw error;
  return ((data ?? []) as EntityRow[]).map(rowToEntity);
}

export async function getEntity(id: string): Promise<Entity | null> {
  const { data, error } = await supabase
    .from('entities')
    .select('id, name, kind, mentions_count, first_mention_at, last_mention_at, summary')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return rowToEntity(data as EntityRow);
}

/**
 * Fetches the captures that mention a given entity. Joins capture_entities
 * with captures so the row data comes back in one round-trip, ordered by
 * newest first.
 */
export async function capturesForEntity(entityId: string): Promise<Capture[]> {
  const { data, error } = await supabase
    .from('capture_entities')
    .select(
      `created_at,
       capture:captures (
         id, user_id, kind, created_at, duration_seconds, mime_type,
         audio_path, text, transcript, question_text, is_private
       )`
    )
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  interface CapShape {
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
  }
  // Supabase types the embedded relation as an array even though we have a
  // single FK; normalise to a single CapShape per row.
  const rows = (data ?? []) as { capture: CapShape | CapShape[] | null }[];
  return rows
    .map((r) => (Array.isArray(r.capture) ? r.capture[0] ?? null : r.capture))
    .filter((c): c is CapShape => c !== null)
    .map((c) => ({
      id: c.id,
      userId: c.user_id,
      kind: c.kind,
      createdAt: new Date(c.created_at).getTime(),
      duration: c.duration_seconds ?? undefined,
      mimeType: c.mime_type ?? undefined,
      audioPath: c.audio_path ?? undefined,
      text: c.text ?? undefined,
      transcript: c.transcript ?? undefined,
      questionText: c.question_text ?? undefined,
      isPrivate: c.is_private ?? false,
      syncedAt: Date.now(),
    }));
}

/**
 * Returns the entities linked to a single capture, ordered by kind so the
 * chips in the UI come out grouped (people first, then places, then themes).
 */
export async function entitiesForCapture(captureId: string): Promise<Entity[]> {
  const { data, error } = await supabase
    .from('capture_entities')
    .select(
      `entity:entities (
        id, name, kind, mentions_count, first_mention_at, last_mention_at, summary
      )`
    )
    .eq('capture_id', captureId);
  if (error) throw error;
  const rows = (data ?? []) as {
    entity: EntityRow | EntityRow[] | null;
  }[];
  const KIND_ORDER: Record<EntityKind, number> = { person: 0, place: 1, theme: 2 };
  return rows
    .map((r) => (Array.isArray(r.entity) ? r.entity[0] ?? null : r.entity))
    .filter((e): e is EntityRow => e !== null)
    .map(rowToEntity)
    .sort((a, b) => {
      const k = KIND_ORDER[a.kind] - KIND_ORDER[b.kind];
      if (k !== 0) return k;
      return b.mentionsCount - a.mentionsCount;
    });
}

/**
 * Returns the user's top N entities by recency. Used by Today's "Your
 * world" preview, where we surface the names that are alive in the user's
 * memory right now.
 */
export async function topRecentEntities(limit = 8): Promise<Entity[]> {
  const { data, error } = await supabase
    .from('entities')
    .select(
      'id, name, kind, mentions_count, first_mention_at, last_mention_at, summary'
    )
    .order('last_mention_at', { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) throw error;
  return ((data ?? []) as EntityRow[]).map(rowToEntity);
}

/**
 * Asks the server to run entity extraction on a single capture. Idempotent —
 * the server short-circuits if `entities_extracted` is already true.
 */
async function extractEntitiesFor(captureId: string): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return;

  const res = await fetch('/api/extract-entities', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ id: captureId }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Extract failed (${res.status}). ${detail}`.trim());
  }

  // Mark locally so we don't retry until the next pull from server confirms
  const all = await listCaptures();
  const local = all.find((c) => c.id === captureId);
  if (local) {
    await saveCapture({ ...local, entitiesExtracted: true });
  }
}

interface ExtractResult {
  ok: number;
  failed: number;
}

/**
 * Walks every synced capture that still has `entitiesExtracted === false`
 * and that has content to extract (a note's text, or a voice capture's
 * transcript). Runs serially to be gentle on Workers AI / Anthropic quotas.
 */
export async function extractPendingEntities(): Promise<ExtractResult> {
  const all = await listCaptures();
  const pending = all.filter((c) => {
    if (!c.syncedAt) return false;
    if (c.entitiesExtracted) return false;
    if (c.kind === 'note') return typeof c.text === 'string' && c.text.trim().length > 0;
    return typeof c.transcript === 'string' && c.transcript.trim().length > 0;
  });
  let ok = 0;
  let failed = 0;
  for (const c of pending) {
    try {
      await extractEntitiesFor(c.id);
      ok++;
    } catch (e) {
      console.error('[extract] failed for', c.id, e);
      failed++;
    }
  }
  return { ok, failed };
}
