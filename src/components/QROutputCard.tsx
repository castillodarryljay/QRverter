import React from 'react';
import {
  Download,
  FileCode,
  Copy,
  ScanLine,
  Link as LinkIcon,
  Check,
  Play,
  Cloud,
  Bookmark
} from 'lucide-react';
import { QRConfig } from '../types/index.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface QROutputCardProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  destinationUrl: string;
  config: QRConfig;
  isCloudReady?: boolean;
  uploadState?: 'idle' | 'compressing' | 'uploading' | 'ready' | 'error';
  onDownloadPNG: () => void;
  onDownloadSVG: () => void;
  onCopyImage: () => void;
  onOpenScannerModal: () => void;
  onOpenWatchPage: () => void;
  onSaveToCloud: () => void;
  onShowToast: (msg: string, type?: 'success' | 'info') => void;
}

export const QROutputCard: React.FC<QROutputCardProps> = ({
  canvasRef,
  destinationUrl,
  config,
  isCloudReady = true,
  uploadState = 'idle',
  onDownloadPNG,
  onDownloadSVG,
  onCopyImage,
  onOpenScannerModal,
  onOpenWatchPage,
  onSaveToCloud,
  onShowToast,
}) => {
  const { user } = useAuth();
  const [copiedUrl, setCopiedUrl] = React.useState(false);
  const [isSaved, setIsSaved] = React.useState(false);

  const copyUrl = async () => {
    if (!destinationUrl) {
      onShowToast('Destination URL is being generated...', 'info');
      return;
    }
    try {
      await navigator.clipboard.writeText(destinationUrl);
      setCopiedUrl(true);
      onShowToast('Destination URL copied to clipboard!', 'success');
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch {
      onShowToast('Could not copy URL', 'info');
    }
  };

  return (
    <section className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xl flex flex-col items-center">
      {/* Header */}
      <div className="w-full flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${isCloudReady ? 'bg-emerald-400' : 'bg-amber-400 animate-ping'}`} />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
            {isCloudReady ? 'Live Scannable Output' : 'Preparing Mobile Stream...'}
          </h3>
        </div>
        <span className="text-xs font-mono text-slate-400 bg-slate-800/80 px-2.5 py-0.5 rounded-md border border-slate-700">
          {config.size}px • ECC: {config.errorCorrectionLevel}
        </span>
      </div>

      {/* QR Canvas Preview Stage */}
      <div className="w-full bg-checkerboard rounded-2xl border border-slate-800 p-6 flex flex-col items-center justify-center min-h-[340px] relative overflow-hidden">
        {!isCloudReady ? (
          <div className="flex flex-col items-center justify-center p-6 text-center space-y-3 z-20">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 animate-spin">
              <Cloud className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">
                {uploadState === 'compressing'
                  ? 'Optimizing Video Bitrate...'
                  : 'Syncing to Cloud for Mobile QR...'}
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
                Hosting compressed stream so mobile camera scanners (iOS & Android) can play smoothly anywhere.
              </p>
            </div>
          </div>
        ) : (
          <div className="relative group transition-transform duration-200 hover:scale-[1.01]">
            <canvas
              ref={canvasRef}
              className="max-w-full h-auto rounded-2xl shadow-2xl border border-white/10"
            />
          </div>
        )}
      </div>

      {/* Cloud Stream Status Indicator */}
      {!isCloudReady ? (
        <div className="w-full mt-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
          <span>Generating cloud video stream... Scannable QR will appear automatically.</span>
        </div>
      ) : destinationUrl.includes('fs:') ? (
        <div className="w-full mt-3 p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
            <span>Cloud Database Stream (100% Mobile Scannable)</span>
          </span>
          <span className="text-[10px] bg-emerald-500/20 px-1.5 py-0.5 rounded font-mono">Live</span>
        </div>
      ) : destinationUrl.includes('firebasestorage.googleapis.com') ? (
        <div className="w-full mt-3 p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
            <span>Firebase Cloud Storage Stream (Scannable on all phones)</span>
          </span>
          <span className="text-[10px] bg-emerald-500/20 px-1.5 py-0.5 rounded font-mono">CDN</span>
        </div>
      ) : null}

      {/* Encoded Destination Link Pill */}
      <div className="w-full mt-3 bg-slate-950 border border-slate-800/90 rounded-xl p-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <LinkIcon className="w-4 h-4 text-indigo-400 shrink-0" />
          <span className="text-xs text-slate-300 font-mono truncate">
            {destinationUrl || 'Generating cloud stream URL...'}
          </span>
        </div>
        <button
          onClick={copyUrl}
          disabled={!isCloudReady}
          className={`text-xs font-medium px-2.5 py-1 rounded-lg border shrink-0 transition ${
            isCloudReady
              ? 'text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border-indigo-500/20'
              : 'text-slate-600 bg-slate-900 border-slate-800 cursor-not-allowed'
          }`}
        >
          {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : 'Copy Link'}
        </button>
      </div>

      {/* Primary Download Actions */}
      <div className="w-full grid grid-cols-2 gap-3 mt-4">
        <button
          onClick={onDownloadPNG}
          disabled={!isCloudReady}
          className={`w-full py-3 px-4 rounded-xl font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition active:scale-[0.99] ${
            isCloudReady
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-600/25 cursor-pointer'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-60'
          }`}
        >
          <Download className="w-4 h-4" />
          <span>Download PNG</span>
        </button>
        <button
          onClick={onDownloadSVG}
          disabled={!isCloudReady}
          className={`w-full py-3 px-4 rounded-xl font-semibold text-xs sm:text-sm border flex items-center justify-center gap-2 transition active:scale-[0.99] ${
            isCloudReady
              ? 'bg-slate-800 hover:bg-slate-700 text-white border-slate-700 cursor-pointer'
              : 'bg-slate-800 text-slate-500 border-slate-800 cursor-not-allowed opacity-60'
          }`}
        >
          <FileCode className="w-4 h-4 text-indigo-400" />
          <span>Download SVG</span>
        </button>
      </div>

      {/* Secondary Actions */}
      <div className="w-full grid grid-cols-2 gap-3 mt-2.5">
        <button
          onClick={onCopyImage}
          disabled={!isCloudReady}
          className={`w-full py-2.5 px-3 rounded-xl text-xs font-medium border flex items-center justify-center gap-1.5 transition ${
            isCloudReady
              ? 'bg-slate-950 hover:bg-slate-800/80 text-slate-300 hover:text-white border-slate-800 cursor-pointer'
              : 'bg-slate-950 text-slate-600 border-slate-900 cursor-not-allowed'
          }`}
        >
          <Copy className="w-3.5 h-3.5 text-slate-400" />
          <span>Copy QR Image</span>
        </button>
        <button
          onClick={onOpenScannerModal}
          className="w-full py-2.5 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-xs font-medium border border-emerald-500/25 flex items-center justify-center gap-1.5 transition cursor-pointer"
        >
          <ScanLine className="w-3.5 h-3.5 text-emerald-400" />
          <span>Test Scanner</span>
        </button>
      </div>

      {/* Save to Cloud Button */}
      <button
        onClick={() => {
          onSaveToCloud();
          setIsSaved(true);
          setTimeout(() => setIsSaved(false), 2400);
        }}
        className="w-full mt-2.5 py-2 px-3 rounded-xl bg-slate-950 hover:bg-slate-800/80 text-indigo-400 hover:text-indigo-300 text-xs font-medium border border-indigo-500/30 flex items-center justify-center gap-1.5 transition cursor-pointer"
      >
        <Cloud className="w-3.5 h-3.5" />
        <span>{user ? (isSaved ? 'Saved to Google Account!' : 'Save QR to Google Account') : 'Sign in with Google to Save'}</span>
      </button>

      {/* Test Play Video directly */}
      <button
        onClick={onOpenWatchPage}
        className="w-full mt-2.5 py-2 px-3 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 hover:text-indigo-200 text-xs font-medium border border-indigo-500/20 flex items-center justify-center gap-1.5 transition cursor-pointer"
      >
        <Play className="w-3.5 h-3.5 fill-current" />
        <span>Watch Video Player (What Mobile Scanners See)</span>
      </button>
    </section>
  );
};
