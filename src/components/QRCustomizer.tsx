import React, { useRef } from 'react';
import {
  Sliders,
  RotateCcw,
  Play,
  Youtube,
  Clapperboard,
  Image as ImageIcon,
  Slash,
  MonitorPlay,
  ExternalLink,
  Upload
} from 'lucide-react';
import { QRConfig, CenterLogoMode, ErrorCorrectionLevel, QRTargetMode } from '../types/index.ts';

interface QRCustomizerProps {
  config: QRConfig;
  onChange: (updated: Partial<QRConfig>) => void;
  onReset: () => void;
  onShowToast: (msg: string, type?: 'success' | 'info') => void;
}

export const QRCustomizer: React.FC<QRCustomizerProps> = ({
  config,
  onChange,
  onReset,
  onShowToast,
}) => {
  const customLogoInputRef = useRef<HTMLInputElement | null>(null);

  const handleCustomLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      onChange({
        logoMode: 'custom',
        customLogoDataUrl: event.target?.result as string,
        errorCorrectionLevel: 'H', // Force high ECC for custom center logo
      });
      onShowToast('Custom center logo applied! Set error correction to High (H).', 'info');
    };
    reader.readAsDataURL(file);
  };

  const handleLogoModeSelect = (mode: CenterLogoMode) => {
    if (mode !== 'none' && (config.errorCorrectionLevel === 'L' || config.errorCorrectionLevel === 'M')) {
      onChange({ logoMode: mode, errorCorrectionLevel: 'H' });
      onShowToast('Error correction set to High (H) to keep center logo scannable.', 'info');
    } else {
      onChange({ logoMode: mode });
    }
  };

  return (
    <section className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-5">
      {/* Step Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="w-6 h-6 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-400 text-xs font-bold flex items-center justify-center">
            2
          </span>
          <div>
            <h2 className="text-base font-semibold text-white">QR Code Customization</h2>
            <p className="text-xs text-slate-400">Configure appearance, scan destination, and center badge</p>
          </div>
        </div>

        <button
          onClick={onReset}
          className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>
      </div>

      {/* Target Destination Switcher */}
      <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3.5 space-y-2">
        <label className="block text-xs font-semibold text-white">QR Scan Destination Mode</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            onClick={() => onChange({ targetMode: 'watch-page' })}
            className={`p-3 rounded-xl border text-left transition ${
              config.targetMode === 'watch-page'
                ? 'border-indigo-500 bg-indigo-500/15 text-white'
                : 'border-slate-800 bg-slate-900/50 text-slate-300 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <MonitorPlay className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-semibold">Cinema Web Player (Recommended)</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-tight">
              Opens instant full-screen responsive player with sound toggle, loop, and playback controls on any phone.
            </p>
          </button>

          <button
            onClick={() => onChange({ targetMode: 'direct-link' })}
            className={`p-3 rounded-xl border text-left transition ${
              config.targetMode === 'direct-link'
                ? 'border-indigo-500 bg-indigo-500/15 text-white'
                : 'border-slate-800 bg-slate-900/50 text-slate-300 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <ExternalLink className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-semibold">Direct Native Link</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-tight">
              Directly opens native YouTube app or raw video file stream URL.
            </p>
          </button>
        </div>
      </div>

      {/* Color Customization */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Foreground Color */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 space-y-2">
          <label className="block text-xs font-medium text-slate-400">QR Code Color (Foreground)</label>
          <div className="flex items-center gap-2.5">
            <input
              type="color"
              value={config.fgColor}
              onChange={(e) => onChange({ fgColor: e.target.value })}
              className="w-9 h-9 rounded-lg cursor-pointer bg-transparent border-0 p-0"
            />
            <input
              type="text"
              value={config.fgColor}
              onChange={(e) => {
                if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
                  onChange({ fgColor: e.target.value });
                }
              }}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white uppercase outline-none focus:border-indigo-500"
            />
          </div>
          {/* Swatches */}
          <div className="flex items-center gap-1.5 pt-1">
            {['#0f172a', '#4f46e5', '#dc2626', '#059669', '#7c3aed', '#ea580c'].map((c) => (
              <button
                key={c}
                onClick={() => onChange({ fgColor: c })}
                style={{ backgroundColor: c }}
                className="w-5 h-5 rounded-full border border-slate-700/80 hover:scale-110 transition"
                title={c}
              />
            ))}
          </div>
        </div>

        {/* Background Color */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 space-y-2">
          <label className="block text-xs font-medium text-slate-400">Card Background Color</label>
          <div className="flex items-center gap-2.5">
            <input
              type="color"
              value={config.bgColor}
              onChange={(e) => onChange({ bgColor: e.target.value })}
              className="w-9 h-9 rounded-lg cursor-pointer bg-transparent border-0 p-0"
            />
            <input
              type="text"
              value={config.bgColor}
              onChange={(e) => {
                if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
                  onChange({ bgColor: e.target.value });
                }
              }}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white uppercase outline-none focus:border-indigo-500"
            />
          </div>
          {/* Swatches */}
          <div className="flex items-center gap-1.5 pt-1">
            {['#ffffff', '#f8fafc', '#eef2ff', '#fef2f2', '#ecfdf5', '#fefce8'].map((c) => (
              <button
                key={c}
                onClick={() => onChange({ bgColor: c })}
                style={{ backgroundColor: c }}
                className="w-5 h-5 rounded-full border border-slate-600 hover:scale-110 transition"
                title={c}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Resolution & Error Correction */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Size Slider */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-slate-400">Output Resolution</label>
            <span className="text-xs font-mono font-semibold text-indigo-400">
              {config.size} × {config.size} px
            </span>
          </div>
          <input
            type="range"
            min={180}
            max={512}
            step={8}
            value={config.size}
            onChange={(e) => onChange({ size: parseInt(e.target.value, 10) })}
            className="w-full my-2"
          />
          <div className="flex justify-between text-[11px] text-slate-500 font-mono">
            <span>180px</span>
            <span>340px</span>
            <span>512px</span>
          </div>
        </div>

        {/* Error Correction */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-slate-400">Error Correction (ECC)</label>
            <span className="text-[11px] text-emerald-400 font-medium">
              Level {config.errorCorrectionLevel} (
              {config.errorCorrectionLevel === 'L'
                ? '7%'
                : config.errorCorrectionLevel === 'M'
                ? '15%'
                : config.errorCorrectionLevel === 'Q'
                ? '25%'
                : '30%'}
              )
            </span>
          </div>
          <div className="grid grid-cols-4 gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
            {(['L', 'M', 'Q', 'H'] as ErrorCorrectionLevel[]).map((lvl) => (
              <button
                key={lvl}
                onClick={() => onChange({ errorCorrectionLevel: lvl })}
                className={`py-1 rounded text-xs font-semibold transition ${
                  config.errorCorrectionLevel === lvl
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Use <strong className="text-slate-300">H (30%)</strong> for center logo overlay.
          </p>
        </div>
      </div>

      {/* Center Logo Overlay */}
      <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-slate-400">Center Icon / Overlay Badge</label>
          <input
            ref={customLogoInputRef}
            type="file"
            accept="image/*"
            onChange={handleCustomLogoUpload}
            className="hidden"
          />
          <button
            onClick={() => customLogoInputRef.current?.click()}
            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Custom Icon</span>
          </button>
        </div>

        <div className="grid grid-cols-5 gap-2">
          <button
            onClick={() => handleLogoModeSelect('none')}
            className={`py-2 px-2 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition ${
              config.logoMode === 'none'
                ? 'border-indigo-500 bg-indigo-500/15 text-white'
                : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700'
            }`}
          >
            <Slash className="w-3.5 h-3.5 text-slate-400" />
            <span>None</span>
          </button>

          <button
            onClick={() => handleLogoModeSelect('play')}
            className={`py-2 px-2 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition ${
              config.logoMode === 'play'
                ? 'border-indigo-500 bg-indigo-500/15 text-white'
                : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700'
            }`}
          >
            <Play className="w-3.5 h-3.5 text-indigo-400 fill-indigo-400" />
            <span>Play</span>
          </button>

          <button
            onClick={() => handleLogoModeSelect('youtube')}
            className={`py-2 px-2 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition ${
              config.logoMode === 'youtube'
                ? 'border-indigo-500 bg-indigo-500/15 text-white'
                : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700'
            }`}
          >
            <Youtube className="w-3.5 h-3.5 text-red-500" />
            <span>YouTube</span>
          </button>

          <button
            onClick={() => handleLogoModeSelect('video')}
            className={`py-2 px-2 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition ${
              config.logoMode === 'video'
                ? 'border-indigo-500 bg-indigo-500/15 text-white'
                : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700'
            }`}
          >
            <Clapperboard className="w-3.5 h-3.5 text-amber-400" />
            <span>Cinema</span>
          </button>

          <button
            onClick={() => customLogoInputRef.current?.click()}
            className={`py-2 px-2 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition ${
              config.logoMode === 'custom'
                ? 'border-indigo-500 bg-indigo-500/15 text-white'
                : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
            <span>Custom</span>
          </button>
        </div>
      </div>

      {/* Frame / Call-To-Action Banner */}
      <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-200">
            <input
              type="checkbox"
              checked={config.includeBanner}
              onChange={(e) => onChange({ includeBanner: e.target.checked })}
              className="w-4 h-4 rounded accent-indigo-600 cursor-pointer"
            />
            <span>Include Bottom Call-to-Action Frame Banner</span>
          </label>
          <div className="flex items-center gap-1.5">
            {['SCAN TO WATCH', 'WATCH VIDEO', 'SCAN ME'].map((txt) => (
              <button
                key={txt}
                onClick={() => onChange({ includeBanner: true, bannerText: txt })}
                className="text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded border border-slate-700 transition"
              >
                {txt}
              </button>
            ))}
          </div>
        </div>

        {config.includeBanner && (
          <input
            type="text"
            value={config.bannerText}
            maxLength={28}
            onChange={(e) => onChange({ bannerText: e.target.value })}
            placeholder="e.g. SCAN TO WATCH VIDEO"
            className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 outline-none transition"
          />
        )}
      </div>
    </section>
  );
};
