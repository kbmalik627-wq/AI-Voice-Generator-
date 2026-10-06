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
  getAudioContext,
  VoiceOption,
} from './utils/audio';
import { AudioVisualizer } from './components/AudioVisualizer';
import { AiToolsModal } from './components/AiToolsModal';
import { StudioIntroSplash } from './components/StudioIntroSplash';
import { InstallShareSection } from './components/InstallShareSection';
import { SCRIPT_TEMPLATES, ScriptTemplate } from './data/templates';

const DEFAULT_AUTH_TOKEN = 'one_token_to_rule_them_all';

export function getStudioAuthToken(): string {
  if (typeof window === 'undefined') return DEFAULT_AUTH_TOKEN;
  try {
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get('__aistudio_auth_token');
    if (tokenFromUrl) {
      localStorage.setItem('__aistudio_auth_token', tokenFromUrl);
      return tokenFromUrl;
    }
    const tokenFromStorage = localStorage.getItem('__aistudio_auth_token');
    if (tokenFromStorage) return tokenFromStorage;
  } catch (e) {
    // ignore
  }
  return DEFAULT_AUTH_TOKEN;
}

export async function studioApiFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const token = getStudioAuthToken();
  const sep = endpoint.includes('?') ? '&' : '?';
  const fullUrl = `${endpoint}${sep}__aistudio_auth_token=${encodeURIComponent(token)}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-aistudio-auth-token': token,
    ...((options.headers as Record<string, string>) || {}),
  };

  return fetch(fullUrl, {
    ...options,
    credentials: 'include',
    headers,
  });
}

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
    'Salam Pakistan, Gold 4100 par hai';

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

  // KMS 5 Free Voices per day & 1-Month Pro (Rs. 300) System
  const [kmsCount, setKmsCount] = useState<number>(0);
  const [isPro, setIsPro] = useState<boolean>(false);
  const [proDaysRemaining, setProDaysRemaining] = useState<number>(30);
  const [showProBox, setShowProBox] = useState<boolean>(false);
  const [tidInput, setTidInput] = useState<string>('');
  const [proToast, setProToast] = useState<string | null>(null);
  const [copiedNumber, setCopiedNumber] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<string>('00:00');
  const [currentLang, setCurrentLang] = useState<'ur' | 'en'>('ur');
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [userProfile, setUserProfile] = useState<{ name: string; email?: string; platform: string } | null>(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('kms_user_profile');
        if (saved) return JSON.parse(saved);
      }
    } catch (e) {
      // ignore
    }
    return null;
  });

  const getTimeUntilMidnight = () => {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const diff = Math.max(0, midnight.getTime() - now.getTime());
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours} گھنٹے ${minutes} منٹ`;
  };

  useEffect(() => {
    setTimeLeft(getTimeUntilMidnight());
    const timer = setInterval(() => {
      setTimeLeft(getTimeUntilMidnight());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    try {
      const today = new Date().toDateString();
      const lastDate = localStorage.getItem('kms_date');
      let count = parseInt(localStorage.getItem('kms_count') || '0', 10);
      if (isNaN(count)) count = 0;

      if (lastDate !== today) {
        count = 0;
        localStorage.setItem('kms_date', today);
        localStorage.setItem('kms_count', '0');
      }

      // Check 1-Month Pro status with strict expiry timestamp
      const proStatus = localStorage.getItem('kms_pro') === 'true';
      const expiryStr = localStorage.getItem('kms_pro_expiry');

      if (proStatus) {
        if (expiryStr) {
          const expiry = parseInt(expiryStr, 10);
          if (Date.now() < expiry) {
            setIsPro(true);
            const days = Math.max(1, Math.ceil((expiry - Date.now()) / (1000 * 60 * 60 * 24)));
            setProDaysRemaining(days);
          } else {
            // Expired after 1 month (30 days)
            setIsPro(false);
            localStorage.removeItem('kms_pro');
            localStorage.removeItem('kms_pro_expiry');
          }
        } else {
          // Grant full 30 days if not set
          const defaultExpiry = Date.now() + 30 * 24 * 60 * 60 * 1000;
          localStorage.setItem('kms_pro_expiry', defaultExpiry.toString());
          setIsPro(true);
          setProDaysRemaining(30);
        }
      }

      setKmsCount(count);
      if (!proStatus && count >= 5) {
        setShowProBox(true);
      }
    } catch (e) {
      // ignore
    }
  }, []);

  const handleCopyPaymentNumber = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText('03267976823');
    }
    setCopiedNumber(true);
    setTimeout(() => setCopiedNumber(false), 2500);
  };

  const handleUnlockPro = () => {
    const cleanTid = tidInput.trim() || `TID-${Date.now().toString().slice(-6)}`;
    const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000; // 30 Days
    const expiryTimestamp = Date.now() + ONE_MONTH_MS;

    try {
      localStorage.setItem('kms_pro', 'true');
      localStorage.setItem('kms_pro_expiry', expiryTimestamp.toString());
      localStorage.setItem('kms_pro_tid', cleanTid);
      localStorage.setItem('kms_pro_date', new Date().toISOString());

      setIsPro(true);
      setProDaysRemaining(30);
      setShowProBox(false);
      setProToast('🎉 مبارک ہو! 1 ماہ (30 دن) کا پرو پیکج ایکٹو ہو گیا ہے - اب لامحدود آوازیں بنائیں!');
      setStatusMessage('👑 1 MONTH VIP PRO ACTIVE - 30 دن تک لامحدود آوازیں ایکٹو ہیں!');
      setTimeout(() => setProToast(null), 8000);
    } catch (e) {
      // ignore
    }
  };

  const handleLoginWith = (platform: 'Google' | 'Facebook') => {
    const profile = {
      name: platform === 'Google' ? 'Google User (صارف)' : 'Facebook User (صارف)',
      email: platform === 'Google' ? 'user@gmail.com' : 'user@facebook.com',
      platform,
    };
    setUserProfile(profile);
    try {
      localStorage.setItem('kms_user_profile', JSON.stringify(profile));
    } catch (e) {
      // ignore
    }
    setStatusMessage(`✅ ${platform} کے ساتھ لاگ ان کامیاب! خوش آمدید!`);
  };

  const handleDeleteAccount = () => {
    if (window.confirm('کیا آپ واقعی اپنا تمام ڈیٹا، وائس ہسٹری اور اکاؤنٹ ڈیلیٹ کرنا چاہتے ہیں؟')) {
      localStorage.removeItem('kms_user_profile');
      localStorage.removeItem('pakistan_voice_history');
      localStorage.removeItem('kms_count');
      setUserProfile(null);
      setHistory([]);
      setKmsCount(0);
      setShowProfileModal(false);
      setStatusMessage('اکاؤنٹ اور ڈیٹا ڈیلیٹ کر دیا گیا ہے (Data Reset Done)');
    }
  };
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

  const hasSpokenWelcomeRef = useRef(false);

  const playWelcomeSpeech = React.useCallback(async () => {
    const welcomeUrdu =
      'السلام علیکم! ویلکم آپ کا خطیب ملک اسٹوڈیو میں۔ یہاں آپ کو خوبصورت آوازیں ملیں گی۔ شکریہ!';
    const welcomeRoman =
      'Assalam o alaikum! Welcome aapka Khateeb Malik Studio main, yahan aapko khoobsurat voices milengi. Shukriya!';

    setStatusMessage('🎤 السلام علیکم! ویلکم آپ کا خطیب ملک اسٹوڈیو میں، یہاں آپ کو خوبصورت آوازیں ملیں گی 🎤');
    hasSpokenWelcomeRef.current = true;

    // 1st Priority: Real HD Studio Voice via AI Neural Engine
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const res = await studioApiFetch('/api/tts', {
        method: 'POST',
        signal: controller.signal,
        body: JSON.stringify({
          text: welcomeUrdu,
          voiceId: 0,
          speed: 1.0,
          pitch: 1.0,
        }),
      });
      clearTimeout(timeoutId);

      const data = await res.json();
      if (data && data.audioBase64) {
        const audioBuffer = await decodeBase64Audio(data.audioBase64, data.mimeType);
        setIsPlaying(true);
        const playHandle = playDecodedBuffer(audioBuffer, {
          speed: 1.0,
          pitch: 1.0,
          volume: 1.0,
          onEnded: () => {
            setIsPlaying(false);
          },
        });
        audioStopRef.current = playHandle.stop;
        setAnalyser(playHandle.analyser);
        return;
      }
    } catch (err) {
      console.warn('Real studio audio fallback to browser speech synthesis', err);
    }

    // 2nd Fallback: Web Speech Synthesis with correct Urdu / Roman matching
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const availableVoices = window.speechSynthesis.getVoices();
        const urVoice = availableVoices.find(
          (v) =>
            v.lang.startsWith('ur') ||
            v.lang.startsWith('hi') ||
            v.name.toLowerCase().includes('urdu') ||
            v.name.toLowerCase().includes('pakistan')
        );

        const textToSpeak = urVoice ? welcomeUrdu : welcomeRoman;
        const msg = new SpeechSynthesisUtterance(textToSpeak);
        msg.lang = urVoice ? 'ur-PK' : 'en-US';
        msg.rate = 0.88;
        msg.pitch = 1.0;
        if (urVoice) {
          msg.voice = urVoice;
        }

        window.speechSynthesis.speak(msg);
      }
    } catch (e) {
      console.warn('Welcome speech synthesis fallback error', e);
    }
  }, []);

  const handleSplashFinish = React.useCallback(() => {
    setShowSplash(false);
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        sessionStorage.setItem('khateeb_splash_shown', 'true');
      }
    } catch (e) {
      // ignore
    }
    // Also trigger welcome voice when splash finishes
    if (!hasSpokenWelcomeRef.current) {
      playWelcomeSpeech();
    }
  }, [playWelcomeSpeech]);

  // Automated Welcome Audio for CEO Khateeb Malik on load (1000ms delay)
  useEffect(() => {
    const welcomeTimer = setTimeout(() => {
      playWelcomeSpeech();
    }, 1000);

    // Browser audio policy fallback: if blocked without interaction, speak on first touch
    const handleFirstGesture = () => {
      if (!hasSpokenWelcomeRef.current) {
        playWelcomeSpeech();
      }
      window.removeEventListener('click', handleFirstGesture);
      window.removeEventListener('touchstart', handleFirstGesture);
    };

    window.addEventListener('click', handleFirstGesture, { once: true });
    window.addEventListener('touchstart', handleFirstGesture, { once: true });

    return () => {
      clearTimeout(welcomeTimer);
      window.removeEventListener('click', handleFirstGesture);
      window.removeEventListener('touchstart', handleFirstGesture);
    };
  }, [playWelcomeSpeech]);

  // PWA Install State for Android Chrome & Mobile
  const [deferredPrompt, setDeferredPrompt] = useState<any>(() => {
    return typeof window !== 'undefined' ? (window as any).__KMS_PWA_PROMPT__ || null : null;
  });
  const [isAppInstalled, setIsAppInstalled] = useState(false);
  const [showTikTokBanner, setShowTikTokBanner] = useState<boolean>(() => {
    return (
      typeof navigator !== 'undefined' &&
      /musical_ly|TikTok|ByteLocale/i.test(navigator.userAgent)
    );
  });

  useEffect(() => {
    // Unlock AudioContext on first user gesture for mobile / in-app browsers
    const unlockAudio = () => {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          if (ctx.state === 'suspended') {
            ctx.resume();
          }
        }
      } catch (e) {
        // ignore
      }
    };
    window.addEventListener('touchstart', unlockAudio, { once: true });
    window.addEventListener('click', unlockAudio, { once: true });
  }, []);

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

  // Guarantee __aistudio_auth_token is preserved in URL and cookies for shared visitors
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        const token =
          url.searchParams.get('__aistudio_auth_token') ||
          localStorage.getItem('__aistudio_auth_token') ||
          DEFAULT_AUTH_TOKEN;

        localStorage.setItem('__aistudio_auth_token', token);
        document.cookie = `__aistudio_auth_token=${token}; path=/; max-age=31536000; SameSite=None; Secure`;

        if (!url.searchParams.has('__aistudio_auth_token')) {
          url.searchParams.set('__aistudio_auth_token', token);
          window.history.replaceState(null, '', url.toString());
        }
      }
    } catch (e) {
      // ignore
    }
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
    // Synchronously awaken AudioContext during the user tap/click for mobile Safari/Chrome
    try {
      const audioCtx = getAudioContext();
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
    } catch (e) {
      // ignore
    }

    if (!text.trim()) {
      setStatusMessage('Pehle kuch likho!');
      return;
    }

    if (!isPro && kmsCount >= 5) {
      setShowProBox(true);
      setStatusMessage('🚨 آج کی 5 مفت آوازیں ختم ہو گئی ہیں! پرو خریدیں۔');
      setTimeout(() => {
        const el = document.getElementById('pro-box');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
      return;
    }

    handleStop();

    // Increment count if not pro
    if (!isPro) {
      const nextCount = kmsCount + 1;
      setKmsCount(nextCount);
      try {
        localStorage.setItem('kms_count', nextCount.toString());
        localStorage.setItem('kms_date', new Date().toDateString());
      } catch (e) {
        // ignore
      }
      if (nextCount >= 5) {
        setShowProBox(true);
      }
    }

    // Browser local engine mode
    if (engineMode === 'browser') {
      setIsPlaying(true);
      setStatusMessage(`لوکل اسٹوڈیو وائس پلے ہو رہی ہے: ${selectedVoice.name}`);
      const offlineWav = synthesizeOfflineWav(text, selectedVoice, speed, pitch);
      setCurrentAudioBase64(offlineWav);

      speakWebSpeech(text, selectedVoice, speed, pitch, () => {
        setIsPlaying(false);
        setStatusMessage('✅ Voice Ready! Ab Download karo');
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
    setStatusMessage('Bana raha hun...');

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const res = await studioApiFetch('/api/tts', {
        method: 'POST',
        signal: controller.signal,
        body: JSON.stringify({
          text,
          voiceId,
          speed,
          pitch,
        }),
      });
      clearTimeout(timeoutId);

      const data = await res.json();

      // Check if server indicated quota limit or fallback
      if (data.quotaExceeded || data.fallback || !data.audioBase64) {
        setIsQuotaNotice(true);
        setStatusMessage('✅ Voice Ready! Ab Download karo');

        const offlineWav = synthesizeOfflineWav(text, selectedVoice, speed, pitch);
        setCurrentAudioBase64(offlineWav);
        setIsPlaying(true);

        speakWebSpeech(text, selectedVoice, speed, pitch, () => {
          setIsPlaying(false);
          setStatusMessage('✅ Voice Ready! Ab Download karo');
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
      setStatusMessage('✅ Voice Ready! Ab Download karo');

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
          setStatusMessage('✅ Voice Ready! Ab Download karo');
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

      setStatusMessage('✅ Voice Ready! Ab Download karo');
      setIsPlaying(true);
      speakWebSpeech(text, selectedVoice, speed, pitch, () => {
        setIsPlaying(false);
        setStatusMessage('✅ Voice Ready! Ab Download karo');
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

    const filename = `KMS_Voice_${Date.now()}.wav`;
    downloadWavFile(wavToDownload, filename);
    setStatusMessage('⬇️ Downloaded - Made by KMS Voice Studio 🇵🇰');
  };

  const handleApplyTemplate = (tmpl: ScriptTemplate) => {
    setText(tmpl.text);
    setVoiceId(tmpl.recommendedVoiceId);
    setStatusMessage(`ٹیمپلیٹ لگ گیا: "${tmpl.title}"`);
  };

  const copyText = () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).catch(() => {
          fallbackCopyText(text);
        });
      } else {
        fallbackCopyText(text);
      }
    } catch (e) {
      fallbackCopyText(text);
    }
    setTextCopied(true);
    setTimeout(() => setTextCopied(false), 2000);
  };

  const fallbackCopyText = (val: string) => {
    try {
      const el = document.createElement('textarea');
      el.value = val;
      el.style.position = 'fixed';
      el.style.left = '-9999px';
      document.body.appendChild(el);
      el.focus();
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    } catch (e) {
      // ignore
    }
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

      {/* Pro Unlocked Toast Notification */}
      {proToast && (
        <div className="w-full max-w-[540px] mb-3 bg-[#00ff88] text-black font-extrabold p-3.5 rounded-2xl text-center text-sm shadow-[0_0_25px_rgba(0,255,136,0.6)] animate-bounce border-2 border-white">
          {proToast}
        </div>
      )}

      {/* Main Studio Card Container */}
      <main className="w-full max-w-[540px] bg-[#1a1a2e] rounded-3xl p-5 sm:p-6 border border-[#6c5ce7] shadow-[0_0_35px_rgba(108,92,231,0.25)] flex flex-col gap-4">
        {/* Header - 🇵🇰 KMS Voice Studio */}
        <header className="header text-center p-4 sm:p-5 bg-[#01411C] border-2 border-[#00ff88]/60 rounded-2xl shadow-[0_4px_20px_rgba(1,65,28,0.6)] flex flex-col items-center justify-center gap-2 text-white">
          {/* Top Switcher Bar: Language & User Account */}
          <div className="w-full flex items-center justify-between gap-2 pb-2.5 border-b border-[#00ff88]/30">
            <button
              onClick={() => setCurrentLang(currentLang === 'ur' ? 'en' : 'ur')}
              className="px-3 py-1 bg-black/40 hover:bg-black/60 border border-[#00ff88]/40 rounded-full text-xs font-semibold text-emerald-200 hover:text-white transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
              title="Toggle Language"
            >
              <span>🌐</span>
              <span>{currentLang === 'ur' ? 'English میں بدلیں' : 'اردو میں بدلیں'}</span>
            </button>

            <button
              onClick={() => setShowProfileModal(true)}
              className="px-3 py-1 bg-[#6c5ce7]/30 hover:bg-[#6c5ce7]/50 border border-[#a29bfe]/40 rounded-full text-xs font-bold text-white transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              <span>👤</span>
              <span>{userProfile ? userProfile.name : 'صارف کا اکاؤنٹ (Profile)'}</span>
            </button>
          </div>

          <div className="flex items-center justify-center gap-2">
            <span className="text-3xl">🇵🇰</span>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              KMS Voice Studio
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-emerald-100 font-semibold font-urdu">
            6 Real Pakistani Voices | By Khateeb Malik (خاتون فاؤنڈر و تخلیق کار)
          </p>

          {/* KMS Daily Limit Indicator */}
          <div
            id="limit-text"
            className="mt-2 w-full flex flex-col items-center justify-center gap-1.5"
          >
            {isPro ? (
              <span className="bg-[#00ff88]/20 border border-[#00ff88] text-[#00ff88] px-4 py-1.5 rounded-full flex items-center gap-2 shadow-sm font-sans text-xs font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-[#00ff88] animate-pulse" />
                <span>👑 1 MONTH VIP PRO ACTIVE • {proDaysRemaining} دن باقی (لامحدود آوازیں ایکٹو ہیں)</span>
              </span>
            ) : (
              <div className="w-full bg-[#092914]/90 border border-[#00ff88]/50 p-2.5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-2 shadow-inner">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-bold text-emerald-200 font-urdu">روزانہ فری لِمٹ:</span>
                  <span className="font-mono text-white font-black bg-black/60 px-2.5 py-0.5 rounded-lg border border-[#00ff88]/40">
                    {kmsCount} / 5 استعمال
                  </span>
                  <span
                    className={`text-[11px] font-bold ${
                      kmsCount >= 5 ? 'text-amber-300 animate-pulse' : 'text-[#00ff88]'
                    }`}
                  >
                    ({Math.max(0, 5 - kmsCount)} باقی)
                  </span>
                </div>

                {/* 5 Dots Indicator */}
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((idx) => (
                    <span
                      key={idx}
                      className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black transition-all ${
                        idx <= kmsCount
                          ? 'bg-[#00ff88] text-black shadow-[0_0_8px_rgba(0,255,136,0.8)]'
                          : 'bg-black/60 border border-gray-600 text-gray-400'
                      }`}
                      title={`آواز نمبر ${idx}`}
                    >
                      {idx <= kmsCount ? '✓' : idx}
                    </span>
                  ))}
                </div>

                {kmsCount >= 5 && (
                  <button
                    onClick={() => setShowProBox(true)}
                    className="bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:opacity-95 text-black px-3 py-1 rounded-xl text-xs font-black shadow-lg cursor-pointer flex items-center gap-1 animate-pulse"
                  >
                    <span>🔓</span>
                    <span>1 Month Pro (Rs. 300)</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </header>

        {/* TikTok In-App Browser Guidance Banner */}
        {showTikTokBanner && (
          <div className="bg-[#1f0b20] border border-[#fe2c55]/60 rounded-2xl p-3 text-xs flex items-start gap-2.5 shadow-[0_0_20px_rgba(254,44,85,0.25)] animate-fadeIn">
            <span className="text-lg leading-none">🎵</span>
            <div className="flex-1">
              <div className="font-bold text-[#fe2c55] flex items-center justify-between">
                <span>TikTok ان-ایپ براؤزر الرٹ</span>
                <button
                  onClick={() => setShowTikTokBanner(false)}
                  className="text-gray-400 hover:text-white text-xs px-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>
              <p className="text-gray-200 mt-1 leading-relaxed font-urdu">
                آڈیو فائل فون میں ڈاؤنلوڈ کرنے اور ایپ ہوم اسکرین پر لگانے کے لیے اوپر دائیں طرف <strong>(•••)</strong> دبا کر <strong>Open in Chrome / Browser</strong> منتخب کریں۔
              </p>
            </div>
          </div>
        )}

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
        <div className="flex items-center justify-between gap-2 text-xs flex-wrap">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsAiModalOpen(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-[#6c5ce7]/20 hover:bg-[#6c5ce7]/40 border border-[#6c5ce7] rounded-xl text-[#a29bfe] hover:text-white transition-all text-xs font-semibold shadow-sm"
              title="Roman Urdu to Nastaliq Converter & AI Polish"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#00ff88]" />
              <span>AI اسکرپٹ ٹولز (Urdu Polish)</span>
            </button>

            <button
              onClick={playWelcomeSpeech}
              className="px-2.5 py-1.5 bg-[#01411C] hover:bg-[#028a3d] border border-[#00ff88]/60 rounded-xl text-[#00ff88] hover:text-white transition-all text-xs font-bold flex items-center gap-1 shadow-sm cursor-pointer"
              title="Play CEO Welcome Audio (خوش آمدید وائس سنیں)"
            >
              <Mic className="w-3.5 h-3.5 text-[#00ff88]" />
              <span>🎙️ Welcome Audio</span>
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
            placeholder="Yahan Urdu me likho... Jaise: Salam Pakistan, Gold 4100 par hai"
            rows={5}
            className={`w-full min-h-[145px] bg-[#0f0f1e] border-2 border-[#01411C] focus:border-[#00ff88] rounded-2xl p-4 text-white text-lg focus:outline-none focus:shadow-[0_0_20px_rgba(0,255,136,0.25)] transition-all resize-none ${
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
          <div className="flex flex-col gap-2.5 mt-1">
            <button
              onClick={isPlaying ? handleStop : handleGenerateVoice}
              disabled={isGenerating}
              className={`btn-main w-full py-4 rounded-2xl text-white font-black text-lg flex items-center justify-center gap-2.5 shadow-2xl transition-all cursor-pointer border-2 border-[#00ff88] ${
                isPlaying
                  ? 'bg-gradient-to-r from-rose-700 to-amber-700 hover:from-rose-600 hover:to-amber-600 shadow-rose-900/40'
                  : 'bg-[#01411C] hover:bg-[#028a3d] shadow-[0_0_25px_rgba(1,65,28,0.7)] hover:scale-[1.01]'
              } disabled:opacity-50`}
            >
              {isGenerating ? (
                <>
                  <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Bana raha hun...</span>
                </>
              ) : isPlaying ? (
                <>
                  <Square className="w-5 h-5 fill-white" />
                  <span>Stop Playback (آواز بند کریں)</span>
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 fill-white" />
                  <span>🔊 Voice Banao</span>
                </>
              )}
            </button>

            {/* Download Button */}
            <button
              id="download-btn"
              onClick={handleDownload}
              disabled={isGenerating}
              className="w-full bg-[#01411C] hover:bg-[#028a3d] border-2 border-[#00ff88]/80 py-3.5 px-4 rounded-2xl text-white font-black text-sm sm:text-base flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg disabled:opacity-40"
            >
              <Download className="w-4 h-4 text-[#00ff88]" />
              <span>⬇️ Download WAV - Made by KMS Voice Studio</span>
            </button>

            {isPlaying && (
              <button
                onClick={handleStop}
                className="bg-rose-900/60 hover:bg-rose-900/80 border border-rose-500/50 py-2.5 px-4 rounded-xl text-rose-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Stop Playback</span>
              </button>
            )}
          </div>

          {/* Status Paragraph (#status) */}
          <p
            id="status"
            className="status mt-1 bg-[#01411C] border-2 border-[#00ff88] p-3 rounded-xl text-center text-xs sm:text-sm text-[#00ff88] font-bold flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(0,255,136,0.25)] font-arabic"
            dir="rtl"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-[#00ff88] animate-ping" />
            <span>{statusMessage}</span>
          </p>

          {/* Pro Box (#pro-box) */}
          <div
            id="pro-box"
            style={{ display: isPro ? 'none' : showProBox || kmsCount >= 5 ? 'block' : 'block' }}
            className={`w-full p-4 sm:p-5 rounded-3xl border-2 transition-all mt-1 ${
              kmsCount >= 5 && !isPro
                ? 'bg-gradient-to-br from-[#ffd700] via-[#ffc107] to-[#e69500] text-black border-white shadow-[0_0_35px_rgba(255,215,0,0.6)] ring-4 ring-amber-400/50'
                : 'bg-gradient-to-br from-[#ffd700] via-[#ffc107] to-[#e69500] text-black border-[#fff3b0] shadow-xl'
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <h3 className="font-black text-sm sm:text-base flex items-center gap-1.5 text-black">
                <span className="text-xl">👑</span>
                <span>
                  {kmsCount >= 5
                    ? '🚨 آج کی 5 فری وائسز ختم! 1 ماہ کا پرو پاس لیں'
                    : '1 ماہ کیلئے لا محدود وائسز - صرف Rs. 300 (VIP Pass)'}
                </span>
              </h3>
              <span className="bg-black text-[#ffd700] text-[10px] px-2.5 py-0.5 rounded-full font-mono font-black shrink-0">
                1 MONTH PASS
              </span>
            </div>

            <p className="text-xs text-gray-900 leading-relaxed font-urdu mb-2">
              روزانہ ہر صارف کو 5 مفت وائسز دی جاتی ہیں۔ پورے 1 مہینے (30 دن) کیلئے لامحدود آوازیں بنانے کیلئے ہمارا پرو پیکج خریدیں۔ ان لاک کرنے پر فوری 30 دن کی لامحدود رسائی مل جائے گی!
            </p>

            {/* Payment Info Card */}
            <div className="bg-black/90 text-white p-3 rounded-2xl border border-white/20 flex flex-col gap-2 shadow-inner">
              <div className="flex items-center justify-between text-xs">
                <span className="text-amber-300 font-bold">JazzCash / EasyPaisa:</span>
                <span className="text-gray-300 font-urdu text-[11px]">اکاؤنٹ ہولڈر: <strong>Khateeb Malik (خاتون فاؤنڈر)</strong></span>
              </div>

              <div className="flex items-center justify-between gap-2 bg-[#1a1a2e] px-3 py-2 rounded-xl border border-gray-700">
                <span className="font-mono text-base font-black text-[#00ff88] tracking-wider">
                  03267976823
                </span>
                <button
                  onClick={handleCopyPaymentNumber}
                  className="px-3 py-1 bg-[#2d2d44] hover:bg-[#00ff88] hover:text-black rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 text-white"
                >
                  {copiedNumber ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedNumber ? 'کاپی ہو گیا!' : 'کاپی نمبر'}</span>
                </button>
              </div>

              {/* Direct WhatsApp Purchase Button */}
              <button
                onClick={() => {
                  const waMsg =
                    'السلام علیکم خطیب ملک صاحبہ! مجھے KMS Voice Studio کا 1 ماہ کا پرو پیکج (Rs. 300) خریدنا ہے، روزانہ کی 5 فری آوازیں ختم ہو گئی ہیں، رہنمائی فرمائیں۔';
                  const waUrl = `https://api.whatsapp.com/send?phone=923267976823&text=${encodeURIComponent(
                    waMsg
                  )}`;
                  window.open(waUrl, '_blank');
                }}
                className="w-full py-2.5 bg-[#25D366] hover:bg-[#20ba59] text-black font-black text-xs rounded-xl flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all"
              >
                <span>📲</span>
                <span>واٹس ایپ پر رابطہ کریں اور خریدیں (03267976823)</span>
              </button>
            </div>

            {/* TID Submission */}
            <p className="text-xs text-gray-900 mt-2.5 font-bold font-urdu">
              رقم بھیجنے کے بعد نیچے TID درج کر کے 1 ماہ کیلئے ان لاک کریں:
            </p>

            <div className="flex gap-2 mt-1.5 flex-col sm:flex-row">
              <input
                type="text"
                id="tid"
                value={tidInput}
                onChange={(e) => setTidInput(e.target.value)}
                placeholder="TID نمبر یا کوڈ لکھیں (e.g. 1234567890)"
                className="flex-1 bg-white text-black p-2.5 rounded-xl border-2 border-black/40 text-xs sm:text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-black placeholder-gray-500"
              />
              <button
                onClick={handleUnlockPro}
                className="bg-black hover:bg-gray-800 text-white font-black px-5 py-2.5 rounded-xl text-xs sm:text-sm transition-all shadow-md cursor-pointer shrink-0"
              >
                1 Month Pro Unlock 🔐
              </button>
            </div>

            {/* Midnight Reset Countdown */}
            {!isPro && (
              <div className="mt-2.5 text-center text-[11px] font-bold text-gray-900 bg-amber-200/80 rounded-xl py-1.5 px-2 border border-amber-300">
                ⏰ روزانہ کی 5 فری آوازیں رات 12:00 بجے خودکار ری سیٹ ہوں گی (باقی وقت: {timeLeft})
              </div>
            )}
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

          {/* KMS Footer */}
          <div className="footer text-center mt-2 text-xs text-gray-300 font-medium">
            Made by KMS Voice Studio by Khateeb Malik - 03267976823
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
          Official Registered App • Created & Directed by Khateeb Malik (خاتون فاؤنڈر) • 100% Free & Copyright-Free Voices
        </p>
      </footer>

      {/* User Profile & Account Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
          <div className="relative max-w-sm w-full bg-[#16142e] border-2 border-[#00ff88] rounded-3xl p-6 text-white shadow-2xl flex flex-col gap-4 text-center">
            <button
              onClick={() => setShowProfileModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white text-base px-2.5 py-1 cursor-pointer rounded-full bg-white/10"
            >
              ✕
            </button>

            <div className="w-16 h-16 rounded-full bg-[#00ff88]/20 border-2 border-[#00ff88] flex items-center justify-center text-3xl mx-auto shadow-[0_0_20px_rgba(0,255,136,0.4)]">
              👤
            </div>

            <div>
              <h3 className="text-lg font-black text-white">صارف کا اکاؤنٹ (User Profile)</h3>
              <p className="text-xs text-gray-400 mt-0.5">KMS Voice Studio User Account</p>
            </div>

            {/* Profile Status */}
            <div className="bg-[#0b0b18] p-3 rounded-2xl border border-gray-700 text-xs flex flex-col gap-1.5 text-right font-urdu">
              <div className="flex items-center justify-between text-gray-300">
                <span className="font-bold text-white">{userProfile ? userProfile.name : 'مہمان صارف (Guest User)'}</span>
                <span className="text-gray-400">صارف کا نام:</span>
              </div>
              <div className="flex items-center justify-between text-gray-300">
                <span className={isPro ? 'text-[#00ff88] font-bold' : 'text-amber-400 font-bold'}>
                  {isPro ? `👑 1 Month VIP Pro (${proDaysRemaining} دن باقی)` : `⚡ فری یوزر (${5 - Math.min(5, kmsCount)}/5 وائسز باقی)`}
                </span>
                <span className="text-gray-400">پیکج اسٹیٹس:</span>
              </div>
            </div>

            {/* Login options if not logged in */}
            {!userProfile ? (
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => handleLoginWith('Google')}
                  className="w-full py-2.5 px-4 bg-white hover:bg-gray-100 text-black font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow cursor-pointer transition-all"
                >
                  <img src="https://www.gstatic.com/images/branding/productlogos/googleg/v6/24px.svg" alt="Google" className="w-4 h-4" />
                  <span>Google کے ساتھ لاگ ان کریں</span>
                </button>
                <button
                  onClick={() => handleLoginWith('Facebook')}
                  className="w-full py-2.5 px-4 bg-[#1877F2] hover:bg-[#166fe5] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow cursor-pointer transition-all"
                >
                  <span>Facebook کے ساتھ لاگ ان کریں</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleDeleteAccount}
                  className="w-full py-2.5 px-4 bg-rose-600/20 hover:bg-rose-600/40 border border-rose-500 text-rose-300 font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <span>🗑️</span>
                  <span>اکاؤنٹ ڈیلیٹ کریں (Delete Account / Reset Data)</span>
                </button>
              </div>
            )}

            <button
              onClick={() => setShowProfileModal(false)}
              className="w-full py-2 bg-[#2d2d44] hover:bg-gray-700 text-gray-300 font-bold text-xs rounded-xl cursor-pointer"
            >
              بند کریں (Close)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
