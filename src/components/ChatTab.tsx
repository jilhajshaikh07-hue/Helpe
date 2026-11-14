import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Mic, 
  MicOff, 
  Volume2, 
  Sparkles, 
  CalendarPlus, 
  Timer, 
  BellRing, 
  BookmarkPlus, 
  Compass, 
  RotateCcw,
  CheckCircle2,
  Heart,
  HelpCircle,
  AlertTriangle,
  Phone
} from 'lucide-react';
import { ChatMessage, UserProfile, InChatAction } from '../types';
import { soundFx, speechCtrl } from '../utils/audio';

interface ChatTabProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => Promise<void>;
  isLoading: boolean;
  userProfile: UserProfile;
  onExecuteAction: (action: InChatAction, msgIndex: number, actionIndex: number) => void;
  onClearChat: () => void;
  onOpenRealityCheckWithDilemma: (dilemma: string) => void;
  onOpenVoiceChat: () => void;
}

export const ChatTab: React.FC<ChatTabProps> = ({
  messages,
  onSendMessage,
  isLoading,
  userProfile,
  onExecuteAction,
  onClearChat,
  onOpenRealityCheckWithDilemma,
  onOpenVoiceChat,
}) => {
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [recognitionError, setRecognitionError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Web Speech API Voice Dictation
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setInputText(transcript);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setRecognitionError('Microphone permission blocked. Enable mic in browser settings.');
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleVoiceInput = () => {
    setRecognitionError(null);
    if (!recognitionRef.current) {
      setRecognitionError('Speech recognition is not supported in this browser. Type in the input below.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        if (userProfile.soundEffects) soundFx.playActionChime();
      } catch (err) {
        console.warn('Voice input start failed:', err);
      }
    }
  };

  const handleSend = async (textToSend?: string) => {
    const content = (textToSend || inputText).trim();
    if (!content || isLoading) return;

    if (userProfile.soundEffects) soundFx.playSendChime();
    setInputText('');
    setRecognitionError(null);
    await onSendMessage(content);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const speakMessage = (text: string) => {
    speechCtrl.speak(text);
  };

  // Get quick replies from the latest model message
  const latestMessage = messages[messages.length - 1];
  const quickReplies = latestMessage?.role === 'model' ? latestMessage.quickReplies : [];

  return (
    <div className="flex flex-col h-[calc(100vh-125px)] max-w-4xl mx-auto px-2 sm:px-4 py-2">
      
      {/* Top chat status bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-amber-50/70 border border-amber-200/60 rounded-xl mb-2 text-xs text-slate-600">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Chatting with <strong>Taniya</strong> (addresses you as <strong>{userProfile.name}</strong>)</span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={onOpenVoiceChat}
            className="text-[11px] bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 shadow-2xs transition active:scale-95"
          >
            <Phone className="w-3 h-3" />
            <span>Voice Chat</span>
          </button>
          <span className="text-slate-300">|</span>
          <button
            onClick={() => onSendMessage("Hey Taniya, give me a quick reality check on my day!")}
            className="text-[11px] text-amber-700 hover:text-amber-900 font-medium flex items-center gap-1 hover:underline"
          >
            <Compass className="w-3 h-3 text-rose-500" />
            Reality Check
          </button>
          <span className="text-slate-300">|</span>
          <button
            onClick={onClearChat}
            className="text-[11px] text-slate-400 hover:text-slate-700 flex items-center gap-1"
            title="Reset conversation"
          >
            <RotateCcw className="w-3 h-3" />
            Clear
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto px-1 sm:px-3 space-y-4 pb-4">
        {messages.map((msg, msgIndex) => {
          const isUser = msg.role === 'user';

          return (
            <div
              key={msg.id}
              className={`flex items-start gap-2.5 sm:gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} animate-in fade-in duration-200`}
            >
              {/* Avatar */}
              {!isUser ? (
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-400 via-rose-300 to-amber-200 p-0.5 shadow-sm shrink-0 mt-0.5">
                  <div className="w-full h-full rounded-full bg-amber-50 flex items-center justify-center text-amber-700 text-sm font-bold">
                    ✨
                  </div>
                </div>
              ) : (
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-slate-700 to-slate-900 p-0.5 shadow-sm shrink-0 text-white flex items-center justify-center text-xs font-semibold mt-0.5">
                  {userProfile.name.charAt(0).toUpperCase()}
                </div>
              )}

              {/* Message Bubble Container */}
              <div className={`max-w-[85%] sm:max-w-[75%] space-y-2`}>
                <div
                  className={`p-3.5 sm:p-4 rounded-2xl text-sm leading-relaxed shadow-xs relative ${
                    isUser
                      ? 'bg-amber-600 text-white rounded-tr-none'
                      : 'bg-white border border-amber-100/90 text-slate-800 rounded-tl-none'
                  }`}
                >
                  {/* Speaker and Mood Tag on Taniya's Messages */}
                  {!isUser && (
                    <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-100 text-[11px] text-slate-400">
                      <span className="font-semibold text-amber-800 flex items-center gap-1">
                        Taniya
                        {msg.mood && (
                          <span className="text-[10px] font-normal px-1.5 py-0.2 bg-amber-50 text-amber-700 rounded-md border border-amber-200/50">
                            {msg.mood}
                          </span>
                        )}
                      </span>
                      <button
                        onClick={() => speakMessage(msg.content)}
                        className="p-1 rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition"
                        title="Listen to Taniya"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Message Body */}
                  <div className="whitespace-pre-wrap">{msg.content}</div>

                  {/* Timestamp */}
                  <div
                    className={`text-[10px] text-right mt-1.5 ${
                      isUser ? 'text-amber-200' : 'text-slate-400'
                    }`}
                  >
                    {msg.timestamp}
                  </div>
                </div>

                {/* Embedded In-Chat Action Buttons */}
                {!isUser && msg.suggestedActions && msg.suggestedActions.length > 0 && (
                  <div className="pt-1 flex flex-wrap gap-2">
                    {msg.suggestedActions.map((action, actionIdx) => (
                      <button
                        key={actionIdx}
                        disabled={action.executed}
                        onClick={() => {
                          if (userProfile.soundEffects) soundFx.playActionChime();
                          onExecuteAction(action, msgIndex, actionIdx);
                        }}
                        className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition shadow-xs border ${
                          action.executed
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300 cursor-default'
                            : 'bg-white hover:bg-amber-50 text-amber-900 border-amber-300 hover:border-amber-400'
                        }`}
                      >
                        {action.executed ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        ) : action.type === 'start_focus' ? (
                          <Timer className="w-3.5 h-3.5 text-amber-600" />
                        ) : action.type === 'add_task' ? (
                          <CalendarPlus className="w-3.5 h-3.5 text-purple-600" />
                        ) : action.type === 'set_reminder' ? (
                          <BellRing className="w-3.5 h-3.5 text-blue-600" />
                        ) : (
                          <BookmarkPlus className="w-3.5 h-3.5 text-indigo-600" />
                        )}
                        <span>{action.executed ? `Added! (${action.label})` : action.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Loading Bubble */}
        {isLoading && (
          <div className="flex items-start gap-3 animate-in fade-in">
            <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 text-sm font-bold shadow-sm">
              ✨
            </div>
            <div className="p-3.5 rounded-2xl rounded-tl-none bg-white border border-amber-100 shadow-xs flex items-center space-x-2 text-slate-500 text-xs">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 rounded-full bg-amber-600 animate-bounce" style={{ animationDelay: '300ms' }} />
              <span className="text-slate-400 font-medium ml-1.5">Taniya is typing...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Reply Chips */}
      {quickReplies && quickReplies.length > 0 && !isLoading && (
        <div className="px-2 py-2 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          <span className="text-[11px] text-slate-400 font-medium shrink-0 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" />
            Quick:
          </span>
          {quickReplies.map((reply, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(reply)}
              className="text-xs px-3 py-1.5 rounded-full bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 font-medium whitespace-nowrap transition active:scale-95 shadow-2xs"
            >
              {reply}
            </button>
          ))}
        </div>
      )}

      {/* Mic permission or status error message */}
      {recognitionError && (
        <div className="mx-2 mb-2 p-2 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center justify-between">
          <span>{recognitionError}</span>
          <button onClick={() => setRecognitionError(null)} className="text-rose-500 font-bold ml-2">×</button>
        </div>
      )}

      {/* Voice Dictation Active Banner */}
      {isListening && (
        <div className="mx-2 mb-2 p-2.5 bg-rose-500 text-white rounded-xl text-xs flex items-center justify-between shadow-md animate-pulse">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
            <span className="font-semibold">Taniya is listening to you speak...</span>
          </div>
          <button
            onClick={toggleVoiceInput}
            className="px-2 py-0.5 bg-white/20 hover:bg-white/30 rounded text-white font-medium text-[11px]"
          >
            Done Talking
          </button>
        </div>
      )}

      {/* Input Box Bar */}
      <div className="p-2 sm:p-2.5 bg-white rounded-2xl border border-amber-200/80 shadow-md flex items-center space-x-2">
        {/* Voice Dictation Button */}
        <button
          onClick={toggleVoiceInput}
          className={`p-2.5 rounded-xl transition ${
            isListening
              ? 'bg-rose-500 text-white shadow-md animate-bounce'
              : 'bg-slate-100 hover:bg-amber-100 text-slate-600 hover:text-amber-800'
          }`}
          title={isListening ? 'Stop listening' : 'Speak to Taniya (Voice input)'}
        >
          {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-amber-700" />}
        </button>

        {/* Text Input */}
        <input
          ref={inputRef}
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Talk with Taniya... (e.g. "I'm feeling overwhelmed today", "Plan my study")`}
          disabled={isLoading}
          className="flex-1 bg-transparent px-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
        />

        {/* Send Button */}
        <button
          onClick={() => handleSend()}
          disabled={!inputText.trim() || isLoading}
          className={`p-2.5 rounded-xl transition ${
            inputText.trim() && !isLoading
              ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
          }`}
          title="Send message"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
};
