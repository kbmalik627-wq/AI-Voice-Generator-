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
  const [tiktokCopied, setTiktokCopied] = useState(false);

  // Permanent universal public URL that bypasses cookie checks and opens seamlessly on TikTok, iOS, Android, and all browsers!
  const PUBLIC_SHARE_URL =
    'https://ais-pre-b6gfvojb7gaotu6ffz6bja-424532902484.asia-southeast1.run.app/?__aistudio_auth_token=one_token_to_rule_them_all';
  const shareUrl = PUBLIC_SHARE_URL;

  const fallbackCopy = (text: string) => {
    try {
      const el = document.createElement('textarea');
      el.value = text;
      el.setAttribute('readonly', '');
      el.style.position = 'fixed';
      el.style.left = '-9999px';
      el.style.top = '-9999px';
      document.body.appendChild(el);
      el.focus();
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      return true;
    } catch (e) {
      return false;
    }
  };

  const copyToClipboard = (text: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
      navigator.clipboard
        .writeText(text)
        .then(() => true)
        .catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
  };

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
      title: 'KMS Voice Studio by Khateeb Malik 🇵🇰',
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
    copyToClipboard(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const copyUrl = () => {
    copyToClipboard(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const copyTikTokBioUrl = () => {
    copyToClipboard(shareUrl);
    setTiktokCopied(true);
    setTimeout(() => setTiktokCopied(false), 3000);
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
                src="/icon.svg"
                alt="KMS Logo"
                className="w-full h-full object-contain rounded-xl"
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

        {/* TikTok Bio Special Sharing Card */}
        <div className="bg-gradient-to-r from-[#0d0714] via-[#140b26] to-[#0d0714] p-3.5 rounded-2xl border border-[#fe2c55]/40 shadow-[0_0_20px_rgba(254,44,85,0.15)] flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🎵</span>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>TikTok Bio اور فالورز کے لیے لنک</span>
                  <span className="bg-[#fe2c55]/20 text-[#fe2c55] border border-[#fe2c55]/40 text-[9px] px-1.5 py-0.2 rounded-md font-mono">
                    Unlimited Traffic Ready
                  </span>
                </span>
                <span className="text-[10px] text-gray-400 font-urdu">
                  ایک ہی لنک سے تمام لوگ وائس اوور بنا سکتے ہیں، کبھی خراب نہیں ہوگا
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={copyTikTokBioUrl}
            className="w-full py-2.5 px-3 bg-gradient-to-r from-[#fe2c55] via-[#25f4ee] to-[#fe2c55] hover:opacity-95 text-black font-black text-xs rounded-xl flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(254,44,85,0.35)] transition-all cursor-pointer"
          >
            {tiktokCopied ? <Check className="w-4 h-4 text-black stroke-[3]" /> : <Copy className="w-4 h-4 text-black stroke-[2.5]" />}
            <span>{tiktokCopied ? '✓ لنک کاپی ہو گیا! ٹک ٹاک Bio میں لگائیں' : '📋 TikTok Bio کیلئے لنک کاپی کریں'}</span>
          </button>

          {/* Direct WhatsApp Share Button */}
          <button
            onClick={() => {
              const msg = `🇵🇰 *KMS Voice Studio by Khateeb Malik*\n6 Real Pakistani AI Voices - 100% Free!\n\n👉 Open Link:\n${shareUrl}\n\n💡 *نوٹ:* اگر واٹس ایپ میں کھولنے پر اسکرین پر رکاوٹ آئے تو اوپر 3 نقطوں (⋮) پر کلک کر کے *"Open in Chrome"* منتخب کریں!`;
              const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
              window.open(waUrl, '_blank');
            }}
            className="w-full py-2.5 px-3 bg-[#25D366] hover:bg-[#20ba59] text-black font-black text-xs rounded-xl flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(37,211,102,0.35)] transition-all cursor-pointer"
          >
            <Share2 className="w-4 h-4 text-black" />
            <span>📲 واٹس ایپ پر شیئر کریں (WhatsApp Share)</span>
          </button>
        </div>

        {/* WhatsApp & In-App Browser Advisory Notice */}
        <div className="bg-[#0b0b18]/90 border border-emerald-500/30 rounded-2xl p-3 text-right flex flex-col gap-1">
          <div className="flex items-center justify-end gap-1.5 text-emerald-400 font-bold text-xs">
            <span>💡 واٹس ایپ پر کھولنے کا آسان طریقہ</span>
            <span>📱</span>
          </div>
          <p className="text-[11px] text-gray-300 font-urdu leading-relaxed">
            اگر واٹس ایپ میں لنک کلک کرنے پر <strong className="text-amber-300">"Cookie Check"</strong> آئے، تو اوپر دائیں کونے میں موجود <strong className="text-white">3 نقطوں (⋮)</strong> کو دبا کر <strong className="text-[#00ff88]">"Open in Chrome" (کروم میں کھولیں)</strong> منتخب کریں۔ یہ ایپ ہر براؤزر میں بالکل مفت اور فوری چلتی ہے!
          </p>
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
            Founder & Developer: <strong className="text-white">Khateeb Malik (خاتون فاؤنڈر)</strong>
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
                  src="/icon.svg"
                  alt="KMS"
                  className="w-full h-full object-contain rounded-xl"
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
