import React, { useState } from 'react';
import { Sparkles, Wand2, ArrowRight, Check, X, FileText } from 'lucide-react';

interface AiToolsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentText: string;
  onApplyText: (newText: string) => void;
}

export const AiToolsModal: React.FC<AiToolsModalProps> = ({
  isOpen,
  onClose,
  currentText,
  onApplyText,
}) => {
  const [inputText, setInputText] = useState(currentText);
  const [selectedStyle, setSelectedStyle] = useState<string>('roman_to_urdu');
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultText, setResultText] = useState('');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!inputText.trim()) return;
    setIsProcessing(true);
    setResultText('');

    try {
      const res = await fetch('/api/ai-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          style: selectedStyle,
          currentText: inputText,
        }),
      });

      const data = await res.json();
      if (data.success && data.resultText) {
        setResultText(data.resultText);
      } else {
        alert(data.error || 'Failed to process text');
      }
    } catch (err: any) {
      alert(err.message || 'Error communicating with AI service');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApply = () => {
    if (resultText) {
      onApplyText(resultText);
      onClose();
    }
  };

  const copyToClipboard = () => {
    if (resultText) {
      navigator.clipboard.writeText(resultText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const STYLES = [
    {
      id: 'roman_to_urdu',
      title: 'رومن اردو سے اردو رسم الخط',
      sub: 'Roman Urdu to Urdu Script (Nastaliq)',
      icon: '✍️',
      example: 'e.g. "aaj ka din bohot khoobsurat hai" -> "آج کا دن بہت خوبصورت ہے"',
    },
    {
      id: 'youtube',
      title: 'یوٹیوب وائرل شارٹس ہک',
      sub: 'Viral Short / Reel Voiceover',
      icon: '🔥',
      example: 'Fast-paced, clicky high retention opening hook',
    },
    {
      id: 'news',
      title: 'بریکنگ نیوز بلیٹن',
      sub: 'Breaking News Anchor Bulletin',
      icon: '🎙️',
      example: 'Formal, authoritative Urdu broadcast cadence',
    },
    {
      id: 'story',
      title: 'داستان گوئی اور کہانی',
      sub: 'Captivating Story Narration',
      icon: '📖',
      example: 'Expressive pauses, emotional depth and warmth',
    },
    {
      id: 'kids',
      title: 'بچوں کے لئے پیاری گفتگو',
      sub: 'Kids Cartoon / Playful Style',
      icon: '🧒',
      example: 'Lively, joyful, simple vocabulary for children',
    },
    {
      id: 'ad',
      title: 'اشتہاری و کمرشل انداز',
      sub: 'Commercial & Sales Voiceover',
      icon: '📢',
      example: 'High energy, persuasive pitch with call to action',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn" dir="ltr">
      <div className="w-full max-w-xl bg-[#1a1a2e] border border-[#6c5ce7] rounded-2xl p-5 shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-[#2d2d44]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#6c5ce7] to-[#a29bfe] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">AI Script Assistant & Urdu Converter</h2>
              <p className="text-xs text-[#a29bfe]">Roman Urdu to Nastaliq, News, Viral Hooks & Story Polish</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-[#2d2d44] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Style Selector */}
        <div className="mt-4">
          <label className="text-xs font-semibold text-gray-300 block mb-2">
            Select Transformation Mode:
          </label>
          <div className="grid grid-cols-2 gap-2">
            {STYLES.map((st) => (
              <button
                key={st.id}
                onClick={() => setSelectedStyle(st.id)}
                className={`p-2.5 rounded-xl border text-left flex flex-col transition-all ${
                  selectedStyle === st.id
                    ? 'border-[#00ff88] bg-[#00ff88]/10 text-white shadow-[0_0_15px_rgba(0,255,136,0.15)]'
                    : 'border-[#2d2d44] bg-[#0f0f1e] text-gray-300 hover:border-[#6c5ce7]/60'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <span>{st.icon}</span>
                  <span>{st.title}</span>
                </div>
                <span className="text-[11px] text-[#a29bfe] mt-0.5">{st.sub}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Text Input */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
            <span>Input Text or Topic:</span>
            {selectedStyle === 'roman_to_urdu' && (
              <span className="text-[#00ff88] text-[11px]">Type Roman Urdu or English</span>
            )}
          </div>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            rows={3}
            placeholder={
              selectedStyle === 'roman_to_urdu'
                ? 'Type in Roman Urdu: e.g. "Assalam o alaikum! World AI Voice Studio bohot acha software hai."'
                : 'Write your draft script or enter a topic...'
            }
            className="w-full bg-[#0f0f1e] border border-[#6c5ce7]/60 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-[#00ff88] transition-colors resize-none"
          />
        </div>

        {/* Generate Button */}
        <div className="mt-3">
          <button
            onClick={handleGenerate}
            disabled={isProcessing || !inputText.trim()}
            className="w-full py-2.5 bg-gradient-to-r from-[#6c5ce7] to-[#a29bfe] hover:from-[#5b4bd8] hover:to-[#918bf0] disabled:opacity-50 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all"
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Crafting AI Voiceover Script...</span>
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" />
                <span>Transform & Polish with AI</span>
              </>
            )}
          </button>
        </div>

        {/* Result Area */}
        {resultText && (
          <div className="mt-4 p-3 bg-[#0f0f1e] border border-[#00ff88]/50 rounded-xl animate-fadeIn">
            <div className="flex items-center justify-between text-xs text-[#00ff88] font-bold mb-2">
              <span className="flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Generated Voiceover Script
              </span>
              <button
                onClick={copyToClipboard}
                className="text-[11px] text-[#a29bfe] hover:text-white underline cursor-pointer"
              >
                {copied ? 'Copied!' : 'Copy Script'}
              </button>
            </div>
            <div
              className="p-3 bg-[#16162a] rounded-lg text-white font-urdu text-lg leading-loose border border-[#2d2d44] max-h-40 overflow-y-auto"
              dir="rtl"
            >
              {resultText}
            </div>

            <div className="mt-3 flex gap-2">
              <button
                onClick={handleApply}
                className="flex-1 py-2 bg-[#00ff88] hover:bg-[#00e57a] text-black font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Apply to Studio Text Area</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
