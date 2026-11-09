import React, { useState, useEffect, useRef } from 'react';
import { useTestStore } from '../store/useTestStore.ts';
import { Mic, MicOff, Play, Square, Sparkles, Terminal, ArrowRight } from 'lucide-react';

export const HeroCommandPanel: React.FC = () => {
  const {
    promptText,
    setPromptText,
    runTest,
    stopTest,
    isRunning,
    isParsing,
    activePlan,
  } = useTestStore();

  const [isRecording, setIsRecording] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  // Global CMD+K shortcut to focus prompt box
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Web Speech API Voice Recognition
  const toggleRecording = () => {
    if (isRecording) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Tarayıcınız Web Speech API ses tanıma özelliğini desteklemiyor.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'tr-TR';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsRecording(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setPromptText(transcript);
        }
        setIsRecording(false);
      };

      recognition.onerror = () => {
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsRecording(false);
    }
  };

  const templateChips = [
    {
      label: '🎒 8. Sınıfa Geç (LGS)',
      prompt: '8. sınıfa geç',
    },
    {
      label: '🚀 8. Sınıf Fen Bilimleri',
      prompt: '8. sınıfa geç, fen bilimlerine gir',
    },
    {
      label: '🧹 Temiz Başlangıç (Ana Sayfa)',
      prompt: 'ana sayfaya dön, pop-up kapat',
    },
    {
      label: '🎬 12. Sınıf Smoke Test',
      prompt: '12. sınıf mat üslü sayılara gir, videoyu 2x yapıp 15 saniye izle, mini testi full salla, analiz ekranı çöküyor mu bak',
    },
  ];

  return (
    <div className="bg-surface-100 rounded-2xl border border-surface-border p-5 space-y-4 shadow-xl relative overflow-hidden">
      {/* Background Subtle Gradient Glow */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-purple-600/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Hero Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-purple-400">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span>Doğal Dil Otomasyon Komutanı (Turkish NLP &amp; Gemini 2.5 Flash)</span>
        </div>
        <div className="flex items-center space-x-2 text-[11px] text-gray-500 font-mono">
          <kbd className="px-2 py-0.5 rounded bg-surface-200 border border-surface-border text-gray-400">⌘K</kbd>
          <span>ile odaklan</span>
        </div>
      </div>

      {/* Main Textarea Input Bar */}
      <div className="relative rounded-xl border border-surface-border bg-surface-200/90 focus-within:border-purple-500 focus-within:ring-1 focus-within:ring-purple-500 transition-all">
        <textarea
          ref={inputRef}
          value={promptText}
          onChange={(e) => setPromptText(e.target.value)}
          placeholder="Doping Hafıza'da neyi test etmek istiyorsun? Serbest Türkçe veya mahalle ağzı yazabilirsin... (Örn: 12. sınıf mat üslü sayılara gir, 2x yap 15 sn izle, testi salla, analize bak)"
          rows={2}
          className="w-full bg-transparent px-4 py-3 text-sm text-gray-100 placeholder-gray-500 resize-none focus:outline-none font-sans leading-relaxed"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              if (!isRunning) runTest();
            }
          }}
        />

        {/* Input Bar Action Buttons */}
        <div className="flex items-center justify-between px-3 py-2 border-t border-surface-border/60 bg-surface-300/40 rounded-b-xl">
          <div className="flex items-center space-x-2">
            {/* Voice Dictation Button */}
            <button
              onClick={toggleRecording}
              className={`p-2 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                isRecording
                  ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/30'
                  : 'bg-surface-100 hover:bg-surface-border text-gray-300'
              }`}
              title="Sesle Türkçe Komut Ver"
            >
              {isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5 text-purple-400" />}
              <span className="text-[11px]">{isRecording ? 'Dinleniyor...' : 'Sesli Komut'}</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            {isRunning ? (
              <button
                onClick={stopTest}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center space-x-1.5 shadow-lg shadow-red-600/30 transition-all transform active:scale-95"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Testi Durdur</span>
              </button>
            ) : (
              <button
                onClick={() => runTest()}
                disabled={isParsing || !promptText.trim()}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center space-x-2 shadow-lg shadow-purple-600/30 transition-all transform active:scale-95 disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Otonom Çalıştır (Playwright)</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Preset Fast Chips */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <span className="text-[11px] text-gray-500 font-semibold flex items-center space-x-1">
          <Terminal className="w-3 h-3" />
          <span>Hazır Şablonlar:</span>
        </span>
        {templateChips.map((chip, idx) => (
          <button
            key={idx}
            onClick={() => {
              setPromptText(chip.prompt);
              inputRef.current?.focus();
            }}
            className="px-3 py-1 rounded-full bg-surface-200/80 hover:bg-surface-border border border-surface-border/80 text-[11px] text-gray-300 hover:text-white transition-all flex items-center space-x-1 group"
          >
            <span>{chip.label}</span>
            <ArrowRight className="w-2.5 h-2.5 text-gray-500 group-hover:text-purple-400 transition-colors" />
          </button>
        ))}
      </div>
    </div>
  );
};
