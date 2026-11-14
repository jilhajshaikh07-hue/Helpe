import React from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  SkipForward, 
  CloudRain, 
  Coffee, 
  Radio, 
  VolumeX, 
  CheckCircle, 
  Sparkles,
  Link2,
  Volume2
} from 'lucide-react';
import { FocusState, FocusMode, PlannerTask, AmbientMode, UserProfile } from '../types';
import { soundFx } from '../utils/audio';

interface FocusTabProps {
  focusState: FocusState;
  onStartFocus: () => void;
  onPauseFocus: () => void;
  onResetFocus: () => void;
  onSetMode: (mode: FocusMode) => void;
  onBindTask: (taskId: string, title: string) => void;
  tasks: PlannerTask[];
  userProfile: UserProfile;
  onUpdateProfile: (updates: Partial<UserProfile>) => void;
}

export const FocusTab: React.FC<FocusTabProps> = ({
  focusState,
  onStartFocus,
  onPauseFocus,
  onResetFocus,
  onSetMode,
  onBindTask,
  tasks,
  userProfile,
  onUpdateProfile,
}) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const percentLeft = focusState.totalSeconds > 0 
    ? Math.round(((focusState.totalSeconds - focusState.remainingSeconds) / focusState.totalSeconds) * 100)
    : 0;

  const handleAmbientClick = (mode: AmbientMode) => {
    soundFx.startAmbient(mode);
    onUpdateProfile({ ambientSound: mode });
    if (userProfile.soundEffects) soundFx.playActionChime();
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    soundFx.setAmbientVolume(val);
    onUpdateProfile({ ambientVolume: val });
  };

  const isBreak = focusState.mode === 'break5' || focusState.mode === 'break15';

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      
      {/* Mode Selector Tabs */}
      <div className="flex items-center justify-center space-x-1.5 p-1.5 bg-slate-100 rounded-2xl max-w-md mx-auto">
        {[
          { id: 'focus25', label: '25m Sprint' },
          { id: 'focus50', label: '50m Deep Work' },
          { id: 'break5', label: '5m Rest' },
          { id: 'break15', label: '15m Break' },
        ].map((m) => (
          <button
            key={m.id}
            onClick={() => {
              if (userProfile.soundEffects) soundFx.playActionChime();
              onSetMode(m.id as FocusMode);
            }}
            className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-semibold transition ${
              focusState.mode === m.id
                ? 'bg-white text-slate-800 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Task Binder Card */}
      <div className="bg-white rounded-2xl p-4 border border-amber-100 shadow-xs flex items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5 min-w-0">
          <Link2 className="w-4 h-4 text-amber-600 shrink-0" />
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Bound Task to Sprint
            </span>
            <span className="text-xs sm:text-sm font-semibold text-slate-800 truncate block">
              {focusState.linkedTaskTitle || 'No task selected (Free flow focus)'}
            </span>
          </div>
        </div>

        {/* Task dropdown picker */}
        <select
          value={focusState.linkedTaskId || ''}
          onChange={(e) => {
            const chosen = tasks.find((t) => t.id === e.target.value);
            if (chosen) {
              onBindTask(chosen.id, chosen.title);
            } else {
              onBindTask('', '');
            }
          }}
          className="text-xs bg-amber-50/80 border border-amber-200/80 text-amber-900 rounded-xl px-2.5 py-1.5 font-medium max-w-[150px] sm:max-w-xs truncate focus:outline-none"
        >
          <option value="">Choose task from planner...</option>
          {tasks.filter((t) => !t.completed).map((t) => (
            <option key={t.id} value={t.id}>
              [{t.category}] {t.title}
            </option>
          ))}
        </select>
      </div>

      {/* Big Timer Circle */}
      <div className="flex flex-col items-center justify-center py-6">
        <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center">
          
          {/* SVG Progress Ring */}
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="50%"
              cy="50%"
              r="44%"
              className="stroke-slate-100"
              strokeWidth="12"
              fill="transparent"
            />
            <circle
              cx="50%"
              cy="50%"
              r="44%"
              className={`transition-all duration-1000 ${
                isBreak ? 'stroke-emerald-500' : 'stroke-amber-500'
              }`}
              strokeWidth="12"
              strokeDasharray="1000"
              strokeDashoffset={1000 - (1000 * percentLeft) / 100}
              strokeLinecap="round"
              fill="transparent"
            />
          </svg>

          {/* Time digits & Status in center */}
          <div className="absolute flex flex-col items-center justify-center text-center">
            <span className={`text-5xl sm:text-6xl font-extrabold tracking-tight tabular-nums ${
              isBreak ? 'text-emerald-700' : 'text-slate-800'
            }`}>
              {formatTime(focusState.remainingSeconds)}
            </span>
            <span className="text-xs font-semibold text-slate-400 mt-2 flex items-center gap-1.5">
              {focusState.isActive && !focusState.isPaused ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  {isBreak ? 'Resting & Recharging' : 'Deep in the Zone'}
                </>
              ) : focusState.isPaused ? (
                <span className="text-amber-600 font-semibold">Paused</span>
              ) : (
                'Ready to Begin'
              )}
            </span>
          </div>
        </div>

        {/* Controls Bar */}
        <div className="flex items-center space-x-4 mt-6">
          <button
            onClick={() => {
              if (userProfile.soundEffects) soundFx.playActionChime();
              onResetFocus();
            }}
            className="p-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
            title="Reset timer"
          >
            <RotateCcw className="w-5 h-5" />
          </button>

          {!focusState.isActive || focusState.isPaused ? (
            <button
              onClick={() => {
                if (userProfile.soundEffects) soundFx.playActionChime();
                onStartFocus();
              }}
              className="px-8 py-3.5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-base shadow-lg hover:shadow-xl transition flex items-center space-x-2 active:scale-95"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>{focusState.isPaused ? 'Resume Focus' : 'Start Focus'}</span>
            </button>
          ) : (
            <button
              onClick={() => {
                if (userProfile.soundEffects) soundFx.playActionChime();
                onPauseFocus();
              }}
              className="px-8 py-3.5 rounded-2xl bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-base shadow-xs transition flex items-center space-x-2 active:scale-95"
            >
              <Pause className="w-5 h-5 fill-current" />
              <span>Pause</span>
            </button>
          )}

          <button
            onClick={() => {
              if (userProfile.soundEffects) soundFx.playBellChime();
              onResetFocus();
              onSetMode(isBreak ? 'focus25' : 'break5');
            }}
            className="p-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
            title="Skip to next session"
          >
            <SkipForward className="w-5 h-5" />
          </button>
        </div>

        {/* Finished cycles counter */}
        <div className="mt-4 flex items-center space-x-1.5 text-xs text-slate-500 font-medium">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>{focusState.completedCycles} focus sprints completed today</span>
        </div>
      </div>

      {/* Built-In Ambient Sound Generator Section */}
      <div className="bg-white rounded-3xl p-5 border border-amber-100 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <h4 className="text-sm font-bold text-slate-800">Synthesized Ambient Audio</h4>
          </div>
          <span className="text-[11px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md font-medium">
            Zero External Hosts • Web Audio
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
          <button
            onClick={() => handleAmbientClick('rain')}
            className={`p-3 rounded-2xl text-xs font-semibold border flex flex-col items-center justify-center gap-1.5 transition ${
              userProfile.ambientSound === 'rain'
                ? 'bg-blue-50 border-blue-400 text-blue-700 shadow-xs'
                : 'bg-slate-50 border-transparent text-slate-600 hover:bg-slate-100'
            }`}
          >
            <CloudRain className="w-5 h-5 text-blue-500" />
            <span>Gentle Rain</span>
          </button>

          <button
            onClick={() => handleAmbientClick('cafe')}
            className={`p-3 rounded-2xl text-xs font-semibold border flex flex-col items-center justify-center gap-1.5 transition ${
              userProfile.ambientSound === 'cafe'
                ? 'bg-amber-50 border-amber-400 text-amber-800 shadow-xs'
                : 'bg-slate-50 border-transparent text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Coffee className="w-5 h-5 text-amber-600" />
            <span>Cozy Cafe</span>
          </button>

          <button
            onClick={() => handleAmbientClick('drone')}
            className={`p-3 rounded-2xl text-xs font-semibold border flex flex-col items-center justify-center gap-1.5 transition ${
              userProfile.ambientSound === 'drone'
                ? 'bg-purple-50 border-purple-400 text-purple-800 shadow-xs'
                : 'bg-slate-50 border-transparent text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Radio className="w-5 h-5 text-purple-600" />
            <span>Warm Synth Drone</span>
          </button>

          <button
            onClick={() => handleAmbientClick('none')}
            className={`p-3 rounded-2xl text-xs font-semibold border flex flex-col items-center justify-center gap-1.5 transition ${
              userProfile.ambientSound === 'none'
                ? 'bg-slate-200 border-slate-300 text-slate-800'
                : 'bg-slate-50 border-transparent text-slate-500 hover:bg-slate-100'
            }`}
          >
            <VolumeX className="w-5 h-5 text-slate-400" />
            <span>Silent</span>
          </button>
        </div>

        {userProfile.ambientSound !== 'none' && (
          <div className="pt-3 border-t border-slate-100 flex items-center space-x-3">
            <Volume2 className="w-4 h-4 text-slate-400" />
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={userProfile.ambientVolume}
              onChange={handleVolumeChange}
              className="flex-1 accent-amber-500 h-1.5 bg-slate-100 rounded-lg cursor-pointer"
            />
            <span className="text-xs font-semibold text-slate-600 min-w-8 text-right">
              {Math.round(userProfile.ambientVolume * 100)}%
            </span>
          </div>
        )}
      </div>

    </div>
  );
};
