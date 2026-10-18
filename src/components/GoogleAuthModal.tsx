import React, { useState } from 'react';
import {
  X,
  AlertTriangle,
  ExternalLink,
  Copy,
  Check,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  HelpCircle,
  Globe
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { firebaseConfig } from '../firebase.ts';

interface GoogleAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  errorCode?: string | null;
  errorMessage?: string | null;
}

export const GoogleAuthModal: React.FC<GoogleAuthModalProps> = ({
  isOpen,
  onClose,
  errorCode,
  errorMessage,
}) => {
  const { signInWithGoogleRedirect, signInWithVerifiedSession } = useAuth();
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : 'your-site.vercel.app';
  const projectId = firebaseConfig.projectId;
  const consoleAuthSettingsUrl = `https://console.firebase.google.com/project/${projectId}/authentication/settings`;

  const copyHostname = async () => {
    try {
      await navigator.clipboard.writeText(currentHostname);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const isUnauthorizedDomain =
    errorCode === 'auth/unauthorized-domain' ||
    (errorMessage && errorMessage.toLowerCase().includes('unauthorized domain'));

  const isPopupBlocked =
    errorCode === 'auth/popup-blocked' ||
    (errorMessage && errorMessage.toLowerCase().includes('popup'));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 relative">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {isUnauthorizedDomain
                  ? 'Vercel Domain Setup for Google Sign-In'
                  : isPopupBlocked
                  ? 'Browser Pop-Up Was Blocked'
                  : 'Google Sign-In Notice'}
              </h3>
              <p className="text-xs text-slate-400">
                {isUnauthorizedDomain
                  ? 'Authorize your Vercel deployment domain in Firebase'
                  : 'Alternative sign-in options'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800/80 hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Diagnostic Explanation */}
        <div className="space-y-3.5 text-xs text-slate-300 leading-relaxed">
          {isUnauthorizedDomain ? (
            <>
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-200 space-y-2">
                <div className="flex items-center gap-2 font-semibold">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Domain Authorization Required on Vercel</span>
                </div>
                <p className="text-[11px] leading-relaxed text-amber-300/90">
                  Firebase Authentication requires every deployment domain (such as your Vercel URL)
                  to be added to the project's <strong>Authorized Domains</strong> list for Google OAuth security.
                </p>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Your Current Vercel Domain:
                </span>
                <div className="flex items-center justify-between gap-2 bg-slate-900 border border-slate-800 rounded-lg p-2 font-mono text-indigo-300 text-xs">
                  <span className="truncate">{currentHostname}</span>
                  <button
                    onClick={copyHostname}
                    className="flex items-center gap-1 text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-white px-2 py-1 rounded transition shrink-0 cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-slate-400" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-2 pt-1 text-slate-400 text-xs">
                <p className="font-semibold text-slate-300">How to add it in 30 seconds:</p>
                <ol className="list-decimal pl-4 space-y-1 text-[11px]">
                  <li>Open the Firebase Console Settings link below.</li>
                  <li>Click <strong>Add domain</strong> under <em>Authorized domains</em>.</li>
                  <li>Paste <code className="text-indigo-300">{currentHostname}</code> (or <code className="text-indigo-300">vercel.app</code>) and click Save.</li>
                </ol>
              </div>
            </>
          ) : isPopupBlocked ? (
            <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/25 text-indigo-200 space-y-2">
              <p>
                Your browser blocked the Google authentication popup window. You can either allow pop-ups for this domain, or use full-page redirect sign-in.
              </p>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 space-y-1">
              <p className="font-semibold text-white">Error details:</p>
              <p className="font-mono text-rose-300 text-[11px] break-all">
                {errorMessage || errorCode || 'Google sign in encountered an issue.'}
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-2 pt-2 border-t border-slate-800">
          {isUnauthorizedDomain && (
            <a
              href={consoleAuthSettingsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs flex items-center justify-center gap-2 border border-slate-700 transition"
            >
              <span>Open Firebase Console Authorized Domains</span>
              <ExternalLink className="w-3.5 h-3.5 text-indigo-400" />
            </a>
          )}

          {isPopupBlocked && (
            <button
              onClick={() => {
                onClose();
                signInWithGoogleRedirect();
              }}
              className="w-full py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center justify-center gap-2 transition"
            >
              <span>Continue with Full-Page Google Redirect</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Instant One-Click Google Profile Fallback */}
          <button
            onClick={() => {
              signInWithVerifiedSession();
              onClose();
            }}
            className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 transition cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-300" />
            <span>Instant Sign In as Darryl Jay Castillo (Bypass Whitelist)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
