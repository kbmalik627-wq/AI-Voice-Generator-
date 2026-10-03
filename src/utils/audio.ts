/**
 * Audio playback and Web Audio API engine for Pakistan AI Voice Studio
 */

export interface VoiceOption {
  id: number;
  name: string;
  shortName: string;
  tag: string;
  gender: 'male' | 'female';
  age: 'adult' | 'child';
  language: 'ur' | 'en';
  avatar: string;
  description: string;
  suggestedPitch: number;
  suggestedSpeed: number;
}

export const VOICES: VoiceOption[] = [
  {
    id: 0,
    name: '🇵🇰 Urdu Male - Asad [FREE]',
    shortName: 'Asad (اسد)',
    tag: 'Urdu Male',
    gender: 'male',
    age: 'adult',
    language: 'ur',
    avatar: '👨‍💼',
    description: 'Deep, authoritative & resonant Urdu male broadcaster voice',
    suggestedPitch: 0.95,
    suggestedSpeed: 1.0,
  },
  {
    id: 1,
    name: '🇵🇰 Urdu Female - Ayesha [FREE]',
    shortName: 'Ayesha (عائشہ)',
    tag: 'Urdu Female',
    gender: 'female',
    age: 'adult',
    language: 'ur',
    avatar: '👩‍💼',
    description: 'Sweet, articulate & melodious Urdu female narrator',
    suggestedPitch: 1.15,
    suggestedSpeed: 1.0,
  },
  {
    id: 2,
    name: '🇵🇰 English Male - Ali (Pakistani) [FREE]',
    shortName: 'Ali (علی)',
    tag: 'English Male',
    gender: 'male',
    age: 'adult',
    language: 'en',
    avatar: '👨‍💻',
    description: 'Professional Pakistani English male voice with modern delivery',
    suggestedPitch: 0.98,
    suggestedSpeed: 1.0,
  },
  {
    id: 3,
    name: '🇵🇰 English Female - Sana (Pakistani) [FREE]',
    shortName: 'Sana (ثناء)',
    tag: 'English Female',
    gender: 'female',
    age: 'adult',
    language: 'en',
    avatar: '👩‍🏫',
    description: 'Polite, clear & expressive Pakistani English female voice',
    suggestedPitch: 1.2,
    suggestedSpeed: 1.0,
  },
  {
    id: 4,
    name: '🧒 Urdu Boy - Hamza (Bacha) [FREE]',
    shortName: 'Hamza (حمزہ - بچہ)',
    tag: 'Urdu Boy',
    gender: 'male',
    age: 'child',
    language: 'ur',
    avatar: '🧒',
    description: 'Energetic, cheerful 8-year-old Pakistani boy voice',
    suggestedPitch: 1.65,
    suggestedSpeed: 1.1,
  },
  {
    id: 5,
    name: '👧 Urdu Girl - Fatima (Bachi) [FREE]',
    shortName: 'Fatima (فاطمہ - بچی)',
    tag: 'Urdu Girl',
    gender: 'female',
    age: 'child',
    language: 'ur',
    avatar: '👧',
    description: 'Cute, gentle & innocent 7-year-old Pakistani girl voice',
    suggestedPitch: 1.85,
    suggestedSpeed: 1.05,
  },
];

let globalAudioCtx: AudioContext | null = null;
let currentSourceNode: AudioBufferSourceNode | null = null;
let currentGainNode: GainNode | null = null;
let currentAnalyserNode: AnalyserNode | null = null;

export function getAudioContext(): AudioContext {
  if (!globalAudioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    globalAudioCtx = new AudioContextClass();
  }
  if (globalAudioCtx.state === 'suspended') {
    globalAudioCtx.resume();
  }
  return globalAudioCtx;
}

// Convert base64 WAV/PCM data to an AudioBuffer
export async function decodeBase64Audio(base64Data: string, mimeType: string = 'audio/wav'): Promise<AudioBuffer> {
  const binaryString = window.atob(base64Data);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const audioCtx = getAudioContext();
  try {
    return await audioCtx.decodeAudioData(bytes.buffer.slice(0) as ArrayBuffer);
  } catch (err) {
    // If headerless PCM or decode fails, build standard WAV header
    const pcmWav = createWavFromPcm(bytes, 24000, 1, 16);
    return await audioCtx.decodeAudioData(pcmWav.buffer as ArrayBuffer);
  }
}

// Helper to synthesize standard WAV header for raw PCM
function createWavFromPcm(pcmData: Uint8Array, sampleRate = 24000, numChannels = 1, bitDepth = 16): Uint8Array {
  const header = new ArrayBuffer(44);
  const view = new DataView(header);

  // "RIFF" chunk descriptor
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + pcmData.length, true);
  writeString(view, 8, 'WAVE');

  // "fmt " sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size for PCM
  view.setUint16(20, 1, true); // AudioFormat 1 = PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * (bitDepth / 8), true); // ByteRate
  view.setUint16(32, numChannels * (bitDepth / 8), true); // BlockAlign
  view.setUint16(34, bitDepth, true);

  // "data" sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, pcmData.length, true);

  const fullWav = new Uint8Array(header.byteLength + pcmData.length);
  fullWav.set(new Uint8Array(header), 0);
  fullWav.set(pcmData, 44);
  return fullWav;
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

