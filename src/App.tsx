/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  CheckCircle2,
  AlertTriangle,
  Info,
  Sparkles,
  QrCode,
  History,
  Trash2,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { Navbar } from './components/Navbar.tsx';
import { VideoInputCard } from './components/VideoInputCard.tsx';
import { QRCustomizer } from './components/QRCustomizer.tsx';
import { QROutputCard } from './components/QROutputCard.tsx';
import { WatchPage } from './components/WatchPage.tsx';
import { QRScannerModal } from './components/QRScannerModal.tsx';
import { InfoModal } from './components/InfoModal.tsx';
import { SavedQRsModal } from './components/SavedQRsModal.tsx';
import { AccountDashboardModal } from './components/AccountDashboardModal.tsx';
import { GoogleAuthModal } from './components/GoogleAuthModal.tsx';
import { useAuth, CloudQRCode } from './context/AuthContext.tsx';
import { QRConfig, QRHistoryItem, QRTargetMode, ErrorCorrectionLevel, CenterLogoMode } from './types/index.ts';
import { buildWatchUrl } from './utils/videoHelper.ts';
import { renderQRToCanvas, exportQRAsSVG } from './utils/qrRenderer.ts';

const DEFAULT_CONFIG: QRConfig = {
  targetMode: 'watch-page',
  fgColor: '#0f172a',
  bgColor: '#ffffff',
  size: 340,
  errorCorrectionLevel: 'H',
  logoMode: 'play',
  customLogoDataUrl: null,
  includeBanner: true,
  bannerText: 'SCAN TO WATCH VIDEO',
};

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
}

