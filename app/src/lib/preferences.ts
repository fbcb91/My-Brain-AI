/**
 * Local user preferences. For now everything lives in localStorage —
 * cross-device sync of preferences will come along with the cloud chat
 * sync (phase 3). Keep getters defensive so we never fall over if
 * localStorage is missing or corrupt.
 */

export type DailyQuestionTime = 'morning' | 'evening';

const KEY_DAILY_QUESTION_TIME = 'niklaus_daily_question_time';

export function getDailyQuestionTime(): DailyQuestionTime {
  if (typeof localStorage === 'undefined') return 'evening';
  const v = localStorage.getItem(KEY_DAILY_QUESTION_TIME);
  return v === 'morning' ? 'morning' : 'evening';
}

export function setDailyQuestionTime(value: DailyQuestionTime): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(KEY_DAILY_QUESTION_TIME, value);
}

/**
 * Returns true when the daily question card is allowed to appear given the
 * user's preferred time. Morning preference unlocks the card from 6:00,
 * evening preference from 18:00. Once unlocked it stays visible for the
 * rest of the day (until midnight, or until the user answers / skips).
 */
export function isWithinPreferredWindow(
  pref: DailyQuestionTime = getDailyQuestionTime(),
  d: Date = new Date()
): boolean {
  const hour = d.getHours();
  if (pref === 'morning') return hour >= 6;
  return hour >= 18;
}
