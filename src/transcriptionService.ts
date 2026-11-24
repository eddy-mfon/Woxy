export type TranscriptionProvider = 'browser' | 'groq' | 'gemini' | 'openai';

export interface TranscriptionSettings {
  preferredProvider: TranscriptionProvider;
  groqApiKey?: string;
  groqModel?: string; // e.g. 'whisper-large-v3-turbo'
  geminiApiKey?: string;
  openaiApiKey?: string;
  autoTranscribeOnSave?: boolean;
}

const SETTINGS_KEY = 'vj_transcription_settings';

export function getTranscriptionSettings(): TranscriptionSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to load transcription settings:', e);
  }
  return {
    preferredProvider: 'groq',
    autoTranscribeOnSave: false,
    groqModel: 'whisper-large-v3-turbo',
  };
}

export function saveTranscriptionSettings(settings: Partial<TranscriptionSettings>): TranscriptionSettings {
  const current = getTranscriptionSettings();
  const updated = { ...current, ...settings };
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save transcription settings:', e);
  }
  return updated;
}

/** Check if Web Speech API is supported in this browser */
export function isBrowserSpeechSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(
    (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition ||
    (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition
  );
}

/**
 * Transcribes audio via Groq's high-speed Whisper API endpoint
 * Uses CORS-enabled client-side direct request with user's key
 */
export async function transcribeWithGroq(
  audioBlob: Blob,
  apiKey: string,
  model = 'whisper-large-v3-turbo'
): Promise<string> {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('Groq API Key is missing. Please add it in Settings.');
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error('You are currently offline. Cloud AI transcription requires an internet connection.');
  }

  const formData = new FormData();
  formData.append('file', audioBlob, 'journal-entry.webm');
  formData.append('model', model);
  formData.append('response_format', 'json');

  let response: Response;
  try {
    response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
      },
      body: formData,
    });
  } catch (err: unknown) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      throw new Error('You are currently offline. Connect to the internet to transcribe audio with Groq Whisper.');
    }
    throw new Error(`Failed to reach Groq server: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (!response.ok) {
    let errDetail = response.statusText;
    try {
      const errJson = await response.json();
      if (errJson.error?.message) {
        errDetail = errJson.error.message;
      }
    } catch {
      // ignore
    }
    throw new Error(`Groq transcription failed (${response.status}): ${errDetail}`);
  }

  const data = await response.json();
  return (data.text || '').trim();
}

/**
 * Transcribes audio via Google Gemini API (gemini-2.5-flash)
 */
export async function transcribeWithGemini(audioBlob: Blob, apiKey: string): Promise<string> {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('Gemini API Key is missing. Please add it in Settings.');
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error('You are currently offline. Cloud AI transcription requires an internet connection.');
  }

  // Convert audio blob to base64
  const arrayBuffer = await audioBlob.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(arrayBuffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64Audio = btoa(binary);

  const mimeType = audioBlob.type || 'audio/webm';

  const payload = {
    contents: [
      {
        parts: [
          {
            text: 'Please provide an accurate, verbatim transcript of this audio journal reflection. Do not add conversational commentary, introductory text, or markdown code blocks; output only the clean transcribed spoken words.',
          },
          {
            inline_data: {
              mime_type: mimeType,
              data: base64Audio,
            },
          },
        ],
      },
    ],
  };

  let response: Response;
  try {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`,
      {
        method: 'POST',
        headers: {
          'x-goog-api-key': apiKey.trim(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );
  } catch (err: unknown) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      throw new Error('You are currently offline. Connect to the internet to transcribe audio with Gemini.');
    }
    throw new Error(`Failed to reach Gemini API: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (!response.ok) {
    let errDetail = response.statusText;
    try {
      const errJson = await response.json();
      if (errJson.error?.message) {
        errDetail = errJson.error.message;
      }
    } catch {
      // ignore
    }
    throw new Error(`Gemini transcription failed (${response.status}): ${errDetail}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return text.trim();
}

/**
 * Transcribes audio via OpenAI Whisper API
 */
export async function transcribeWithOpenAI(audioBlob: Blob, apiKey: string): Promise<string> {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('OpenAI API Key is missing. Please add it in Settings.');
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error('You are currently offline. Cloud AI transcription requires an internet connection.');
  }

  const formData = new FormData();
  formData.append('file', audioBlob, 'journal-entry.webm');
  formData.append('model', 'whisper-1');
  formData.append('response_format', 'json');

  let response: Response;
  try {
    response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
      },
      body: formData,
    });
  } catch (err: unknown) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      throw new Error('You are currently offline. Connect to the internet to transcribe audio with OpenAI.');
    }
    throw new Error(`Failed to reach OpenAI server: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (!response.ok) {
    let errDetail = response.statusText;
    try {
      const errJson = await response.json();
      if (errJson.error?.message) {
        errDetail = errJson.error.message;
      }
    } catch {
      // ignore
    }
    throw new Error(`OpenAI transcription failed (${response.status}): ${errDetail}`);
  }

  const data = await response.json();
  return (data.text || '').trim();
}

/**
 * High-level transcribe function that selects provider or handles errors cleanly
 */
export async function transcribeAudioBlob(
  audioBlob: Blob,
  specificProvider?: TranscriptionProvider
): Promise<string> {
  const settings = getTranscriptionSettings();
  const provider = specificProvider || settings.preferredProvider;

  if (provider === 'groq') {
    if (!settings.groqApiKey) {
      throw new Error('Groq API Key is not configured. Set your free key in Settings.');
    }
    return transcribeWithGroq(audioBlob, settings.groqApiKey, settings.groqModel);
  }

  if (provider === 'gemini') {
    if (!settings.geminiApiKey) {
      throw new Error('Gemini API Key is not configured. Set your free key in Settings.');
    }
    return transcribeWithGemini(audioBlob, settings.geminiApiKey);
  }

  if (provider === 'openai') {
    if (!settings.openaiApiKey) {
      throw new Error('OpenAI API Key is not configured. Set your key in Settings.');
    }
    return transcribeWithOpenAI(audioBlob, settings.openaiApiKey);
  }

  // Fallback to whichever key is configured, or error
  if (settings.groqApiKey) {
    return transcribeWithGroq(audioBlob, settings.groqApiKey, settings.groqModel);
  }
  if (settings.geminiApiKey) {
    return transcribeWithGemini(audioBlob, settings.geminiApiKey);
  }
  if (settings.openaiApiKey) {
    return transcribeWithOpenAI(audioBlob, settings.openaiApiKey);
  }

  throw new Error(
    'No AI transcription provider configured. Please configure Groq (free), Gemini (free), or OpenAI in Settings.'
  );
}