export default function App() {
  // Navigation & Routing State
  const [currentWatchUrl, setCurrentWatchUrl] = useState<string | null>(null);
  const [currentWatchTitle, setCurrentWatchTitle] = useState<string>('');

  // Video State
  const [videoUrl, setVideoUrl] = useState<string>(
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
  );
  const [publicVideoUrl, setPublicVideoUrl] = useState<string>('');
  const [videoTitle, setVideoTitle] = useState<string>('High Sierra Trail — 4K Stream');

  // QR Customization State
  const [qrConfig, setQrConfig] = useState<QRConfig>(DEFAULT_CONFIG);

  // Auth & Cloud Sync
  const { user, signInWithGoogle, saveCurrentQRToCloud, authError, clearAuthError } = useAuth();
  const [isCloudModalOpen, setIsCloudModalOpen] = useState(false);

  // Modals & Popups
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  // History State
  const [history, setHistory] = useState<QRHistoryItem[]>([]);

  // Toast Notifications
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Canvas Reference
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const customLogoImgRef = useRef<HTMLImageElement | null>(null);

  // Show Toast Helper
  const showToast = useCallback(
    (message: string, type: 'success' | 'info' | 'warning' | 'error' = 'success') => {
      const id = Date.now().toString() + Math.random().toString();
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3400);
    },
    []
  );

  // Check URL query parameters or hash on initial mount (for QR code scan landing)
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const watchParam = urlParams.get('watch') || urlParams.get('v');
      const titleParam = urlParams.get('title') || '';

      if (watchParam) {
        setCurrentWatchUrl(watchParam);
        setCurrentWatchTitle(titleParam);
      }
    } catch (e) {
      console.error('Error parsing route params:', e);
    }
  }, []);

  // Load history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('vidqr_history');
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    } catch {
      // Storage unavailable or disabled
    }
  }, []);

  // Save history to localStorage
  const saveToHistory = useCallback((destUrl: string, vidUrl: string, title: string) => {
    try {
      setHistory((prev) => {
        const filtered = prev.filter((item) => item.videoUrl !== vidUrl);
        const updated: QRHistoryItem[] = [
          {
            id: Date.now().toString(),
            title: title || 'Scanned Video',
            videoUrl: vidUrl,
            destinationUrl: destUrl,
            createdAt: Date.now(),
          },
          ...filtered,
        ].slice(0, 6);
        localStorage.setItem('vidqr_history', JSON.stringify(updated));
        return updated;
      });
    } catch {
      // ignore
    }
  }, []);

  const [appBaseUrl, setAppBaseUrl] = useState<string>('');

  // Fetch server info for public APP_URL
  useEffect(() => {
    fetch('/api/app-info')
      .then((res) => res.json())
      .then((data) => {
        if (data.appUrl) {
          setAppBaseUrl(data.appUrl);
        }
      })
      .catch(() => {});
  }, []);

  // Compute live destination URL based on mode
  const effectiveStreamUrl = publicVideoUrl || videoUrl;
  const destinationUrl =
    qrConfig.targetMode === 'watch-page'
      ? buildWatchUrl(effectiveStreamUrl, videoTitle, appBaseUrl || (typeof window !== 'undefined' ? window.location.origin : ''))
      : effectiveStreamUrl;

  // Load custom logo image if provided
  useEffect(() => {
    if (qrConfig.customLogoDataUrl) {
      const img = new Image();
      img.onload = () => {
        customLogoImgRef.current = img;
        triggerRender();
      };
      img.src = qrConfig.customLogoDataUrl;
    } else {
      customLogoImgRef.current = null;
    }
  }, [qrConfig.customLogoDataUrl]);

  // Master Canvas QR Renderer Trigger
  const triggerRender = useCallback(async () => {
    if (!canvasRef.current) return;
    try {
      await renderQRToCanvas(
        canvasRef.current,
        destinationUrl,
        qrConfig,
        customLogoImgRef.current
      );
    } catch (err) {
      console.error('Failed to render QR Code:', err);
    }
  }, [destinationUrl, qrConfig]);

  useEffect(() => {
    triggerRender();
  }, [triggerRender]);

  // Download Handlers
  const handleDownloadPNG = () => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    const a = document.createElement('a');
    a.download = `video-qr-${Date.now()}.png`;
    a.href = dataUrl;
    document.body.appendChild(a);
    a.click();
    a.remove();
    confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });
    showToast('High-resolution PNG QR Code downloaded!', 'success');
    saveToHistory(destinationUrl, videoUrl, videoTitle);
  };

  const handleDownloadSVG = async () => {
    try {
      const svgString = await exportQRAsSVG(destinationUrl, qrConfig);
      const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.download = `video-qr-${Date.now()}.svg`;
      a.href = url;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });
      showToast('Crisp Vector SVG QR Code downloaded!', 'success');
      saveToHistory(destinationUrl, videoUrl, videoTitle);
    } catch {
      showToast('Could not generate SVG.', 'error');
    }
  };

  const handleCopyImage = async () => {
    if (!canvasRef.current) return;
    try {
      canvasRef.current.toBlob(async (blob) => {
        if (!blob) return;
        if (navigator.clipboard && window.ClipboardItem) {
          try {
            const item = new ClipboardItem({ 'image/png': blob });
            await navigator.clipboard.write([item]);
            showToast('QR Code image copied to clipboard!', 'success');
            return;
          } catch {
            // fallback
          }
        }
        showToast('Image copy not supported in this browser; downloaded PNG instead.', 'info');
        handleDownloadPNG();
      });
    } catch {
      showToast('Unable to copy image.', 'error');
    }
  };

  const handleSaveToCloud = async () => {
    if (!user) {
      try {
        await signInWithGoogle();
        showToast('Signed in with Google! Click save again to store your QR code.', 'info');
      } catch {
        showToast('Google sign-in was cancelled.', 'error');
      }
      return;
    }
    const saved = await saveCurrentQRToCloud(videoTitle, videoUrl, destinationUrl, qrConfig);
    if (saved) {
      confetti({ particleCount: 35, spread: 55, origin: { y: 0.8 } });
      showToast('Saved video QR code to your Google account!', 'success');
    } else {
      showToast('Could not save QR code to cloud.', 'error');
    }
  };

  const handleLoadCloudQR = (qr: CloudQRCode) => {
    setVideoUrl(qr.videoUrl);
    setVideoTitle(qr.title);
    setQrConfig({
      targetMode: qr.targetMode as QRTargetMode,
      fgColor: qr.fgColor,
      bgColor: qr.bgColor,
      size: qr.size,
      errorCorrectionLevel: qr.errorCorrectionLevel as ErrorCorrectionLevel,
      logoMode: qr.logoMode as CenterLogoMode,
      customLogoDataUrl: null,
      includeBanner: qr.includeBanner,
      bannerText: qr.bannerText,
    });
    showToast(`Loaded "${qr.title}" from your cloud library!`, 'info');
  };

  const handleDownloadPNGFromQRItem = async (qr: CloudQRCode) => {
    try {
      const offscreen = document.createElement('canvas');
      const itemConfig: QRConfig = {
        targetMode: qr.targetMode as QRTargetMode,
        fgColor: qr.fgColor,
        bgColor: qr.bgColor,
        size: qr.size || 340,
        errorCorrectionLevel: qr.errorCorrectionLevel as ErrorCorrectionLevel,
        logoMode: qr.logoMode as CenterLogoMode,
        customLogoDataUrl: null,
        includeBanner: qr.includeBanner,
        bannerText: qr.bannerText || 'SCAN TO WATCH',
      };
      await renderQRToCanvas(offscreen, qr.destinationUrl, itemConfig);
      const dataUrl = offscreen.toDataURL('image/png');
      const a = document.createElement('a');
      a.download = `${qr.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-qr.png`;
      a.href = dataUrl;
      document.body.appendChild(a);
      a.click();
      a.remove();
      showToast(`Downloaded PNG for ${qr.title}!`, 'success');
    } catch {
      showToast('Error downloading QR code', 'error');
    }
  };

  const handleDownloadSVGFromQRItem = async (qr: CloudQRCode) => {
    try {
      const itemConfig: QRConfig = {
        targetMode: qr.targetMode as QRTargetMode,
        fgColor: qr.fgColor,
        bgColor: qr.bgColor,
        size: qr.size || 340,
        errorCorrectionLevel: qr.errorCorrectionLevel as ErrorCorrectionLevel,
        logoMode: qr.logoMode as CenterLogoMode,
        customLogoDataUrl: null,
        includeBanner: qr.includeBanner,
        bannerText: qr.bannerText || 'SCAN TO WATCH',
      };
      const svgString = await exportQRAsSVG(qr.destinationUrl, itemConfig);
      const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.download = `${qr.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-qr.svg`;
      a.href = url;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      showToast(`Downloaded vector SVG for ${qr.title}!`, 'success');
    } catch {
      showToast('Error downloading SVG', 'error');
    }
  };

  const resetConfig = () => {
    setQrConfig(DEFAULT_CONFIG);
    showToast('Reset QR customizations to default.', 'info');
  };

  const scrollToGenerator = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // If in Watch Mode (someone scanned the QR or clicked Watch Video), show dedicated Watch Page!
  if (currentWatchUrl) {
    return (
      <WatchPage
        videoUrl={currentWatchUrl}
        videoTitle={currentWatchTitle}
        onReturnToStudio={() => {
          // Remove query params from address bar without reloading
          const newUrl = window.location.pathname;
          window.history.pushState({}, '', newUrl);
          setCurrentWatchUrl(null);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Toast Notification Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl backdrop-blur-md transition-all ${
              toast.type === 'success'
                ? 'border-emerald-500/40 bg-slate-900/95 text-emerald-300'
                : toast.type === 'error'
                ? 'border-rose-500/40 bg-slate-900/95 text-rose-300'
                : toast.type === 'warning'
                ? 'border-amber-500/40 bg-slate-900/95 text-amber-300'
                : 'border-indigo-500/40 bg-slate-900/95 text-indigo-300'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />}
            {toast.type === 'error' && <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />}
            {toast.type === 'warning' && <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />}
            {toast.type === 'info' && <Info className="w-4 h-4 shrink-0 text-indigo-400" />}
            <span className="text-xs font-medium text-white">{toast.message}</span>
          </div>
        ))}
      </div>

      {/* Top Navbar adhering strictly to Top Bar Contract */}
      <Navbar
        onOpenScanner={() => setIsScannerOpen(true)}
        onOpenInfo={() => setIsInfoOpen(true)}
        onSelectPreset={() => {
          setVideoUrl('https://www.youtube.com/watch?v=aqz-KE-bpKQ');
          setPublicVideoUrl('');
          setVideoTitle('Big Buck Bunny 4K (YouTube)');
          showToast('Loaded YouTube 4K Demo Preset!', 'info');
        }}
        onScrollToGenerator={scrollToGenerator}
        onOpenCloudModal={() => setIsCloudModalOpen(true)}
      />

      {/* Main Content Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Hero Banner / Value Prop Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-slate-800/80">
          <div>
            <div className="flex items-center gap-2 mb-2 text-xs font-medium text-indigo-400">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Full-Stack Video to QR Code Generator & Cinema Player</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Scan to Play Any Video on Mobile
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1.5 max-w-2xl leading-relaxed">
              Generate scannable QR codes for MP4s, YouTube clips, Vimeo, or uploaded video files.
              When scanned with any smartphone camera, the video immediately launches in full-screen cinema playback!
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setIsInfoOpen(true)}
              className="text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700 px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
            >
              <Info className="w-4 h-4 text-indigo-400" />
              <span>How It Works</span>
            </button>
            <button
              onClick={() => setIsScannerOpen(true)}
              className="text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/25 px-4 py-2 rounded-xl flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
            >
              <QrCode className="w-4 h-4" />
              <span>Test & Scan QR</span>
            </button>
          </div>
        </div>

        {/* 2-Column Responsive Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* Left Column: Video Input & Customizer (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            <VideoInputCard
              currentUrl={videoUrl}
              videoTitle={videoTitle}
              onUrlChange={(url) => {
                setVideoUrl(url);
                setPublicVideoUrl('');
              }}
              onPublicUrlChange={(pubUrl) => {
                setPublicVideoUrl(pubUrl);
              }}
              onTitleChange={setVideoTitle}
              onShowToast={showToast}
            />

            <QRCustomizer
              config={qrConfig}
              onChange={(updated) => setQrConfig((prev) => ({ ...prev, ...updated }))}
              onReset={resetConfig}
              onShowToast={showToast}
            />
          </div>

          {/* Right Column: QR Output Card & Live Canvas (5 Cols, Sticky) */}
          <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-6">
            <QROutputCard
              canvasRef={canvasRef}
              destinationUrl={destinationUrl}
              config={qrConfig}
              onDownloadPNG={handleDownloadPNG}
              onDownloadSVG={handleDownloadSVG}
              onCopyImage={handleCopyImage}
              onOpenScannerModal={() => setIsScannerOpen(true)}
              onOpenWatchPage={() => {
                setCurrentWatchUrl(videoUrl);
                setCurrentWatchTitle(videoTitle);
              }}
              onSaveToCloud={handleSaveToCloud}
              onShowToast={showToast}
            />

            {/* Quick History Card */}
            {history.length > 0 && (
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-300">
                    <History className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Recent Video QRs</span>
                  </div>
                  <button
                    onClick={() => {
                      setHistory([]);
                      localStorage.removeItem('vidqr_history');
                      showToast('Cleared history', 'info');
                    }}
                    className="text-[11px] text-slate-500 hover:text-rose-400 flex items-center gap-1 transition"
                  >
                    <Trash2 className="w-3 h-3" /> Clear
                  </button>
                </div>

                <div className="space-y-2">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        setVideoUrl(item.videoUrl);
                        setVideoTitle(item.title);
                        showToast(`Switched to: ${item.title}`, 'info');
                      }}
                      className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-indigo-500/50 cursor-pointer transition flex items-center justify-between gap-3 group"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-white truncate group-hover:text-indigo-400 transition">
                          {item.title}
                        </p>
                        <p className="text-[11px] text-slate-500 font-mono truncate">
                          {item.videoUrl}
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition shrink-0" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <p>VidQR Studio · Instant Video to QR Code Generator & Mobile Cinema Player</p>
      </footer>

      {/* Interactive QR Scanner & Verification Modal */}
      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        currentQRCanvas={canvasRef.current}
        currentVideoUrl={videoUrl}
        destinationUrl={destinationUrl}
        onOpenWatchPage={(url, title) => {
          setCurrentWatchUrl(url);
          setCurrentWatchTitle(title || videoTitle);
        }}
      />

      {/* Educational How It Works Modal */}
      <InfoModal isOpen={isInfoOpen} onClose={() => setIsInfoOpen(false)} />

      {/* Account & Uploads Management Dashboard */}
      <AccountDashboardModal
        isOpen={isCloudModalOpen}
        onClose={() => setIsCloudModalOpen(false)}
        onLoadQR={handleLoadCloudQR}
        onOpenWatchPage={(url, title) => {
          setCurrentWatchUrl(url);
          setCurrentWatchTitle(title);
        }}
        onDownloadPNGFromUrl={handleDownloadPNGFromQRItem}
        onDownloadSVGFromUrl={handleDownloadSVGFromQRItem}
        onShowToast={showToast}
      />

      {/* Google Auth Vercel Helper & Diagnostic Modal */}
      <GoogleAuthModal
        isOpen={!!authError}
        onClose={clearAuthError}
        errorCode={authError?.code}
        errorMessage={authError?.message}
      />
    </div>
  );
}
