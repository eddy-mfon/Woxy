import type { VoiceNote, StreakStats } from './types';

/**
 * Format a Date to YYYY-MM-DD local format
 */
export function formatLocalDate(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse YYYY-MM-DD into a local Date object
 */
export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Pretty human readable date label
 */
export function getFriendlyDateLabel(dateStr: string): string {
  const today = formatLocalDate(new Date());
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = formatLocalDate(yesterdayDate);

  if (dateStr === today) return 'Today';
  if (dateStr === yesterday) return 'Yesterday';

  const date = parseLocalDate(dateStr);
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
  });
}

/**
 * Format seconds to mm:ss
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format timestamp to 12h or 24h local time string (e.g. "3:45 PM")
 */
export function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Calculate streaks and journaling statistics
 */
export function calculateStreaks(notes: VoiceNote[]): StreakStats {
  if (!notes || notes.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      totalJournalDays: 0,
      totalNotes: 0,
      hasRecordedToday: false,
    };
  }

  // Set of unique distinct dates that have at least 1 note
  const uniqueDates = Array.from(new Set(notes.map((n) => n.dateStr))).sort();
  const totalJournalDays = uniqueDates.length;
  const totalNotes = notes.length;

  const todayStr = formatLocalDate(new Date());

  const hasRecordedToday = uniqueDates.includes(todayStr);

  // Calculate current streak
  let currentStreak = 0;
  // If user recorded today, streak starts from today.
  // If user hasn't recorded today yet, but did yesterday, the streak is alive starting from yesterday!
  let checkDate = new Date();
  if (!hasRecordedToday) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  // Count backwards day by day
  const dateSet = new Set(uniqueDates);
  while (dateSet.has(formatLocalDate(checkDate))) {
    currentStreak++;
    checkDate.setDate(checkDate.getDate() - 1);
  }

  // Calculate longest streak across history
  let longestStreak = 0;
  let tempStreak = 0;
  let prevDate: Date | null = null;

  for (const dateStr of uniqueDates) {
    const currDate = parseLocalDate(dateStr);
    if (!prevDate) {
      tempStreak = 1;
    } else {
      const diffTime = currDate.getTime() - prevDate.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        tempStreak++;
      } else {
        tempStreak = 1;
      }
    }
    prevDate = currDate;
    if (tempStreak > longestStreak) {
      longestStreak = tempStreak;
    }
  }

  return {
    currentStreak,
    longestStreak,
    totalJournalDays,
    totalNotes,
    hasRecordedToday,
  };
}
