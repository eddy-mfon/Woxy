import React, { useState, useRef, useEffect } from 'react';
import {
  Square,
  Pause,
  Play,
  RotateCcw,
  Check,
  Mic,
  Users,
  BookOpen,
  Lightbulb,
  FileText,
  AlignLeft,
} from 'lucide-react';
import type { NoteCategory } from './types';
import { formatDuration } from './utils';
import { WaveformVisualizer } from './WaveformVisualizer';

interface AudioRecorderProps {
  onSaveRecord: (
    blob: Blob | undefined,
    duration: number,
    title?: string,
    category?: NoteCategory,
    notes?: string,
    attendees?: string[]
  ) => Promise<void>;
  selectedDateLabel: string;
}

const CATEGORIES: { id: NoteCategory; label: string; icon: any; placeholder: string; hint: string }[] = [
  {
    id: 'journal',
    label: 'Journal & Reflection',
    icon: BookOpen,
    placeholder: 'Today’s personal reflection...',
    hint: 'Reflect on wins, moods, and lessons from today.',
  },
  {
    id: 'meeting',
    label: 'Meeting / Discussion',
    icon: Users,
    placeholder: 'Meeting title or topic (e.g. Weekly Standup, Product Sync)...',
    hint: 'Record conversation audio while taking live agenda notes and action items.',
  },
  {
    id: 'idea',
    label: 'Quick Idea / Voice Memo',
    icon: Lightbulb,
    placeholder: 'Brainstorm or quick thought...',
    hint: 'Capture fleeting epiphanies and voice drafts with zero friction.',
  },
  {
    id: 'note',
    label: 'Written Note',
    icon: FileText,
    placeholder: 'Note title...',
    hint: 'Capture written notes with optional accompanying audio.',
  },
];

const INSPIRATION_PROMPTS = [
  '⚡ What went well today?',
  '🌤 How are you feeling right now?',
  '💡 An idea or realization',
  '🎯 Today’s main win or lesson',
  '🔮 What are you grateful for?',
  '🧠 Something you learned',
];

