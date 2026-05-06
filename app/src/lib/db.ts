import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Capture } from './types';

interface NklDB extends DBSchema {
  captures: {
    key: string;
    value: Capture;
    indexes: { byCreatedAt: number };
  };
}

const DB_NAME = 'niklaus';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<NklDB>> | null = null;

function getDB(): Promise<IDBPDatabase<NklDB>> {
  if (!dbPromise) {
    dbPromise = openDB<NklDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore('captures', { keyPath: 'id' });
        store.createIndex('byCreatedAt', 'createdAt');
      },
    });
  }
  return dbPromise;
}

export async function saveCapture(capture: Capture): Promise<void> {
  const db = await getDB();
  await db.put('captures', capture);
}

export async function listCaptures(): Promise<Capture[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex('captures', 'byCreatedAt');
  return all.reverse();
}

export async function listUnsynced(): Promise<Capture[]> {
  const all = await listCaptures();
  return all.filter((c) => !c.syncedAt);
}

export async function markSynced(
  id: string,
  patch: Partial<Pick<Capture, 'audioPath' | 'userId'>> = {}
): Promise<void> {
  const db = await getDB();
  const cap = await db.get('captures', id);
  if (!cap) return;
  cap.syncedAt = Date.now();
  if (patch.audioPath) cap.audioPath = patch.audioPath;
  if (patch.userId && !cap.userId) cap.userId = patch.userId;
  await db.put('captures', cap);
}

export async function deleteCapture(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('captures', id);
}
