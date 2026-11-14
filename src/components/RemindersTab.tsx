import React, { useState } from 'react';
import { 
  Bell, 
  Plus, 
  Trash2, 
  Clock, 
  Droplet, 
  Eye, 
  Heart, 
  Moon, 
  CheckCircle2, 
  Sparkles,
  Volume2
} from 'lucide-react';
import { ReminderItem, UserProfile } from '../types';
import { soundFx } from '../utils/audio';

interface RemindersTabProps {
  reminders: ReminderItem[];
  onAddReminder: (title: string, minutesFromNow: number, category?: string) => void;
  onDeleteReminder: (id: string) => void;
  userProfile: UserProfile;
}

const PRESET_NUDGES = [
  {
    title: '💧 Hydration check & refill water bottle',
    minutes: 30,
    category: 'Wellness',
    icon: Droplet,
    color: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  {
    title: '👀 Eye-rest stretch: 20-20-20 rule',
    minutes: 20,
    category: 'Wellness',
    icon: Eye,
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  {
    title: '🌙 Evening wind-down: dim screens & relax',
    minutes: 60,
    category: 'Personal',
    icon: Moon,
    color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  {
    title: '📞 Call a loved one or friend for a catch-up',
    minutes: 90,
    category: 'Personal',
    icon: Heart,
    color: 'bg-rose-50 text-rose-700 border-rose-200',
  },
];

export const RemindersTab: React.FC<RemindersTabProps> = ({
  reminders,
  onAddReminder,
  onDeleteReminder,
  userProfile,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [customMinutes, setCustomMinutes] = useState(15);
  const [customCategory, setCustomCategory] = useState('General');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTitle.trim()) return;

    onAddReminder(customTitle.trim(), customMinutes, customCategory);
    if (userProfile.soundEffects) soundFx.playActionChime();
    setCustomTitle('');
    setShowAddModal(false);
  };

  const getTimeRemaining = (triggerTime: number) => {
    const diff = triggerTime - Date.now();
    if (diff <= 0) return 'Triggered!';
    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    if (mins > 60) {
      const hours = Math.floor(mins / 60);
      return `${hours}h ${mins % 60}m left`;
    }
    return `${mins}m ${secs}s left`;
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      
      {/* Banner */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-emerald-200 text-xs font-bold uppercase tracking-wider">
              <Bell className="w-4 h-4" />
              <span>Smart Reminders &amp; Nudges</span>
            </div>
            <h2 className="text-2xl font-bold mt-1">Caring Scheduled Nudges</h2>
            <p className="text-xs sm:text-sm text-emerald-100 mt-1 max-w-lg leading-relaxed">
              Taniya rings a warm chime alert when it&apos;s time to hydrate, look away from the screen, or wind down for the night.
            </p>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 bg-white text-teal-800 hover:bg-teal-50 rounded-2xl text-xs sm:text-sm font-bold shadow-md transition active:scale-95 shrink-0 flex items-center space-x-2"
          >
            <Plus className="w-4 h-4 text-emerald-600" />
            <span>Custom Nudge</span>
          </button>
        </div>
      </div>

      {/* Quick Presets Grid */}
      <div className="space-y-2">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
          Quick 1-Click Presets:
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {PRESET_NUDGES.map((preset, idx) => {
            const Icon = preset.icon;
            return (
              <button
                key={idx}
                onClick={() => {
                  onAddReminder(preset.title, preset.minutes, preset.category);
                  if (userProfile.soundEffects) soundFx.playActionChime();
                }}
                className="p-3 bg-white hover:bg-amber-50/60 rounded-2xl border border-slate-200 hover:border-amber-300 text-left transition flex items-center justify-between shadow-2xs group active:scale-98"
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div className={`p-2 rounded-xl border ${preset.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-slate-800 truncate block">
                      {preset.title}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Rings in {preset.minutes} minutes
                    </span>
                  </div>
                </div>
                <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-lg shrink-0 ml-2 group-hover:bg-amber-100">
                  + Add
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Reminders List */}
      <div className="space-y-3">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
          Scheduled Nudges ({reminders.length}):
        </span>

        {reminders.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 border border-dashed border-slate-200 text-center">
            <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <h4 className="text-sm font-semibold text-slate-600">No active reminders</h4>
            <p className="text-xs text-slate-400 mt-1">Tap one of the quick presets above!</p>
          </div>
        ) : (
          reminders.map((rem) => {
            const isPassed = rem.triggerTime <= Date.now() || rem.triggered;

            return (
              <div
                key={rem.id}
                className={`p-3.5 sm:p-4 rounded-2xl border transition flex items-center justify-between gap-3 ${
                  isPassed
                    ? 'bg-emerald-50/70 border-emerald-200'
                    : 'bg-white border-amber-100 shadow-xs'
                }`}
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div className={`p-2 rounded-xl ${isPassed ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                    {isPassed ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                  </div>

                  <div className="min-w-0">
                    <h4 className={`text-sm font-semibold truncate ${isPassed ? 'text-emerald-900' : 'text-slate-800'}`}>
                      {rem.title}
                    </h4>
                    <div className="flex items-center gap-2 mt-0.5 text-xs">
                      <span className="text-slate-500">{rem.timeString}</span>
                      <span className="text-slate-300">•</span>
                      <span className={`font-semibold ${isPassed ? 'text-emerald-600' : 'text-amber-700'}`}>
                        {getTimeRemaining(rem.triggerTime)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    onClick={() => {
                      if (userProfile.soundEffects) soundFx.playActionChime();
                      onDeleteReminder(rem.id);
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition"
                    title="Dismiss"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Custom Nudge Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-emerald-100">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Create a Caring Nudge</h3>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  What should Taniya remind you to do?
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Call mom, Stretch neck, Drink herbal tea"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Remind me in (Minutes):
                </label>
                <input
                  type="number"
                  min="1"
                  max="480"
                  value={customMinutes}
                  onChange={(e) => setCustomMinutes(parseInt(e.target.value) || 15)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                >
                  Set Nudge
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
