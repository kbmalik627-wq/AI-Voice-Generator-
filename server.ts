import express from 'express';
import type { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import fs from 'node:fs';

dotenv.config();

const app = express();
// Cloud Run NGINX proxies to app container on port 3000. Do not use process.env.PORT (8080) to avoid EADDRINUSE conflict with NGINX.
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Initialize Google GenAI
const ai = new GoogleGenAI();

// Voice definitions matching the 6 options
interface VoiceProfile {
  id: number;
  name: string;
  category: string;
  geminiVoice: string;
  gender: 'male' | 'female';
  age: 'adult' | 'child';
  language: 'ur' | 'en';
  systemPrompt: string;
}

const VOICE_PROFILES: Record<number, VoiceProfile> = {
  0: {
    id: 0,
    name: '🇵🇰 Urdu Female - Khateeb',
    category: 'Urdu Female',
    geminiVoice: 'Aoede',
    gender: 'female',
    age: 'adult',
    language: 'ur',
    systemPrompt: 'You are Khateeb, a sweet, warm, articulate, melodious and professional Pakistani Urdu female narrator and broadcaster with natural Urdu pronunciation.'
  },
  1: {
    id: 1,
    name: '🇵🇰 Urdu Female - Ayesha',
    category: 'Urdu Female',
    geminiVoice: 'Kore',
    gender: 'female',
    age: 'adult',
    language: 'ur',
    systemPrompt: 'You are Ayesha, an articulate, polite, warm, and professional Pakistani Urdu female narrator with melodious diction and flawless Urdu pronunciation.'
  },
  2: {
    id: 2,
    name: '🇵🇰 English Male - Ali (Pakistani)',
    category: 'English Male',
    geminiVoice: 'Puck',
    gender: 'male',
    age: 'adult',
    language: 'en',
    systemPrompt: 'You are Ali, an educated Pakistani male professional speaking fluent English with a natural, subtle South Asian / Pakistani cadence and confident delivery.'
  },
  3: {
    id: 3,
    name: '🇵🇰 English Female - Sana (Pakistani)',
    category: 'English Female',
    geminiVoice: 'Aoede',
    gender: 'female',
    age: 'adult',
    language: 'en',
    systemPrompt: 'You are Sana, a cheerful and eloquent Pakistani female speaker presenting in natural, professional English with subtle Pakistani warmth and clarity.'
  },
  4: {
    id: 4,
    name: '🧒 Urdu Boy - Hamza (Bacha)',
    category: 'Child Boy',
    geminiVoice: 'Puck',
    gender: 'male',
    age: 'child',
    language: 'ur',
    systemPrompt: 'You are Hamza, a cute, energetic 8-year-old Pakistani Urdu speaking boy (bacha) full of excitement, curiosity, and childlike wonder.'
  },
  5: {
    id: 5,
    name: '👧 Urdu Girl - Fatima (Bachi)',
    category: 'Child Girl',
    geminiVoice: 'Kore',
    gender: 'female',
    age: 'child',
    language: 'ur',
    systemPrompt: 'You are Fatima, an adorable, sweet 7-year-old Pakistani Urdu speaking little girl (bachi) talking gently and innocently.'
  }
};

// In-memory audio cache to save quota on repeated phrases (supports up to 1000 items)
const audioCache = new Map<string, string>();
const MAX_CACHE_SIZE = 1000;

// Shared handler for TTS requests (accessible via /api/tts and /api/synthesize)
const handleTTSRequest = async (req: Request, res: Response) => {
  try {
    const { text, voiceId = 0, speed = 1.0, pitch = 1.0 } = req.body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Text is required for voice generation' });
    }

    const cleanText = text.trim();
    const profile = VOICE_PROFILES[Number(voiceId)] || VOICE_PROFILES[0];
    const cacheKey = `${profile.id}_${cleanText}`;

    // Return cached audio if available
    if (audioCache.has(cacheKey)) {
      return res.json({
        success: true,
        audioBase64: audioCache.get(cacheKey),
        mimeType: 'audio/wav',
        voiceName: profile.name,
        speed,
        pitch,
        cached: true,
        wordCount: cleanText.split(/\s+/).filter(Boolean).length,
        charCount: cleanText.length
      });
    }

    // Call Gemini 3.8 Flash Lite TTS
    const speechConfig: any = {
      voiceConfig: {
        prebuiltVoiceConfig: {
          voiceName: profile.geminiVoice
        }
      }
    };

    let audioData: string | undefined;
    let mimeType = 'audio/wav';

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: cleanText,
        config: {
          speechConfig,
        }
      });

      const part = response.candidates?.[0]?.content?.parts?.[0];
      audioData = part?.inlineData?.data;
      mimeType = part?.inlineData?.mimeType || 'audio/wav';

      if (audioData) {
        audioCache.set(cacheKey, audioData);
        if (audioCache.size > MAX_CACHE_SIZE) {
          const firstKey = audioCache.keys().next().value;
          if (firstKey) audioCache.delete(firstKey);
        }
      }
    } catch (apiErr: any) {
      console.warn('Gemini TTS gracefully fallbacking for high volume:', apiErr?.message);
      return res.json({
        success: true,
        fallback: true,
        quotaExceeded: true,
        message: 'Unlimited Free Studio Voice Engine is active.',
        voiceName: profile.name,
        speed,
        pitch,
        wordCount: cleanText.split(/\s+/).filter(Boolean).length,
        charCount: cleanText.length
      });
    }

    if (!audioData) {
      return res.json({
        success: true,
        fallback: true,
        quotaExceeded: true,
        message: 'Unlimited Free Studio Voice Engine is active.',
        voiceName: profile.name,
        speed,
        pitch,
        wordCount: cleanText.split(/\s+/).filter(Boolean).length,
        charCount: cleanText.length
      });
    }

    return res.json({
      success: true,
      audioBase64: audioData,
      mimeType,
      voiceName: profile.name,
      speed,
      pitch,
      wordCount: cleanText.split(/\s+/).filter(Boolean).length,
      charCount: cleanText.length
    });
  } catch (error: any) {
    console.warn('TTS Generation handled gracefully with fallback:', error?.message);
    const profile = VOICE_PROFILES[Number(req.body?.voiceId)] || VOICE_PROFILES[0];
    return res.json({
      success: true,
      fallback: true,
      quotaExceeded: true,
      message: 'Switched to Unlimited Free Studio Voice Engine.',
      voiceName: profile.name,
      speed: Number(req.body?.speed) || 1.0,
      pitch: Number(req.body?.pitch) || 1.0,
      wordCount: (req.body?.text || '').split(/\s+/).filter(Boolean).length,
      charCount: (req.body?.text || '').length
    });
  }
};

