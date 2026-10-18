import React, { useState } from 'react';
import {
  X,
  User as UserIcon,
  Video,
  Download,
  Trash2,
  Edit2,
  Check,
  Copy,
  ExternalLink,
  Play,
  ArrowRight,
  Sparkles,
  Zap,
  Search,
  LogOut,
  SlidersHorizontal,
  Cloud,
  FileCode,
  QrCode
} from 'lucide-react';
import { useAuth, CloudQRCode } from '../context/AuthContext.tsx';
import { formatFileSize } from '../utils/videoHelper.ts';

interface AccountDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadQR: (qr: CloudQRCode) => void;
  onOpenWatchPage: (videoUrl: string, title: string) => void;
  onDownloadPNGFromUrl: (qr: CloudQRCode) => void;
  onDownloadSVGFromUrl: (qr: CloudQRCode) => void;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

export const AccountDashboardModal: React.FC<AccountDashboardModalProps> = ({
  isOpen,
  onClose,
  onLoadQR,
  onOpenWatchPage,
  onDownloadPNGFromUrl,
  onDownloadSVGFromUrl,
  onShowToast,
}) => {
  const { user, logout, cloudQRCodes, deleteCloudQR, updateQRTitle, updateUserProfile } = useAuth();

  const [activeTab, setActiveTab] = useState<'uploads' | 'profile'>('uploads');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitleText, setEditTitleText] = useState('');

  const [isEditingName, setIsEditingName] = useState(false);
  const [newNameText, setNewNameText] = useState(user?.displayName || '');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen || !user) return null;

  // Calculate storage space saved
  const totalOriginalBytes = cloudQRCodes.reduce((acc, q) => acc + (q.originalSize || 0), 0);
  const totalCompressedBytes = cloudQRCodes.reduce((acc, q) => acc + (q.compressedSize || q.originalSize || 0), 0);
  const totalBytesSaved = Math.max(0, totalOriginalBytes - totalCompressedBytes);

  // Filtered uploads
  const filteredQRs = cloudQRCodes.filter((q) => {
    const qText = searchQuery.toLowerCase();
    return q.title.toLowerCase().includes(qText) || q.videoUrl.toLowerCase().includes(qText);
  });

  const handleStartRename = (qr: CloudQRCode) => {
    setEditingId(qr.id);
    setEditTitleText(qr.title);
  };

  const handleSaveRename = async (id: string) => {
    if (!editTitleText.trim()) return;
    const ok = await updateQRTitle(id, editTitleText.trim());
    if (ok) {
      onShowToast('Video title updated successfully!', 'success');
      setEditingId(null);
    }
  };

  const handleSaveProfileName = async () => {
    if (!newNameText.trim()) return;
    const ok = await updateUserProfile(newNameText.trim());
    if (ok) {
      onShowToast('Profile display name updated!', 'success');
      setIsEditingName(false);
    }
  };

  const handleCopyLink = async (qr: CloudQRCode) => {
    try {
      await navigator.clipboard.writeText(qr.destinationUrl);
      setCopiedId(qr.id);
      onShowToast('Scannable video link copied to clipboard!', 'success');
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full p-5 sm:p-7 shadow-2xl space-y-6 max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  className="w-12 h-12 rounded-2xl object-cover border border-indigo-500/30"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-bold text-lg">
                  {(user.displayName || user.email || 'U')[0].toUpperCase()}
                </div>
              )}
              <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-slate-900" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white truncate">
                  {user.displayName || 'VidQR Creator'}
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-semibold border border-indigo-500/30">
                  Google Account
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono truncate">{user.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                logout();
                onClose();
              }}
              title="Sign Out"
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-rose-400 text-xs font-medium border border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Account Analytics & Storage Space Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 shrink-0">
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-400 mb-1">
              <Video className="w-4 h-4 text-indigo-400" />
              <span>Total Uploads</span>
            </div>
            <p className="text-xl font-extrabold text-white">{cloudQRCodes.length}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Active QR video streams</p>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-400 mb-1">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Bandwidth & Space Saved</span>
            </div>
            <p className="text-xl font-extrabold text-emerald-400">
              {totalBytesSaved > 0 ? formatFileSize(totalBytesSaved) : '0 MB'}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">Via in-browser compressor</p>
          </div>

          <div className="col-span-2 sm:col-span-1 bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-400 mb-1">
              <Cloud className="w-4 h-4 text-sky-400" />
              <span>Cloud Storage Sync</span>
            </div>
            <p className="text-xl font-extrabold text-white">Active</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Dual-layer persistent backup</p>
          </div>
        </div>

        {/* Tab & Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('uploads')}
              className={`py-1.5 px-3 rounded-xl text-xs font-semibold transition cursor-pointer ${
                activeTab === 'uploads'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-slate-800/60 text-slate-400 hover:text-white'
              }`}
            >
              My Uploads ({cloudQRCodes.length})
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`py-1.5 px-3 rounded-xl text-xs font-semibold transition cursor-pointer ${
                activeTab === 'profile'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-slate-800/60 text-slate-400 hover:text-white'
              }`}
            >
              Account Settings
            </button>
          </div>

          {activeTab === 'uploads' && (
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search uploads..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-xs text-white placeholder-slate-500 outline-none"
              />
            </div>
          )}
        </div>

        {/* Tab 1: Uploads & QR Library */}
        {activeTab === 'uploads' && (
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {cloudQRCodes.length === 0 ? (
              <div className="text-center py-12 px-4 space-y-3 bg-slate-950/40 rounded-2xl border border-slate-800/60">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mx-auto">
                  <Video className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-semibold text-white">No video uploads or saved QRs yet</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Select a video or paste a link in the studio, then click <strong>"Save QR to Google Account"</strong> to manage your library here.
                </p>
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition cursor-pointer"
                >
                  Create New Video QR
                </button>
              </div>
            ) : filteredQRs.length === 0 ? (
              <div className="text-center py-10 text-xs text-slate-400">
                No uploads found matching "{searchQuery}"
              </div>
            ) : (
              filteredQRs.map((qr) => (
                <div
                  key={qr.id}
                  className="bg-slate-950/90 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-4 transition space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      {editingId === qr.id ? (
                        <div className="flex items-center gap-2 mb-1">
                          <input
                            type="text"
                            value={editTitleText}
                            onChange={(e) => setEditTitleText(e.target.value)}
                            className="bg-slate-900 border border-indigo-500 text-white text-xs px-2.5 py-1 rounded-lg outline-none w-full max-w-md"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveRename(qr.id)}
                            className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-sm font-semibold text-white truncate">{qr.title}</h4>
                          <button
                            onClick={() => handleStartRename(qr)}
                            title="Edit Title"
                            className="text-slate-500 hover:text-indigo-400 p-0.5 rounded cursor-pointer"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}

                      <p className="text-xs text-slate-400 font-mono truncate">{qr.videoUrl}</p>

                      <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px] text-slate-500">
                        <span>{new Date(qr.createdAt).toLocaleDateString()}</span>
                        <span>·</span>
                        <span className="uppercase font-mono bg-slate-900 px-1.5 py-0.5 rounded text-slate-300">
                          {qr.targetMode}
                        </span>
                        <span>·</span>
                        <span>{qr.size}px</span>

                        {qr.savedPercentage && qr.savedPercentage > 0 && (
                          <>
                            <span>·</span>
                            <span className="text-emerald-400 font-medium flex items-center gap-1">
                              <Zap className="w-3 h-3" />
                              {qr.savedPercentage}% compressed
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        if (confirm(`Delete "${qr.title}" from your cloud library?`)) {
                          deleteCloudQR(qr.id);
                          onShowToast('Removed from your uploads', 'info');
                        }
                      }}
                      title="Delete Upload"
                      className="text-slate-500 hover:text-rose-400 p-2 rounded-xl hover:bg-rose-500/10 transition cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Actions Row */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-slate-900">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          onOpenWatchPage(qr.videoUrl, qr.title);
                          onClose();
                        }}
                        className="text-xs text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-xl border border-slate-700 flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
                        <span>Watch Video</span>
                      </button>

                      <button
                        onClick={() => handleCopyLink(qr)}
                        className="text-xs text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 px-2.5 py-1.5 rounded-xl border border-slate-800 flex items-center gap-1.5 transition cursor-pointer"
                      >
                        {copiedId === qr.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-slate-400" />
                            <span>Copy Link</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => onDownloadPNGFromUrl(qr)}
                        title="Download PNG QR Code"
                        className="text-xs text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 px-2.5 py-1.5 rounded-xl border border-slate-800 flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5 text-indigo-400" />
                        <span>PNG</span>
                      </button>

                      <button
                        onClick={() => onDownloadSVGFromUrl(qr)}
                        title="Download Vector SVG QR Code"
                        className="text-xs text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 px-2.5 py-1.5 rounded-xl border border-slate-800 flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <FileCode className="w-3.5 h-3.5 text-purple-400" />
                        <span>SVG</span>
                      </button>
                    </div>

                    <button
                      onClick={() => {
                        onLoadQR(qr);
                        onClose();
                      }}
                      className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 py-1.5 px-3 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 transition cursor-pointer"
                    >
                      <span>Load in Studio</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 2: Profile & Account Settings */}
        {activeTab === 'profile' && (
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-4">
              <h4 className="text-sm font-semibold text-white">Profile Information</h4>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Display Name
                  </label>
                  {isEditingName ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newNameText}
                        onChange={(e) => setNewNameText(e.target.value)}
                        className="bg-slate-900 border border-indigo-500 text-white text-xs px-3 py-2 rounded-xl outline-none w-full max-w-sm"
                      />
                      <button
                        onClick={handleSaveProfileName}
                        className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setIsEditingName(false)}
                        className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between max-w-sm bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white">
                      <span>{user.displayName || 'VidQR Creator'}</span>
                      <button
                        onClick={() => {
                          setIsEditingName(true);
                          setNewNameText(user.displayName || '');
                        }}
                        className="text-xs text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer"
                      >
                        Edit
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Google Email
                  </label>
                  <p className="text-xs font-mono text-slate-300 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 max-w-sm">
                    {user.email}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    User ID (UID)
                  </label>
                  <p className="text-[11px] font-mono text-slate-500 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 max-w-sm truncate">
                    {user.uid}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-3">
              <h4 className="text-sm font-semibold text-white">Storage & Privacy</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Your uploaded video streams and QR codes are linked to your authenticated Google account and secured using Firestore rule-based access controls.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
