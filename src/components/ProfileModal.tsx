import React, { useState } from 'react';
import { User, Volume2, VolumeX, Sparkles, Heart, BellRing, RotateCcw } from 'lucide-react';
import { UserProfile } from '../types';
import { soundFx, speechCtrl } from '../utils/audio';

interface ProfileModalProps {
  userProfile: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onUpdateProfile: (updates: Partial<UserProfile>) => void;
  onResetAllData: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  userProfile,
  isOpen,
  onClose,
  onUpdateProfile,
  onResetAllData,
}) => {
  const [name, setName] = useState(userProfile.name);
  const [pronouns, setPronouns] = useState(userProfile.pronouns);
  const [primaryGoal, setPrimaryGoal] = useState(userProfile.primaryGoal);
  const [voiceNarration, setVoiceNarration] = useState(userProfile.voiceNarration);
  const [soundEffects, setSoundEffects] = useState(userProfile.soundEffects);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    speechCtrl.setEnabled(voiceNarration);
    onUpdateProfile({
      name: name.trim() || 'Jilhaj',
      pronouns,
      primaryGoal,
      voiceNarration,
      soundEffects,
    });
    if (soundEffects) soundFx.playActionChime();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-amber-100 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <span className="text-xl">✨</span>
            <h3 className="text-lg font-bold text-slate-800">Taniya &amp; Your Profile</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold text-xl">
            ×
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4 mt-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Your Preferred Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Jilhaj"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              Taniya will naturally use this in greetings, text messages, and planning notes.
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Pronouns (Optional)
            </label>
            <input
              type="text"
              value={pronouns}
              onChange={(e) => setPronouns(e.target.value)}
              placeholder="e.g. he/him, she/her, they/them"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              What are your top priorities right now?
            </label>
            <textarea
              rows={2}
              value={primaryGoal}
              onChange={(e) => setPrimaryGoal(e.target.value)}
              placeholder="e.g. Balancing deep coding and university prep while keeping sleep schedule healthy"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 resize-none"
            />
          </div>

          <div className="pt-2 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-700 block">Taniya Voice Narration</span>
                <span className="text-[11px] text-slate-400">Read responses out loud with friendly speech</span>
              </div>
              <input
                type="checkbox"
                checked={voiceNarration}
                onChange={(e) => setVoiceNarration(e.target.checked)}
                className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-700 block">Sound Effects &amp; Chimes</span>
                <span className="text-[11px] text-slate-400">Subtle chimes on message send, receive &amp; actions</span>
              </div>
              <input
                type="checkbox"
                checked={soundEffects}
                onChange={(e) => setSoundEffects(e.target.checked)}
                className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Reset all tasks, chats, and memories to default demonstration state?')) {
                  onResetAllData();
                  onClose();
                }
              }}
              className="text-xs text-rose-500 hover:text-rose-700 flex items-center gap-1 font-medium"
            >
              <RotateCcw className="w-3 h-3" />
              Reset Demo Data
            </button>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
              >
                Save Changes
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
