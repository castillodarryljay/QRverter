import React from 'react';
import { ScanLine, LogOut, Cloud, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

interface NavbarProps {
  onOpenScanner: () => void;
  onOpenInfo: () => void;
  onSelectPreset: () => void;
  onScrollToGenerator: () => void;
  onOpenCloudModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenScanner,
  onOpenInfo,
  onSelectPreset,
  onScrollToGenerator,
  onOpenCloudModal,
}) => {
  const { user, loading, signInWithGoogle, logout, cloudQRCodes } = useAuth();

  return (
    <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-xl sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            onScrollToGenerator();
          }}
          className="text-lg font-extrabold tracking-tight text-white whitespace-nowrap shrink-0 flex items-center gap-2"
        >
          <span className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/30">
            <ScanLine className="w-4 h-4" />
          </span>
          <span>VidQR <span className="text-indigo-400">Studio</span></span>
        </a>

        {/* Zone 2: 4-5 concise single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-xs sm:text-sm font-medium text-slate-300">
          <button
            onClick={onScrollToGenerator}
            className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Generator
          </button>
          <button
            onClick={onOpenScanner}
            className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Scanner & Tester
          </button>
          <button
            onClick={onOpenInfo}
            className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            How It Works
          </button>
          <button
            onClick={onSelectPreset}
            className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Video Presets
          </button>
          {user && onOpenCloudModal && (
            <button
              onClick={onOpenCloudModal}
              className="text-indigo-400 hover:text-indigo-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5"
            >
              <Cloud className="w-3.5 h-3.5" />
              <span>My Saved QRs ({cloudQRCodes.length})</span>
            </button>
          )}
        </nav>

        {/* Zone 3: Google Login & Action */}
        <div className="flex items-center gap-2.5 shrink-0">
          {loading ? (
            <div className="w-7 h-7 rounded-full bg-slate-800 animate-pulse" />
          ) : user ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/80 px-2.5 py-1 rounded-xl">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="w-5 h-5 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-indigo-600 text-[10px] font-bold text-white flex items-center justify-center">
                    {(user.displayName || user.email || 'U')[0].toUpperCase()}
                  </div>
                )}
                <span className="text-xs font-medium text-slate-200 hidden sm:inline truncate max-w-[100px]">
                  {user.displayName?.split(' ')[0] || user.email?.split('@')[0]}
                </span>
                <button
                  onClick={logout}
                  title="Sign out"
                  className="text-slate-400 hover:text-rose-400 transition ml-1 p-0.5 rounded cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={signInWithGoogle}
              className="px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 hover:text-white rounded-xl border border-slate-700/80 flex items-center gap-2 transition cursor-pointer shadow-sm active:scale-95 whitespace-nowrap shrink-0"
            >
              {/* Google multicolored G SVG */}
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Sign in with Google</span>
            </button>
          )}

          <button
            onClick={onOpenScanner}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-500 shadow-lg shadow-indigo-600/25 transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 active:scale-95 cursor-pointer"
          >
            <ScanLine className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Test QR Scanner</span>
            <span className="sm:hidden">Scan</span>
          </button>
        </div>
      </div>
    </header>
  );
};

