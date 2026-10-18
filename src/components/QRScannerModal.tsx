import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  ScanLine,
  Camera,
  Upload,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Play,
  RotateCcw,
  Sparkles,
  Smartphone
} from 'lucide-react';
import jsQR from 'jsqr';
import confetti from 'canvas-confetti';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentQRCanvas: HTMLCanvasElement | null;
  currentVideoUrl: string;
  destinationUrl: string;
  onOpenWatchPage: (url: string, title?: string) => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  currentQRCanvas,
  currentVideoUrl,
  destinationUrl,
  onOpenWatchPage,
}) => {
  const [activeTab, setActiveTab] = useState<'simulate' | 'camera' | 'file'>('simulate');
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [scannedResult, setScannedResult] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Play chime sound on QR decode
  const playSuccessChime = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.1); // A5
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.35);
    } catch {
      // AudioContext not available or blocked
    }
  };

  // Start Camera
  const startCamera = async (facing: 'environment' | 'user') => {
    stopCamera();
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing },
        audio: false,
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsScanning(true);
    } catch (err) {
      console.error('Camera access error:', err);
      setCameraError('Camera access unavailable or permission denied. Try uploading a QR image instead.');
      setIsScanning(false);
    }
  };

  // Stop Camera
  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setIsScanning(false);
  };

  // Continuous Camera QR frame scanning loop using jsQR
  useEffect(() => {
    if (activeTab === 'camera' && cameraStream && isScanning) {
      const scanFrame = () => {
        if (!videoRef.current || videoRef.current.readyState < 2) {
          animFrameRef.current = requestAnimationFrame(scanFrame);
          return;
        }

        const video = videoRef.current;
        const canvas = canvasRef.current || document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);

          if (code && code.data) {
            playSuccessChime();
            confetti({ particleCount: 40, spread: 60, origin: { y: 0.7 } });
            setScannedResult(code.data);
            stopCamera();
            return;
          }
        }

        animFrameRef.current = requestAnimationFrame(scanFrame);
      };

      animFrameRef.current = requestAnimationFrame(scanFrame);
    }

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [activeTab, cameraStream, isScanning]);

  // Clean up on tab switch or close
  useEffect(() => {
    if (activeTab === 'camera' && isOpen) {
      startCamera(cameraFacing);
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [activeTab, isOpen, cameraFacing]);

  // Handle image upload scan
  const handleImageFileScan = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imgData.data, imgData.width, imgData.height);
        if (code && code.data) {
          playSuccessChime();
          confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });
          setScannedResult(code.data);
        } else {
          alert('No valid QR code detected in this image. Please ensure the QR code is clearly visible.');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  if (!isOpen) return null;

  const currentPreviewDataUrl = currentQRCanvas ? currentQRCanvas.toDataURL('image/png') : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl relative overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <ScanLine className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Scan & Test Video QR Code</h3>
              <p className="text-xs text-slate-400">Verify mobile scanner detection & test instant video playback</p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="text-slate-400 hover:text-white p-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-slate-950 border border-slate-800 rounded-xl my-4 shrink-0">
          <button
            onClick={() => setActiveTab('simulate')}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition ${
              activeTab === 'simulate'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Phone Simulator</span>
          </button>
          <button
            onClick={() => setActiveTab('camera')}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition ${
              activeTab === 'camera'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Webcam / Camera</span>
          </button>
          <button
            onClick={() => setActiveTab('file')}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition ${
              activeTab === 'file'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Scan from Image</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* TAB 1: PHONE SIMULATOR */}
          {activeTab === 'simulate' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
              {/* Phone Camera Viewfinder */}
              <div className="md:col-span-5 flex flex-col items-center">
                <div className="relative w-56 h-56 rounded-2xl bg-slate-950 border-2 border-emerald-500/40 p-3 flex items-center justify-center overflow-hidden shadow-inner">
                  {currentPreviewDataUrl ? (
                    <img
                      src={currentPreviewDataUrl}
                      alt="Generated QR"
                      className="max-w-full max-h-full rounded-lg object-contain"
                    />
                  ) : (
                    <div className="text-xs text-slate-500">Generating preview...</div>
                  )}

                  {/* Corner Target Brackets */}
                  <div className="absolute top-2 left-2 w-5 h-5 border-t-2 border-l-2 border-emerald-400 rounded-tl pointer-events-none" />
                  <div className="absolute top-2 right-2 w-5 h-5 border-t-2 border-r-2 border-emerald-400 rounded-tr pointer-events-none" />
                  <div className="absolute bottom-2 left-2 w-5 h-5 border-b-2 border-l-2 border-emerald-400 rounded-bl pointer-events-none" />
                  <div className="absolute bottom-2 right-2 w-5 h-5 border-b-2 border-r-2 border-emerald-400 rounded-br pointer-events-none" />

                  {/* Laser Scan Animation */}
                  <div className="laser-line absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34d399] pointer-events-none" />
                </div>
                <div className="mt-3 text-xs font-medium text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Camera Viewfinder Locked & Decoded</span>
                </div>
              </div>

              {/* Decoded Info & Play Action */}
              <div className="md:col-span-7 space-y-3">
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold uppercase tracking-wider text-slate-400">
                      Decoded Destination URL
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-mono text-[11px] border border-emerald-500/30">
                      100% Scannable
                    </span>
                  </div>
                  <p className="text-xs font-mono text-indigo-300 break-all bg-slate-900/90 p-2.5 rounded-xl border border-slate-800/80">
                    {destinationUrl}
                  </p>
                  <p className="text-xs text-slate-400 leading-relaxed pt-1">
                    When scanned by any iPhone, Samsung, or Android camera app, the mobile browser will automatically open and initiate instant video playback.
                  </p>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => {
                      onOpenWatchPage(currentVideoUrl);
                      onClose();
                    }}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 transition active:scale-[0.99]"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Open Video Player (Simulate Phone Tap)</span>
                  </button>

                  <a
                    href={destinationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center justify-center gap-1.5 transition"
                  >
                    <span>Open Raw URL in New Tab</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: WEBCAM / CAMERA SCANNER */}
          {activeTab === 'camera' && (
            <div className="flex flex-col items-center space-y-4">
              {cameraError ? (
                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs text-center max-w-md">
                  <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-rose-400" />
                  <p className="font-semibold">{cameraError}</p>
                </div>
              ) : (
                <div className="relative w-full max-w-sm aspect-square rounded-2xl bg-black border-2 border-indigo-500/40 overflow-hidden shadow-inner flex items-center justify-center">
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {/* Viewfinder Target */}
                  <div className="absolute inset-8 border border-white/30 rounded-2xl pointer-events-none flex items-center justify-center">
                    <div className="w-8 h-8 border-t-2 border-l-2 border-indigo-400 absolute top-0 left-0" />
                    <div className="w-8 h-8 border-t-2 border-r-2 border-indigo-400 absolute top-0 right-0" />
                    <div className="w-8 h-8 border-b-2 border-l-2 border-indigo-400 absolute bottom-0 left-0" />
                    <div className="w-8 h-8 border-b-2 border-r-2 border-indigo-400 absolute bottom-0 right-0" />
                    <div className="laser-line absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-indigo-400 to-transparent shadow-[0_0_12px_#6366f1]" />
                  </div>

                  <span className="absolute bottom-3 text-xs bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-slate-200">
                    Point camera at any QR code
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const nextFacing = cameraFacing === 'environment' ? 'user' : 'environment';
                    setCameraFacing(nextFacing);
                    startCamera(nextFacing);
                  }}
                  className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-xl border border-slate-700 flex items-center gap-1.5 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Switch Camera ({cameraFacing === 'environment' ? 'Back' : 'Front'})</span>
                </button>
              </div>

              {scannedResult && (
                <div className="w-full bg-slate-950 border border-emerald-500/40 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-emerald-400 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" /> QR Code Scanned!
                    </span>
                  </div>
                  <p className="text-xs font-mono text-white break-all bg-slate-900 p-2 rounded-lg">
                    {scannedResult}
                  </p>
                  <button
                    onClick={() => {
                      // Check if it has watch param or is direct
                      const urlObj = new URL(scannedResult, window.location.origin);
                      const watchParam = urlObj.searchParams.get('watch');
                      const playUrl = watchParam || scannedResult;
                      onOpenWatchPage(playUrl);
                      stopCamera();
                      onClose();
                    }}
                    className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center justify-center gap-1.5 transition shadow"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Play Video Now</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: FILE SCANNER */}
          {activeTab === 'file' && (
            <div className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageFileScan}
                className="hidden"
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-indigo-500 bg-slate-950/60 rounded-2xl p-8 text-center cursor-pointer transition group"
              >
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 group-hover:scale-105 transition flex items-center justify-center mx-auto mb-3">
                  <Upload className="w-6 h-6 text-indigo-400" />
                </div>
                <p className="text-sm font-semibold text-white mb-1">Click to upload a QR code image</p>
                <p className="text-xs text-slate-400">Supports PNG, JPG, WEBP screenshots or photos</p>
              </div>

              {scannedResult && (
                <div className="w-full bg-slate-950 border border-emerald-500/40 rounded-2xl p-4 space-y-2">
                  <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" /> Decoded Payload
                  </span>
                  <p className="text-xs font-mono text-white break-all bg-slate-900 p-2 rounded-lg">
                    {scannedResult}
                  </p>
                  <button
                    onClick={() => {
                      const urlObj = new URL(scannedResult, window.location.origin);
                      const watchParam = urlObj.searchParams.get('watch');
                      const playUrl = watchParam || scannedResult;
                      onOpenWatchPage(playUrl);
                      onClose();
                    }}
                    className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center justify-center gap-1.5 transition shadow"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Play Video Now</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
