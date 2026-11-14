import React, { useState } from 'react';
import { 
  Compass, 
  Sparkles, 
  HeartHandshake, 
  ArrowRight, 
  CheckCircle2, 
  PhoneCall, 
  ShieldAlert, 
  Moon, 
  Coffee, 
  HelpCircle,
  Clock,
  Send
} from 'lucide-react';
import { UserProfile } from '../types';
import { soundFx } from '../utils/audio';
import { apiUrl } from '../utils/api';

interface RealityCheckTabProps {
  userProfile: UserProfile;
  initialDilemma?: string;
  onClearInitialDilemma?: () => void;
  onApplyActionAsTask?: (title: string) => void;
}

const PRESET_DILEMMAS = [
  {
    label: "🌙 Pulling an All-Nighter",
    text: "I'm behind on work/study and strongly tempted to pull an all-nighter tonight so I can catch up.",
  },
  {
    label: "🛋️ Rest Day Guilt",
    text: "I have so much to do, but I'm mentally exhausted. When I try to rest, I feel terrible guilt.",
  },
  {
    label: "📱 2-Hour Scrolling Paralysis",
    text: "I've been stuck doom-scrolling and avoiding opening my important assignment for over 2 hours.",
  },
  {
    label: "🥀 Imposter Syndrome Freakout",
    text: "I feel like everyone else is advancing faster than me and I'm just faking my way through.",
  },
  {
    label: "☕ Skipping Meals to Grind",
    text: "I haven't eaten a proper meal today because I told myself I wouldn't eat until this task was done.",
  },
];

