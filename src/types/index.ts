export type TaskCategory = 'Work' | 'Study' | 'Wellness' | 'Personal';
export type PriorityLevel = 'high' | 'med' | 'low';
export type MemoryCategory = 'routine' | 'preference' | 'habit' | 'goal' | 'personal';
export type AmbientMode = 'none' | 'rain' | 'cafe' | 'drone';

export interface UserProfile {
  name: string;
  pronouns: string;
  primaryGoal: string;
  voiceNarration: boolean;
  soundEffects: boolean;
  ambientSound: AmbientMode;
  ambientVolume: number;
}

export interface InChatAction {
  type: 'add_task' | 'start_focus' | 'set_reminder' | 'save_memory' | 'open_reality_check';
  label: string;
  data: {
    title?: string;
    category?: TaskCategory;
    priority?: PriorityLevel;
    time?: string;
    duration?: number;
    taskTitle?: string;
    minutesFromNow?: number;
    content?: string;
  };
  executed?: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
  mood?: string;
  quickReplies?: string[];
  suggestedActions?: InChatAction[];
}

export interface PlannerTask {
  id: string;
  title: string;
  category: TaskCategory;
  priority: PriorityLevel;
  completed: boolean;
  time?: string;
  tip?: string;
  createdAt: string;
}

export interface MemoryItem {
  id: string;
  category: MemoryCategory;
  title: string;
  content: string;
  dateAdded: string;
}

export interface ReminderItem {
  id: string;
  title: string;
  triggerTime: number; // timestamp in ms
  timeString: string;
  triggered: boolean;
  category: string;
}

export type FocusMode = 'focus25' | 'focus50' | 'break5' | 'break15';

export interface FocusState {
  isActive: boolean;
  isPaused: boolean;
  mode: FocusMode;
  totalSeconds: number;
  remainingSeconds: number;
  linkedTaskId?: string;
  linkedTaskTitle?: string;
  completedCycles: number;
}
