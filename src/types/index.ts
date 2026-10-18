export type VideoSourceType = 'direct' | 'youtube' | 'vimeo' | 'drive' | 'cloud' | 'server';

export interface VideoItem {
  id: string;
  title: string;
  url: string;
  sourceType: VideoSourceType;
  fileSize?: number;
  fileName?: string;
  duration?: number;
  createdAt: number;
}

export type QRTargetMode = 'watch-page' | 'direct-link';

export type ErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';

export type CenterLogoMode = 'none' | 'play' | 'youtube' | 'video' | 'custom';

export interface QRConfig {
  targetMode: QRTargetMode;
  fgColor: string;
  bgColor: string;
  size: number;
  errorCorrectionLevel: ErrorCorrectionLevel;
  logoMode: CenterLogoMode;
  customLogoDataUrl: string | null;
  includeBanner: boolean;
  bannerText: string;
}

export interface QRHistoryItem {
  id: string;
  title: string;
  videoUrl: string;
  destinationUrl: string;
  thumbnail?: string;
  createdAt: number;
}
