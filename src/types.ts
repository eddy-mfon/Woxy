export type NoteCategory = 'journal' | 'meeting' | 'idea' | 'note';

export interface VoiceNoteMeta {
  id: string;
  dateStr: string; // YYYY-MM-DD format (local date)
  timestamp: number; // Unix ms
  duration: number; // Duration in seconds
  title: string;
  notes?: string;
  transcript?: string;
  tags?: string[];
  audioSize?: number;
  category?: NoteCategory; // 'journal' | 'meeting' | 'idea' | 'note'
  attendees?: string[]; // for meetings
  summary?: string; // key bullet points / takeaways
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
