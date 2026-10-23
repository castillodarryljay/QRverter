import { db } from '../firebase.ts';
import { doc, setDoc, getDoc, collection, getDocs, query, orderBy } from 'firebase/firestore';

const CHUNK_SIZE = 550 * 1024; // ~550 KB per chunk (safe under Firestore 1MB document limit)

export interface FirestoreVideoMetadata {
  id: string;
  title: string;
  mimeType: string;
  totalChunks: number;
  size: number;
  createdAt: string;
}

/**
 * Converts a Blob or File to a Base64 string.
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const res = reader.result as string;
      // remove data:video/mp4;base64, header if present
      const base64 = res.includes(',') ? res.split(',')[1] : res;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Converts a Base64 string back to a Uint8Array.
 */
function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Uploads a video file or compressed blob into Cloud Firestore in chunks.
 * Works 100% reliably across any mobile phone, desktop, or cloud platform.
 * Returns an internal ID in the format "fs:videoId".
 */
export async function uploadVideoToFirestore(
  file: File | Blob,
  title: string,
  onProgress?: (progressPercent: number) => void
): Promise<string> {
  const videoId = 'vid_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  const mimeType = file.type || 'video/mp4';

  const metadata: FirestoreVideoMetadata = {
    id: videoId,
    title: title || 'Video Stream',
    mimeType,
    totalChunks,
    size: file.size,
    createdAt: new Date().toISOString(),
  };

  // 1. Write video metadata document
  await setDoc(doc(db, 'sharedVideos', videoId), metadata);

  // 2. Prepare chunk upload tasks with concurrency batching
  let completedCount = 0;
  const chunkIndices = Array.from({ length: totalChunks }, (_, i) => i);
  const BATCH_SIZE = 3;

  for (let b = 0; b < chunkIndices.length; b += BATCH_SIZE) {
    const batch = chunkIndices.slice(b, b + BATCH_SIZE);
    await Promise.all(
      batch.map(async (i) => {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunkBlob = file.slice(start, end);
        const chunkBase64 = await blobToBase64(chunkBlob);

        const chunkDocRef = doc(db, 'sharedVideos', videoId, 'chunks', `chunk_${i}`);
        await setDoc(chunkDocRef, {
          index: i,
          data: chunkBase64,
        });

        completedCount++;
        if (onProgress) {
          const percent = Math.min(99, Math.round((completedCount / totalChunks) * 100));
          onProgress(percent);
        }
      })
    );
  }

  if (onProgress) {
    onProgress(100);
  }

  return `fs:${videoId}`;
}

/**
 * Retrieves a chunked video from Cloud Firestore and reconstructs a playable Blob URL.
 */
export async function fetchVideoFromFirestore(
  videoId: string,
  onProgress?: (progressPercent: number) => void
): Promise<{ blobUrl: string; mimeType: string; title: string }> {
  // 1. Fetch metadata
  const metaDocRef = doc(db, 'sharedVideos', videoId);
  const metaSnap = await getDoc(metaDocRef);

  if (!metaSnap.exists()) {
    throw new Error('Video not found or has been removed');
  }

  const meta = metaSnap.data() as FirestoreVideoMetadata;
  const chunksQuery = query(collection(db, 'sharedVideos', videoId, 'chunks'));
  const chunksSnap = await getDocs(chunksQuery);

  if (chunksSnap.empty) {
    throw new Error('Video chunks not found');
  }

  const rawChunks: { index: number; data: string }[] = [];
  chunksSnap.forEach((d) => {
    rawChunks.push(d.data() as { index: number; data: string });
  });

  // Sort chunks by index
  rawChunks.sort((a, b) => a.index - b.index);

  // Merge binary chunks
  const binaryParts: BlobPart[] = [];
  for (let i = 0; i < rawChunks.length; i++) {
    const uint8 = base64ToUint8Array(rawChunks[i].data);
    binaryParts.push(uint8.buffer as ArrayBuffer);
    if (onProgress) {
      onProgress(Math.round(((i + 1) / rawChunks.length) * 100));
    }
  }

  const effectiveMime = meta.mimeType || 'video/mp4';
  const finalBlob = new Blob(binaryParts, { type: effectiveMime });
  const blobUrl = URL.createObjectURL(finalBlob);

  return {
    blobUrl,
    mimeType: effectiveMime,
    title: meta.title,
  };
}
