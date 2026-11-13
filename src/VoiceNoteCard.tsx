import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  Trash2,
  Download,
  MoreHorizontal,
  Edit2,
  Check,
  Loader2,
  Clock,
  FileText,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { VoiceNote } from './types';
import { formatDuration, formatTime } from './utils';
import { WaveformVisualizer } from './WaveformVisualizer';
import { getVoiceNoteAudio } from './db';
import { TranscribeModal } from './TranscribeModal';

interface VoiceNoteCardProps {
  note: VoiceNote;
  authorName?: string;
  onDelete: (id: string) => Promise<void>;
  onUpdateTitle?: (id: string, newTitle: string) => Promise<void>;
  onUpdateTranscript?: (id: string, transcript: string) => Promise<void>;
}

/** Check if a title is a default auto-generated one like "Voice Note #3" */
function isDefaultTitle(title: string): boolean {
  return /^Voice Note #\d+$/i.test(title.trim());
}

export const VoiceNoteCard: React.FC<VoiceNoteCardProps> = ({
  note,
  onDelete,
  onUpdateTitle,
  onUpdateTranscript,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(note.duration);
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState(note.title);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isTranscribeModalOpen, setIsTranscribeModalOpen] = useState(false);
  const [isTranscriptExpanded, setIsTranscriptExpanded] = useState(false);
  const [cachedBlob, setCachedBlob] = useState<Blob | undefined>(note.audioBlob);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const hasCustomTitle = !isDefaultTitle(note.title) && note.title.trim().length > 0;

  // Lazy load audio blob on-demand only when user plays, downloads, or transcribes
  const loadAudioBlob = async (): Promise<{ url: string; blob: Blob } | null> => {
    if (audioUrl && cachedBlob) return { url: audioUrl, blob: cachedBlob };
    setIsLoadingAudio(true);
    try {
      let blob = cachedBlob || note.audioBlob;
      if (!blob) {
        blob = (await getVoiceNoteAudio(note.id)) || undefined;
      }
      if (blob) {
        setCachedBlob(blob);
        const url = audioUrl || URL.createObjectURL(blob);
        setAudioUrl(url);
        return { url, blob };
      }
    } catch (err) {
      console.error('Error fetching audio blob:', err);
    } finally {
      setIsLoadingAudio(false);
    }
    return null;
  };

  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  // Close dropdown menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  const togglePlay = async () => {
    if (!audioUrl) {
      const loaded = await loadAudioBlob();
      if (!loaded) return;
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.play().catch((e) => console.error('Audio play error:', e));
        }
      }, 50);
      return;
    }

    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch((e) => console.error('Audio play error:', e));
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (
      audioRef.current &&
      !isNaN(audioRef.current.duration) &&
      audioRef.current.duration !== Infinity
    ) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const handleTitleSubmit = async () => {
    setIsEditingTitle(false);
    if (title.trim() && title !== note.title && onUpdateTitle) {
      await onUpdateTitle(note.id, title.trim());
    } else {
      setTitle(note.title);
    }
  };

  const downloadAudio = async () => {
    let url = audioUrl;
    if (!url) {
      const loaded = await loadAudioBlob();
      url = loaded?.url || '';
    }
    if (!url) return;

    const a = document.createElement('a');
    a.href = url;
    const safeTitle = (note.title || 'voice-note').replace(/[^a-z0-9_-]/gi, '_');
    a.download = `${safeTitle}-${note.dateStr}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setMenuOpen(false);
  };

  const handleOpenTranscribe = async () => {
    setMenuOpen(false);
    if (!cachedBlob) {
      await loadAudioBlob();
    }
    setIsTranscribeModalOpen(true);
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={`vnc-card ${isPlaying ? 'vnc-playing' : ''}`}>
      <audio
        ref={audioRef}
        src={audioUrl}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
        }}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
      />

      {/* Top Row: Play button + Info + Menu */}
      <div className="vnc-top-row">
        {/* Play/Pause Button */}
        <button
          className={`vnc-play-btn ${isPlaying ? 'active' : ''}`}
          onClick={togglePlay}
          disabled={isLoadingAudio}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isLoadingAudio ? (
            <Loader2 size={18} className="animate-spin" />
          ) : isPlaying ? (
            <Pause size={18} />
          ) : (
            <Play size={18} className="play-offset" />
          )}
        </button>

        {/* Center: Time + Duration + optional title */}
        <div className="vnc-info">
          <div className="vnc-primary-row">
            <span className="vnc-time">{formatTime(note.timestamp)}</span>
            <span className="vnc-duration-pill">
              <Clock size={11} />
              {formatDuration(duration)}
            </span>
          </div>

          {/* Title: show custom title OR inline edit */}
          {isEditingTitle ? (
            <div className="vnc-edit-row">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleTitleSubmit();
                  if (e.key === 'Escape') {
                    setTitle(note.title);
                    setIsEditingTitle(false);
                  }
                }}
                autoFocus
                className="vnc-title-input"
                placeholder="Add a title..."
              />
              <button className="vnc-save-btn" onClick={handleTitleSubmit}>
                <Check size={13} />
              </button>
            </div>
          ) : hasCustomTitle ? (
            <span
              className="vnc-title"
              onClick={() => setIsEditingTitle(true)}
              title="Click to edit"
            >
              {note.title}
            </span>
          ) : null}
        </div>

        {/* Three-dot Menu */}
        <div className="vnc-menu-wrap" ref={menuRef}>
          {/* Quick Transcribe Button on Card Header */}
          <button
            type="button"
            className={`vnc-quick-transcribe-btn ${note.transcript ? 'has-transcript' : ''}`}
            onClick={handleOpenTranscribe}
            title={note.transcript ? 'View Transcript' : 'Transcribe voice to text'}
          >
            <Sparkles size={13} />
            <span>{note.transcript ? 'Transcript' : 'Transcribe'}</span>
          </button>

          <button
            className="vnc-menu-btn"
            onClick={() => setMenuOpen((v) => !v)}
            title="Options"
          >
            <MoreHorizontal size={16} />
          </button>

          {menuOpen && (
            <div className="vnc-dropdown">
              <button
                className="vnc-dropdown-item"
                onClick={() => {
                  setIsEditingTitle(true);
                  setMenuOpen(false);
                }}
              >
                <Edit2 size={13} />
                <span>{hasCustomTitle ? 'Rename' : 'Add Title'}</span>
              </button>
              <button className="vnc-dropdown-item" onClick={handleOpenTranscribe}>
                <FileText size={13} />
                <span>{note.transcript ? 'View / Edit Transcript' : 'Transcribe Audio'}</span>
              </button>
              <button className="vnc-dropdown-item" onClick={downloadAudio}>
                <Download size={13} />
                <span>Download</span>
              </button>
              <div className="vnc-dropdown-divider" />
              <button
                className="vnc-dropdown-item danger"
                onClick={() => {
                  setMenuOpen(false);
                  if (confirm('Delete this voice note?')) {
                    onDelete(note.id);
                  }
                }}
              >
                <Trash2 size={13} />
                <span>Delete</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Waveform + scrubber — only when playing or has been interacted with */}
      {(isPlaying || currentTime > 0 || audioUrl) && (
        <div className="vnc-player-section">
          <div className="vnc-waveform" onClick={togglePlay}>
            <WaveformVisualizer
              isActive={isPlaying}
              height={32}
              barWidth={2}
              barGap={2}
              color="var(--accent-purple, #ef4444)"
              secondaryColor="var(--accent-purple-light, #f87171)"
            />
          </div>

          <div className="vnc-scrubber">
            <span className="vnc-scrub-time">{formatDuration(currentTime)}</span>
            <div className="vnc-scrub-track">
              <input
                type="range"
                min="0"
                max={duration || 1}
                step="0.05"
                value={currentTime}
                onChange={handleSeek}
                className="vnc-scrub-input"
                style={{
                  background: `linear-gradient(to right, var(--accent-purple, #ef4444) ${progressPercent}%, #e2e8f0 ${progressPercent}%)`,
                }}
              />
            </div>
            <span className="vnc-scrub-time vnc-scrub-total">{formatDuration(duration)}</span>
          </div>
        </div>
      )}

      {/* Transcript Collapsible Snippet on Card if transcribed */}
      {note.transcript && (
        <div className="vnc-transcript-preview-box">
          <div
            className="vnc-transcript-header"
            onClick={() => setIsTranscriptExpanded((v) => !v)}
          >
            <div className="vnc-transcript-title-row">
              <FileText size={13} className="text-accent" />
              <span className="vnc-transcript-label">Transcript</span>
            </div>
            <button type="button" className="vnc-transcript-toggle-btn">
              {isTranscriptExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
          <p
            className={`vnc-transcript-text ${isTranscriptExpanded ? 'expanded' : 'collapsed'}`}
            onClick={() => setIsTranscriptExpanded((v) => !v)}
          >
            {note.transcript}
          </p>
        </div>
      )}

      {/* Transcription Modal */}
      <TranscribeModal
        isOpen={isTranscribeModalOpen}
        onClose={() => setIsTranscribeModalOpen(false)}
        noteTitle={note.title}
        noteDate={note.dateStr}
        audioBlob={cachedBlob}
        initialTranscript={note.transcript || ''}
        onSaveTranscript={async (newTranscript) => {
          if (onUpdateTranscript) {
            await onUpdateTranscript(note.id, newTranscript);
          }
        }}
      />
    </div>
  );
};