export const AudioRecorder: React.FC<AudioRecorderProps> = ({
  onSaveRecord,
  selectedDateLabel,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<NoteCategory>('journal');
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [previewTime, setPreviewTime] = useState(0);
  const [customTitle, setCustomTitle] = useState('');
  const [typedNotes, setTypedNotes] = useState('');
  const [attendeesInput, setAttendeesInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [activePrompt, setActivePrompt] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Allow up to 60 minutes for meeting recordings, 10 mins for normal reflections
  const MAX_RECORDING_SECONDS = selectedCategory === 'meeting' ? 3600 : 600;

  // Prevent accidental tab closure/reload while recording
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isRecording) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isRecording]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, [audioUrl]);

  const startRecording = async () => {
    setPermissionError(null);
    audioChunksRef.current = [];
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setRecordedBlob(null);
    setRecordingTime(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      let options: MediaRecorderOptions = {};
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        options = { mimeType: 'audio/webm;codecs=opus' };
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        options = { mimeType: 'audio/mp4' };
      }

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        setRecordedBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);

        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
        }
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setIsPaused(false);

      timerRef.current = window.setInterval(() => {
        setRecordingTime((prev) => {
          if (prev + 1 >= MAX_RECORDING_SECONDS) {
            stopRecording();
            return MAX_RECORDING_SECONDS;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: unknown) {
      console.error('Error accessing microphone:', err);
      const errMsg = err instanceof Error ? err.message : 'Microphone access denied';
      setPermissionError(`Microphone error: ${errMsg}`);
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      timerRef.current = window.setInterval(() => {
        setRecordingTime((prev) => {
          if (prev + 1 >= MAX_RECORDING_SECONDS) {
            stopRecording();
            return MAX_RECORDING_SECONDS;
          }
          return prev + 1;
        });
      }, 1000);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const resetRecording = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setRecordedBlob(null);
    setRecordingTime(0);
    setCustomTitle('');
    setTypedNotes('');
    setAttendeesInput('');
    setIsPlayingPreview(false);
  };

  const togglePreviewPlay = () => {
    if (!audioPreviewRef.current) return;
    if (isPlayingPreview) {
      audioPreviewRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      audioPreviewRef.current.play();
      setIsPlayingPreview(true);
    }
  };

  const handleSave = async () => {
    // Allows saving with either audio recording OR typed text notes
    if (!recordedBlob && !typedNotes.trim() && !customTitle.trim()) return;
    setIsSaving(true);
    try {
      const finalTitle = customTitle.trim() || activePrompt || undefined;
      const attendees = attendeesInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      await onSaveRecord(
        recordedBlob || undefined,
        recordingTime,
        finalTitle,
        selectedCategory,
        typedNotes.trim() || undefined,
        attendees.length > 0 ? attendees : undefined
      );
      resetRecording();
    } catch (err) {
      console.error('Error saving entry:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const currentCategoryConfig = CATEGORIES.find((c) => c.id === selectedCategory) || CATEGORIES[0];

  return (
    <div className={`intriguing-recorder-card ${isRecording ? 'is-recording' : ''}`}>
      {/* Category selector strip */}
      <div className="recorder-category-tabbar">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              className={`cat-pill-btn ${isSelected ? 'is-selected' : ''}`}
              onClick={() => {
                if (!isRecording) setSelectedCategory(cat.id);
              }}
              disabled={isRecording}
              title={cat.hint}
            >
              <Icon size={14} />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Header bar */}
      <div className="recorder-top-strip">
        <div className="recorder-status-tag">
          <span className={`recorder-pulse-indicator ${isRecording ? 'live' : ''}`} />
          <span className="recorder-status-label">
            {isRecording
              ? isPaused
                ? 'Recording Paused'
                : selectedCategory === 'meeting'
                ? 'Meeting Recording in Progress...'
                : 'Recording in Progress...'
              : recordedBlob
              ? 'Voice Note Ready'
              : selectedCategory === 'meeting'
              ? 'Meeting Audio & Notes Studio'
              : 'Voice Note Studio'}
          </span>
        </div>
        <span className="recorder-date-badge">{selectedDateLabel}</span>
      </div>

      {permissionError && (
        <div className="recorder-error-alert">
          <span>{permissionError}</span>
        </div>
      )}

      {/* Main Studio Interactive Chamber */}
      {!recordedBlob ? (
        <div className="recorder-interactive-chamber">
          {!isRecording ? (
            /* IDLE STATE: Tactile record button, category details & optional prompt */
            <div className="recorder-idle-layout">
              <div className="recorder-mic-button-halo">
                <div className="mic-halo-ring mic-halo-ring-outer" />
                <div className="mic-halo-ring mic-halo-ring-inner" />
                <button
                  type="button"
                  className="btn-intriguing-record"
                  onClick={startRecording}
                  aria-label={`Start recording ${selectedCategory}`}
                >
                  <div className="record-inner-circle">
                    <Mic size={26} className="record-mic-icon" />
                  </div>
                </button>
              </div>

              <div className="recorder-idle-copy">
                <h4 className="idle-headline">
                  {selectedCategory === 'meeting'
                    ? 'Start Meeting Recording'
                    : selectedCategory === 'idea'
                    ? 'Record Quick Voice Idea'
                    : 'Tap to Record Voice Note'}
                </h4>
                <p className="idle-subline">{currentCategoryConfig.hint}</p>
              </div>

              {/* Title & Attendees Fields */}
              <div className="studio-inputs-wrapper">
                <input
                  type="text"
                  placeholder={currentCategoryConfig.placeholder}
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="studio-title-input"
                />

                {selectedCategory === 'meeting' && (
                  <div className="meeting-attendees-field">
                    <Users size={14} className="input-field-icon" />
                    <input
                      type="text"
                      placeholder="Attendees (e.g. Sarah, David, Alex)..."
                      value={attendeesInput}
                      onChange={(e) => setAttendeesInput(e.target.value)}
                      className="studio-sub-input"
                    />
                  </div>
                )}

                {/* Optional Scratchpad Notes */}
                <div className="studio-notes-scratchpad">
                  <AlignLeft size={14} className="input-field-icon notes-icon" />
                  <textarea
                    placeholder={
                      selectedCategory === 'meeting'
                        ? 'Meeting agenda, notes & key discussion points...'
                        : 'Notes, bullet points, or thoughts (optional)...'
                    }
                    value={typedNotes}
                    onChange={(e) => setTypedNotes(e.target.value)}
                    className="studio-notes-textarea"
                    rows={2}
                  />
                </div>

                {/* If user typed a note without recording, allow saving text directly */}
                {typedNotes.trim() && (
                  <div className="save-text-only-row">
                    <button
                      type="button"
                      className="btn-save-note-only"
                      onClick={handleSave}
                      disabled={isSaving}
                    >
                      <Check size={14} />
                      <span>{isSaving ? 'Saving...' : 'Save Note (Without Audio)'}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Inspiration Prompts Chips (for journals) */}
              {selectedCategory === 'journal' && (
                <div className="recorder-prompts-carousel">
                  {INSPIRATION_PROMPTS.map((prompt, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className={`prompt-chip ${activePrompt === prompt ? 'selected' : ''}`}
                      onClick={() => {
                        setActivePrompt(prompt === activePrompt ? '' : prompt);
                        setCustomTitle(
                          prompt === activePrompt ? '' : prompt.replace(/^[^\w\s]+/, '').trim()
                        );
                      }}
                    >
                      <span>{prompt}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* ACTIVE RECORDING STATE: Live waveform & live meeting notepad */
            <div className="recorder-active-layout">
              <div className="active-timer-display">
                <span className="live-rec-dot" />
                <span className="active-digits">{formatDuration(recordingTime)}</span>
                <span className="recording-cap-label">
                  / {formatDuration(MAX_RECORDING_SECONDS)}
                </span>
              </div>

              {/* Real-time speaking audio waveform */}
              <div className="active-waveform-track">
                <WaveformVisualizer
                  analyserNode={analyserRef.current}
                  isActive={isRecording && !isPaused}
                  height={54}
                  barWidth={3}
                  barGap={3}
                  color="var(--accent-purple, #ef4444)"
                  secondaryColor="var(--accent-purple-light, #f87171)"
                />
              </div>

              {/* Simultaneous Live Meeting Notes */}
              <div className="live-recorder-notepad">
                <div className="notepad-header">
                  <AlignLeft size={13} />
                  <span>
                    {selectedCategory === 'meeting'
                      ? 'Live Meeting Notepad'
                      : 'Live Notes & Reflections'}
                  </span>
                </div>
                <textarea
                  placeholder={
                    selectedCategory === 'meeting'
                      ? 'Type agenda items, discussion notes, and action items in real-time...'
                      : 'Type notes, realizations, or thoughts while recording...'
                  }
                  value={typedNotes}
                  onChange={(e) => setTypedNotes(e.target.value)}
                  className="live-notepad-input"
                  rows={3}
                />
              </div>

              {/* Action buttons */}
              <div className="active-controls-strip">
                {isPaused ? (
                  <button
                    type="button"
                    className="btn-recorder-action resume"
                    onClick={resumeRecording}
                  >
                    <Play size={15} />
                    <span>Resume</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn-recorder-action pause"
                    onClick={pauseRecording}
                  >
                    <Pause size={15} />
                    <span>Pause</span>
                  </button>
                )}

                <button
                  type="button"
                  className="btn-recorder-action done"
                  onClick={stopRecording}
                >
                  <Square size={14} fill="currentColor" />
                  <span>Done Recording</span>
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* RECORDED PREVIEW STATE: Waveform player, notes & title */
        <div className="recorder-preview-layout">
          {audioUrl && (
            <audio
              ref={audioPreviewRef}
              src={audioUrl}
              onEnded={() => setIsPlayingPreview(false)}
              onTimeUpdate={() => {
                if (audioPreviewRef.current) {
                  setPreviewTime(audioPreviewRef.current.currentTime);
                }
              }}
            />
          )}

          <div className="preview-playback-chamber">
            <button
              type="button"
              className={`btn-preview-toggle ${isPlayingPreview ? 'playing' : ''}`}
              onClick={togglePreviewPlay}
            >
              {isPlayingPreview ? <Pause size={16} /> : <Play size={16} className="play-indent" />}
            </button>

            <div className="preview-waveform-visual">
              <WaveformVisualizer
                isActive={isPlayingPreview}
                height={36}
                barWidth={3}
                barGap={3}
                color="var(--accent-purple, #ef4444)"
                secondaryColor="var(--accent-purple-light, #f87171)"
              />
            </div>

            <div className="preview-progress-details">
              <span className="preview-time-readout">{formatDuration(previewTime)}</span>
              <div className="preview-scrub-rail">
                <div
                  className="preview-scrub-fill"
                  style={{
                    width: `${recordingTime > 0 ? (previewTime / recordingTime) * 100 : 0}%`,
                  }}
                />
              </div>
              <span className="preview-time-readout total">{formatDuration(recordingTime)}</span>
            </div>
          </div>

          <div className="preview-title-field-wrap">
            <input
              type="text"
              placeholder={currentCategoryConfig.placeholder}
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              className="preview-title-input"
              autoFocus
            />
          </div>

          {selectedCategory === 'meeting' && (
            <div className="meeting-attendees-field">
              <Users size={14} className="input-field-icon" />
              <input
                type="text"
                placeholder="Attendees (comma-separated)..."
                value={attendeesInput}
                onChange={(e) => setAttendeesInput(e.target.value)}
                className="studio-sub-input"
              />
            </div>
          )}

          <div className="preview-notes-wrap">
            <textarea
              placeholder="Notes, action items, or takeaways..."
              value={typedNotes}
              onChange={(e) => setTypedNotes(e.target.value)}
              className="preview-notes-textarea"
              rows={3}
            />
          </div>

          <div className="preview-actions-bar">
            <button
              type="button"
              className="btn-preview-discard"
              onClick={resetRecording}
              disabled={isSaving}
            >
              <RotateCcw size={14} />
              <span>Discard</span>
            </button>

            <button
              type="button"
              className="btn-preview-save"
              onClick={handleSave}
              disabled={isSaving}
            >
              <Check size={15} />
              <span>
                {isSaving
                  ? 'Saving...'
                  : selectedCategory === 'meeting'
                  ? 'Save Meeting Note'
                  : 'Save Voice Note'}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