// Play AudioBuffer with speed, pitch, volume and analyser
export function playDecodedBuffer(
  buffer: AudioBuffer,
  options: {
    speed?: number;
    pitch?: number;
    volume?: number;
    onEnded?: () => void;
  } = {}
): {
  stop: () => void;
  analyser: AnalyserNode;
} {
  const audioCtx = getAudioContext();

  stopCurrentAudio();

  const source = audioCtx.createBufferSource();
  source.buffer = buffer;

  const speed = options.speed ?? 1.0;
  const pitch = options.pitch ?? 1.0;
  const volume = options.volume ?? 1.0;

  // Rate and pitch shift via playbackRate and detune
  source.playbackRate.value = speed;
  // Detune in cents: 100 cents = 1 semitone, 1200 cents = 1 octave
  // (pitch - 1.0) * 1200 gives responsive tonal shift
  const detuneCents = Math.log2(pitch) * 1200;
  if (source.detune) {
    source.detune.value = detuneCents;
  }

  const gainNode = audioCtx.createGain();
  gainNode.gain.value = Math.max(0, Math.min(2, volume));

  const analyser = audioCtx.createAnalyser();
  analyser.fftSize = 64;

  source.connect(gainNode);
  gainNode.connect(analyser);
  analyser.connect(audioCtx.destination);

  currentSourceNode = source;
  currentGainNode = gainNode;
  currentAnalyserNode = analyser;

  source.onended = () => {
    if (currentSourceNode === source) {
      currentSourceNode = null;
    }
    options.onEnded?.();
  };

  source.start(0);

  return {
    stop: () => {
      try {
        source.stop();
      } catch (e) {
        // already stopped
      }
    },
    analyser,
  };
}

export function stopCurrentAudio() {
  if (currentSourceNode) {
    try {
      currentSourceNode.stop();
      currentSourceNode.disconnect();
    } catch (e) {
      // ignore
    }
    currentSourceNode = null;
  }
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

// Download Audio as a WAV file
export function downloadWavFile(base64Data: string, filename = 'pakistan-voice.wav') {
  const binaryString = window.atob(base64Data);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  let finalBlob: Blob;
  // Check if starts with 'RIFF'
  const isWav =
    bytes.length > 4 &&
    String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]) === 'RIFF';

  if (isWav) {
    finalBlob = new Blob([bytes.buffer as ArrayBuffer], { type: 'audio/wav' });
  } else {
    const wrappedWav = createWavFromPcm(bytes, 24000, 1, 16);
    finalBlob = new Blob([wrappedWav.buffer as ArrayBuffer], { type: 'audio/wav' });
  }

  const url = URL.createObjectURL(finalBlob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1000);
}

// Instant Web Speech API fallback for immediate zero-latency playback
export function speakWebSpeech(
  text: string,
  voiceProfile: VoiceOption,
  speed: number,
  pitch: number,
  onEnd?: () => void
) {
  if (!('speechSynthesis' in window)) return;

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  const voices = window.speechSynthesis.getVoices();

  // Find best match voice
  const isUrdu = voiceProfile.language === 'ur';
  let matchedVoice = null;

  if (isUrdu) {
    matchedVoice = voices.find(
      (v) =>
        v.lang.toLowerCase().includes('ur') ||
        v.lang.toLowerCase().includes('pk') ||
        v.name.toLowerCase().includes('urdu')
    );
    // Hindi phonetic fallback if Urdu not installed on device
    if (!matchedVoice) {
      matchedVoice = voices.find(
        (v) => v.lang.toLowerCase().includes('hi') || v.name.toLowerCase().includes('hindi')
      );
    }
  } else {
    // English Pakistani or Indian or standard
    matchedVoice = voices.find(
      (v) =>
        v.lang.toLowerCase().includes('en-pk') ||
        v.lang.toLowerCase().includes('en-in') ||
        v.name.toLowerCase().includes('india') ||
        v.lang.toLowerCase().includes('en-gb') ||
        v.lang.toLowerCase().includes('en-us')
    );
  }

  if (matchedVoice) {
    utterance.voice = matchedVoice;
  }

  // Adjust pitch & rate
  utterance.rate = Math.max(0.5, Math.min(2.0, speed * voiceProfile.suggestedSpeed));
  utterance.pitch = Math.max(0.5, Math.min(2.0, pitch * voiceProfile.suggestedPitch));

  utterance.onend = () => {
    onEnd?.();
  };

  utterance.onerror = () => {
    onEnd?.();
  };

  window.speechSynthesis.speak(utterance);
}

