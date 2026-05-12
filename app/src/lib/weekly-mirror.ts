import { supabase } from './supabase';

export interface WeeklyMirror {
  weekStart: string; // YYYY-MM-DD (Monday)
  content: string;
  createdAt: number;
}

const DISMISS_PREFIX = 'niklaus_mirror_dismissed_';

/**
 * Fetches the latest weekly mirror, generating it on the server if missing.
 * Returns null when there's no eligible content (e.g. user had zero
 * captures last week) or if anything goes wrong network-side.
 */
export async function fetchLatestWeeklyMirror(): Promise<WeeklyMirror | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return null;

  let res: Response;
  try {
    res = await fetch('/api/weekly-mirror', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
    });
  } catch (e) {
    console.error('[weekly-mirror] network error', e);
    return null;
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    console.error('[weekly-mirror] fetch failed', res.status, detail);
    return null;
  }

  const data = (await res.json()) as {
    mirror?: { week_start: string; content: string; created_at: string } | null;
  };
  if (!data.mirror) return null;

  return {
    weekStart: data.mirror.week_start,
    content: data.mirror.content,
    createdAt: new Date(data.mirror.created_at).getTime(),
  };
}

export function isMirrorDismissed(weekStart: string): boolean {
  if (typeof localStorage === 'undefined') return false;
  return localStorage.getItem(DISMISS_PREFIX + weekStart) === '1';
}

export function dismissMirror(weekStart: string): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(DISMISS_PREFIX + weekStart, '1');
  } catch {
    // quota / private mode — let the dismiss not stick rather than crash
  }
}

/** Pretty range like "Apr 28 – May 4" for the eyebrow on the card. */
export function formatWeekRange(weekStart: string): string {
  const start = new Date(`${weekStart}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  const sameMonth = start.getUTCMonth() === end.getUTCMonth();
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    });
  if (sameMonth) {
    return `${fmt(start)} – ${end.getUTCDate()}`;
  }
  return `${fmt(start)} – ${fmt(end)}`;
}
