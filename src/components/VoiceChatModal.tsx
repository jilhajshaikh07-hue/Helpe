import React, { useState, useEffect, useRef } from 'react';
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  Sparkles,
  Hand,
  MessageSquare,
  RefreshCw,
} from 'lucide-react';
import { MemoryItem, PlannerTask, UserProfile } from '../types';
import { soundFx, speechCtrl } from '../utils/audio';
import { apiUrl } from '../utils/api';
import {
  LiveVoiceClient,
  LiveVoiceName,
  VoiceCallStatus,
  fetchGeminiTtsAudio,
} from '../utils/liveVoice';

interface VoiceChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile;
  memories: MemoryItem[];
  tasks: PlannerTask[];
  onAppendVoiceTurn: (role: 'user' | 'model', text: string) => void;
}

interface TranscriptLine {
  id: string;
  role: 'user' | 'model';
  text: string;
  isFinal: boolean;
}

const VOICE_OPTIONS: Array<{ id: LiveVoiceName; label: string; vibe: string }> = [
  { id: 'Zephyr', label: 'Zephyr', vibe: 'Warm & Bright' },
  { id: 'Kore', label: 'Kore', vibe: 'Calm & Grounded' },
  { id: 'Puck', label: 'Puck', vibe: 'Playful & Upbeat' },
];

