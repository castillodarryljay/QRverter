import { VideoSourceType } from '../types/index.ts';

export function detectVideoSource(url: string): {
  type: VideoSourceType;
  embedUrl?: string;
  videoId?: string;
} {
  const cleanUrl = url.trim();

  // 1. YouTube (standard watch, shorts, share youtu.be, embed)
  const ytMatch = cleanUrl.match(
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i
  );
  if (ytMatch && ytMatch[1]) {
    return {
      type: 'youtube',
      videoId: ytMatch[1],
      embedUrl: `https://www.youtube-nocookie.com/embed/${ytMatch[1]}?autoplay=1&rel=0&playsinline=1&modestbranding=1`,
    };
  }

  // 2. Vimeo
  const vimeoMatch = cleanUrl.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  if (vimeoMatch && vimeoMatch[1]) {
    return {
      type: 'vimeo',
      videoId: vimeoMatch[1],
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1&playsinline=1&title=0&byline=0`,
    };
  }

  // 3. Google Drive
  const driveMatch = cleanUrl.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i);
  if (driveMatch && driveMatch[1]) {
    return {
      type: 'drive',
      videoId: driveMatch[1],
      embedUrl: `https://drive.google.com/file/d/${driveMatch[1]}/preview`,
    };
  }

  // 4. Server upload
  if (cleanUrl.includes('/api/videos/')) {
    return {
      type: 'server',
    };
  }

  // 5. Cloud upload (tmpfiles, file.io, catbox, etc.)
  if (cleanUrl.includes('tmpfiles.org') || cleanUrl.includes('file.io') || cleanUrl.includes('catbox.moe')) {
    return {
      type: 'cloud',
    };
  }

  // 6. Direct video stream file (.mp4, .webm, .mov, blob, etc.)
  if (/\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(cleanUrl) || cleanUrl.startsWith('blob:')) {
    return {
      type: 'direct',
    };
  }

  return {
    type: 'direct',
  };
}

export function formatDuration(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function buildWatchUrl(videoUrl: string, title: string, baseUrl?: string): string {
  const origin = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  const params = new URLSearchParams();
  params.set('watch', videoUrl);
  if (title) params.set('title', title);
  params.set('auto', '1');
  return `${origin}/?${params.toString()}`;
}
