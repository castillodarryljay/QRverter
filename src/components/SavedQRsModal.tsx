import React from 'react';
import { X, Cloud, Play, Trash2, ArrowRight, ExternalLink, QrCode } from 'lucide-react';
import { useAuth, CloudQRCode } from '../context/AuthContext.tsx';

interface SavedQRsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadQR: (qr: CloudQRCode) => void;
  onOpenWatchPage: (videoUrl: string, title: string) => void;
}

export const SavedQRsModal: React.FC<SavedQRsModalProps> = ({
  isOpen,
  onClose,
  onLoadQR,
  onOpenWatchPage,
}) => {
  const { user, cloudQRCodes, deleteCloudQR } = useAuth();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">My Cloud Saved QR Codes</h3>
              <p className="text-xs text-slate-400">
                Synced with Google account ({user?.email})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List of Saved QRs */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {cloudQRCodes.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mx-auto">
                <QrCode className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-semibold text-white">No saved video QR codes yet</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Generate a QR code in VidQR Studio and click "Save to My Cloud Account" to access it anywhere.
              </p>
            </div>
          ) : (
            cloudQRCodes.map((qr) => (
              <div
                key={qr.id}
                className="bg-slate-950/80 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-4 transition space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold text-white truncate">{qr.title}</h4>
                    <p className="text-xs text-slate-400 font-mono truncate">{qr.videoUrl}</p>
                    <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-500">
                      <span>{new Date(qr.createdAt).toLocaleDateString()}</span>
                      <span>·</span>
                      <span className="uppercase font-mono">{qr.targetMode}</span>
                      <span>·</span>
                      <span>{qr.size}px</span>
                    </div>
                  </div>

                  <button
                    onClick={() => deleteCloudQR(qr.id)}
                    title="Delete from cloud"
                    className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition cursor-pointer shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-900">
                  <button
                    onClick={() => {
                      onOpenWatchPage(qr.videoUrl, qr.title);
                      onClose();
                    }}
                    className="text-xs text-slate-300 hover:text-white flex items-center gap-1.5 py-1 px-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 transition cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
                    <span>Watch Video</span>
                  </button>

                  <button
                    onClick={() => {
                      onLoadQR(qr);
                      onClose();
                    }}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 py-1 px-2.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 transition cursor-pointer"
                  >
                    <span>Load in Generator</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
