/**
 * Client-Side Video Compressor using HTML5 Canvas, AudioContext & MediaRecorder.
 * Dramatically reduces video file size (typically 70% - 90% space reduction)
 * before uploading to save user bandwidth, storage, and make uploads super fast.
 */

export interface CompressionOptions {
  targetResolution?: '720p' | '480p' | '360p';
  quality?: 'high' | 'medium' | 'low';
  onProgress?: (progressPercent: number) => void;
}

export interface CompressionResult {
  compressedFile: File;
  compressedUrl: string;
  originalSize: number;
  compressedSize: number;
  reductionPercentage: number;
  duration: number;
  width: number;
  height: number;
}

export async function compressVideoFile(
  file: File,
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  const {
    targetResolution = '720p',
    quality = 'medium',
    onProgress,
  } = options;

  // If file is already compact (less than 4MB), skip heavy compression for 0ms delay
  if (file.size < 4 * 1024 * 1024) {
    const objectUrl = URL.createObjectURL(file);
    return {
      compressedFile: file,
      compressedUrl: objectUrl,
      originalSize: file.size,
      compressedSize: file.size,
      reductionPercentage: 0,
      duration: 0,
      width: 0,
      height: 0,
    };
  }

  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true; // Required for auto-playback during transcoding
    video.playsInline = true;
    const sourceUrl = URL.createObjectURL(file);
    video.src = sourceUrl;

    video.onloadedmetadata = () => {
      const origW = video.videoWidth || 1280;
      const origH = video.videoHeight || 720;
      const duration = video.duration || 1;

      // Determine target bounding dimensions
      let maxDimW = 1280;
      let maxDimH = 720;
      let targetBitrate = 1_800_000; // 1.8 Mbps

      if (targetResolution === '480p') {
        maxDimW = 854;
        maxDimH = 480;
        targetBitrate = 900_000; // 900 Kbps
      } else if (targetResolution === '360p') {
        maxDimW = 640;
        maxDimH = 360;
        targetBitrate = 550_000; // 550 Kbps
      }

      if (quality === 'low') {
        targetBitrate = Math.round(targetBitrate * 0.7);
      } else if (quality === 'high') {
        targetBitrate = Math.round(targetBitrate * 1.4);
      }

      // Calculate proportional dimensions
      let targetW = origW;
      let targetH = origH;
      const aspect = origW / origH;

      if (origW > maxDimW || origH > maxDimH) {
        if (aspect >= 1) {
          targetW = Math.min(origW, maxDimW);
          targetH = Math.round(targetW / aspect);
        } else {
          targetH = Math.min(origH, maxDimH);
          targetW = Math.round(targetH * aspect);
        }
      }

      // Ensure even dimensions (required by H.264/VP9 codecs)
      targetW = targetW % 2 === 0 ? targetW : targetW - 1;
      targetH = targetH % 2 === 0 ? targetH : targetH - 1;

      // Create offscreen canvas
      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d', { alpha: false });

      if (!ctx) {
        URL.revokeObjectURL(sourceUrl);
        reject(new Error('Canvas context could not be created'));
        return;
      }

      // Choose supported MIME type
      const possibleTypes = [
        'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
        'video/mp4',
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
      ];
      let selectedMime = possibleTypes.find((t) => MediaRecorder.isTypeSupported(t)) || 'video/webm';
      const outputExt = selectedMime.includes('mp4') ? '.mp4' : '.webm';

      // Capture canvas stream at 30fps
      const canvasStream = canvas.captureStream(30);

      // Try capturing audio tracks from source video if browser supports captureStream
      try {
        const streamSrc = (video as unknown as { captureStream?: () => MediaStream; mozCaptureStream?: () => MediaStream });
        const videoStream = streamSrc.captureStream ? streamSrc.captureStream() : streamSrc.mozCaptureStream ? streamSrc.mozCaptureStream() : null;
        if (videoStream) {
          const audioTracks = videoStream.getAudioTracks();
          audioTracks.forEach((t) => canvasStream.addTrack(t));
        }
      } catch {
        // Fallback without audio track
      }

      let mediaRecorder: MediaRecorder;
      try {
        mediaRecorder = new MediaRecorder(canvasStream, {
          mimeType: selectedMime,
          videoBitsPerSecond: targetBitrate,
        });
      } catch {
        try {
          mediaRecorder = new MediaRecorder(canvasStream);
        } catch (e) {
          URL.revokeObjectURL(sourceUrl);
          reject(e);
          return;
        }
      }

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        URL.revokeObjectURL(sourceUrl);
        const finalBlob = new Blob(chunks, { type: selectedMime });
        const baseName = file.name.replace(/\.[^/.]+$/, '');
        const compressedFileName = `${baseName}-compressed${outputExt}`;
        const compressedFile = new File([finalBlob], compressedFileName, {
          type: selectedMime,
          lastModified: Date.now(),
        });
        const compressedUrl = URL.createObjectURL(finalBlob);

        const reduction = Math.max(0, Math.round(((file.size - finalBlob.size) / file.size) * 100));

        resolve({
          compressedFile,
          compressedUrl,
          originalSize: file.size,
          compressedSize: finalBlob.size,
          reductionPercentage: reduction,
          duration,
          width: targetW,
          height: targetH,
        });
      };

      mediaRecorder.onerror = (e) => {
        URL.revokeObjectURL(sourceUrl);
        reject(e);
      };

      // Faster transcoding playback speed (2.5x) to speed up compression significantly
      video.playbackRate = 2.5;

      let animFrameId: number;
      const drawFrame = () => {
        if (video.paused || video.ended) return;
        ctx.drawImage(video, 0, 0, targetW, targetH);

        if (onProgress && duration > 0) {
          const p = Math.min(99, Math.round((video.currentTime / duration) * 100));
          onProgress(p);
        }

        animFrameId = requestAnimationFrame(drawFrame);
      };

      video.onplay = () => {
        mediaRecorder.start(250);
        drawFrame();
      };

      video.onended = () => {
        cancelAnimationFrame(animFrameId);
        if (onProgress) onProgress(100);
        setTimeout(() => {
          if (mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
          }
        }, 150);
      };

      video.onerror = () => {
        cancelAnimationFrame(animFrameId);
        URL.revokeObjectURL(sourceUrl);
        reject(new Error('Video loading error during compression'));
      };

      // Start playback & transcoding
      video.play().catch((err) => {
        URL.revokeObjectURL(sourceUrl);
        reject(err);
      });
    };

    video.onerror = () => {
      URL.revokeObjectURL(sourceUrl);
      reject(new Error('Could not load video metadata'));
    };
  });
}
