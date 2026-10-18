import React from 'react';
import { X, HelpCircle, Smartphone, Cloud, ShieldCheck, Printer } from 'lucide-react';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-indigo-400" />
            How Video QR Codes Work
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800/80 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-3.5 text-xs sm:text-sm text-slate-300 leading-relaxed">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <strong className="text-white block mb-0.5">1. Instant Phone Scanning & Playback</strong>
              <span>
                Standard phone camera apps (iPhone Camera, Samsung Camera, Google Lens) recognize
                the QR code matrix instantly and prompt users to open the video in mobile Safari or
                Chrome, where our player begins playback immediately.
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5">
              <Cloud className="w-4 h-4" />
            </div>
            <div>
              <strong className="text-white block mb-0.5">2. Video Hosting Architecture</strong>
              <span>
                QR codes can physically only store ~3KB of text and cannot fit raw video files (which
                are megabytes). When you upload a video file here, it is automatically hosted on our
                streaming server and public cloud so that anyone scanning can stream it over cellular
                or Wi-Fi without needing your local computer.
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <strong className="text-white block mb-0.5">3. Error Correction & Custom Logos</strong>
              <span>
                Our generator uses high-level Reed-Solomon Error Correction (up to 30%), allowing you
                to overlay a central play button or brand logo while remaining 100% readable to
                cameras even if partially obscured or printed at angles.
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <strong className="text-white block mb-0.5">4. Printing for Posters & Product Boxes</strong>
              <span>
                Export using our vector SVG button for crisp, infinite-resolution printing on packaging,
                business cards, exhibition booths, or wedding invitations.
              </span>
            </div>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition"
          >
            Got it, thanks!
          </button>
        </div>
      </div>
    </div>
  );
};