export const VoiceChatModal: React.FC<VoiceChatModalProps> = ({
  isOpen,
  onClose,
  userProfile,
  memories,
  tasks,
  onAppendVoiceTurn,
}) => {
  const [status, setStatus] = useState<VoiceCallStatus>('idle');
  const [selectedVoice, setSelectedVoice] = useState<LiveVoiceName>('Zephyr');
  const [isMuted, setIsMuted] = useState(false);
  const [isFallbackMode, setIsFallbackMode] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [inputLevel, setInputLevel] = useState(0);
  const [outputLevel, setOutputLevel] = useState(0);
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [callSeconds, setCallSeconds] = useState(0);

  const clientRef = useRef<LiveVoiceClient | null>(null);
  const userDraftRef = useRef('');
  const modelDraftRef = useRef('');
  const recognitionRef = useRef<any>(null);
  const fallbackAudioRef = useRef<HTMLAudioElement | null>(null);
  const isFallbackActiveRef = useRef(false);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  // Call duration timer
  useEffect(() => {
    if (
      status === 'idle' ||
      status === 'error' ||
      status === 'connecting'
    ) {
      return;
    }
    const timer = window.setInterval(() => {
      setCallSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [status]);

  // Cleanup when modal closes or unmounts
  useEffect(() => {
    if (!isOpen) {
      stopAllVoice();
    }
    return () => {
      stopAllVoice();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const commitDrafts = () => {
    const userText = userDraftRef.current.trim();
    const modelText = modelDraftRef.current.trim();

    if (userText) {
      onAppendVoiceTurn('user', userText);
      userDraftRef.current = '';
    }
    if (modelText) {
      onAppendVoiceTurn('model', modelText);
      modelDraftRef.current = '';
    }

    setTranscript((prev) =>
      prev.map((line) => (line.isFinal ? line : { ...line, isFinal: true }))
    );
  };

  const upsertDraftLine = (role: 'user' | 'model', chunk: string) => {
    if (role === 'user') {
      userDraftRef.current += chunk;
    } else {
      modelDraftRef.current += chunk;
    }
    const fullText = role === 'user' ? userDraftRef.current : modelDraftRef.current;

    setTranscript((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.role === role && !last.isFinal) {
        const updated = [...prev];
        updated[updated.length - 1] = { ...last, text: fullText };
        return updated;
      }
      return [
        ...prev,
        {
          id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          role,
          text: fullText,
          isFinal: false,
        },
      ];
    });
  };

  const stopAllVoice = () => {
    isFallbackActiveRef.current = false;
    if (clientRef.current) {
      clientRef.current.stop();
      clientRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
      recognitionRef.current = null;
    }
    if (fallbackAudioRef.current) {
      try {
        fallbackAudioRef.current.pause();
      } catch (_) {}
      fallbackAudioRef.current = null;
    }
    speechCtrl.stop();
    commitDrafts();
    setStatus('idle');
    setInputLevel(0);
    setOutputLevel(0);
    setIsMuted(false);
  };

  // Start Real-Time Gemini Live Voice Call
  const startLiveCall = async () => {
    stopAllVoice();
    setErrorMsg(null);
    setIsFallbackMode(false);
    setCallSeconds(0);
    setTranscript([]);

    if (userProfile.soundEffects) soundFx.playActionChime();
    speechCtrl.stop();

    const client = new LiveVoiceClient({
      onStatusChange: (nextStatus) => setStatus(nextStatus),
      onInputTranscript: (chunk) => upsertDraftLine('user', chunk),
      onOutputTranscript: (chunk) => upsertDraftLine('model', chunk),
      onTurnComplete: () => commitDrafts(),
      onInputLevel: (lvl) => setInputLevel(lvl),
      onOutputLevel: (lvl) => setOutputLevel(lvl),
      onError: (msg) => setErrorMsg(msg),
    });

    clientRef.current = client;

    const ok = await client.start({
      userProfile,
      memories,
      tasks,
      voiceName: selectedVoice,
    });

    if (!ok) {
      // Automatically offer / switch to hands-free turn-based voice chat if live WS failed
      clientRef.current = null;
    }
  };

  // Hands-free Turn-Based Voice Mode (SpeechRecognition -> /api/chat -> Gemini TTS / SpeechSynthesis)
  const startFallbackVoiceMode = async () => {
    stopAllVoice();
    setErrorMsg(null);
    setIsFallbackMode(true);
    isFallbackActiveRef.current = true;
    setCallSeconds(0);
    setStatus('fallback-listening');

    const greeting = `Hey ${userProfile.name}! I'm on the line with you. What's on your mind?`;
    setTranscript((prev) => [
      ...prev,
      { id: `fb-greet-${Date.now()}`, role: 'model', text: greeting, isFinal: true },
    ]);
    onAppendVoiceTurn('model', greeting);
    await speakFallbackResponse(greeting);
  };

  const speakFallbackResponse = async (text: string) => {
    if (!isFallbackActiveRef.current) return;
    setStatus('fallback-speaking');
    setOutputLevel(0.6);

    const audio = await fetchGeminiTtsAudio(text, selectedVoice);
    if (audio && isFallbackActiveRef.current) {
      fallbackAudioRef.current = audio;
      audio.onended = () => {
        setOutputLevel(0);
        if (isFallbackActiveRef.current) {
          listenFallbackTurn();
        }
      };
      audio.onerror = () => {
        setOutputLevel(0);
        if (isFallbackActiveRef.current) {
          listenFallbackTurn();
        }
      };
      try {
        await audio.play();
        return;
      } catch (_) {}
    }

    // Browser SpeechSynthesis fallback
    speechCtrl.setEnabled(true);
    speechCtrl.speak(text, () => {
      setOutputLevel(0);
      if (isFallbackActiveRef.current) {
        listenFallbackTurn();
      }
    });
  };

  const listenFallbackTurn = () => {
    if (!isFallbackActiveRef.current) return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setErrorMsg(
        'Continuous browser speech recognition is unavailable here. Tap a quick prompt below or use Chrome/Android!'
      );
      setStatus('fallback-listening');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    let finalUtterance = '';

    recognition.onstart = () => {
      if (isFallbackActiveRef.current) {
        setStatus('fallback-listening');
        setInputLevel(0.35);
      }
    };

    recognition.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const piece = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalUtterance += piece;
        } else {
          interim += piece;
        }
      }
      const display = (finalUtterance + interim).trim();
      if (display) {
        userDraftRef.current = display;
        setTranscript((prev) => {
          const last = prev[prev.length - 1];
          if (last && last.role === 'user' && !last.isFinal) {
            const copy = [...prev];
            copy[copy.length - 1] = { ...last, text: display };
            return copy;
          }
          return [
            ...prev,
            { id: `fb-u-${Date.now()}`, role: 'user', text: display, isFinal: false },
          ];
        });
      }
    };

    recognition.onend = async () => {
      setInputLevel(0);
      const spoken = (finalUtterance || userDraftRef.current).trim();
      userDraftRef.current = '';
      if (!isFallbackActiveRef.current) return;

      if (!spoken) {
        // Retry listening quietly if nothing caught
        if (!isMuted && isFallbackActiveRef.current) {
          window.setTimeout(() => listenFallbackTurn(), 400);
        }
        return;
      }

      await sendFallbackTurn(spoken);
    };

    recognition.onerror = (e: any) => {
      setInputLevel(0);
      if (e.error === 'not-allowed') {
        setErrorMsg('Microphone permission denied. Please enable mic access.');
        setStatus('error');
        isFallbackActiveRef.current = false;
      }
    };

    recognitionRef.current = recognition;
    if (!isMuted) {
      try {
        recognition.start();
      } catch (_) {}
    }
  };

  const sendFallbackTurn = async (spokenText: string) => {
    setTranscript((prev) =>
      prev.map((line) => (line.isFinal ? line : { ...line, isFinal: true }))
    );
    onAppendVoiceTurn('user', spokenText);
    setStatus('fallback-thinking');

    try {
      const res = await fetch(apiUrl('/api/chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: spokenText }],
          memories,
          userProfile,
          currentPlannerTasks: tasks,
          clientTime: new Date().toLocaleString(),
        }),
      });
      const data = await res.json();
      const reply = data.replyText || `I'm right here with you, ${userProfile.name}!`;
      setTranscript((prev) => [
        ...prev,
        { id: `fb-m-${Date.now()}`, role: 'model', text: reply, isFinal: true },
      ]);
      onAppendVoiceTurn('model', reply);
      await speakFallbackResponse(reply);
    } catch {
      const errReply = `I caught that, ${userProfile.name}, though my connection hiccuped for a second.`;
      setTranscript((prev) => [
        ...prev,
        { id: `fb-m-${Date.now()}`, role: 'model', text: errReply, isFinal: true },
      ]);
      await speakFallbackResponse(errReply);
    }
  };

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    if (userProfile.soundEffects) soundFx.playActionChime();

    if (clientRef.current) {
      clientRef.current.setMuted(next);
    }
    if (isFallbackMode && recognitionRef.current) {
      if (next) {
        try {
          recognitionRef.current.stop();
        } catch (_) {}
      } else if (status === 'fallback-listening') {
        listenFallbackTurn();
      }
    }
  };

  const handleInterrupt = () => {
    if (clientRef.current) {
      clientRef.current.clearPlaybackQueue();
      setStatus('listening');
    }
    if (fallbackAudioRef.current) {
      fallbackAudioRef.current.pause();
      setOutputLevel(0);
      if (isFallbackActiveRef.current) listenFallbackTurn();
    }
    speechCtrl.stop();
  };

  const handleQuickPrompt = (promptText: string) => {
    if (userProfile.soundEffects) soundFx.playActionChime();
    if (clientRef.current && (status === 'listening' || status === 'speaking')) {
      clientRef.current.sendPromptText(promptText);
      setTranscript((prev) => [
        ...prev,
        { id: `qp-${Date.now()}`, role: 'user', text: promptText, isFinal: true },
      ]);
      onAppendVoiceTurn('user', promptText);
    } else if (isFallbackMode) {
      setTranscript((prev) => [
        ...prev,
        { id: `qp-${Date.now()}`, role: 'user', text: promptText, isFinal: true },
      ]);
      sendFallbackTurn(promptText);
    }
  };

  if (!isOpen) return null;

  const isCallActive =
    status === 'listening' ||
    status === 'speaking' ||
    status === 'fallback-listening' ||
    status === 'fallback-thinking' ||
    status === 'fallback-speaking';

  const isTaniyaSpeaking = status === 'speaking' || status === 'fallback-speaking';
  const activeEnergy = isTaniyaSpeaking ? outputLevel : inputLevel;
  const orbScale = 1 + activeEnergy * 0.28;

  const statusLabel = (() => {
    if (status === 'connecting') return 'Connecting live voice...';
    if (status === 'speaking' || status === 'fallback-speaking') return 'Taniya is speaking...';
    if (status === 'fallback-thinking') return 'Taniya is thinking...';
    if (isMuted) return 'Microphone muted';
    if (status === 'listening' || status === 'fallback-listening')
      return `Listening to ${userProfile.name}...`;
    if (status === 'error') return 'Voice connection interrupted';
    return `Ready for Voice Chat with ${userProfile.name}`;
  })();

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-gradient-to-b from-[#fffaf2] via-white to-[#fff5eb] rounded-3xl shadow-2xl border border-amber-200/80 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Bar */}
        <div className="px-5 py-4 border-b border-amber-100 flex items-center justify-between bg-white/80">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-rose-400 flex items-center justify-center text-white shadow-xs">
              <Phone className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                Taniya Voice Chat
                {isCallActive && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                    {formatDuration(callSeconds)}
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-slate-500">
                {isFallbackMode ? 'Turn-by-Turn Voice Mode' : 'Real-Time Gemini Live Audio'}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              stopAllVoice();
              onClose();
            }}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-2.5 py-1 rounded-xl hover:bg-slate-100 transition"
          >
            Close
          </button>
        </div>

        {/* Center Orb & Status */}
        <div className="px-6 pt-6 pb-4 flex flex-col items-center text-center">
          <div className="relative w-40 h-40 flex items-center justify-center">
            {/* Outer aura */}
            <div
              className={`absolute inset-0 rounded-full blur-xl transition-transform duration-150 ${
                isTaniyaSpeaking
                  ? 'bg-gradient-to-tr from-rose-400/50 via-amber-300/60 to-orange-300/50'
                  : isCallActive && !isMuted
                  ? 'bg-gradient-to-tr from-emerald-300/40 via-amber-300/50 to-amber-200/40'
                  : 'bg-amber-200/30'
              }`}
              style={{ transform: `scale(${orbScale * 1.08})` }}
            />

            {/* Main Animated Orb */}
            <div
              className={`relative w-32 h-32 rounded-full shadow-xl flex flex-col items-center justify-center transition-transform duration-150 border-4 border-white ${
                isTaniyaSpeaking
                  ? 'bg-gradient-to-tr from-rose-500 via-amber-500 to-amber-300'
                  : isCallActive
                  ? 'bg-gradient-to-tr from-amber-500 via-amber-400 to-rose-300'
                  : 'bg-gradient-to-tr from-amber-400 to-rose-300'
              }`}
              style={{ transform: `scale(${orbScale})` }}
            >
              <Sparkles className="w-8 h-8 text-white drop-shadow-xs" />
              <span className="text-xs font-bold text-white mt-1 tracking-wide">Taniya</span>
            </div>
          </div>

          <p className="mt-3 text-sm font-bold text-slate-800">{statusLabel}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {isCallActive
              ? 'Speak naturally anytime — you can interrupt Taniya mid-sentence.'
              : 'Pick a voice style and start talking hands-free with Taniya.'}
          </p>

          {/* Voice Style Selector (shown before starting call) */}
          {!isCallActive && status !== 'connecting' && (
            <div className="mt-4 w-full">
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block mb-1.5">
                Taniya&apos;s Voice Style
              </span>
              <div className="grid grid-cols-3 gap-2">
                {VOICE_OPTIONS.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVoice(v.id)}
                    className={`p-2 rounded-2xl border text-left transition ${
                      selectedVoice === v.id
                        ? 'bg-amber-50 border-amber-400 text-amber-900 shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-xs font-bold block">{v.label}</span>
                    <span className="text-[10px] text-slate-400 block">{v.vibe}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Error / Fallback Recovery Box */}
        {errorMsg && (
          <div className="mx-5 mb-3 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-2">
            <p className="font-medium">{errorMsg}</p>
            {!isFallbackMode && (
              <button
                onClick={startFallbackVoiceMode}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Switch to Turn-Based Voice Chat
              </button>
            )}
          </div>
        )}

        {/* Live Transcript Feed */}
        {transcript.length > 0 && (
          <div className="mx-5 mb-3 flex-1 min-h-[110px] max-h-48 overflow-y-auto bg-white/90 border border-amber-100 rounded-2xl p-3 space-y-2 text-xs">
            {transcript.map((line) => (
              <div
                key={line.id}
                className={`flex ${line.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] px-3 py-1.5 rounded-xl ${
                    line.role === 'user'
                      ? 'bg-amber-600 text-white'
                      : 'bg-amber-50 text-slate-800 border border-amber-200/70'
                  }`}
                >
                  <span className="font-bold text-[10px] opacity-75 block">
                    {line.role === 'user' ? userProfile.name : 'Taniya'}
                  </span>
                  <span>{line.text}</span>
                </div>
              </div>
            ))}
            <div ref={transcriptEndRef} />
          </div>
        )}

        {/* Quick Voice Prompts while on call */}
        {isCallActive && (
          <div className="px-5 pb-3 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            {[
              'Give me a quick pep talk',
              'Help me prioritize today',
              'Do a reality check with me',
            ].map((prompt) => (
              <button
                key={prompt}
                onClick={() => handleQuickPrompt(prompt)}
                className="text-[11px] px-3 py-1.5 rounded-full bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 font-medium whitespace-nowrap transition shrink-0"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        {/* Bottom Controls */}
        <div className="px-6 py-4 bg-white border-t border-amber-100 flex items-center justify-center gap-3">
          {!isCallActive && status !== 'connecting' ? (
            <>
              <button
                onClick={startLiveCall}
                className="flex-1 py-3 px-5 rounded-2xl bg-gradient-to-r from-amber-600 to-rose-500 hover:from-amber-700 hover:to-rose-600 text-white font-bold text-sm shadow-lg flex items-center justify-center gap-2 transition active:scale-95"
              >
                <Phone className="w-4 h-4" />
                <span>Start Live Voice Call</span>
              </button>
              <button
                onClick={startFallbackVoiceMode}
                className="py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition"
                title="Use turn-by-turn speech recognition + TTS"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Turn Mode</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={toggleMute}
                className={`p-3.5 rounded-2xl border transition ${
                  isMuted
                    ? 'bg-rose-100 border-rose-300 text-rose-700'
                    : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                }`}
                title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              {isTaniyaSpeaking && (
                <button
                  onClick={handleInterrupt}
                  className="px-4 py-3 rounded-2xl bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold flex items-center gap-1.5 transition"
                  title="Pause Taniya so you can speak"
                >
                  <Hand className="w-4 h-4" />
                  <span>Interrupt</span>
                </button>
              )}

              <button
                onClick={() => {
                  if (userProfile.soundEffects) soundFx.playActionChime();
                  stopAllVoice();
                }}
                className="px-6 py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-md flex items-center gap-2 transition active:scale-95"
              >
                <PhoneOff className="w-4 h-4" />
                <span>End Call</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
