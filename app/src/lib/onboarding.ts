/**
 * Onboarding state lives only in localStorage for now — it's a per-device
 * cosmetic gate, not authoritative product state. A user signing into a new
 * device after having used the app extensively shouldn't see the
 * onboarding flow again, so the gate also exempts anyone whose local
 * IndexedDB already has captures (auto-onboard).
 */

export type WhyAnswer = 'myself' | 'children' | 'loved-one' | 'curious';

const KEY_DONE = 'niklaus_onboarded_';
const KEY_WHY = 'niklaus_onboarding_why_';

export function isOnboarded(userId: string | undefined): boolean {
  if (!userId || typeof localStorage === 'undefined') return true;
  return localStorage.getItem(KEY_DONE + userId) === 'true';
}

export function markOnboarded(userId: string): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(KEY_DONE + userId, 'true');
  } catch {
    // ignore quota / private mode
  }
}

export function getWhy(userId: string | undefined): WhyAnswer | null {
  if (!userId || typeof localStorage === 'undefined') return null;
  const v = localStorage.getItem(KEY_WHY + userId);
  if (v === 'myself' || v === 'children' || v === 'loved-one' || v === 'curious') {
    return v;
  }
  return null;
}

export function setWhy(userId: string, why: WhyAnswer): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(KEY_WHY + userId, why);
  } catch {
    // ignore
  }
}
