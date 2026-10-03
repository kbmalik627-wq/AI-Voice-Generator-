import React, { useState, useEffect } from 'react';

interface StudioIntroSplashProps {
  onFinish: () => void;
}

export const StudioIntroSplash: React.FC<StudioIntroSplashProps> = ({ onFinish }) => {
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    // Start fade-out after 2.1s, complete by 2.5s
    const fadeTimer = setTimeout(() => {
      setIsFadingOut(true);
    }, 2100);

    const finishTimer = setTimeout(() => {
      onFinish();
    }, 2500);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(finishTimer);
    };
  }, [onFinish]);

  return (
    <div
      onClick={onFinish}
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-between p-6 select-none cursor-pointer transition-opacity duration-500 ease-out bg-[#0a0a1a] ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{
        background: 'radial-gradient(circle at center, #2e0854 0%, #17042c 45%, #0a0a1a 90%)',
      }}
    >
      {/* Top subtle spacing */}
      <div className="pt-6">
        <div className="inline-flex items-center gap-2 bg-[#8a2be2]/20 border border-[#8a2be2]/40 px-3.5 py-1 rounded-full text-[11px] text-purple-300 font-mono tracking-widest shadow-[0_0_15px_rgba(138,43,226,0.3)]">
          <span className="w-2 h-2 rounded-full bg-[#00ff88] animate-ping" />
          <span>PAKISTAN NO.1 AI VOICE PLATFORM</span>
        </div>
      </div>

      {/* Center Hero Content */}
      <div className="flex flex-col items-center justify-center text-center gap-4 my-auto max-w-md w-full animate-fadeIn">
        {/* Center Logo with Glowing Effect */}
        <div className="relative group">
          {/* Ambient Glowing Halo */}
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-[#8a2be2] via-[#ffae00] to-[#8a2be2] blur-2xl opacity-75 animate-pulse" />

          {/* Logo Container */}
          <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-[#0f0728] border-2 border-[#8a2be2] p-4 shadow-[0_0_50px_rgba(138,43,226,0.85)] flex items-center justify-center">
            <img
              src="https://cdn-icons-png.flaticon.com/512/4712/4712109.png"
              alt="World AI Voice Studio Logo"
              className="w-full h-full object-contain filter drop-shadow-[0_0_15px_rgba(255,215,0,0.5)] transform hover:scale-105 transition-transform"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/icon.svg';
              }}
            />
          </div>
        </div>

        {/* Big Text: "KHATEEB MALIK STUDIO" in gold gradient, bold, letter-spacing 3px */}
        <div className="flex flex-col items-center gap-1 mt-2">
          <h1
            className="text-2xl sm:text-4xl font-black bg-gradient-to-r from-[#ffe066] via-[#f59e0b] to-[#ffd700] bg-clip-text text-transparent drop-shadow-[0_0_25px_rgba(245,158,11,0.5)] uppercase text-center"
            style={{ letterSpacing: '3px' }}
          >
            KHATEEB MALIK STUDIO
          </h1>

          {/* Below: "World AI Voice Studio" small white text */}
          <p className="text-sm sm:text-base text-gray-200 tracking-wider font-semibold font-sans mt-0.5">
            World AI Voice Studio
          </p>

          <p className="text-xs text-purple-300 font-urdu mt-0.5">
            خطیب ملک آفیشل اے آئی وائس اسٹوڈیو
          </p>
        </div>

        {/* Below that: Loading dots animation */}
        <div className="flex items-center justify-center gap-2 mt-4">
          <span
            className="w-2.5 h-2.5 rounded-full bg-[#ffd700] shadow-[0_0_10px_#ffd700] animate-bounce"
            style={{ animationDelay: '0ms', animationDuration: '800ms' }}
          />
          <span
            className="w-2.5 h-2.5 rounded-full bg-[#8a2be2] shadow-[0_0_10px_#8a2be2] animate-bounce"
            style={{ animationDelay: '180ms', animationDuration: '800ms' }}
          />
          <span
            className="w-2.5 h-2.5 rounded-full bg-[#00ff88] shadow-[0_0_10px_#00ff88] animate-bounce"
            style={{ animationDelay: '360ms', animationDuration: '800ms' }}
          />
        </div>
      </div>

      {/* Bottom: "Powered by CEO Khateeb Malik 🇵🇰" */}
      <div className="pb-6 flex flex-col items-center gap-1 text-center">
        <p className="text-xs sm:text-sm text-gray-300 font-semibold tracking-wide flex items-center justify-center gap-1.5">
          <span>Powered by CEO Khateeb Malik</span>
          <span className="text-base">🇵🇰</span>
        </p>
        <span className="text-[10px] text-gray-500 font-mono">
          Tap anywhere to skip • Initializing Voice AI Engine
        </span>
      </div>
    </div>
  );
};
