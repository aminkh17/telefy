import { openDB, DBSchema } from 'idb';

interface AudioDB extends DBSchema {
  tracks: {
    key: string;
    value: {
      id: string;
      title: string;
      artist: string;
      duration: number;
      mimeType: string;
      blob: Blob; // Full file if completed
      savedAt: number;
    };
  };
  chunks: {
    key: string; // trackId_chunkIndex
    value: {
      key: string;
      trackId: string;
      index: number;
      data: ArrayBuffer;
    };
  };
}

const DB_NAME = 'telefy-music-db';
const DB_VERSION = 1;

export const initDB = async () => {
  return openDB<AudioDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('tracks')) {
        db.createObjectStore('tracks', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('chunks')) {
        db.createObjectStore('chunks', { keyPath: 'key' }); // Composite key manually managed
      }
    },
  });
};

export const saveFullTrack = async (track: any, blob: Blob) => {
  const db = await initDB();
  // Extract only serializable fields to avoid DataCloneError
  const { id, title, artist, duration, mimeType } = track;
  
  await db.put('tracks', {
    id,
    title,
    artist,
    duration,
    mimeType,
    blob,
    savedAt: Date.now(),
  });
};

export const getFullTrack = async (id: string) => {
  const db = await initDB();
  return db.get('tracks', id);
};

export const saveChunk = async (trackId: string, index: number, data: ArrayBuffer) => {
    const db = await initDB();
    await db.put('chunks', {
        key: `${trackId}_${index}`,
        trackId,
        index,
        data
    });
};

export const getChunks = async (trackId: string) => {
    const db = await initDB();
    // This is inefficient for random access, but okay for sequential reading if needed
    // Better to use a cursor or range if idb supports it easily, but simpler:
    // Actually, we usually want "all chunks" or "chunk X".
    // For now, let's assume we might not rely heavily on individual chunk caching 
    // for complex seeking *yet*, but for resuming.
    // Let's implement getting a specific chunk if needed.
    return [];
};
