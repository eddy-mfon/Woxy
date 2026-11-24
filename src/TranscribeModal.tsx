import React, { useState, useEffect } from 'react';
import {
  FileText,
  Sparkles,
  Zap,
  Key,
  ExternalLink,
  Check,
  AlertCircle,
  Copy,
  Volume2,
  X,
  WifiOff,
} from 'lucide-react';
import {
  getTranscriptionSettings,
  saveTranscriptionSettings,
  transcribeAudioBlob,
  type TranscriptionProvider,
} from './transcriptionService';

interface TranscribeModalProps {
  isOpen: boolean;
  onClose: () => void;
  noteTitle: string;
  noteDate: string;
  audioBlob?: Blob;
  initialTranscript?: string;
  onSaveTranscript: (transcript: string) => Promise<void>;
  onOpenSettings?: () => void;
}

export const TranscribeModal: React.FC<TranscribeModalProps> = ({
  isOpen,
  onClose,
  noteTitle,
  noteDate,
  audioBlob,
  initialTranscript = '',
  onSaveTranscript,
}) => {
  const [transcript, setTranscript] = useState(initialTranscript);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<TranscriptionProvider>('groq');
  const [groqKeyInput, setGroqKeyInput] = useState('');
  const [geminiKeyInput, setGeminiKeyInput] = useState('');
  const [openaiKeyInput, setOpenaiKeyInput] = useState('');
  const [showConfig, setShowConfig] = useState(false);
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTranscript(initialTranscript);
      setError(null);
      setSaved(false);
      setCopied(false);
      const s = getTranscriptionSettings();
      setSelectedProvider(s.preferredProvider === 'browser' ? 'groq' : s.preferredProvider);
      setGroqKeyInput(s.groqApiKey || '');
      setGeminiKeyInput(s.geminiApiKey || '');
      setOpenaiKeyInput(s.openaiApiKey || '');

      // If no keys configured, show config accordion
      if (!s.groqApiKey && !s.geminiApiKey && !s.openaiApiKey) {
        setShowConfig(true);
      }
    }
  }, [isOpen, initialTranscript]);

  if (!isOpen) return null;

  const handleTranscribe = async () => {
    if (!audioBlob) {
      setError('Audio data is still loading or not available.');
      return;
    }

    if (!isOnline) {
      setError('You are offline. Your audio note is safely stored locally on your device! Cloud AI transcription will be ready once you reconnect to the internet.');
      return;
    }

    // Save key if entered right here
    if (selectedProvider === 'groq' && groqKeyInput.trim()) {
      saveTranscriptionSettings({ groqApiKey: groqKeyInput.trim(), preferredProvider: 'groq' });
    } else if (selectedProvider === 'gemini' && geminiKeyInput.trim()) {
      saveTranscriptionSettings({ geminiApiKey: geminiKeyInput.trim(), preferredProvider: 'gemini' });
    } else if (selectedProvider === 'openai' && openaiKeyInput.trim()) {
      saveTranscriptionSettings({ openaiApiKey: openaiKeyInput.trim(), preferredProvider: 'openai' });
    }

    setIsTranscribing(true);
    setError(null);

    try {
      const text = await transcribeAudioBlob(audioBlob, selectedProvider);
      setTranscript(text);
      if (text) {
        await onSaveTranscript(text);
        setSaved(true);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleCopy = async () => {
    if (!transcript) return;
    try {
      await navigator.clipboard.writeText(transcript);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveManual = async () => {
    await onSaveTranscript(transcript);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const currentSettings = getTranscriptionSettings();
  const hasKeyForSelected =
    (selectedProvider === 'groq' && (currentSettings.groqApiKey || groqKeyInput.trim())) ||
    (selectedProvider === 'gemini' && (currentSettings.geminiApiKey || geminiKeyInput.trim())) ||
    (selectedProvider === 'openai' && (currentSettings.openaiApiKey || openaiKeyInput.trim()));

  return (
    <div className="vj-modal-overlay" onClick={onClose}>
      <div
        className="vj-modal-surface transcribe-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="transcribe-modal-header">
          <div className="transcribe-title-group">
            <div className="transcribe-icon-wrap">
              <Sparkles size={20} className="sparkle-accent-icon" />
            </div>
            <div>
              <h3 className="transcribe-modal-title">Voice-to-Text Transcription</h3>
              <p className="transcribe-modal-subtitle">
                {noteTitle} • {noteDate}
              </p>
            </div>
          </div>
          <button className="transcribe-close-btn" onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="transcribe-modal-body">
          {/* Offline Status Notice Banner */}
          {!isOnline && (
            <div className="transcribe-alert offline">
              <WifiOff size={16} />
              <div className="alert-text-wrap">
                <strong>You are currently offline</strong>
                <span>
                  Your voice note is saved locally on your computer and can be played anytime. AI transcription requires an active internet connection to contact Groq, Gemini, or OpenAI Whisper.
                </span>
              </div>
            </div>
          )}

          {error && (
            <div className="transcribe-alert error">
              <AlertCircle size={16} />
              <div className="alert-text-wrap">
                <span>{error}</span>
                {error.includes('Settings') && (
                  <button
                    type="button"
                    className="alert-link-btn"
                    onClick={() => {
                      setShowConfig(true);
                    }}
                  >
                    Enter API Key below
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Provider selector bar */}
          <div className="transcribe-engine-selector">
            <span className="selector-label">Transcription Engine:</span>
            <div className="engine-options-row">
              <button
                type="button"
                className={`engine-pill-btn ${selectedProvider === 'groq' ? 'is-selected' : ''}`}
                onClick={() => setSelectedProvider('groq')}
              >
                <Zap size={14} className="engine-icon groq" />
                <span>Groq Whisper</span>
                <span className="pill-badge free">Free & Fastest</span>
              </button>

              <button
                type="button"
                className={`engine-pill-btn ${selectedProvider === 'gemini' ? 'is-selected' : ''}`}
                onClick={() => setSelectedProvider('gemini')}
              >
                <Sparkles size={14} className="engine-icon gemini" />
                <span>Google Gemini</span>
                <span className="pill-badge free">Free Tier</span>
              </button>

              <button
                type="button"
                className={`engine-pill-btn ${selectedProvider === 'openai' ? 'is-selected' : ''}`}
                onClick={() => setSelectedProvider('openai')}
              >
                <Volume2 size={14} className="engine-icon openai" />
                <span>OpenAI Whisper</span>
              </button>
            </div>
          </div>

          {/* Quick Key Configuration strip if needed */}
          {(!hasKeyForSelected || showConfig) && (
            <div className="quick-api-config-box">
              <div className="config-box-header">
                <div className="config-box-title">
                  <Key size={14} />
                  <span>Configure {selectedProvider === 'groq' ? 'Groq' : selectedProvider === 'gemini' ? 'Gemini' : 'OpenAI'} API Key</span>
                </div>
                {hasKeyForSelected && (
                  <button
                    type="button"
                    className="btn-toggle-config"
                    onClick={() => setShowConfig(false)}
                  >
                    Hide
                  </button>
                )}
              </div>

              <p className="config-box-explainer">
                {selectedProvider === 'groq' ? (
                  <>
                    Groq offers lightning-fast Whisper transcription with a generous 100% free tier. Get your free key at{' '}
                    <a
                      href="https://console.groq.com/keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="config-external-link"
                    >
                      console.groq.com <ExternalLink size={11} />
                    </a>
                  </>
                ) : selectedProvider === 'gemini' ? (
                  <>
                    Google AI Studio provides a free API key for Gemini 2.5 Flash with no credit card required.{' '}
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="config-external-link"
                    >
                      aistudio.google.com <ExternalLink size={11} />
                    </a>
                  </>
                ) : (
                  <>Enter your OpenAI API key to use Whisper-1.</>
                )}
              </p>

              {selectedProvider === 'groq' && (
                <div className="config-input-row">
                  <input
                    type="password"
                    placeholder="Enter Groq API Key (gsk_...)"
                    value={groqKeyInput}
                    onChange={(e) => setGroqKeyInput(e.target.value)}
                    className="config-key-input"
                  />
                  <button
                    type="button"
                    className="config-save-btn"
                    onClick={() => {
                      saveTranscriptionSettings({ groqApiKey: groqKeyInput.trim() });
                      alert('Groq API Key saved locally!');
                      setShowConfig(false);
                    }}
                  >
                    Save
                  </button>
                </div>
              )}

              {selectedProvider === 'gemini' && (
                <div className="config-input-row">
                  <input
                    type="password"
                    placeholder="Enter Gemini API Key (AIzaSy...)"
                    value={geminiKeyInput}
                    onChange={(e) => setGeminiKeyInput(e.target.value)}
                    className="config-key-input"
                  />
                  <button
                    type="button"
                    className="config-save-btn"
                    onClick={() => {
                      saveTranscriptionSettings({ geminiApiKey: geminiKeyInput.trim() });
                      alert('Gemini API Key saved locally!');
                      setShowConfig(false);
                    }}
                  >
                    Save
                  </button>
                </div>
              )}

              {selectedProvider === 'openai' && (
                <div className="config-input-row">
                  <input
                    type="password"
                    placeholder="Enter OpenAI API Key (sk-...)"
                    value={openaiKeyInput}
                    onChange={(e) => setOpenaiKeyInput(e.target.value)}
                    className="config-key-input"
                  />
                  <button
                    type="button"
                    className="config-save-btn"
                    onClick={() => {
                      saveTranscriptionSettings({ openaiApiKey: openaiKeyInput.trim() });
                      alert('OpenAI API Key saved locally!');
                      setShowConfig(false);
                    }}
                  >
                    Save
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Transcript Display & Editor */}
          <div className="transcript-box-container">
            <div className="transcript-box-top">
              <span className="transcript-label">Transcript</span>
              <div className="transcript-actions-group">
                {transcript && (
                  <>
                    <button
                      type="button"
                      className="btn-transcript-action"
                      onClick={handleCopy}
                      title="Copy to clipboard"
                    >
                      {copied ? <Check size={14} className="text-green" /> : <Copy size={14} />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                    <button
                      type="button"
                      className="btn-transcript-action"
                      onClick={handleSaveManual}
                      title="Save edits"
                    >
                      <Check size={14} />
                      <span>{saved ? 'Saved' : 'Save Changes'}</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            <textarea
              className="transcript-textarea"
              placeholder={
                isTranscribing
                  ? 'Transcribing audio reflection... Please wait a few seconds.'
                  : !isOnline
                  ? 'You are offline. When connected to the internet, tap "Transcribe This Recording" to generate a transcript, or type notes manually right here.'
                  : 'Click "Start Transcription" below to transcribe your voice journal into text, or type notes here.'
              }
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              rows={8}
              disabled={isTranscribing}
            />
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="transcribe-modal-footer">
          <button
            type="button"
            className="btn-transcribe-cancel"
            onClick={onClose}
            disabled={isTranscribing}
          >
            Done
          </button>

          <button
            type="button"
            className={`btn-transcribe-primary ${isTranscribing ? 'loading' : ''} ${!isOnline ? 'disabled-offline' : ''}`}
            onClick={handleTranscribe}
            disabled={isTranscribing || !audioBlob || !isOnline}
            title={!isOnline ? 'Connect to the internet to transcribe' : undefined}
          >
            {isTranscribing ? (
              <>
                <span className="transcribe-spinner" />
                <span>Transcribing with {selectedProvider.toUpperCase()}...</span>
              </>
            ) : !isOnline ? (
              <>
                <WifiOff size={16} />
                <span>Offline (Cloud AI Paused)</span>
              </>
            ) : (
              <>
                <FileText size={16} />
                <span>{transcript ? 'Re-transcribe Audio' : 'Transcribe This Recording'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
