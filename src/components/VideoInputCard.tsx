import React, { useState, useRef } from 'react';
import {
  Link2,
  UploadCloud,
  Film,
  Youtube,
  Video,
  FileVideo,
  CheckCircle2,
  Sparkles,
  Info,
  Globe,
  RotateCcw
} from 'lucide-react';
import { detectVideoSource, formatFileSize } from '../utils/videoHelper.ts';

interface VideoInputCardProps {
  currentUrl: string;
  videoTitle: string;
  onUrlChange: (url: string) => void;
  onTitleChange: (title: string) => void;
  onShowToast: (message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

export const VideoInputCard: React.FC<VideoInputCardProps> = ({
  currentUrl,
  videoTitle,
  onUrlChange,
  onTitleChange,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'url' | 'upload'>('url');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadedFileSize, setUploadedFileSize] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [lastFile, setLastFile] = useState<File | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);

  const videoMeta = detectVideoSource(currentUrl);

  const handleUrlSubmit = (url: string) => {
    const clean = url.trim();
    if (!clean) return;
    onUrlChange(clean);
  };

  const setPreset = (url: string, name: string) => {
    onUrlChange(url);
    onTitleChange(name);
    onShowToast(`Loaded sample: ${name}`, 'info');
  };

  const uploadFile = async (file: File) => {
    if (!file.type.startsWith('video/') && !/\.(mp4|webm|mov|m4v|mkv)$/i.test(file.name)) {
      onShowToast('Please select a valid video file (MP4, WebM, MOV).', 'error');
      return;
    }

    setLastFile(file);
    setUploadedFileName(file.name);
    setUploadedFileSize(file.size);
    onTitleChange(file.name.replace(/\.[^/.]+$/, ''));
    setIsUploading(true);
    setUploadProgress(10);

    // 1. First attempt: Upload to full-stack Express server /api/upload
    try {
      const formData = new FormData();
      formData.append('video', file);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/upload', true);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          setUploadProgress(Math.max(10, percent));
        }
      };

      const serverUploadPromise = new Promise<{ url: string }>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const res = JSON.parse(xhr.responseText);
              if (res.url) resolve(res);
              else reject(new Error('Invalid response'));
            } catch (err) {
              reject(err);
            }
          } else {
            reject(new Error(`Server error ${xhr.status}`));
          }
        };
        xhr.onerror = () => reject(new Error('Server network error'));
        xhr.ontimeout = () => reject(new Error('Server timeout'));
      });

      xhr.send(formData);
      const res = await serverUploadPromise;

      setUploadProgress(100);
      setIsUploading(false);
      onUrlChange(res.url);
      onShowToast('Video uploaded and hosted on server for streaming!', 'success');
      return;
    } catch {
      // 2. Second attempt: Upload to public tmpfiles.org for external mobile scan support
      try {
        setUploadProgress(35);
        const tmpFormData = new FormData();
        tmpFormData.append('file', file);

        const tmpXhr = new XMLHttpRequest();
        tmpXhr.open('POST', 'https://tmpfiles.org/api/v1/upload', true);

        tmpXhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100);
            setUploadProgress(percent);
          }
        };

        const tmpPromise = new Promise<string>((resolve, reject) => {
          tmpXhr.onload = () => {
            if (tmpXhr.status >= 200 && tmpXhr.status < 300) {
              try {
                const data = JSON.parse(tmpXhr.responseText);
                if (data?.data?.url) {
                  // Direct stream link
                  const raw = data.data.url.replace('http://', 'https://');
                  const directUrl = raw.replace('https://tmpfiles.org/', 'https://tmpfiles.org/dl/');
                  resolve(directUrl);
                } else {
                  reject(new Error('Invalid tmpfiles response'));
                }
              } catch (e) {
                reject(e);
              }
            } else {
              reject(new Error(`tmpfiles error ${tmpXhr.status}`));
            }
          };
          tmpXhr.onerror = () => reject(new Error('Network error'));
        });

        tmpXhr.send(tmpFormData);
        const cloudUrl = await tmpPromise;

        setUploadProgress(100);
        setIsUploading(false);
        onUrlChange(cloudUrl);
        onShowToast('Video uploaded to public cloud host! Scannable anywhere.', 'success');
        return;
      } catch {
        // Local preview fallback
        setIsUploading(false);
        const localBlob = URL.createObjectURL(file);
        onUrlChange(localBlob);
        onShowToast('Using local video stream for preview.', 'warning');
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      uploadFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <section className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-5">
      {/* Step Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="w-6 h-6 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-400 text-xs font-bold flex items-center justify-center">
            1
          </span>
          <div>
            <h2 className="text-base font-semibold text-white">Select Video Source</h2>
            <p className="text-xs text-slate-400">Choose a link or upload a file to turn into a QR code</p>
          </div>
        </div>
        <span className="text-[11px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-md">
          Ready to Encode
        </span>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 p-1 bg-slate-950 border border-slate-800 rounded-xl">
        <button
          onClick={() => setActiveTab('url')}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-semibold transition ${
            activeTab === 'url'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Link2 className="w-4 h-4" />
          <span>Paste Video URL</span>
        </button>
        <button
          onClick={() => setActiveTab('upload')}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-semibold transition ${
            activeTab === 'upload'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <UploadCloud className="w-4 h-4" />
          <span>Upload Video File</span>
        </button>
      </div>

      {/* TAB 1: PASTE URL */}
      {activeTab === 'url' && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">
              Video Stream Link (YouTube, Vimeo, MP4, MOV, Google Drive)
            </label>
            <div className="relative flex items-center">
              <Globe className="w-4 h-4 text-slate-500 absolute left-3.5 pointer-events-none" />
              <input
                type="url"
                value={currentUrl}
                onChange={(e) => handleUrlSubmit(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=... or direct .mp4 link"
                className="w-full pl-10 pr-20 py-2.5 bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 outline-none transition font-mono"
              />
              <button
                onClick={() => {
                  onUrlChange('');
                  onShowToast('Cleared URL input', 'info');
                }}
                className="absolute right-2 text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-lg transition"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Video Title Input */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Video Title / Label (Appears when scanned)
            </label>
            <input
              type="text"
              value={videoTitle}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="e.g. Product Showcase 2026 / Company Reel"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 outline-none transition"
            />
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            <span className="text-slate-400">Quick presets:</span>
            <button
              onClick={() =>
                setPreset(
                  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
                  'High Sierra Trails (MP4 Direct)'
                )
              }
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1.5 rounded-lg border border-slate-700 transition flex items-center gap-1.5"
            >
              <Film className="w-3.5 h-3.5 text-indigo-400" />
              <span>Direct MP4</span>
            </button>
            <button
              onClick={() =>
                setPreset('https://www.youtube.com/watch?v=aqz-KE-bpKQ', 'Big Buck Bunny (YouTube HD)')
              }
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1.5 rounded-lg border border-slate-700 transition flex items-center gap-1.5"
            >
              <Youtube className="w-3.5 h-3.5 text-red-400" />
              <span>YouTube 4K</span>
            </button>
            <button
              onClick={() =>
                setPreset('https://vimeo.com/76979871', 'The Mountain (Vimeo Reel)')
              }
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1.5 rounded-lg border border-slate-700 transition flex items-center gap-1.5"
            >
              <Video className="w-3.5 h-3.5 text-sky-400" />
              <span>Vimeo</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: UPLOAD FILE */}
      {activeTab === 'upload' && (
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-500/20 flex items-start gap-3">
            <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-300 leading-relaxed">
              <strong className="text-white">Full-Stack Cloud & Server Video Hosting:</strong> QR
              codes physically hold ~3KB of alphanumeric characters, so raw video megabytes cannot be
              drawn directly into pixels. Uploading your video here hosts it on our streaming server
              or cloud host, allowing any phone camera to scan and watch it immediately!
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/webm,video/quicktime,video/*"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                uploadFile(e.target.files[0]);
              }
            }}
            className="hidden"
          />

          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition group ${
              isDragging
                ? 'border-indigo-500 bg-indigo-950/30'
                : 'border-slate-800 hover:border-indigo-500 bg-slate-950/60'
            }`}
          >
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 group-hover:scale-105 transition flex items-center justify-center mx-auto mb-3">
              <UploadCloud className="w-6 h-6 text-indigo-400" />
            </div>
            <p className="text-sm font-semibold text-white mb-1">
              Click to choose a video or drag & drop here
            </p>
            <p className="text-xs text-slate-400">Supports MP4, WebM, MOV up to 100MB</p>
          </div>

          {/* Upload Progress Status Card */}
          {(isUploading || uploadedFileName) && (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/15 flex items-center justify-center text-indigo-400 shrink-0">
                    <FileVideo className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{uploadedFileName}</p>
                    <p className="text-[11px] text-slate-400">{formatFileSize(uploadedFileSize || 0)}</p>
                  </div>
                </div>
                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                    isUploading
                      ? 'bg-indigo-500/20 text-indigo-300'
                      : 'bg-emerald-500/20 text-emerald-300'
                  }`}
                >
                  {isUploading ? `Uploading ${uploadProgress}%` : 'Hosted & Scannable'}
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>

              {!isUploading && currentUrl && (
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <span className="text-slate-400 truncate max-w-xs font-mono">{currentUrl}</span>
                  <button
                    onClick={() => {
                      if (lastFile) uploadFile(lastFile);
                    }}
                    className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" /> Re-upload
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Live Video Player Preview */}
      <div className="pt-4 border-t border-slate-800/80">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Film className="w-3.5 h-3.5 text-indigo-400" />
            Live Preview
          </span>
          <span className="text-[11px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
            {videoMeta.type === 'youtube'
              ? 'YouTube Embed'
              : videoMeta.type === 'vimeo'
              ? 'Vimeo Embed'
              : videoMeta.type === 'drive'
              ? 'Google Drive'
              : 'Direct HTML5 Stream'}
          </span>
        </div>

        <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden border border-slate-800 shadow-inner flex items-center justify-center">
          {videoMeta.embedUrl ? (
            <iframe
              src={videoMeta.embedUrl}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <video
              ref={videoPreviewRef}
              src={currentUrl}
              controls
              playsInline
              className="w-full h-full object-contain"
            />
          )}
        </div>
      </div>
    </section>
  );
};
