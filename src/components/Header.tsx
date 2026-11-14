import React, { useState } from 'react';
import { 
  Sparkles, 
  Volume2, 
  VolumeX, 
  Settings, 
  CloudRain, 
  Coffee, 
  Radio, 
  Clock, 
  Calendar, 
  MessageSquare, 
  BrainCircuit, 
  Compass, 
  Bell,
  Heart,
  Phone
} from 'lucide-react';
import { UserProfile, AmbientMode } from '../types';
import { soundFx, speechCtrl } from '../utils/audio';

interface HeaderProps {
  userProfile: UserProfile;
  onUpdateProfile: (updates: Partial<UserProfile>) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  openSettings: () => void;
  pendingTasksCount: number;
  isFocusRunning: boolean;
  focusRemainingText?: string;
  isSpeaking: boolean;
  activeRemindersCount: number;
  onOpenVoiceChat: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  userProfile,
  onUpdateProfile,
  activeTab,
  setActiveTab,
  openSettings,
  pendingTasksCount,
  isFocusRunning,
  focusRemainingText,
  isSpeaking,
  activeRemindersCount,
  onOpenVoiceChat,
}) => {
  const [showAmbientMenu, setShowAmbientMenu] = useState(false);

  const handleAmbientChange = (mode: AmbientMode) => {
    soundFx.startAmbient(mode);
    onUpdateProfile({ ambientSound: mode });
    if (userProfile.soundEffects) soundFx.playActionChime();
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    soundFx.setAmbientVolume(val);
    onUpdateProfile({ ambientVolume: val });
  };

  const toggleVoice = () => {
    const nextVal = !userProfile.voiceNarration;
    speechCtrl.setEnabled(nextVal);
    onUpdateProfile({ voiceNarration: nextVal });
    if (userProfile.soundEffects) soundFx.playActionChime();
  };

  return (
    <header className="bg-white/90 backdrop-blur-md border-b border-amber-100/80 sticky top-0 z-30 shadow-xs">
      {/* Top Banner Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between">
        
        {/* Companion Brand & Persona */}
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gradient-to-tr from-amber-400 via-rose-300 to-amber-200 p-0.5 shadow-md flex items-center justify-center">
              <div className="w-full h-full rounded-full bg-amber-50 flex items-center justify-center text-amber-700 font-bold text-lg select-none">
                ✨
              </div>
            </div>
            {/* Animated online badge */}
            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            </span>
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-1.5">
                Taniya
                <span className="text-xs px-2 py-0.5 bg-rose-50 text-rose-600 rounded-full font-medium border border-rose-200/60 hidden sm:inline-flex items-center gap-1">
                  <Heart className="w-2.5 h-2.5 fill-rose-500 text-rose-500" />
                  Your Close Friend
                </span>
              </h1>
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              {isSpeaking ? (
                <span className="text-amber-600 font-medium animate-pulse">Taniya is speaking...</span>
              ) : (
                <span>Here for {userProfile.name} • Warm &amp; Upbeat</span>
              )}
            </p>
          </div>
        </div>

        {/* Global Controls: Ambience, Voice, Focus Pill, Settings */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          
          {/* Live Voice Chat Button */}
          <button
            onClick={onOpenVoiceChat}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white shadow-xs transition active:scale-95"
            title="Start Live Voice Chat with Taniya"
          >
            <Phone className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Voice Chat</span>
          </button>

          {/* Active Focus Pill in Header */}
          {isFocusRunning && (
            <button
              onClick={() => setActiveTab('focus')}
              className="flex items-center space-x-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-800 rounded-full text-xs font-semibold hover:bg-amber-100 transition animate-pulse"
              title="Focus Sprint Active"
            >
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>{focusRemainingText || 'Focusing'}</span>
            </button>
          )}

          {/* Ambient Sound Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowAmbientMenu(!showAmbientMenu)}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition ${
                userProfile.ambientSound !== 'none'
                  ? 'bg-amber-50 border-amber-300 text-amber-800 shadow-xs'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
              title="Ambience Sound Generator"
            >
              {userProfile.ambientSound === 'rain' && <CloudRain className="w-3.5 h-3.5 text-blue-500" />}
              {userProfile.ambientSound === 'cafe' && <Coffee className="w-3.5 h-3.5 text-amber-600" />}
              {userProfile.ambientSound === 'drone' && <Radio className="w-3.5 h-3.5 text-purple-500" />}
              {userProfile.ambientSound === 'none' && <CloudRain className="w-3.5 h-3.5 text-slate-400" />}
              <span className="hidden md:inline capitalize">
                {userProfile.ambientSound === 'none' ? 'Ambience' : userProfile.ambientSound}
              </span>
            </button>

            {showAmbientMenu && (
              <div 
                className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-amber-100 p-3 z-50 animate-in fade-in zoom-in-95 duration-150"
                onMouseLeave={() => setShowAmbientMenu(false)}
              >
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                  <span className="text-xs font-semibold text-slate-700">Synthesized Ambience</span>
                  <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-medium">100% Offline</span>
                </div>
                
                <div className="grid grid-cols-2 gap-1.5 mb-3">
                  <button
                    onClick={() => handleAmbientChange('rain')}
                    className={`flex items-center space-x-1.5 p-2 rounded-xl text-xs font-medium border transition ${
                      userProfile.ambientSound === 'rain'
                        ? 'bg-blue-50 border-blue-300 text-blue-700'
                        : 'bg-slate-50 border-transparent text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <CloudRain className="w-3.5 h-3.5 text-blue-500" />
                    <span>Gentle Rain</span>
                  </button>

                  <button
                    onClick={() => handleAmbientChange('cafe')}
                    className={`flex items-center space-x-1.5 p-2 rounded-xl text-xs font-medium border transition ${
                      userProfile.ambientSound === 'cafe'
                        ? 'bg-amber-50 border-amber-300 text-amber-800'
                        : 'bg-slate-50 border-transparent text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Coffee className="w-3.5 h-3.5 text-amber-600" />
                    <span>Cozy Cafe</span>
                  </button>

                  <button
                    onClick={() => handleAmbientChange('drone')}
                    className={`flex items-center space-x-1.5 p-2 rounded-xl text-xs font-medium border transition ${
                      userProfile.ambientSound === 'drone'
                        ? 'bg-purple-50 border-purple-300 text-purple-800'
                        : 'bg-slate-50 border-transparent text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Radio className="w-3.5 h-3.5 text-purple-600" />
                    <span>Warm Drone</span>
                  </button>

                  <button
                    onClick={() => handleAmbientChange('none')}
                    className={`flex items-center space-x-1.5 p-2 rounded-xl text-xs font-medium border transition ${
                      userProfile.ambientSound === 'none'
                        ? 'bg-slate-200 border-slate-300 text-slate-800'
                        : 'bg-slate-50 border-transparent text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    <span>Mute Off</span>
                  </button>
                </div>

                {userProfile.ambientSound !== 'none' && (
                  <div className="pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                      <span>Volume</span>
                      <span>{Math.round(userProfile.ambientVolume * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={userProfile.ambientVolume}
                      onChange={handleVolumeChange}
                      className="w-full accent-amber-500 h-1.5 bg-slate-100 rounded-lg cursor-pointer"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Voice Narration Toggle */}
          <button
            onClick={toggleVoice}
            className={`p-2 rounded-xl border transition ${
              userProfile.voiceNarration
                ? 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100'
                : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100'
            }`}
            title={userProfile.voiceNarration ? 'Voice Narration ON (Click to mute)' : 'Voice Narration OFF (Click to unmute)'}
          >
            {userProfile.voiceNarration ? (
              <Volume2 className="w-4 h-4 text-rose-500" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {/* Settings Modal Toggle */}
          <button
            onClick={openSettings}
            className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 transition"
            title="Profile & Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Tab Navigation Bar */}
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center space-x-1 sm:space-x-2 overflow-x-auto py-1 scrollbar-none">
        
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition ${
            activeTab === 'chat'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-amber-50 hover:text-amber-800'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Chat with Taniya</span>
        </button>

        <button
          onClick={() => setActiveTab('planner')}
          className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition relative ${
            activeTab === 'planner'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-amber-50 hover:text-amber-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Day Planner</span>
          {pendingTasksCount > 0 && (
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              activeTab === 'planner' ? 'bg-amber-800 text-white' : 'bg-amber-100 text-amber-800'
            }`}>
              {pendingTasksCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('focus')}
          className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition ${
            activeTab === 'focus'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-amber-50 hover:text-amber-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Focus Buddy</span>
          {isFocusRunning && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('reality')}
          className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition ${
            activeTab === 'reality'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-amber-50 hover:text-amber-800'
          }`}
        >
          <Compass className="w-4 h-4 text-rose-500" />
          <span>Reality Check</span>
        </button>

        <button
          onClick={() => setActiveTab('memories')}
          className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition ${
            activeTab === 'memories'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-amber-50 hover:text-amber-800'
          }`}
        >
          <BrainCircuit className="w-4 h-4 text-indigo-500" />
          <span>Memory Book</span>
        </button>

        <button
          onClick={() => setActiveTab('reminders')}
          className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition ${
            activeTab === 'reminders'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-amber-50 hover:text-amber-800'
          }`}
        >
          <Bell className="w-4 h-4 text-emerald-500" />
          <span>Reminders</span>
          {activeRemindersCount > 0 && (
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              activeTab === 'reminders' ? 'bg-amber-800 text-white' : 'bg-emerald-100 text-emerald-800'
            }`}>
              {activeRemindersCount}
            </span>
          )}
        </button>

      </nav>
    </header>
  );
};
