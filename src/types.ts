export interface VoiceNoteMeta {
  id: string;
  dateStr: string; // YYYY-MM-DD format (local date)
  timestamp: number; // Unix ms
  duration: number; // Duration in seconds
  title: string;
  notes?: string;
  tags?: string[];
  audioSize?: number;
}

export interface VoiceNote extends VoiceNoteMeta {
  audioBlob?: Blob;
}

export interface DaySummary {
  dateStr: string;
  count: number;
  totalDuration: number;
}

export interface StreakStats {
  currentStreak: number;
  longestStreak: number;
  totalJournalDays: number;
  totalNotes: number;
  hasRecordedToday: boolean;
}
