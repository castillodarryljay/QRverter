import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  RotateCcw,
  RotateCw,
  Repeat,
  Share2,
  ExternalLink,
  QrCode,
  ArrowLeft,
  Sparkles,
  Check,
  Film
} from 'lucide-react';
import { detectVideoSource, formatDuration } from '../utils/videoHelper.ts';
import { fetchVideoFromFirestore } from '../utils/firestoreVideoStore.ts';

interface WatchPageProps {
  videoUrl: string;
  videoTitle?: string;
  onReturnToStudio: () => void;
}

export const WatchPage: React.FC<WatchPageProps> = ({
  videoUrl,
  videoTitle,
  onReturnToStudio,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showTapForSound, setShowTapForSound] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isLooping, setIsLooping] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Firestore cloud stream state
  const isFsUrl = videoUrl.startsWith('fs:');
  const [resolvedUrl, setResolvedUrl] = useState<string>(isFsUrl ? '' : videoUrl);
  const [isLoadingFirestore, setIsLoadingFirestore] = useState<boolean>(isFsUrl);
  const [firestoreProgress, setFirestoreProgress] = useState<number>(0);
  const [playerError, setPlayerError] = useState<string | null>(null);

  // Fetch from Firestore if URL is an fs: ID
  useEffect(() => {
    if (videoUrl.startsWith('fs:')) {
      const vidId = videoUrl.replace('fs:', '');
      setIsLoadingFirestore(true);
      setFirestoreProgress(10);
      setPlayerError(null);

      fetchVideoFromFirestore(vidId, (p) => setFirestoreProgress(p))
        .then((res) => {
          setResolvedUrl(res.blobUrl);
          setIsLoadingFirestore(false);
        })
        .catch((err) => {
          console.error('Failed to load video from Firestore:', err);
          setPlayerError('Could not load video from cloud database. The video may have expired or been removed.');
          setIsLoadingFirestore(false);
        });
    } else if (videoUrl.startsWith('blob:')) {
      // If someone scanned a local blob URL from a desktop session
      setPlayerError(
        'This QR code contains a local session link that only exists in the PC memory where it was created. Please regenerate the QR code using the updated Cloud Stream!'
      );
      setIsLoadingFirestore(false);
    } else {
      setResolvedUrl(videoUrl);
      setIsLoadingFirestore(false);
      setPlayerError(null);
    }
  }, [videoUrl]);

  const videoMeta = detectVideoSource(resolvedUrl || videoUrl);
  const isEmbed = ['youtube', 'vimeo', 'drive'].includes(videoMeta.type);

  // Autoplay attempt on mount for direct HTML5 video once resolvedUrl is ready
  useEffect(() => {
    if (!videoRef.current || isEmbed || !resolvedUrl) return;

    const video = videoRef.current;
    video.load();
    video.muted = true; // Mobile autoplay policy requires muted initially
    video.playbackRate = 1.0; // Strictly normal 1.0x natural speed
    setIsMuted(true);
    setPlaybackRate(1);

    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setIsPlaying(true);
          setShowTapForSound(true);
        })
        .catch(() => {
          setIsPlaying(false);
          setShowTapForSound(true);
        });
    }
  }, [resolvedUrl, isEmbed]);

  // Handle Fullscreen changes
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const handleUserActivity = () => {
    setControlsVisible(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setControlsVisible(false);
      }
    }, 3200);
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const unmuteAndPlay = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = false;
    setIsMuted(false);
    setShowTapForSound(false);
    videoRef.current.play();
    setIsPlaying(true);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMuted = !videoRef.current.muted;
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
    if (!nextMuted) setShowTapForSound(false);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
      if (val > 0) setShowTapForSound(false);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      videoRef.current.playbackRate = playbackRate || 1.0;
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = val;
      setCurrentTime(val);
    }
  };

  const skipTime = (delta: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.min(Math.max(videoRef.current.currentTime + delta, 0), duration);
    }
  };

  const changeSpeed = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
  };

  const toggleLoop = () => {
    const nextLoop = !isLooping;
    setIsLooping(nextLoop);
    if (videoRef.current) {
      videoRef.current.loop = nextLoop;
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: videoTitle || 'Watch Video — VidQR',
          url: shareUrl,
        });
        return;
      } catch {
        // Fallback to copy
      }
    }
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2400);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Top Bar */}
      <header className="border-b border-slate-800/80 bg-slate-900/70 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onReturnToStudio}
            className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700/80 px-3 py-1.5 rounded-lg border border-slate-700 transition"
          >
            <ArrowLeft className="w-4 h-4 text-indigo-400" />
            <span className="hidden sm:inline">Back to Studio</span>
            <span className="sm:hidden">Studio</span>
          </button>
          <div className="h-4 w-px bg-slate-800 hidden sm:block" />
          <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            Scanned Video Stream
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 text-xs font-medium bg-slate-800/80 hover:bg-slate-800 text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700 transition"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-indigo-400" />
                <span>Share</span>
              </>
            )}
          </button>

          {resolvedUrl && resolvedUrl.startsWith('http') && (
            <a
              href={resolvedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg shadow-sm transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Direct Link</span>
            </a>
          )}
        </div>
      </header>

      {/* Main Cinema Viewport */}
      <main className="flex-1 flex flex-col items-center justify-center p-3 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto">
        {/* Title & Metadata Header */}
        <div className="w-full mb-3 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
            <h1 className="text-sm sm:text-base font-semibold text-white truncate">
              {videoTitle || 'Scanned Video Playback'}
            </h1>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-slate-500 font-mono text-[11px] uppercase tracking-wider">
              {videoMeta.type === 'youtube'
                ? 'YouTube HD'
                : videoMeta.type === 'vimeo'
                ? 'Vimeo Stream'
                : 'Direct Stream'}
            </span>
          </div>
        </div>

        {/* Player Container */}
        <div
          ref={containerRef}
          onMouseMove={handleUserActivity}
          onTouchStart={handleUserActivity}
          className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-slate-800/90 group flex items-center justify-center"
        >
          {isLoadingFirestore ? (
            <div className="flex flex-col items-center justify-center p-6 text-center space-y-3 z-30">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 animate-spin">
                <RotateCw className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Streaming video from Cloud...</p>
                <p className="text-xs text-slate-400 mt-0.5">Assembling high-definition stream ({firestoreProgress}%)</p>
              </div>
              <div className="w-48 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 transition-all duration-200"
                  style={{ width: `${firestoreProgress}%` }}
                />
              </div>
            </div>
          ) : playerError ? (
            <div className="flex flex-col items-center justify-center p-6 text-center space-y-3 z-30">
              <p className="text-sm font-semibold text-rose-400">{playerError}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                Reload Stream
              </button>
            </div>
          ) : isEmbed ? (
            /* Embedded Iframe Player (YouTube / Vimeo / Drive) */
            <iframe
              src={videoMeta.embedUrl}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          ) : (
            /* HTML5 Direct Video Player */
            <>
              <video
                ref={videoRef}
                key={resolvedUrl}
                src={resolvedUrl}
                playsInline
                preload="auto"
                loop={isLooping}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onError={() => {
                  if (!resolvedUrl) return;
                  setPlayerError('Video format or stream could not be loaded. Tap reload to retry.');
                }}
                onClick={togglePlay}
                className="w-full h-full object-contain cursor-pointer"
              />

              {/* Floating "Tap for Sound" overlay if muted on mobile autoplay */}
              {showTapForSound && isMuted && isPlaying && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30">
                  <button
                    onClick={unmuteAndPlay}
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-600/95 hover:bg-indigo-500 text-white font-medium text-xs shadow-xl shadow-indigo-600/30 backdrop-blur-md border border-white/20 transition-all hover:scale-105 active:scale-95 animate-bounce"
                  >
                    <VolumeX className="w-4 h-4 text-indigo-200" />
                    <span>Video Playing Muted — Tap for Sound 🔊</span>
                  </button>
                </div>
              )}

              {/* Center Play Button Overlay when Paused */}
              {!isPlaying && (
                <button
                  onClick={togglePlay}
                  className="absolute inset-0 m-auto w-16 h-16 rounded-2xl bg-indigo-600/90 hover:bg-indigo-600 text-white flex items-center justify-center shadow-2xl shadow-indigo-600/40 backdrop-blur-sm transition-transform hover:scale-110 active:scale-95 z-20"
                >
                  <Play className="w-8 h-8 fill-white ml-1" />
                </button>
              )}

              {/* Custom Scrub & Control Bar */}
              <div
                className={`absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-4 sm:p-5 transition-opacity duration-300 z-30 ${
                  controlsVisible || !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
              >
                {/* Seek Bar */}
                <div className="relative mb-3 flex items-center group/seek">
                  <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    value={currentTime}
                    onChange={handleSeek}
                    className="w-full h-1.5 rounded-lg accent-indigo-500 cursor-pointer"
                  />
                </div>

                {/* Bottom Row Controls */}
                <div className="flex items-center justify-between gap-3 text-xs">
                  {/* Left Controls */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={togglePlay}
                      className="p-1.5 rounded-lg text-white hover:text-indigo-400 hover:bg-white/10 transition"
                      title={isPlaying ? 'Pause' : 'Play'}
                    >
                      {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                    </button>

                    <button
                      onClick={() => skipTime(-10)}
                      className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition"
                      title="Rewind 10s"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => skipTime(10)}
                      className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition"
                      title="Forward 10s"
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>

                    {/* Volume */}
                    <div className="flex items-center gap-1.5 group/vol">
                      <button
                        onClick={toggleMute}
                        className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition"
                      >
                        {isMuted || volume === 0 ? (
                          <VolumeX className="w-4 h-4 text-rose-400" />
                        ) : (
                          <Volume2 className="w-4 h-4" />
                        )}
                      </button>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={isMuted ? 0 : volume}
                        onChange={handleVolumeChange}
                        className="w-16 h-1 accent-indigo-500 cursor-pointer hidden sm:block"
                      />
                    </div>

                    {/* Time Counter */}
                    <span className="text-[11px] font-mono text-slate-300 tabular-nums">
                      {formatDuration(currentTime)} / {formatDuration(duration)}
                    </span>
                  </div>

                  {/* Right Controls */}
                  <div className="flex items-center gap-2">
                    {/* Playback speed menu */}
                    <div className="flex items-center bg-black/40 border border-white/10 rounded-lg p-0.5">
                      {[1, 1.25, 1.5, 2].map((rate) => (
                        <button
                          key={rate}
                          onClick={() => changeSpeed(rate)}
                          className={`px-1.5 py-0.5 rounded text-[11px] font-mono transition ${
                            playbackRate === rate
                              ? 'bg-indigo-600 text-white font-semibold'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {rate}x
                        </button>
                      ))}
                    </div>

                    {/* Loop Toggle */}
                    <button
                      onClick={toggleLoop}
                      className={`p-1.5 rounded-lg transition ${
                        isLooping
                          ? 'text-indigo-400 bg-indigo-500/20'
                          : 'text-slate-400 hover:text-white hover:bg-white/10'
                      }`}
                      title={isLooping ? 'Looping Enabled' : 'Loop Off'}
                    >
                      <Repeat className="w-4 h-4" />
                    </button>

                    {/* Fullscreen */}
                    <button
                      onClick={toggleFullscreen}
                      className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition"
                      title="Toggle Fullscreen"
                    >
                      {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Video Info & Secondary Actions */}
        <div className="w-full mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5">
            <h2 className="text-base font-semibold text-white mb-1.5">
              {videoTitle || 'Scanned Video Stream'}
            </h2>
            <p className="text-xs text-slate-400 break-all leading-relaxed">
              Target URL:{' '}
              <span className="text-indigo-300 font-mono">{videoUrl}</span>
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-400 pt-3 border-t border-slate-800">
              <span className="flex items-center gap-1.5">
                <Film className="w-3.5 h-3.5 text-indigo-400" />
                <span>Responsive Fullscreen Cinema Player</span>
              </span>
              <span>·</span>
              <span>Autoplay Ready</span>
              <span>·</span>
              <span>Scanned from VidQR Code</span>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between gap-4">
            <div>
              <h3 className="text-xs font-semibold text-white uppercase tracking-wider mb-1">
                Make Your Own QR Code
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Turn any video, YouTube clip, or uploaded video file into a scannable QR code.
              </p>
            </div>
            <button
              onClick={onReturnToStudio}
              className="w-full py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition"
            >
              <QrCode className="w-4 h-4" />
              <span>Open VidQR Studio</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};
