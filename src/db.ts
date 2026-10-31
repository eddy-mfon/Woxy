import type { VoiceNote, VoiceNoteMeta } from './types';

const DB_NAME = 'VoiceJournalDB';
const DB_VERSION = 2; // Upgraded version to support audio blob isolation
const STORE_NAME = 'voice_notes';
const AUDIO_STORE_NAME = 'voice_audio';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const tx = (event.target as IDBOpenDBRequest).transaction;

      // Ensure main notes metadata store exists
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('dateStr', 'dateStr', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }

      // Create dedicated audio store for large blobs
      if (!db.objectStoreNames.contains(AUDIO_STORE_NAME)) {
        db.createObjectStore(AUDIO_STORE_NAME, { keyPath: 'id' });
      }

      // Migration: If upgrading from v1, move existing audioBlob from STORE_NAME to AUDIO_STORE_NAME
      if (event.oldVersion === 1 && tx) {
        try {
          const notesStore = tx.objectStore(STORE_NAME);
          const audioStore = tx.objectStore(AUDIO_STORE_NAME);
          const getAllReq = notesStore.getAll();
          getAllReq.onsuccess = () => {
            const notes = getAllReq.result || [];
            for (const n of notes) {
              if (n.audioBlob) {
                audioStore.put({ id: n.id, audioBlob: n.audioBlob });
                // Clean up blob from metadata record
                delete n.audioBlob;
                notesStore.put(n);
              }
            }
          };
        } catch (e) {
          console.warn('Migration warning:', e);
        }
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Saves a voice note by cleanly splitting metadata and binary audio blob
 */
export async function saveVoiceNote(note: VoiceNote): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_NAME, AUDIO_STORE_NAME], 'readwrite');
    const notesStore = tx.objectStore(STORE_NAME);
    const audioStore = tx.objectStore(AUDIO_STORE_NAME);

    // Save audio blob in binary store
    if (note.audioBlob) {
      audioStore.put({
        id: note.id,
        audioBlob: note.audioBlob,
      });
    }

    // Save clean lightweight metadata
    const { audioBlob, ...meta } = note;
    notesStore.put({
      ...meta,
      audioSize: audioBlob?.size || 0,
    });

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Fast: retrieves only metadata for all notes (does not load MBs of blobs into RAM)
 */
export async function getAllVoiceNotes(): Promise<VoiceNote[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const notes: VoiceNote[] = request.result || [];
      notes.sort((a, b) => b.timestamp - a.timestamp);
      resolve(notes);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Loads the actual audio Blob on-demand when a user clicks play/view
 */
export async function getVoiceNoteAudio(id: string): Promise<Blob | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(AUDIO_STORE_NAME, 'readonly');
    const store = tx.objectStore(AUDIO_STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => {
      if (request.result && request.result.audioBlob) {
        resolve(request.result.audioBlob);
      } else {
        // Fallback check in main store for backwards compat
        const txFallback = db.transaction(STORE_NAME, 'readonly');
        const reqFallback = txFallback.objectStore(STORE_NAME).get(id);
        reqFallback.onsuccess = () => {
          resolve(reqFallback.result?.audioBlob || null);
        };
        reqFallback.onerror = () => resolve(null);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Deletes both metadata and audio payload
 */
export async function deleteVoiceNote(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_NAME, AUDIO_STORE_NAME], 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.objectStore(AUDIO_STORE_NAME).delete(id);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Updates note metadata (title, tags, etc.)
 */
export async function updateVoiceNote(id: string, updates: Partial<VoiceNoteMeta>): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(id);

    getReq.onsuccess = () => {
      const existing = getReq.result as VoiceNoteMeta;
      if (!existing) {
        reject(new Error(`Voice note with id ${id} not found`));
        return;
      }
      const updated = { ...existing, ...updates };
      const putReq = store.put(updated);
      putReq.onsuccess = () => resolve();
      putReq.onerror = () => reject(putReq.error);
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

/**
 * Exports all journal notes and their audio files as a structured JSON bundle
 */
export async function exportJournalBackup(): Promise<string> {
  const notes = await getAllVoiceNotes();

  const fullData = await Promise.all(
    notes.map(async (n) => {
      const blob = await getVoiceNoteAudio(n.id);
      let base64Audio = '';
      if (blob) {
        base64Audio = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      }
      return {
        ...n,
        audioDataUrl: base64Audio,
      };
    })
  );

  return JSON.stringify({
    version: 1,
    exportDate: new Date().toISOString(),
    notesCount: fullData.length,
    notes: fullData,
  }, null, 2);
}

/**
 * Imports a previously exported backup
 */
export async function importJournalBackup(jsonString: string): Promise<number> {
  const data = JSON.parse(jsonString);
  if (!data || !Array.isArray(data.notes)) {
    throw new Error('Invalid backup file format');
  }

  let importedCount = 0;
  for (const item of data.notes) {
    if (!item.id || !item.dateStr) continue;

    let blob: Blob | undefined;
    if (item.audioDataUrl) {
      const res = await fetch(item.audioDataUrl);
      blob = await res.blob();
    }

    const noteToSave: VoiceNote = {
      id: item.id,
      dateStr: item.dateStr,
      timestamp: item.timestamp || Date.now(),
      duration: item.duration || 0,
      title: item.title || 'Imported Note',
      audioBlob: blob,
    };

    await saveVoiceNote(noteToSave);
    importedCount++;
  }

  return importedCount;
}

/**
 * Requests persistent storage from the browser to protect from auto-eviction
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (navigator.storage && navigator.storage.persist) {
    const isPersisted = await navigator.storage.persist();
    return isPersisted;
  }
  return false;
}
