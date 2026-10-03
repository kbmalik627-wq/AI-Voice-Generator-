import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Square,
  Download,
  RotateCcw,
  Sparkles,
  Volume2,
  Trash2,
  Copy,
  Check,
  Languages,
  Radio,
  FileText,
  Clock,
  Mic,
  Zap,
} from 'lucide-react';
import {
  VOICES,
  decodeBase64Audio,
  playDecodedBuffer,
  stopCurrentAudio,
  downloadWavFile,
  speakWebSpeech,
  synthesizeOfflineWav,
  VoiceOption,
} from './utils/audio';
import { AudioVisualizer } from './components/AudioVisualizer';
import { AiToolsModal } from './components/AiToolsModal';
import { StudioIntroSplash } from './components/StudioIntroSplash';
import { InstallShareSection } from './components/InstallShareSection';
import { SCRIPT_TEMPLATES, ScriptTemplate } from './data/templates';

interface HistoryItem {
  id: string;
  timestamp: string;
  text: string;
  voiceId: number;
  voiceName: string;
  audioBase64?: string;
  duration?: number;
}

export default function App() {
  const defaultText =
    'السلام علیکم! ورلڈ اے آئی وائس اسٹوڈیو میں خوش آمدید-یہاں آپ اردو اور دیگر زبانوں میں کاپی رائٹ فری وائس با آسانی سے تیار کر سکتے ہیں۔';

  const [text, setText] = useState<string>(defaultText);
  const [voiceId, setVoiceId] = useState<number>(0);
  const [speed, setSpeed] = useState<number>(1.0);
  const [pitch, setPitch] = useState<number>(1.0);
  const [volume, setVolume] = useState<number>(1.0);
  const [engineMode, setEngineMode] = useState<'neural' | 'browser'>('neural');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>(
    'اسٹوڈیو تیار ہے - آواز منتخب کر کے جنریٹ کا بٹن دبائیں'
  );
  const [currentAudioBase64, setCurrentAudioBase64] = useState<string | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('pakistan_voice_history');
        if (saved) return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to load history', e);
    }
    return [];
  });
  const [isAiModalOpen, setIsAiModalOpen] = useState<boolean>(false);
  const [textCopied, setTextCopied] = useState<boolean>(false);
  const [manualDir, setManualDir] = useState<'rtl' | 'ltr' | null>(null);
  const [isQuotaNotice, setIsQuotaNotice] = useState<boolean>(false);
  const [showSplash, setShowSplash] = useState<boolean>(() => {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        return sessionStorage.getItem('khateeb_splash_shown') !== 'true';
      }
    } catch (e) {
      // ignore
    }
    return true;
  });

  const handleSplashFinish = () => {
    setShowSplash(false);
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        sessionStorage.setItem('khateeb_splash_shown', 'true');
      }
    } catch (e) {
      // ignore
    }
  };

  // PWA Install State for Android Chrome & Mobile
  const [deferredPrompt, setDeferredPrompt] = useState<any>(() => {
    return typeof window !== 'undefined' ? (window as any).__KMS_PWA_PROMPT__ || null : null;
  });
  const [isAppInstalled, setIsAppInstalled] = useState(false);

  useEffect(() => {
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (typeof window !== 'undefined') {
        (window as any).__KMS_PWA_PROMPT__ = e;
      }
    };
    const handleAppInstalled = () => {
      setIsAppInstalled(true);
      setDeferredPrompt(null);
      if (typeof window !== 'undefined') {
        (window as any).__KMS_PWA_PROMPT__ = null;
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    const isStandalone =
      typeof window !== 'undefined' &&
      (window.matchMedia('(display-mode: standalone)').matches ||
        (navigator as any).standalone === true ||
        document.referrer.includes('android-app://'));
    if (isStandalone) {
      setIsAppInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const audioStopRef = useRef<(() => void) | null>(null);

  // Pure derived text direction based on Arabic/Urdu characters or user preference
  const isUrdu = /[\u0600-\u06FF]/.test(text);
  const textDir: 'rtl' | 'ltr' = manualDir ?? (isUrdu ? 'rtl' : 'ltr');

  const toggleDirection = () => {
    setManualDir((curr) => {
      const active = curr ?? (isUrdu ? 'rtl' : 'ltr');
      return active === 'rtl' ? 'ltr' : 'rtl';
    });
  };

  const selectedVoice: VoiceOption =
    VOICES.find((v) => v.id === voiceId) || VOICES[0];

  const charCount = text.length;
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

  const saveToHistory = (item: HistoryItem) => {
    setHistory((prev) => {
      const updated = [item, ...prev].slice(0, 15);
      return updated;
    });
    try {
      const current = JSON.parse(localStorage.getItem('pakistan_voice_history') || '[]');
      const updated = [item, ...current].slice(0, 15);
      localStorage.setItem('pakistan_voice_history', JSON.stringify(updated));
    } catch (err) {
      // localStorage limit
    }
  };

  const handleStop = () => {
    if (audioStopRef.current) {
      audioStopRef.current();
      audioStopRef.current = null;
    }
    stopCurrentAudio();
    setIsPlaying(false);
    setStatusMessage('آواز بند کر دی گئی (Stopped)');
  };

  const handleGenerateVoice = async () => {
    if (!text.trim()) {
      setStatusMessage('براہ کرم کوئی متن (Text) لکھیں');
      return;
    }

    handleStop();

    // Browser local engine mode
    if (engineMode === 'browser') {
      setIsPlaying(true);
      setStatusMessage(`لوکل اسٹوڈیو وائس پلے ہو رہی ہے: ${selectedVoice.name}`);
      const offlineWav = synthesizeOfflineWav(text, selectedVoice, speed, pitch);
      setCurrentAudioBase64(offlineWav);

      speakWebSpeech(text, selectedVoice, speed, pitch, () => {
        setIsPlaying(false);
        setStatusMessage('پلے بیک مکمل ہوا! آپ فائل ڈاؤنلوڈ کر سکتے ہیں۔');
      });

      saveToHistory({
        id: Date.now().toString(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: text.slice(0, 100) + (text.length > 100 ? '...' : ''),
        voiceId,
        voiceName: `${selectedVoice.name} (Local)`,
        audioBase64: offlineWav,
        duration: Math.max(2, Math.round(text.split(/\s+/).length * 0.35)),
      });
      return;
    }

    // Neural Cloud HD Engine mode
    setIsGenerating(true);
    setStatusMessage(`سٹوڈیو کوالٹی وائس تیار کی جا رہی ہے (${selectedVoice.name})...`);

    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voiceId,
          speed,
          pitch,
        }),
      });

      const data = await res.json();

      // Check if server indicated quota limit or fallback
      if (data.quotaExceeded || data.fallback || !data.audioBase64) {
        setIsQuotaNotice(true);
        setStatusMessage('نیورل کوٹہ مکمل - لامحدود لوکل اسٹوڈیو وائس تیار ہو گئی (Ready & Downloadable)');

        const offlineWav = synthesizeOfflineWav(text, selectedVoice, speed, pitch);
        setCurrentAudioBase64(offlineWav);
        setIsPlaying(true);

        speakWebSpeech(text, selectedVoice, speed, pitch, () => {
          setIsPlaying(false);
          setStatusMessage('پلے بیک مکمل! آپ فائل ڈاؤنلوڈ کر سکتے ہیں۔');
        });

        saveToHistory({
          id: Date.now().toString(),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: text.slice(0, 100) + (text.length > 100 ? '...' : ''),
          voiceId,
          voiceName: `${selectedVoice.name} (Unlimited Studio)`,
          audioBase64: offlineWav,
          duration: Math.max(2, Math.round(text.split(/\s+/).length * 0.35)),
        });
        return;
      }

      setCurrentAudioBase64(data.audioBase64);
      setStatusMessage('وائس کامیابی سے تیار ہو گئی! اب آڈیو پلے ہو رہی ہے...');

      // Decode audio
      const audioBuffer = await decodeBase64Audio(data.audioBase64, data.mimeType);

      // Play audio
      setIsPlaying(true);
      const playHandle = playDecodedBuffer(audioBuffer, {
        speed,
        pitch,
        volume,
        onEnded: () => {
          setIsPlaying(false);
          setStatusMessage('پلے بیک مکمل! آپ فائل ڈاؤنلوڈ کر سکتے ہیں۔');
        },
      });

      audioStopRef.current = playHandle.stop;
      setAnalyser(playHandle.analyser);

      // Save to history
      saveToHistory({
        id: Date.now().toString(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: text.slice(0, 100) + (text.length > 100 ? '...' : ''),
        voiceId,
        voiceName: selectedVoice.name,
        audioBase64: data.audioBase64,
        duration: Math.round(audioBuffer.duration),
      });
    } catch (err: any) {
      console.warn('Neural engine unavailable, using unlimited local studio engine:', err?.message);
      setIsQuotaNotice(true);
      const offlineWav = synthesizeOfflineWav(text, selectedVoice, speed, pitch);
      setCurrentAudioBase64(offlineWav);

      setStatusMessage('لوکل اسٹوڈیو وائس پر پلے کیا جا رہا ہے (100% Free & Downloadable)');
      setIsPlaying(true);
      speakWebSpeech(text, selectedVoice, speed, pitch, () => {
        setIsPlaying(false);
        setStatusMessage('پلے بیک مکمل ہوا! آپ فائل ڈاؤنلوڈ کر سکتے ہیں۔');
      });

      saveToHistory({
        id: Date.now().toString(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: text.slice(0, 100) + (text.length > 100 ? '...' : ''),
        voiceId,
        voiceName: `${selectedVoice.name} (Local)`,
        audioBase64: offlineWav,
        duration: Math.max(2, Math.round(text.split(/\s+/).length * 0.35)),
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    // Generate immediately if not present
    const wavToDownload = currentAudioBase64 || synthesizeOfflineWav(text, selectedVoice, speed, pitch);
    setCurrentAudioBase64(wavToDownload);

    const filename = `Pakistan_AI_Voice_${selectedVoice.shortName.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.wav`;
    downloadWavFile(wavToDownload, filename);
    setStatusMessage('آڈیو WAV فائل کامیابی سے ڈاؤنلوڈ ہو گئی!');
  };

  const handleApplyTemplate = (tmpl: ScriptTemplate) => {
    setText(tmpl.text);
    setVoiceId(tmpl.recommendedVoiceId);
    setStatusMessage(`ٹیمپلیٹ لگ گیا: "${tmpl.title}"`);
  };

  const copyText = () => {
    navigator.clipboard.writeText(text);
    setTextCopied(true);
    setTimeout(() => setTextCopied(false), 2000);
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('pakistan_voice_history');
    setStatusMessage('ہسٹری صاف کر دی گئی');
  };

  return (
    <div className="min-h-screen bg-[#0f0f1e] text-white flex flex-col items-center py-6 px-3 sm:px-6">
      {/* Starting Splash Screen: KHATEEB MALIK STUDIO */}
      {showSplash && <StudioIntroSplash onFinish={handleSplashFinish} />}

      {/* AI Tools Modal */}
      {isAiModalOpen && (
        <AiToolsModal
          isOpen={isAiModalOpen}
          onClose={() => setIsAiModalOpen(false)}
          currentText={text}
          onApplyText={(newT) => {
            setText(newT);
            setStatusMessage('AI اسکرپٹ کامیابی سے ٹیکسٹ ایریا میں شامل ہو گیا!');
          }}
        />
      )}

      {/* Main Studio Card Container */}
      <main className="w-full max-w-[540px] bg-[#1a1a2e] rounded-3xl p-5 sm:p-6 border border-[#6c5ce7] shadow-[0_0_35px_rgba(108,92,231,0.25)] flex flex-col gap-4">
        {/* Header - KMS KHATEEB MALIK STUDIO */}
        <header className="text-center pb-3 border-b border-[#2d2d44]">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-xl bg-[#0a0a16] border border-[#00ff88] p-0.5 shadow-[0_0_12px_rgba(0,255,136,0.3)] shrink-0">
              <img
                src="/pwa-192x192.png"
                alt="KMS"
                className="w-full h-full object-contain rounded-lg"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/icon.svg';
                }}
              />
            </div>
            <div className="inline-flex items-center gap-2 bg-[#6c5ce7]/25 border border-[#6c5ce7]/60 px-3 py-1 rounded-full text-xs text-[#00ff88] font-mono shadow-[0_0_12px_rgba(0,255,136,0.2)]">
              <span className="w-2 h-2 rounded-full bg-[#00ff88] animate-pulse" />
              <span className="font-bold tracking-wider">KMS OFFICIAL STUDIO</span>
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black tracking-tight flex flex-col items-center justify-center gap-1">
            <span className="text-[11px] font-mono font-black text-[#00ff88] tracking-[0.35em]">
              KMS
            </span>
            <span className="bg-gradient-to-r from-[#00ff88] via-[#ffffff] to-[#a29bfe] bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(0,255,136,0.35)] leading-tight">
              KHATEEB MALIK STUDIO
            </span>
            <span className="text-2xl sm:text-3xl font-urdu font-bold text-[#00ff88] drop-shadow-[0_0_15px_rgba(0,255,136,0.4)]">
              خطیب ملک اسٹوڈیو
            </span>
          </h1>

          <p className="text-xs sm:text-sm text-[#a29bfe] mt-1 font-medium flex items-center justify-center gap-1.5 flex-wrap">
            <span>🇵🇰 6 Real Pakistani Voices</span>
            <span>•</span>
            <span>Male, Female & Kids</span>
            <span>•</span>
            <span className="text-[#00ff88] font-bold">100% Free & Downloadable</span>
          </p>
        </header>

        {/* Quota Notice Banner */}
        {isQuotaNotice && (
          <div className="bg-[#1f1a3a] border border-[#a29bfe]/40 rounded-2xl p-3 text-xs flex items-start gap-2.5 shadow-md animate-fadeIn">
            <span className="text-base leading-none">⚡</span>
            <div className="flex-1">
              <div className="font-bold text-[#00ff88] flex items-center justify-between">
                <span>Free Tier Quota Notice • Unlimited Local Studio Active</span>
                <button
                  onClick={() => setIsQuotaNotice(false)}
                  className="text-gray-400 hover:text-white text-xs px-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>
              <p className="text-gray-300 mt-1 leading-relaxed">
                Gemini Neural TTS Free Tier daily limit (10 requests) reached. The app seamlessly switched to the <strong>Unlimited Free Studio Voice Engine</strong>. All 6 Pakistani voices and instant WAV audio downloads remain 100% active and free!
              </p>
              <div className="text-[11px] text-[#a29bfe] mt-1">
                Tip: Attach a billing-enabled key in <strong>Settings &gt; Secrets</strong> for continuous Gemini Neural cloud voices.
              </div>
            </div>
          </div>
        )}

        {/* Quick Tools Bar */}
        <div className="flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsAiModalOpen(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-[#6c5ce7]/20 hover:bg-[#6c5ce7]/40 border border-[#6c5ce7] rounded-xl text-[#a29bfe] hover:text-white transition-all text-xs font-semibold shadow-sm"
              title="Roman Urdu to Nastaliq Converter & AI Polish"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#00ff88]" />
              <span>AI اسکرپٹ ٹولز (Urdu Polish)</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowSplash(true)}
              className="px-2.5 py-1.5 bg-[#0f0f1e] hover:bg-[#252538] border border-[#2d2d44] hover:border-[#00ff88]/50 rounded-xl text-gray-300 hover:text-[#00ff88] transition-all text-xs flex items-center gap-1"
              title="Show Khateeb Malik Studio Intro"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#00ff88]" />
              <span>Intro</span>
            </button>

            <button
              onClick={toggleDirection}
              className="px-2.5 py-1.5 bg-[#0f0f1e] hover:bg-[#252538] border border-[#2d2d44] rounded-xl text-gray-300 hover:text-white transition-all text-xs flex items-center gap-1"
              title="Toggle RTL / LTR Direction"
            >
              <Languages className="w-3.5 h-3.5 text-[#a29bfe]" />
              <span>{textDir === 'rtl' ? 'RTL (اردو)' : 'LTR (ENG)'}</span>
            </button>

            <button
              onClick={() => {
                setText('');
                setManualDir(null);
              }}
              className="px-2.5 py-1.5 bg-[#0f0f1e] hover:bg-rose-950/40 border border-[#2d2d44] hover:border-rose-700/50 rounded-xl text-gray-400 hover:text-rose-300 transition-all text-xs flex items-center gap-1"
              title="Clear Text"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          </div>
        </div>

        {/* Textarea Input */}
        <div className="relative">
          <textarea
            id="text"
            dir={textDir}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="السلام علیکم! ورلڈ اے آئی وائس اسٹوڈیو میں خوش آمدید-یہاں آپ اردو اور دیگر زبانوں میں کاپی رائٹ فری وائس با آسانی سے تیار کر سکتے ہیں۔"
            rows={5}
            className={`w-full min-h-[145px] bg-[#0f0f1e] border-2 border-[#6c5ce7] rounded-2xl p-4 text-white text-lg focus:outline-none focus:border-[#00ff88] focus:shadow-[0_0_20px_rgba(0,255,136,0.2)] transition-all resize-none ${
              textDir === 'rtl' ? 'font-urdu text-xl text-right leading-loose' : 'font-sans text-base text-left'
            }`}
          />

          <button
            onClick={copyText}
            className="absolute bottom-3 left-3 p-1.5 bg-[#1a1a2e]/90 hover:bg-[#2d2d44] border border-[#2d2d44] rounded-lg text-gray-400 hover:text-white text-xs flex items-center gap-1 transition-all"
            title="Copy Text"
          >
            {textCopied ? <Check className="w-3 h-3 text-[#00ff88]" /> : <Copy className="w-3 h-3" />}
            <span className="text-[10px]">{textCopied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>

        {/* Word and Character Count */}
        <div className="count flex justify-between items-center text-xs text-[#a29bfe] font-mono px-1">
          <span id="charCount" className="flex items-center gap-1">
            <span className="text-white font-bold">{charCount}</span> characters
          </span>
          <span id="wordCount" className="flex items-center gap-1.5">
            <span className="text-white font-bold">{wordCount}</span> / ∞ words
            <span className="bg-[#00ff88]/15 border border-[#00ff88]/40 text-[#00ff88] px-2 py-0.5 rounded-full text-[10px] font-bold">
              UNLIMITED FREE
            </span>
          </span>
        </div>

        {/* Templates Quick Carousel */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-[11px] text-gray-400 px-1">
            <span>✨ Ready-to-Use Pakistani Script Templates:</span>
            <span className="text-[#a29bfe]">Click to load</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1.5 no-scrollbar scroll-smooth">
            {SCRIPT_TEMPLATES.map((tmpl) => (
              <button
                key={tmpl.id}
                onClick={() => handleApplyTemplate(tmpl)}
                className="shrink-0 px-2.5 py-1.5 bg-[#0f0f1e] hover:bg-[#252538] border border-[#2d2d44] hover:border-[#6c5ce7] rounded-xl text-xs text-gray-300 hover:text-white flex items-center gap-1.5 transition-all text-left"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#00ff88]" />
                <span className="font-medium">{tmpl.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Controls Section */}
        <div className="controls flex flex-col gap-3">
          {/* Voice Selector */}
          <div>
            <div className="flex items-center justify-between text-xs text-gray-300 mb-1.5 px-1 font-medium">
              <span className="flex items-center gap-1">
                <Mic className="w-3.5 h-3.5 text-[#00ff88]" />
                Select Voice (6 Real Pakistani Voices):
              </span>
              <span className="text-[11px] text-[#a29bfe] font-mono">
                {selectedVoice.tag} • {selectedVoice.gender}
              </span>
            </div>

            <select
              id="voiceSelect"
              value={voiceId}
              onChange={(e) => setVoiceId(Number(e.target.value))}
              className="w-full bg-[#0f0f1e] border-2 border-[#6c5ce7] text-white p-3.5 rounded-2xl text-base font-semibold focus:outline-none focus:border-[#00ff88] transition-all cursor-pointer shadow-md"
            >
              {VOICES.map((v) => (
                <option key={v.id} value={v.id} className="bg-[#1a1a2e] text-white py-2">
                  {v.name}
                </option>
              ))}
            </select>

            {/* Voice description snippet */}
            <div className="mt-1.5 px-2 flex items-center justify-between text-xs text-gray-400">
              <span className="flex items-center gap-1.5">
                <span className="text-base">{selectedVoice.avatar}</span>
                <span className="text-[#a29bfe]">{selectedVoice.description}</span>
              </span>
            </div>
          </div>

          {/* Quick Voice Avatars Pill Grid */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
            {VOICES.map((v) => (
              <button
                key={v.id}
                onClick={() => setVoiceId(v.id)}
                className={`py-2 px-1 rounded-xl border flex flex-col items-center justify-center transition-all ${
                  voiceId === v.id
                    ? 'border-[#00ff88] bg-[#00ff88]/15 text-white shadow-[0_0_12px_rgba(0,255,136,0.25)]'
                    : 'border-[#2d2d44] bg-[#0f0f1e] text-gray-400 hover:text-white hover:border-[#6c5ce7]/50'
                }`}
              >
                <span className="text-lg">{v.avatar}</span>
                <span className="text-[11px] font-bold mt-0.5 truncate w-full text-center">
                  {v.shortName.split(' ')[0]}
                </span>
                <span className="text-[9px] text-[#a29bfe]">{v.age === 'child' ? 'Bacha' : v.gender}</span>
              </button>
            ))}
          </div>

          {/* Sliders: Speed and Pitch */}
          <div className="row flex gap-3">
            {/* Speed */}
            <div className="col flex-1 bg-[#0f0f1e] p-3 rounded-2xl border border-[#2d2d44] flex flex-col justify-between">
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="text-gray-300 font-medium">Speed:</span>
                <span id="speedVal" className="font-mono text-[#00ff88] font-bold">
                  {speed.toFixed(1)}x
                </span>
              </div>
              <input
                type="range"
                id="speed"
                min="0.5"
                max="2.0"
                step="0.1"
                value={speed}
                onChange={(e) => setSpeed(parseFloat(e.target.value))}
              />
              <div className="flex justify-between text-[10px] text-gray-500 mt-1 font-mono">
                <span>0.5x Slow</span>
                <span>1.0x</span>
                <span>2.0x Fast</span>
              </div>
            </div>

            {/* Pitch */}
            <div className="col flex-1 bg-[#0f0f1e] p-3 rounded-2xl border border-[#2d2d44] flex flex-col justify-between">
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="text-gray-300 font-medium">Pitch:</span>
                <span id="pitchVal" className="font-mono text-[#00ff88] font-bold">
                  {pitch.toFixed(1)}
                </span>
              </div>
              <input
                type="range"
                id="pitch"
                min="0.5"
                max="2.0"
                step="0.1"
                value={pitch}
                onChange={(e) => setPitch(parseFloat(e.target.value))}
              />
              <div className="flex justify-between text-[10px] text-gray-500 mt-1 font-mono">
                <span>Deep / بھاری</span>
                <span>Normal</span>
                <span>High / باریک</span>
              </div>
            </div>
          </div>

          {/* Volume Slider & Engine Selector */}
          <div className="flex items-center justify-between gap-3 p-2.5 bg-[#0f0f1e] rounded-2xl border border-[#2d2d44]">
            <div className="flex items-center gap-2 flex-1">
              <Volume2 className="w-4 h-4 text-[#a29bfe] shrink-0" />
              <input
                type="range"
                min="0"
                max="1.5"
                step="0.05"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-24 sm:w-32"
              />
              <span className="text-xs font-mono text-gray-400">{Math.round(volume * 100)}%</span>
            </div>

            {/* Engine Switcher */}
            <div className="flex items-center gap-1 bg-[#1a1a2e] p-1 rounded-xl border border-[#2d2d44]">
              <button
                onClick={() => setEngineMode('neural')}
                className={`px-2 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                  engineMode === 'neural'
                    ? 'bg-[#6c5ce7] text-white shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
                title="AI Neural Cloud Engine (High Definition Studio WAV)"
              >
                <Zap className="w-3 h-3 text-[#00ff88]" />
                <span>AI Neural (HD)</span>
              </button>
              <button
                onClick={() => setEngineMode('browser')}
                className={`px-2 py-1 rounded-lg text-xs font-medium transition-all ${
                  engineMode === 'browser'
                    ? 'bg-[#2d2d44] text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
                title="Instant Browser Engine"
              >
                <span>Local</span>
              </button>
            </div>
          </div>

          {/* Visualizer */}
          <AudioVisualizer isPlaying={isPlaying} analyser={analyser} />

          {/* Main Action Buttons */}
          <div className="flex flex-col gap-2 mt-1">
            <button
              onClick={isPlaying ? handleStop : handleGenerateVoice}
              disabled={isGenerating}
              className={`btn-main w-full py-4 rounded-2xl text-white font-extrabold text-lg flex items-center justify-center gap-2 shadow-xl transition-all cursor-pointer ${
                isPlaying
                  ? 'bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 shadow-rose-900/30'
                  : 'bg-gradient-to-r from-[#6c5ce7] via-[#8574ea] to-[#a29bfe] hover:from-[#5b4bd8] hover:to-[#918bf0] shadow-[#6c5ce7]/30 hover:scale-[1.01]'
              } disabled:opacity-50`}
            >
              {isGenerating ? (
                <>
                  <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin" />
                  <span>وائس تیار کی جا رہی ہے (Generating AI Audio)...</span>
                </>
              ) : isPlaying ? (
                <>
                  <Square className="w-5 h-5 fill-white" />
                  <span>Stop Playback (آواز بند کریں)</span>
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 fill-white" />
                  <span>Generate Voice & Play (وائس تیار کریں)</span>
                </>
              )}
            </button>

            {/* Secondary Buttons Row */}
            <div className="flex gap-2">
              <button
                onClick={handleDownload}
                disabled={isGenerating}
                className="btn-sec flex-1 bg-[#2d2d44] hover:bg-[#383856] border border-[#6c5ce7] py-3 px-3 rounded-xl text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md disabled:opacity-40"
              >
                <Download className="w-4 h-4 text-[#00ff88]" />
                <span>Download Audio (.WAV)</span>
              </button>

              {isPlaying && (
                <button
                  onClick={handleStop}
                  className="bg-rose-900/40 hover:bg-rose-900/60 border border-rose-500/50 py-3 px-4 rounded-xl text-rose-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>Stop</span>
                </button>
              )}
            </div>
          </div>

          {/* Status Bar */}
          <div className="status mt-2 bg-[#2d2d44]/70 border border-[#00ff88] p-3 rounded-xl text-center text-xs sm:text-sm text-[#00ff88] font-medium flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(0,255,136,0.15)] font-arabic" dir="rtl">
            <span className="w-2 h-2 rounded-full bg-[#00ff88] animate-ping" />
            <span>{statusMessage}</span>
          </div>

          {/* Recent Generations History */}
          <div className="mt-3 pt-3 border-t border-[#2d2d44]">
            <div className="flex items-center justify-between text-xs text-gray-400 mb-2 px-1">
              <span className="flex items-center gap-1.5 font-bold text-gray-300">
                <Clock className="w-3.5 h-3.5 text-[#a29bfe]" />
                Recent Audio Generations ({history.length}):
              </span>
              {history.length > 0 && (
                <button
                  onClick={clearHistory}
                  className="text-[11px] text-gray-500 hover:text-rose-400 flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear History</span>
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <div className="text-center py-4 bg-[#0f0f1e] rounded-xl border border-dashed border-[#2d2d44] text-xs text-gray-500">
                کوئی آڈیو محفوظ نہیں ہے۔ وائس جنریٹ کرنے پر یہاں تاریخ محفوظ ہو جائے گی۔
              </div>
            ) : (
              <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="hist-item bg-[#0f0f1e] hover:bg-[#16162a] p-2.5 rounded-xl border border-[#2d2d44] flex items-center justify-between gap-2 text-xs transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-bold text-[#a29bfe] text-[11px] truncate">
                          {item.voiceName}
                        </span>
                        <span className="text-[10px] text-gray-500 font-mono">
                          {item.timestamp}
                        </span>
                      </div>
                      <p className="text-gray-300 truncate text-[11px] font-urdu" dir="rtl">
                        {item.text}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {item.audioBase64 && (
                        <button
                          onClick={() => {
                            if (item.audioBase64) {
                              decodeBase64Audio(item.audioBase64).then((buf) => {
                                setIsPlaying(true);
                                const h = playDecodedBuffer(buf, {
                                  speed,
                                  pitch,
                                  volume,
                                  onEnded: () => setIsPlaying(false),
                                });
                                audioStopRef.current = h.stop;
                                setAnalyser(h.analyser);
                              });
                            }
                          }}
                          className="p-1.5 bg-[#2d2d44] hover:bg-[#6c5ce7] rounded-lg text-white transition-colors"
                          title="Replay"
                        >
                          <Play className="w-3 h-3 fill-current" />
                        </button>
                      )}
                      {item.audioBase64 && (
                        <button
                          onClick={() => {
                            if (item.audioBase64) {
                              downloadWavFile(item.audioBase64, `Voice_${item.id}.wav`);
                            }
                          }}
                          className="p-1.5 bg-[#2d2d44] hover:bg-[#00ff88] hover:text-black rounded-lg text-gray-300 transition-colors"
                          title="Download WAV"
                        >
                          <Download className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Dedicated PWA Install & Share Section */}
          <div id="install-section" className="w-full">
            <InstallShareSection />
          </div>
        </div>
      </main>

      {/* Footer Branding */}
      <footer className="mt-6 text-center text-xs text-gray-500 flex flex-col items-center gap-1">
        <p className="font-bold text-gray-300 flex items-center gap-2">
          <span className="text-[#00ff88]">⚡</span>
          <span className="bg-gradient-to-r from-[#00ff88] via-white to-[#a29bfe] bg-clip-text text-transparent font-extrabold tracking-wider">
            KMS • KHATEEB MALIK STUDIO
          </span>
          <span>•</span>
          <span className="text-[#00ff88] font-urdu">خطیب ملک اسٹوڈیو</span>
        </p>
        <p className="text-[11px] text-gray-500">
          Official Registered App • Created & Directed by Khateeb Malik • 100% Free & Copyright-Free Voices
        </p>
      </footer>
    </div>
  );
}