export const RealityCheckTab: React.FC<RealityCheckTabProps> = ({
  userProfile,
  initialDilemma,
  onClearInitialDilemma,
  onApplyActionAsTask,
}) => {
  const [dilemma, setDilemma] = useState(initialDilemma || '');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    honestPushback: string;
    theRealityCheck: string;
    immediate5MinStep: string;
    closingAffection: string;
  } | null>(null);

  const handleSubmit = async (textToSubmit?: string) => {
    const text = textToSubmit || dilemma;
    if (!text.trim() || isLoading) return;

    setIsLoading(true);
    setResult(null);
    try {
      const res = await fetch(apiUrl('/api/reality-check'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dilemma: text,
          userProfile,
        }),
      });

      if (!res.ok) throw new Error('Reality check error');
      const data = await res.json();
      setResult(data);
      if (userProfile.soundEffects) soundFx.playReceiveChime();
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPreset = (presetText: string) => {
    setDilemma(presetText);
    handleSubmit(presetText);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      
      {/* Intro Header */}
      <div className="bg-gradient-to-br from-rose-500 via-amber-600 to-amber-700 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center space-x-2 text-rose-200 text-xs font-bold uppercase tracking-wider">
            <Compass className="w-4 h-4" />
            <span>Honest Feedback &amp; Reality Check</span>
          </div>
          <h2 className="text-2xl font-bold mt-1">Candid Love from Taniya</h2>
          <p className="text-xs sm:text-sm text-amber-100 mt-2 max-w-xl leading-relaxed">
            Real friends don&apos;t enable burnout, self-neglect, or guilt spirals. Tell Taniya what dilemma or temptation you&apos;re wrestling with, and get clear, compassionate truth.
          </p>
        </div>
      </div>

      {/* Preset Dilemma Buttons */}
      <div className="space-y-2">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
          Common Dilemmas (Tap to Test):
        </span>
        <div className="flex flex-wrap gap-2">
          {PRESET_DILEMMAS.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => handleSelectPreset(preset.text)}
              className="text-xs font-semibold px-3 py-2 rounded-xl bg-white border border-amber-200/80 hover:border-amber-400 hover:bg-amber-50 text-slate-700 transition active:scale-95 shadow-2xs"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Input Form */}
      <div className="bg-white rounded-3xl p-5 border border-amber-100 shadow-sm space-y-3">
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
          What are you struggling with or feeling guilty about?
        </label>
        <textarea
          rows={3}
          value={dilemma}
          onChange={(e) => setDilemma(e.target.value)}
          placeholder={`Be totally real with Taniya (e.g. "I'm thinking of skipping sleep to study", "I feel like a failure for taking a break")`}
          className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:border-amber-500 text-slate-800 placeholder-slate-400 leading-relaxed resize-none"
        />

        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] text-slate-400">
            Taniya will give you candid truth without shame or guilt.
          </span>
          <button
            onClick={() => handleSubmit()}
            disabled={!dilemma.trim() || isLoading}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs shadow-xs transition flex items-center space-x-2 ${
              dilemma.trim() && !isLoading
                ? 'bg-amber-600 hover:bg-amber-700 text-white active:scale-95'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>{isLoading ? 'Taniya is Reflecting...' : 'Get Reality Check'}</span>
          </button>
        </div>
      </div>

      {/* Result Display */}
      {result && (
        <div className="bg-white rounded-3xl p-6 border-2 border-amber-300 shadow-xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
          
          {/* 1. Candid Pushback */}
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2 text-rose-600 text-xs font-bold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>Taniya&apos;s Candid Pushback:</span>
            </div>
            <p className="text-sm font-semibold text-slate-800 bg-rose-50/70 p-3.5 rounded-2xl border border-rose-200/60 leading-relaxed">
              {result.honestPushback}
            </p>
          </div>

          {/* 2. Objective Reality Check */}
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2 text-amber-700 text-xs font-bold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>The Grounded Truth:</span>
            </div>
            <p className="text-sm text-slate-700 bg-amber-50/60 p-3.5 rounded-2xl border border-amber-200/60 leading-relaxed">
              {result.theRealityCheck}
            </p>
          </div>

          {/* 3. Immediate 5-Minute Micro-Action */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-emerald-700 text-xs font-bold uppercase tracking-wider">
              <Clock className="w-3.5 h-3.5 text-emerald-600" />
              <span>Your 5-Minute Kinder Micro-Step:</span>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-xs sm:text-sm font-semibold text-emerald-900 leading-snug">
                {result.immediate5MinStep}
              </p>
              {onApplyActionAsTask && (
                <button
                  onClick={() => {
                    if (userProfile.soundEffects) soundFx.playActionChime();
                    onApplyActionAsTask(result.immediate5MinStep);
                  }}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs whitespace-nowrap active:scale-95"
                >
                  + Add to Planner
                </button>
              )}
            </div>
          </div>

          {/* 4. Affectionate Closing Note */}
          <div className="pt-2 border-t border-slate-100 flex items-center space-x-3 text-xs text-slate-600 italic font-serif">
            <span className="text-lg">💛</span>
            <span>&ldquo;{result.closingAffection}&rdquo; &mdash; Taniya</span>
          </div>

        </div>
      )}

      {/* Distress & Real-Life Support Resource Banner */}
      <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 space-y-3">
        <div className="flex items-center space-x-2 text-slate-700">
          <HeartHandshake className="w-5 h-5 text-rose-500 shrink-0" />
          <h4 className="text-xs sm:text-sm font-bold">Deep Care &amp; Real-Life Connection</h4>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          Taniya is here to champion your days and keep you company, but artificial companions can never replace the warmth of real-life human beings. When things feel too heavy, reach out to someone who loves you in the real world.
        </p>

        <div className="p-3 bg-white rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div>
            <span className="font-bold text-slate-800 block">Need Immediate Free Support?</span>
            <span className="text-slate-500">988 Suicide &amp; Crisis Lifeline (Call or text 988 in USA/Canada • 24/7 Free &amp; Confidential)</span>
          </div>
          <span className="px-3 py-1 bg-rose-50 text-rose-700 rounded-xl font-bold border border-rose-200 text-center">
            Dial 988
          </span>
        </div>
      </div>

    </div>
  );
};
