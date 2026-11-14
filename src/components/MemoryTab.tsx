import React, { useState } from 'react';
import { 
  BrainCircuit, 
  Plus, 
  Trash2, 
  Sparkles, 
  Tag, 
  Clock, 
  Coffee, 
  Moon, 
  Compass, 
  BookOpen, 
  Heart 
} from 'lucide-react';
import { MemoryItem, MemoryCategory, UserProfile } from '../types';
import { soundFx } from '../utils/audio';

interface MemoryTabProps {
  memories: MemoryItem[];
  onAddMemory: (memory: Omit<MemoryItem, 'id' | 'dateAdded'>) => void;
  onDeleteMemory: (id: string) => void;
  userProfile: UserProfile;
}

export const MemoryTab: React.FC<MemoryTabProps> = ({
  memories,
  onAddMemory,
  onDeleteMemory,
  userProfile,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState<MemoryCategory>('routine');

  const filtered = memories.filter((m) => {
    if (selectedCategory === 'all') return true;
    return m.category === selectedCategory;
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    onAddMemory({
      title: newTitle.trim(),
      content: newContent.trim(),
      category: newCategory,
    });

    if (userProfile.soundEffects) soundFx.playActionChime();
    setNewTitle('');
    setNewContent('');
    setShowAddModal(false);
  };

  const getCategoryIcon = (category: MemoryCategory) => {
    switch (category) {
      case 'routine':
        return <Clock className="w-4 h-4 text-amber-600" />;
      case 'preference':
        return <Coffee className="w-4 h-4 text-purple-600" />;
      case 'habit':
        return <BookOpen className="w-4 h-4 text-blue-600" />;
      case 'goal':
        return <Compass className="w-4 h-4 text-emerald-600" />;
      case 'personal':
        return <Heart className="w-4 h-4 text-rose-600" />;
    }
  };

  const getCategoryColor = (category: MemoryCategory) => {
    switch (category) {
      case 'routine':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'preference':
        return 'bg-purple-50 text-purple-800 border-purple-200';
      case 'habit':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'goal':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'personal':
        return 'bg-rose-50 text-rose-800 border-rose-200';
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-600 via-purple-600 to-indigo-600 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-purple-200 text-xs font-bold uppercase tracking-wider">
              <BrainCircuit className="w-4 h-4" />
              <span>Taniya&apos;s Memory Book</span>
            </div>
            <h2 className="text-2xl font-bold mt-1">What Taniya Remembers About You</h2>
            <p className="text-xs sm:text-sm text-purple-100 mt-1 max-w-lg leading-relaxed">
              Every detail here is woven into Taniya&apos;s Gemini 3.8 Flash brain context. She uses this to talk like your real, attentive friend.
            </p>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 bg-white text-purple-900 hover:bg-purple-50 rounded-2xl text-xs sm:text-sm font-bold shadow-md transition active:scale-95 shrink-0 flex items-center space-x-2"
          >
            <Plus className="w-4 h-4 text-purple-600" />
            <span>Teach Taniya Something</span>
          </button>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1">
        {['all', 'routine', 'preference', 'habit', 'goal', 'personal'].map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold capitalize whitespace-nowrap transition ${
              selectedCategory === cat
                ? 'bg-purple-700 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-purple-50 hover:text-purple-900'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Memories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-2xl p-4 border border-amber-100 hover:border-purple-200 shadow-xs transition flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider ${getCategoryColor(item.category)}`}>
                  {getCategoryIcon(item.category)}
                  {item.category}
                </span>

                <button
                  onClick={() => {
                    if (userProfile.soundEffects) soundFx.playActionChime();
                    onDeleteMemory(item.id);
                  }}
                  className="p-1 text-slate-400 hover:text-rose-500 rounded transition"
                  title="Forget this memory"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <h4 className="text-sm font-bold text-slate-800">{item.title}</h4>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">{item.content}</p>
            </div>

            <div className="mt-3 pt-2 border-t border-slate-100 text-[10px] text-slate-400 flex items-center justify-between">
              <span>Added: {item.dateAdded}</span>
              <span className="text-purple-600 font-medium">Active in Context ✓</span>
            </div>
          </div>
        ))}
      </div>

      {/* Teach Taniya Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-purple-100">
            <h3 className="text-lg font-bold text-slate-800 mb-1">Teach Taniya a New Memory</h3>
            <p className="text-xs text-slate-500 mb-4">
              Add details about your daily routine, preferences, caffeine choices, or study habits.
            </p>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Memory Topic
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Favorite Study Music or Gym Schedule"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Category
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as MemoryCategory)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-purple-500"
                >
                  <option value="routine">Routine</option>
                  <option value="preference">Preference</option>
                  <option value="habit">Habit</option>
                  <option value="goal">Goal</option>
                  <option value="personal">Personal</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  What should Taniya know?
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. 'I like taking a 10-minute walk after lunch to beat the 2 PM slump.'"
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-purple-500 resize-none"
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
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-xs"
                >
                  Save Memory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