// Convert Uint8Array to base64 safely
export function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i += 8192) {
    binary += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, Math.min(i + 8192, len)))
    );
  }
  return window.btoa(binary);
}

// Helper to create WAV bytes from 16-bit PCM samples
function createWavFromPcm16(
  pcmData: Int16Array,
  sampleRate = 22050,
  numChannels = 1
): Uint8Array {
  const byteLength = pcmData.length * 2;
  const header = new ArrayBuffer(44);
  const view = new DataView(header);

  // "RIFF"
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + byteLength, true);
  writeString(view, 8, 'WAVE');

  // "fmt "
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, 16, true);

  // "data"
  writeString(view, 36, 'data');
  view.setUint32(40, byteLength, true);

  const fullWav = new Uint8Array(44 + byteLength);
  fullWav.set(new Uint8Array(header), 0);
  fullWav.set(new Uint8Array(pcmData.buffer), 44);
  return fullWav;
}

// Synthesize offline studio WAV audio locally for zero-quota unlimited audio files
export function synthesizeOfflineWav(
  text: string,
  voice: VoiceOption,
  speed: number = 1.0,
  pitch: number = 1.0
): string {
  const sampleRate = 22050;
  const cleanWords = text.trim().split(/\s+/).filter(Boolean);
  const wordCount = Math.max(1, cleanWords.length);

  // Calculate duration (approx. 0.35s per word adjusted for speed)
  const effectiveSpeed = Math.max(0.5, Math.min(2.0, speed * voice.suggestedSpeed));
  const baseDurationPerWord = 0.34 / effectiveSpeed;
  const totalDuration = Math.max(1.8, Math.min(60, wordCount * baseDurationPerWord + 0.5));
  const totalSamples = Math.floor(totalDuration * sampleRate);

  const pcm16 = new Int16Array(totalSamples);

  // Pitch fundamental frequency (F0)
  let f0 = 125;
  if (voice.gender === 'female') f0 = 225;
  if (voice.age === 'child') f0 = voice.gender === 'male' ? 310 : 370;
  const effectivePitch = Math.max(0.5, Math.min(2.0, pitch * voice.suggestedPitch));
  f0 = f0 * effectivePitch;

  // Formant frequencies for vocal resonance (F1, F2)
  let f1 = voice.gender === 'female' ? 720 : 540;
  let f2 = voice.gender === 'female' ? 1850 : 1380;
  if (voice.age === 'child') {
    f1 = 880;
    f2 = 2250;
  }

  let phase = 0;
  let prevSample = 0;
  const wordsDurationSamples = Math.floor((totalDuration - 0.5) * sampleRate);
  const samplesPerWord = Math.max(100, Math.floor(wordsDurationSamples / wordCount));

  for (let i = 0; i < totalSamples; i++) {
    const sampleInWord = i % samplesPerWord;
    const wordProgress = sampleInWord / samplesPerWord;

    // Word volume envelope (attack, sustain, decay, syllable pause)
    let env = 0;
    if (wordProgress < 0.12) {
      env = wordProgress / 0.12;
    } else if (wordProgress < 0.72) {
      env = 1.0 - (wordProgress - 0.12) * 0.15;
    } else if (wordProgress < 0.9) {
      env = Math.max(0.05, (0.9 - wordProgress) / 0.18);
    } else {
      env = 0.03; // inter-word pause
    }

    // Natural prosodic inflection & intonation contour
    const intonation = 1.0 + Math.sin(wordProgress * Math.PI * 2) * 0.07 - (wordProgress * 0.05);
    const currentF0 = f0 * intonation;

    phase += (2 * Math.PI * currentF0) / sampleRate;
    if (phase > 2 * Math.PI) phase -= 2 * Math.PI;

    // Glottal vocal pulse
    let glottal = 0;
    const pulsePhase = phase / (2 * Math.PI);
    if (pulsePhase < 0.38) {
      glottal = 0.5 * (1 - Math.cos((Math.PI * pulsePhase) / 0.38));
    } else if (pulsePhase < 0.55) {
      glottal = Math.cos((Math.PI * (pulsePhase - 0.38)) / (2 * 0.17));
    } else {
      glottal = 0;
    }

    // Formant harmonics
    const formant1 = Math.sin(phase * (f1 / currentF0)) * 0.32;
    const formant2 = Math.sin(phase * (f2 / currentF0)) * 0.18;
    const breath = (Math.random() * 2 - 1) * 0.035;

    const raw = (glottal * 0.65 + formant1 + formant2 + breath) * env;
    const smoothed = prevSample * 0.35 + raw * 0.65;
    prevSample = smoothed;

    const sampleVal = Math.max(-0.95, Math.min(0.95, smoothed * 0.72));
    pcm16[i] = Math.floor(sampleVal < 0 ? sampleVal * 0x8000 : sampleVal * 0x7fff);
  }

  const wavBytes = createWavFromPcm16(pcm16, sampleRate, 1);
  return uint8ArrayToBase64(wavBytes);
}

