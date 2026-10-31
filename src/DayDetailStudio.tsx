import React from 'react';
import { ArrowLeft, Plus, Mic, Sparkles, Clock } from 'lucide-react';
import type { VoiceNote } from './types';
import { getFriendlyDateLabel, formatDuration } from './utils';
import { AudioRecorder } from './AudioRecorder';
import { VoiceNoteCard } from './VoiceNoteCard';

interface DayDetailStudioProps {
  dateStr: string;
  notes: VoiceNote[];
  onBack: () => void;
  onSaveRecord: (blob: Blob, duration: number, title?: string) => Promise<void>;
  onDeleteRecord: (id: string) => Promise<void>;
  onUpdateTitle: (id: string, newTitle: string) => Promise<void>;
}

export const DayDetailStudio: React.FC<DayDetailStudioProps> = ({
  dateStr,
  notes,
  onBack,
  onSaveRecord,
  onDeleteRecord,
  onUpdateTitle,
}) => {
  const [showRecorder, setShowRecorder] = React.useState(notes.length === 0);

  const totalDuration = notes.reduce((acc, n) => acc + (n.duration || 0), 0);

  return (
    <div className="day-detail-studio-layout">
      {/* Top Banner Navigation Bar */}
      <div className="day-studio-nav">
        <button className="btn-back-to-calendar" onClick={onBack}>
          <ArrowLeft size={16} />
          <span>Return to Calendar</span>
        </button>

        <div className="day-studio-center-title">
          <span className="studio-kicker">Day Chronicle Studio</span>
          <h2 className="studio-heading">{getFriendlyDateLabel(dateStr)} ({dateStr})</h2>
        </div>

        <div className="day-studio-stats-badge">
          <span className="studio-pill">
            <Mic size={13} />
            {notes.length} {notes.length === 1 ? 'recording' : 'recordings'}
          </span>
          {notes.length > 0 && (
            <span className="studio-pill duration">
              <Clock size={13} />
              {formatDuration(totalDuration)}
            </span>
          )}
        </div>
      </div>

      {/* Action to Toggle Voice Recorder */}
      <div className="day-studio-action-strip">
        <button
          className={`btn-toggle-add-note ${showRecorder ? 'active' : ''}`}
          onClick={() => setShowRecorder((v) => !v)}
        >
          {showRecorder ? (
            <span>Hide Recorder Chamber</span>
          ) : (
            <>
              <Plus size={15} />
              <span>Record New Voice Note for This Day</span>
            </>
          )}
        </button>
      </div>

      {/* Audio Recorder Chamber for this specific day */}
      {showRecorder && (
        <div className="day-recorder-section">
          <AudioRecorder
            onSaveRecord={async (blob, duration, title) => {
              await onSaveRecord(blob, duration, title);
            }}
            selectedDateLabel={getFriendlyDateLabel(dateStr)}
          />
        </div>
      )}

      {/* All Recordings for This Day */}
      <div className="day-recordings-list-section">
        <div className="recordings-list-header">
          <h3 className="recordings-list-title">All Voice Entries For This Date</h3>
          <span className="recordings-list-count">
            {notes.length} {notes.length === 1 ? 'note' : 'notes'}
          </span>
        </div>

        {notes.length === 0 ? (
          <div className="day-studio-empty-card">
            <div className="empty-icon-wrap">
              <Sparkles size={24} />
            </div>
            <p className="empty-title">No voice notes recorded on {dateStr}</p>
            <p className="empty-sub">
              You can tap "Record New Voice Note for This Day" above to capture audio reflections for this day.
            </p>
          </div>
        ) : (
          <div className="feed-list-cards">
            {notes.map((note) => (
              <VoiceNoteCard
                key={note.id}
                note={note}
                onDelete={onDeleteRecord}
                onUpdateTitle={onUpdateTitle}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
