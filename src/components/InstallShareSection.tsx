import React, { useState } from 'react';
import {
  Share2,
  Copy,
  Check,
  Smartphone,
  ExternalLink,
  X,
  Compass,
  ArrowRight,
  ShieldCheck,
  Download,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const InstallShareSection: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, isInAppBrowser, install } = usePWAInstall();
  const [copied, setCopied] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [guidePlatform, setGuidePlatform] = useState<'android' | 'ios' | 'inapp'>('android');
  const [installingStatus, setInstallingStatus] = useState<string | null>(null);

  const shareUrl =
    typeof window !== 'undefined'
      ? window.location.origin
      : 'https://ais-pre-b6gfvojb7gaotu6ffz6bja-424532902484.asia-southeast1.run.app';

  const handleInstallClick = async () => {
    if (isInstalled) {
      setInstallingStatus('ایپ پہلے سے آپ کے موبائل پر انسٹال ہے!');
      setTimeout(() => setInstallingStatus(null), 3000);
      return;
    }

    if (isInAppBrowser) {
      setGuidePlatform('inapp');
      setShowGuideModal(true);
      return;
    }

    if (isInstallable) {
      setInstallingStatus('انسٹالیشن ڈائیلاگ شروع ہو رہا ہے...');
      const success = await install();
      if (success) {
        setInstallingStatus('کامیابی! KMS اسٹوڈیو ایپ انسٹال ہو چکی ہے!');
        setTimeout(() => setInstallingStatus(null), 4000);
      } else {
        setInstallingStatus(null);
        setGuidePlatform(isIOS ? 'ios' : 'android');
        setShowGuideModal(true);
      }
    } else {
      setGuidePlatform(isIOS ? 'ios' : 'android');
      setShowGuideModal(true);
    }
  };

  const handleShareClick = async () => {
    const shareData = {
      title: 'KMS - Khateeb Malik Studio',
      text: '🇵🇰 KMS Voice Studio by Khateeb Malik: 6 Real Pakistani Voices, Unlimited Free Urdu AI Studio with Instant WAV Download!',
      url: shareUrl,
    };

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (e) {
        // user cancelled or fallback
      }
    }

    // Clipboard fallback
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      // ignore
    }
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <>
      {/* Install & Share Interactive Card at the End */}
      <section className="w-full mt-4 p-5 rounded-3xl bg-gradient-to-b from-[#14122e] to-[#0d0d1e] border-2 border-[#6c5ce7]/70 shadow-[0_0_30px_rgba(108,92,231,0.25)] flex flex-col gap-4">
        {/* KMS Studio Brand Header */}
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-[#2d2d44]">
          <div className="flex items-center gap-3">
            {/* KMS Logo Badge */}
            <div className="w-13 h-13 rounded-2xl bg-[#0a0a16] border-2 border-[#00ff88] p-1 shadow-[0_0_15px_rgba(0,255,136,0.3)] flex items-center justify-center shrink-0">
              <img
                src="/pwa-192x192.png"
                alt="KMS Logo"
                className="w-full h-full object-contain rounded-xl"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/icon.svg';
                }}
              />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-lg bg-gradient-to-r from-[#00ff88] via-white to-[#a29bfe] bg-clip-text text-transparent tracking-wider">
                  KMS STUDIO
                </span>
                <span className="bg-[#00ff88]/20 border border-[#00ff88]/50 text-[#00ff88] px-2 py-0.5 rounded-full text-[10px] font-bold">
                  OFFICIAL APP
                </span>
              </div>
              <p className="text-xs text-[#a29bfe] font-urdu font-medium">
                خطیب ملک اے آئی وائس اسٹوڈیو • موبائل ایپ انسٹال کریں
              </p>
            </div>
          </div>

          <div className="text-right hidden sm:block">
            <span className="text-[10px] text-gray-400 font-mono block">Registered To:</span>
            <span className="text-xs font-bold text-white font-mono">Khateeb Malik</span>
          </div>
        </div>

        {/* Status Toast */}
        {installingStatus && (
          <div className="bg-[#00ff88]/20 border border-[#00ff88] text-[#00ff88] text-xs px-3.5 py-2 rounded-xl text-center font-bold animate-fadeIn">
            {installingStatus}
          </div>
        )}

        {/* Action Buttons Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Main Install Button */}
          <button
            onClick={handleInstallClick}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#00ff88] to-[#00b894] hover:from-[#00e676] hover:to-[#00a884] text-[#0b0b18] font-black text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-[0_0_20px_rgba(0,255,136,0.35)] hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
          >
            <Smartphone className="w-5 h-5 stroke-[2.5]" />
            <span>
              {isInstalled
                ? 'App Installed (ایپ انسٹال ہے ✓)'
                : 'موبائل پر انسٹال کریں (Install App)'}
            </span>
          </button>

          {/* Share Button */}
          <button
            onClick={handleShareClick}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#6c5ce7] to-[#8075ea] hover:from-[#5b4bd8] hover:to-[#7164e2] text-white font-black text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-[0_0_20px_rgba(108,92,231,0.35)] hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
          >
            <Share2 className="w-5 h-5 stroke-[2.5]" />
            <span>لنک شیئر کریں (Share Link)</span>
          </button>
        </div>

        {/* Clickable Share URL Box */}
        <div className="bg-[#0b0b18] p-3 rounded-2xl border border-[#2d2d44] flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-[11px] text-gray-400 px-1 font-mono">
            <span>Official Web & App Link:</span>
            <span className="text-[#00ff88]">{copied ? '✓ لنک کاپی ہو گیا!' : 'Tap to copy'}</span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={shareUrl}
              onClick={copyUrl}
              className="flex-1 bg-[#141228] border border-[#2d2d44] hover:border-[#6c5ce7] rounded-xl px-3 py-2 text-xs text-gray-200 font-mono truncate focus:outline-none cursor-pointer"
            />
            <button
              onClick={copyUrl}
              className="px-4 py-2 bg-[#2d2d44] hover:bg-[#00ff88] hover:text-black rounded-xl text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 shadow"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Verification & Ownership Tag */}
        <div className="flex items-center justify-between text-[10px] text-gray-500 font-mono px-1">
          <span className="flex items-center gap-1 text-gray-400">
            <ShieldCheck className="w-3.5 h-3.5 text-[#00ff88]" />
            KMS Standalone PWA • Official Icon & Logo
          </span>
          <span className="text-gray-400">
            Developer: <strong className="text-white">Khateeb Malik</strong>
          </span>
        </div>
      </section>

      {/* Guide Modal for Easy 2-Step Installation */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
          <div className="relative max-w-sm w-full bg-[#16142e] border-2 border-[#00ff88] rounded-3xl p-6 text-white shadow-2xl flex flex-col gap-4">
            <button
              onClick={() => setShowGuideModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-[#0a0a16] border-2 border-[#00ff88] p-1 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(0,255,136,0.3)]">
                <img
                  src="/pwa-192x192.png"
                  alt="KMS"
                  className="w-full h-full object-contain rounded-xl"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/icon.svg';
                  }}
                />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-white">
                  KMS App موبائل پر کیسے انسٹال کریں؟
                </h3>
                <p className="text-xs text-[#00ff88] font-bold font-mono">
                  KMS - Khateeb Malik Studio
                </p>
              </div>
            </div>

            {/* Toggle Platform */}
            <div className="flex bg-[#0b0b18] p-1 rounded-xl border border-[#2d2d44]">
              <button
                onClick={() => setGuidePlatform('android')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  guidePlatform === 'android'
                    ? 'bg-[#00ff88] text-black shadow'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Android / Chrome
              </button>
              <button
                onClick={() => setGuidePlatform('ios')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  guidePlatform === 'ios'
                    ? 'bg-[#00ff88] text-black shadow'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                iPhone (iOS)
              </button>
              {isInAppBrowser && (
                <button
                  onClick={() => setGuidePlatform('inapp')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    guidePlatform === 'inapp'
                      ? 'bg-amber-400 text-black shadow'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  WhatsApp / In-App
                </button>
              )}
            </div>

            {/* Instructions */}
            {guidePlatform === 'android' && (
              <div className="bg-[#0b0b18] p-4 rounded-2xl border border-[#2d2d44] text-xs text-gray-300 space-y-3 leading-relaxed">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#00ff88] text-black font-bold flex items-center justify-center shrink-0 text-xs">
                    1
                  </span>
                  <p>
                    کروم (Chrome) میں اوپر دائیں جانب موجود <strong>تین نقطوں (⋮)</strong> پر کلک کریں۔
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#00ff88] text-black font-bold flex items-center justify-center shrink-0 text-xs">
                    2
                  </span>
                  <p>
                    مینو میں <strong>"Install app" (ایپ انسٹال کریں)</strong> یا <strong>"Add to Home screen"</strong> منتخب کریں۔
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#00ff88] text-black font-bold flex items-center justify-center shrink-0 text-xs">
                    3
                  </span>
                  <p>
                    <strong>Install</strong> پر کلک کریں، آپ کے موبائل کی اسکرین پر <strong>KMS کا اپنا آفیشل لوگو</strong> لگ جائے گا اور یہ بغیر براؤزر کے الگ فل اسکرین ایپ بن کر چلے گی!
                  </p>
                </div>
              </div>
            )}

            {guidePlatform === 'ios' && (
              <div className="bg-[#0b0b18] p-4 rounded-2xl border border-[#2d2d44] text-xs text-gray-300 space-y-3 leading-relaxed">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#00ff88] text-black font-bold flex items-center justify-center shrink-0 text-xs">
                    1
                  </span>
                  <p>
                    سفاری (Safari) میں نیچے موجود <strong>Share (⎋)</strong> بٹن دبائیں۔
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#00ff88] text-black font-bold flex items-center justify-center shrink-0 text-xs">
                    2
                  </span>
                  <p>
                    نیچے سکرول کر کے <strong>"Add to Home Screen (⊕)"</strong> پر ٹیپ کریں۔
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#00ff88] text-black font-bold flex items-center justify-center shrink-0 text-xs">
                    3
                  </span>
                  <p>
                    اوپر دائیں کونے میں <strong>Add</strong> کا بٹن دبائیں۔ iPhone پر <strong>KMS Studio</strong> ایپ انسٹال ہو جائے گی!
                  </p>
                </div>
              </div>
            )}

            {guidePlatform === 'inapp' && (
              <div className="bg-amber-950/40 border border-amber-600/60 p-4 rounded-2xl text-xs text-amber-200 space-y-2.5 leading-relaxed">
                <p className="font-bold text-white flex items-center gap-1.5">
                  <span>⚠️</span>
                  <span>آپ واٹس ایپ یا فیس بک کے اندر ہیں:</span>
                </p>
                <p>
                  واٹس ایپ اور سوشل میڈیا ایپس کے اندر انسٹالیشن بلاک ہوتی ہے۔
                </p>
                <p>
                  1. اوپر یا نیچے دائیں جانب موجود <strong>تین نقطوں (⋮)</strong> پر کلک کریں۔<br />
                  2. <strong>"Open in Chrome" (یا Open in Safari)</strong> پر کلک کریں۔<br />
                  3. وہاں پر <strong>موبائل پر انسٹال کریں</strong> کا بٹن فوراً کام کرے گا!
                </p>
              </div>
            )}

            {/* Direct Try Install Button inside modal */}
            {isInstallable && (
              <button
                onClick={async () => {
                  setShowGuideModal(false);
                  await install();
                }}
                className="w-full py-3 bg-[#00ff88] text-[#0a0a16] font-black rounded-xl text-sm transition-all hover:bg-[#00e676] flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(0,255,136,0.4)]"
              >
                <Smartphone className="w-4 h-4" />
                <span>ابھی براہِ راست انسٹال کریں (Direct Install Now)</span>
              </button>
            )}

            <button
              onClick={() => setShowGuideModal(false)}
              className="w-full py-2.5 bg-[#2d2d44] hover:bg-[#3d3d5c] text-white font-bold rounded-xl text-xs transition-all cursor-pointer"
            >
              ٹھیک ہے (Close)
            </button>
          </div>
        </div>
      )}
    </>
  );
};
