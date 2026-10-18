import React from 'react';
import {
  Download,
  FileCode,
  Copy,
  ScanLine,
  Link as LinkIcon,
  Check,
  Play,
  Share2
} from 'lucide-react';
import { QRConfig } from '../types/index.ts';

interface QROutputCardProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  destinationUrl: string;
  config: QRConfig;
  onDownloadPNG: () => void;
  onDownloadSVG: () => void;
  onCopyImage: () => void;
  onOpenScannerModal: () => void;
  onOpenWatchPage: () => void;
  onShowToast: (msg: string, type?: 'success' | 'info') => void;
}

export const QROutputCard: React.FC<QROutputCardProps> = ({
  canvasRef,
  destinationUrl,
  config,
  onDownloadPNG,
  onDownloadSVG,
  onCopyImage,
  onOpenScannerModal,
  onOpenWatchPage,
  onShowToast,
}) => {
  const [copiedUrl, setCopiedUrl] = React.useState(false);

  const copyUrl = async () => {
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
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
            Live Scannable Output
          </h3>
        </div>
        <span className="text-xs font-mono text-slate-400 bg-slate-800/80 px-2.5 py-0.5 rounded-md border border-slate-700">
          {config.size}px • ECC: {config.errorCorrectionLevel}
        </span>
      </div>

      {/* QR Canvas Preview Stage */}
      <div className="w-full bg-checkerboard rounded-2xl border border-slate-800 p-6 flex flex-col items-center justify-center min-h-[340px] relative overflow-hidden">
        <div className="relative group transition-transform duration-200 hover:scale-[1.01]">
          <canvas
            ref={canvasRef}
            className="max-w-full h-auto rounded-2xl shadow-2xl border border-white/10"
          />
        </div>
      </div>

      {/* Encoded Destination Link Pill */}
      <div className="w-full mt-4 bg-slate-950 border border-slate-800/90 rounded-xl p-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <LinkIcon className="w-4 h-4 text-indigo-400 shrink-0" />
          <span className="text-xs text-slate-300 font-mono truncate">
            {destinationUrl}
          </span>
        </div>
        <button
          onClick={copyUrl}
          className="text-xs font-medium text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 px-2.5 py-1 rounded-lg border border-indigo-500/20 shrink-0 transition"
        >
          {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : 'Copy Link'}
        </button>
      </div>

      {/* Primary Download Actions */}
      <div className="w-full grid grid-cols-2 gap-3 mt-4">
        <button
          onClick={onDownloadPNG}
          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 transition active:scale-[0.99]"
        >
          <Download className="w-4 h-4" />
          <span>Download PNG</span>
        </button>
        <button
          onClick={onDownloadSVG}
          className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs sm:text-sm border border-slate-700 flex items-center justify-center gap-2 transition active:scale-[0.99]"
        >
          <FileCode className="w-4 h-4 text-indigo-400" />
          <span>Download SVG</span>
        </button>
      </div>

      {/* Secondary Actions */}
      <div className="w-full grid grid-cols-2 gap-3 mt-2.5">
        <button
          onClick={onCopyImage}
          className="w-full py-2.5 px-3 rounded-xl bg-slate-950 hover:bg-slate-800/80 text-slate-300 hover:text-white text-xs font-medium border border-slate-800 flex items-center justify-center gap-1.5 transition"
        >
          <Copy className="w-3.5 h-3.5 text-slate-400" />
          <span>Copy QR Image</span>
        </button>
        <button
          onClick={onOpenScannerModal}
          className="w-full py-2.5 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-xs font-medium border border-emerald-500/25 flex items-center justify-center gap-1.5 transition"
        >
          <ScanLine className="w-3.5 h-3.5 text-emerald-400" />
          <span>Test Scanner</span>
        </button>
      </div>

      {/* Test Play Video directly */}
      <button
        onClick={onOpenWatchPage}
        className="w-full mt-3 py-2 px-3 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 hover:text-indigo-200 text-xs font-medium border border-indigo-500/20 flex items-center justify-center gap-1.5 transition"
      >
        <Play className="w-3.5 h-3.5 fill-current" />
        <span>Watch Video Player (What Mobile Scanners See)</span>
      </button>
    </section>
  );
};