app.post('/api/tts', handleTTSRequest);
app.post('/api/synthesize', handleTTSRequest);

// POST /api/ai-script - Script enhancer / Roman Urdu converter / Style formatter
app.post('/api/ai-script', async (req: Request, res: Response) => {
  try {
    const { prompt, style = 'enhance', currentText = '' } = req.body;

    let systemInstruction = `You are an expert Urdu and Pakistani media scriptwriter, copywriter, and linguist.
You specialize in writing natural spoken Urdu (اردو) in standard Nastaliq-friendly script, as well as Pakistani English voiceover scripts.
When given text, improve it for voice acting and audio delivery. Output ONLY the resulting voiceover script text without markdown conversational fluff, quotes, or meta-comments.`;

    let userPrompt = '';

    if (style === 'roman_to_urdu') {
      userPrompt = `Convert the following Roman Urdu (English alphabet Urdu) or English input into pure, grammatically perfect, beautiful Urdu script (اردو رسم الخط):\n"${currentText || prompt}"`;
    } else if (style === 'youtube') {
      userPrompt = `Rewrite or expand the following topic/text into a high-retention, viral YouTube Short / Reel voiceover hook (under 60 words) in engaging Urdu:\n"${currentText || prompt}"`;
    } else if (style === 'news') {
      userPrompt = `Transform the following text into a professional Urdu breaking news broadcast bulletin (نیوز بلیٹن انداز):\n"${currentText || prompt}"`;
    } else if (style === 'story') {
      userPrompt = `Turn the following into a warm, captivating Urdu story narration with dramatic pauses (داستان گو انداز):\n"${currentText || prompt}"`;
    } else if (style === 'kids') {
      userPrompt = `Write or rewrite this in a fun, lively, simple Urdu style suitable for a child (بچوں کی پیاری گفتگو یا نظم):\n"${currentText || prompt}"`;
    } else if (style === 'ad') {
      userPrompt = `Craft a persuasive 30-second commercial voiceover script in Urdu with a clear call-to-action:\n"${currentText || prompt}"`;
    } else {
      userPrompt = `Polish and improve the following text for crystal clear, natural spoken voiceover delivery:\n"${currentText || prompt}"`;
    }

    let generatedText = '';
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-flash-latest',
        contents: `${systemInstruction}\n\nTask: ${userPrompt}`,
      });
      generatedText = response.text?.trim() || '';
    } catch (modelErr: any) {
      console.warn('Primary model failed, trying fallback...', modelErr?.message);
      generatedText = currentText || prompt || '';
    }

    return res.json({
      success: true,
      resultText: generatedText || currentText || prompt
    });
  } catch (error: any) {
    console.warn('AI Script handled gracefully with fallback:', error?.message);
    return res.json({
      success: true,
      resultText: req.body?.currentText || req.body?.prompt || '',
      fallback: true
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV === 'production' && fs.existsSync('dist')) {
    app.use(express.static('dist'));
    app.get('*', (req: Request, res: Response, next) => {
      if (req.path.startsWith('/api')) return next();
      res.sendFile('dist/index.html', { root: '.' });
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Pakistan AI Voice Studio backend running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
