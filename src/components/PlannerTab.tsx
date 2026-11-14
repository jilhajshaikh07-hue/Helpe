import React, { useState } from 'react';
import { 
  Sparkles, 
  Plus, 
  CheckCircle2, 
  Circle, 
  Clock, 
  Calendar, 
  Trash2, 
  Timer, 
  ArrowRight, 
  Award,
  Zap,
  BookOpen,
  Heart,
  Briefcase,
  User,
  Coffee,
  Check
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { PlannerTask, TaskCategory, PriorityLevel, UserProfile } from '../types';
import { soundFx } from '../utils/audio';
import { apiUrl } from '../utils/api';

interface PlannerTabProps {
  tasks: PlannerTask[];
  onToggleTask: (taskId: string) => void;
  onAddTask: (task: Omit<PlannerTask, 'id' | 'createdAt'>) => void;
  onDeleteTask: (taskId: string) => void;
  onStartFocusWithTask: (task: PlannerTask) => void;
  userProfile: UserProfile;
  memories: any[];
}

export const PlannerTab: React.FC<PlannerTabProps> = ({
  tasks,
  onToggleTask,
  onAddTask,
  onDeleteTask,
  onStartFocusWithTask,
  userProfile,
  memories,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<TaskCategory>('Study');
  const [newPriority, setNewPriority] = useState<PriorityLevel>('med');
  const [newTime, setNewTime] = useState('');
  
  // Organize Day with Taniya State
  const [isOrganizing, setIsOrganizing] = useState(false);
  const [organizeResult, setOrganizeResult] = useState<{
    briefing: string;
    organizedSchedule: Array<{
      timeSlot: string;
      title: string;
      category: string;
      priority: string;
      tip?: string;
    }>;
    topPriorityAdvice: string;
  } | null>(null);

  const completedCount = tasks.filter((t) => t.completed).length;
  const progressPercent = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  const filteredTasks = tasks.filter((t) => {
    if (selectedCategory === 'all') return true;
    return t.category.toLowerCase() === selectedCategory.toLowerCase();
  });

  const handleToggle = (task: PlannerTask) => {
    if (userProfile.soundEffects) soundFx.playActionChime();
    onToggleTask(task.id);

    // If completing this task makes all tasks completed, celebrate!
    if (!task.completed && completedCount + 1 === tasks.length && tasks.length > 0) {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
      });
    }
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    onAddTask({
      title: newTitle.trim(),
      category: newCategory,
      priority: newPriority,
      completed: false,
      time: newTime.trim() || undefined,
    });

    if (userProfile.soundEffects) soundFx.playActionChime();
    setNewTitle('');
    setNewTime('');
    setShowAddModal(false);
  };

  const askTaniyaToOrganize = async () => {
    setIsOrganizing(true);
    try {
      const res = await fetch(apiUrl('/api/organize-day'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tasks,
          energyLevel: 'Medium-High',
          userProfile,
          memories,
          currentTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }),
      });

      if (!res.ok) throw new Error('Failed to organize schedule');
      const data = await res.json();
      setOrganizeResult(data);
      if (userProfile.soundEffects) soundFx.playReceiveChime();
    } catch (err) {
      console.error(err);
    } finally {
      setIsOrganizing(false);
    }
  };

  const applyOrganizedSchedule = () => {
    if (!organizeResult) return;
    
    // Clear and replace with Taniya's structured schedule
    organizeResult.organizedSchedule.forEach((item) => {
      onAddTask({
        title: item.title,
        category: (item.category as TaskCategory) || 'Work',
        priority: (item.priority as PriorityLevel) || 'med',
        completed: false,
        time: item.timeSlot,
        tip: item.tip,
      });
    });

    if (userProfile.soundEffects) soundFx.playActionChime();
    setOrganizeResult(null);
  };

  const getCategoryBadge = (category: TaskCategory) => {
    switch (category) {
      case 'Work':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Study':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Wellness':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Personal':
        return 'bg-amber-50 text-amber-800 border-amber-200';
    }
  };

  const getPriorityBadge = (priority: PriorityLevel) => {
    switch (priority) {
      case 'high':
        return 'bg-rose-50 text-rose-700 border-rose-200 font-semibold';
      case 'med':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'low':
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 space-y-6">
      
      {/* Top Banner & Progress Header */}
      <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-rose-500 rounded-3xl p-5 sm:p-6 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs uppercase tracking-wider font-semibold text-amber-200">
                {userProfile.name}&apos;s Daily Flow
              </span>
              <h2 className="text-2xl font-bold mt-1">Today&apos;s Day Planner</h2>
              <p className="text-xs sm:text-sm text-amber-100 mt-1 max-w-lg">
                Structured intentionally across Work, Study, Wellness, and Personal priorities.
              </p>
            </div>

            {/* Organize with Taniya Button */}
            <button
              onClick={askTaniyaToOrganize}
              disabled={isOrganizing}
              className="inline-flex items-center space-x-2 px-4 py-2.5 bg-white text-amber-800 hover:bg-amber-50 rounded-2xl text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition active:scale-95 shrink-0"
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>{isOrganizing ? 'Taniya is Organizing...' : '✨ Ask Taniya to Organize'}</span>
            </button>
          </div>

          {/* Progress Bar Metric */}
          <div className="mt-5 pt-4 border-t border-white/20">
            <div className="flex items-center justify-between text-xs text-amber-100 mb-2 font-medium">
              <span>{completedCount} of {tasks.length} tasks completed</span>
              <span className="font-bold">{progressPercent}% done</span>
            </div>
            <div className="w-full bg-white/20 h-2.5 rounded-full overflow-hidden">
              <div 
                className="bg-white h-full transition-all duration-500 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Taniya AI Organized Schedule Modal / Proposal Banner */}
      {organizeResult && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-5 shadow-md animate-in fade-in duration-200">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-xl">✨</span>
              <h3 className="font-bold text-slate-800 text-base">Taniya&apos;s Strategic Schedule</h3>
            </div>
            <button
              onClick={() => setOrganizeResult(null)}
              className="text-slate-400 hover:text-slate-600 font-bold"
            >
              ×
            </button>
          </div>

          <p className="text-xs sm:text-sm text-slate-700 mt-2 bg-white/70 p-3 rounded-xl border border-amber-200/60 leading-relaxed font-serif italic">
            &ldquo;{organizeResult.briefing}&rdquo;
          </p>

          <div className="my-3 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-medium">
            <strong>Key Advice:</strong> {organizeResult.topPriorityAdvice}
          </div>

          <div className="space-y-2 mt-3 max-h-60 overflow-y-auto">
            {organizeResult.organizedSchedule.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-amber-100 text-xs">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-amber-800">{item.timeSlot}</span>
                  <span className="text-slate-700 font-medium">{item.title}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-0.5 rounded-md border text-[10px] ${getCategoryBadge(item.category as TaskCategory)}`}>
                    {item.category}
                  </span>
                  <span className={`px-1.5 py-0.5 rounded-md border text-[10px] ${getPriorityBadge(item.priority as PriorityLevel)}`}>
                    {item.priority}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-end space-x-3">
            <button
              onClick={() => setOrganizeResult(null)}
              className="px-3 py-1.5 rounded-xl text-xs text-slate-600 hover:bg-slate-200"
            >
              Dismiss
            </button>
            <button
              onClick={applyOrganizedSchedule}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              Apply to Day Planner
            </button>
          </div>
        </div>
      )}

      {/* Category Pills & Add Task Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'All Tasks', icon: Calendar },
            { id: 'study', label: 'Study', icon: BookOpen },
            { id: 'work', label: 'Work', icon: Briefcase },
            { id: 'wellness', label: 'Wellness', icon: Heart },
            { id: 'personal', label: 'Personal', icon: User },
          ].map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                  isSelected
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-amber-50 hover:text-amber-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition active:scale-95 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Task</span>
        </button>
      </div>

      {/* Task List */}
      <div className="space-y-2.5">
        {filteredTasks.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 border border-dashed border-slate-200 text-center">
            <Coffee className="w-8 h-8 text-amber-500 mx-auto mb-2" />
            <h4 className="text-sm font-semibold text-slate-700">No tasks in this category</h4>
            <p className="text-xs text-slate-400 mt-1">Tap &apos;Add Task&apos; or ask Taniya to organize your day!</p>
          </div>
        ) : (
          filteredTasks.map((task) => (
            <div
              key={task.id}
              className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${
                task.completed
                  ? 'bg-slate-50/80 border-slate-200 opacity-60'
                  : 'bg-white border-amber-100 hover:border-amber-300 shadow-xs'
              } flex flex-col sm:flex-row sm:items-center justify-between gap-3`}
            >
              <div className="flex items-start space-x-3 flex-1 min-w-0">
                <button
                  onClick={() => handleToggle(task)}
                  className="mt-0.5 text-slate-400 hover:text-amber-600 transition shrink-0"
                >
                  {task.completed ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <Circle className="w-5 h-5" />
                  )}
                </button>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-sm font-medium ${
                        task.completed ? 'line-through text-slate-400' : 'text-slate-800'
                      }`}
                    >
                      {task.title}
                    </span>

                    {task.time && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
                        <Clock className="w-3 h-3 text-amber-600" />
                        {task.time}
                      </span>
                    )}

                    <span className={`text-[10px] px-2 py-0.5 rounded-md border ${getCategoryBadge(task.category)}`}>
                      {task.category}
                    </span>

                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md border ${getPriorityBadge(task.priority)}`}>
                      {task.priority.toUpperCase()}
                    </span>
                  </div>

                  {task.tip && (
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                      <span className="text-amber-500">💡</span> {task.tip}
                    </p>
                  )}
                </div>
              </div>

              {/* Task Actions: Send to Focus Sprint & Delete */}
              <div className="flex items-center space-x-2 self-end sm:self-center shrink-0">
                {!task.completed && (
                  <button
                    onClick={() => onStartFocusWithTask(task)}
                    className="flex items-center space-x-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 rounded-xl text-xs font-semibold transition active:scale-95"
                    title="Start Pomodoro Focus on this task"
                  >
                    <Timer className="w-3.5 h-3.5 text-amber-600" />
                    <span>Focus Sprint</span>
                  </button>
                )}

                <button
                  onClick={() => onDeleteTask(task.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition"
                  title="Delete task"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-amber-100">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Add a New Task</h3>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Task Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Read research paper on attention models"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Category
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as TaskCategory)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500"
                  >
                    <option value="Study">Study</option>
                    <option value="Work">Work</option>
                    <option value="Wellness">Wellness</option>
                    <option value="Personal">Personal</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as PriorityLevel)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500"
                  >
                    <option value="high">High</option>
                    <option value="med">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Scheduled Time (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 10:30 AM or Afternoon"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500"
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
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
                >
                  Save Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
