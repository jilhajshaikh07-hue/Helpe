import { UserProfile, MemoryItem, PlannerTask, ChatMessage, ReminderItem } from '../types';

export const initialProfile: UserProfile = {
  name: 'Jilhaj',
  pronouns: 'he/him',
  primaryGoal: 'Stay on top of study & deep work goals while maintaining healthy boundaries and zero burnout.',
  voiceNarration: true,
  soundEffects: true,
  ambientSound: 'none',
  ambientVolume: 0.5,
};

export const initialMemories: MemoryItem[] = [
  {
    id: 'mem-1',
    category: 'preference',
    title: 'Favorite Study Beverage',
    content: 'Enjoys warm black tea or iced matcha during deep work sessions.',
    dateAdded: '2026-11-01',
  },
  {
    id: 'mem-2',
    category: 'routine',
    title: 'Morning Kickoff',
    content: 'Likes reviewing his top 3 priorities before opening high-distraction apps.',
    dateAdded: '2026-11-02',
  },
  {
    id: 'mem-3',
    category: 'goal',
    title: 'Sleep Boundary',
    content: 'Target bedtime is 11:30 PM to maintain cognitive energy for tomorrow.',
    dateAdded: '2026-11-03',
  },
  {
    id: 'mem-4',
    category: 'habit',
    title: 'Eye Rest & Movement',
    content: 'Needs occasional reminders to look away from screen (20-20-20 rule) and stretch shoulders.',
    dateAdded: '2026-11-04',
  },
  {
    id: 'mem-5',
    category: 'personal',
    title: 'Communication Vibe',
    content: 'Appreciates warm, candid, direct talk like an authentic close friend, zero patronizing corporate speak.',
    dateAdded: '2026-11-04',
  },
];

export const initialTasks: PlannerTask[] = [
  {
    id: 'task-1',
    title: 'Deep dive into distributed systems & AI models',
    category: 'Study',
    priority: 'high',
    completed: false,
    time: '10:30 AM',
    tip: 'Tackle during peak morning alertness.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'task-2',
    title: 'Refactor app state and clean up project endpoints',
    category: 'Work',
    priority: 'high',
    completed: false,
    time: '01:30 PM',
    tip: 'Break into two 25m Pomodoro sprints.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'task-3',
    title: 'Hydration refill & 15-minute sunshine walk',
    category: 'Wellness',
    priority: 'med',
    completed: false,
    time: '04:00 PM',
    tip: 'Reset the eyes and lower cortisol.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'task-4',
    title: 'Call family or close friend for an evening check-in',
    category: 'Personal',
    priority: 'med',
    completed: false,
    time: '07:30 PM',
    tip: 'Real connection beats screen time every day.',
    createdAt: new Date().toISOString(),
  },
];

export const initialMessages: ChatMessage[] = [
  {
    id: 'msg-welcome',
    role: 'model',
    content: "Hey Jilhaj! ✨ I'm so glad you stopped by. I've got your study plan loaded up, and I'm ready to keep you company—whether that means diving into a focused Pomodoro sprint, organizing today's schedule, or doing a reality check if you're feeling overwhelmed. How's your energy right now?",
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    mood: 'upbeat',
    quickReplies: [
      "Let's do a 25m focus sprint!",
      "Organize my day for me",
      "Feeling a bit scattered",
      "I need honest advice",
    ],
    suggestedActions: [
      {
        type: 'start_focus',
        label: '🚀 Start 25m Study Sprint',
        data: { duration: 25, taskTitle: 'Deep dive into distributed systems & AI models' },
      },
      {
        type: 'set_reminder',
        label: '💧 Set Hydration Nudge (45m)',
        data: { title: 'Drink a big glass of water & stand up', minutesFromNow: 45 },
      },
    ],
  },
];

export const initialReminders: ReminderItem[] = [
  {
    id: 'rem-1',
    title: 'Eye Rest: Look 20ft away for 20 seconds',
    triggerTime: Date.now() + 25 * 60 * 1000,
    timeString: 'In 25 minutes',
    triggered: false,
    category: 'Wellness',
  },
  {
    id: 'rem-2',
    title: 'Hydration check & stretch',
    triggerTime: Date.now() + 50 * 60 * 1000,
    timeString: 'In 50 minutes',
    triggered: false,
    category: 'Wellness',
  },
];
