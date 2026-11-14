import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { 
  UserProfile, 
  PlannerTask, 
  MemoryItem, 
  ChatMessage, 
  ReminderItem, 
  FocusState, 
  FocusMode, 
  InChatAction 
} from './types';
import { 
  initialProfile, 
  initialMemories, 
  initialTasks, 
  initialMessages, 
  initialReminders 
} from './utils/initialData';
import { soundFx, speechCtrl } from './utils/audio';
import { apiUrl } from './utils/api';

import { Header } from './components/Header';
import { ChatTab } from './components/ChatTab';
import { PlannerTab } from './components/PlannerTab';
import { FocusTab } from './components/FocusTab';
import { RealityCheckTab } from './components/RealityCheckTab';
import { MemoryTab } from './components/MemoryTab';
import { RemindersTab } from './components/RemindersTab';
import { ProfileModal } from './components/ProfileModal';
import { VoiceChatModal } from './components/VoiceChatModal';
import { BellRing, CheckCircle, Sparkles } from 'lucide-react';

export default function App() {
  // 1. Persistent State Initialization with localStorage
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem('taniya_profile_v1');
      return saved ? JSON.parse(saved) : initialProfile;
    } catch {
      return initialProfile;
    }
  });

  const [tasks, setTasks] = useState<PlannerTask[]>(() => {
    try {
      const saved = localStorage.getItem('taniya_tasks_v1');
      return saved ? JSON.parse(saved) : initialTasks;
    } catch {
      return initialTasks;
    }
  });

  const [memories, setMemories] = useState<MemoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('taniya_memories_v1');
      return saved ? JSON.parse(saved) : initialMemories;
    } catch {
      return initialMemories;
    }
  });

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem('taniya_messages_v1');
      return saved ? JSON.parse(saved) : initialMessages;
    } catch {
      return initialMessages;
    }
  });

  const [reminders, setReminders] = useState<ReminderItem[]>(() => {
    try {
      const saved = localStorage.getItem('taniya_reminders_v1');
      return saved ? JSON.parse(saved) : initialReminders;
    } catch {
      return initialReminders;
    }
  });

  // Active Navigation Tab
  const [activeTab, setActiveTab] = useState<string>('chat');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isVoiceChatOpen, setIsVoiceChatOpen] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Active in-app reminder alert toast
  const [activeAlert, setActiveAlert] = useState<string | null>(null);

  // Reality check topic pass-through
  const [passedDilemma, setPassedDilemma] = useState<string>('');

  // 2. Focus Buddy Pomodoro State
  const [focusState, setFocusState] = useState<FocusState>({
    isActive: false,
    isPaused: false,
    mode: 'focus25',
    totalSeconds: 25 * 60,
    remainingSeconds: 25 * 60,
    linkedTaskId: 'task-1',
    linkedTaskTitle: 'Deep dive into distributed systems & AI models',
    completedCycles: 0,
  });

  // Save changes to localStorage
  useEffect(() => {
    localStorage.setItem('taniya_profile_v1', JSON.stringify(userProfile));
  }, [userProfile]);

  useEffect(() => {
    localStorage.setItem('taniya_tasks_v1', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('taniya_memories_v1', JSON.stringify(memories));
  }, [memories]);

  useEffect(() => {
    localStorage.setItem('taniya_messages_v1', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem('taniya_reminders_v1', JSON.stringify(reminders));
  }, [reminders]);

  // Synchronize initial speech settings
  useEffect(() => {
    speechCtrl.setEnabled(userProfile.voiceNarration);
  }, [userProfile.voiceNarration]);

  // 3. Focus Timer Countdown Interval
  useEffect(() => {
    if (!focusState.isActive || focusState.isPaused) return;

    const interval = setInterval(() => {
      setFocusState((prev) => {
        if (prev.remainingSeconds <= 1) {
          // Timer finished!
          if (userProfile.soundEffects) soundFx.playBellChime();

          const wasWork = prev.mode === 'focus25' || prev.mode === 'focus50';
          if (wasWork) {
            confetti({
              particleCount: 100,
              spread: 70,
              origin: { y: 0.6 },
            });
            // Mark linked task as complete if bound
            if (prev.linkedTaskId) {
              setTasks((currentTasks) =>
                currentTasks.map((t) =>
                  t.id === prev.linkedTaskId ? { ...t, completed: true } : t
                )
              );
            }
          }

          const nextMode: FocusMode = wasWork ? 'break5' : 'focus25';
          const nextSeconds = nextMode === 'break5' ? 5 * 60 : 25 * 60;

          return {
            ...prev,
            isActive: false,
            isPaused: false,
            mode: nextMode,
            totalSeconds: nextSeconds,
            remainingSeconds: nextSeconds,
            completedCycles: wasWork ? prev.completedCycles + 1 : prev.completedCycles,
          };
        }

        return {
          ...prev,
          remainingSeconds: prev.remainingSeconds - 1,
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [focusState.isActive, focusState.isPaused, userProfile.soundEffects]);

  // 4. Reminders check interval (checks every 5 seconds)
  useEffect(() => {
    const checkInterval = setInterval(() => {
      const now = Date.now();
      reminders.forEach((rem) => {
        if (!rem.triggered && rem.triggerTime <= now) {
          // Trigger reminder!
          if (userProfile.soundEffects) soundFx.playReminderChime();
          setActiveAlert(`⏰ Taniya Reminder: ${rem.title}`);
          if (userProfile.voiceNarration) {
            speechCtrl.speak(`Hey ${userProfile.name}, gentle reminder: ${rem.title}`);
          }

          setReminders((prev) =>
            prev.map((r) => (r.id === rem.id ? { ...r, triggered: true } : r))
          );
        }
      });
    }, 5000);

    return () => clearInterval(checkInterval);
  }, [reminders, userProfile.soundEffects, userProfile.voiceNarration, userProfile.name]);

  // Handle Chat Message Send
  const handleSendMessage = async (text: string) => {
    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setIsChatLoading(true);

    try {
      const res = await fetch(apiUrl('/api/chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.slice(-10), // send last 10 messages for conversational context
          memories,
          userProfile,
          currentPlannerTasks: tasks,
          clientTime: new Date().toLocaleString(),
        }),
      });

      if (!res.ok) throw new Error('Chat API response failed');
      const data = await res.json();

      const modelMsg: ChatMessage = {
        id: `taniya-${Date.now()}`,
        role: 'model',
        content: data.replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        mood: data.mood || 'warm',
        quickReplies: data.quickReplies || [],
        suggestedActions: data.suggestedActions || [],
      };

      setMessages((prev) => [...prev, modelMsg]);

      // Sound chime on receive
      if (userProfile.soundEffects) soundFx.playReceiveChime();

      // Voice narration if enabled
      if (userProfile.voiceNarration) {
        setIsSpeaking(true);
        speechCtrl.speak(data.replyText, () => {
          setIsSpeaking(false);
        });
      }
    } catch (err) {
      console.error(err);
      const fallbackMsg: ChatMessage = {
        id: `taniya-err-${Date.now()}`,
        role: 'model',
        content: `Hey ${userProfile.name}! I'm right here with you. My connection had a quick hiccup, but I'm ready for whatever you need next!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        mood: 'warm',
        quickReplies: ["Let's organize my day", "Start 25m focus sprint", "Check my reminders"],
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Handle In-Chat Action Execution
  const handleExecuteAction = (action: InChatAction, msgIndex: number, actionIndex: number) => {
    // 1. Mark action as executed in messages state
    setMessages((prev) => {
      const copy = [...prev];
      if (copy[msgIndex]?.suggestedActions?.[actionIndex]) {
        copy[msgIndex].suggestedActions![actionIndex].executed = true;
      }
      return copy;
    });

    // 2. Perform the action
    if (action.type === 'add_task') {
      const { title, category, priority, time } = action.data;
      if (title) {
        const newTask: PlannerTask = {
          id: `task-${Date.now()}`,
          title,
          category: category || 'Study',
          priority: priority || 'med',
          completed: false,
          time: time || undefined,
          createdAt: new Date().toISOString(),
        };
        setTasks((prev) => [newTask, ...prev]);
        setActiveAlert(`Added "${title}" to your Day Planner!`);
      }
    } else if (action.type === 'start_focus') {
      const duration = action.data.duration || 25;
      const taskTitle = action.data.taskTitle || 'Study & Deep Work';
      setFocusState({
        isActive: true,
        isPaused: false,
        mode: duration === 50 ? 'focus50' : 'focus25',
        totalSeconds: duration * 60,
        remainingSeconds: duration * 60,
        linkedTaskTitle: taskTitle,
        completedCycles: focusState.completedCycles,
      });
      setActiveTab('focus');
      setActiveAlert(`Started a ${duration}-minute Focus sprint!`);
    } else if (action.type === 'set_reminder') {
      const mins = action.data.minutesFromNow || 30;
      const title = action.data.title || 'Gentle check-in';
      const triggerTime = Date.now() + mins * 60 * 1000;
      const newRem: ReminderItem = {
        id: `rem-${Date.now()}`,
        title,
        triggerTime,
        timeString: `In ${mins} minutes`,
        triggered: false,
        category: 'Wellness',
      };
      setReminders((prev) => [newRem, ...prev]);
      setActiveAlert(`Set reminder: "${title}" in ${mins} minutes`);
    } else if (action.type === 'save_memory') {
      const content = action.data.content || '';
      if (content) {
        const newMem: MemoryItem = {
          id: `mem-${Date.now()}`,
          category: (action.data.category as any) || 'preference',
          title: 'From Conversation',
          content,
          dateAdded: new Date().toISOString().split('T')[0],
        };
        setMemories((prev) => [newMem, ...prev]);
        setActiveAlert(`Taniya remembered: "${content}"`);
      }
    }
  };

  // Planner handlers
  const handleToggleTask = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t))
    );
  };

  const handleAddTask = (taskData: Omit<PlannerTask, 'id' | 'createdAt'>) => {
    const newTask: PlannerTask = {
      ...taskData,
      id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      createdAt: new Date().toISOString(),
    };
    setTasks((prev) => [newTask, ...prev]);
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  const handleStartFocusWithTask = (task: PlannerTask) => {
    setFocusState((prev) => ({
      ...prev,
      isActive: true,
      isPaused: false,
      mode: 'focus25',
      totalSeconds: 25 * 60,
      remainingSeconds: 25 * 60,
      linkedTaskId: task.id,
      linkedTaskTitle: task.title,
    }));
    setActiveTab('focus');
    if (userProfile.soundEffects) soundFx.playActionChime();
  };

  // Focus Handlers
  const handleStartFocus = () => {
    setFocusState((prev) => ({ ...prev, isActive: true, isPaused: false }));
  };

  const handlePauseFocus = () => {
    setFocusState((prev) => ({ ...prev, isPaused: true }));
  };

  const handleResetFocus = () => {
    let secs = 25 * 60;
    if (focusState.mode === 'focus50') secs = 50 * 60;
    if (focusState.mode === 'break5') secs = 5 * 60;
    if (focusState.mode === 'break15') secs = 15 * 60;

    setFocusState((prev) => ({
      ...prev,
      isActive: false,
      isPaused: false,
      totalSeconds: secs,
      remainingSeconds: secs,
    }));
  };

  const handleSetFocusMode = (mode: FocusMode) => {
    let secs = 25 * 60;
    if (mode === 'focus50') secs = 50 * 60;
    if (mode === 'break5') secs = 5 * 60;
    if (mode === 'break15') secs = 15 * 60;

    setFocusState((prev) => ({
      ...prev,
      mode,
      totalSeconds: secs,
      remainingSeconds: secs,
      isActive: false,
      isPaused: false,
    }));
  };

  const handleBindTask = (taskId: string, title: string) => {
    setFocusState((prev) => ({
      ...prev,
      linkedTaskId: taskId,
      linkedTaskTitle: title,
    }));
  };

  // Memory Handlers
  const handleAddMemory = (memData: Omit<MemoryItem, 'id' | 'dateAdded'>) => {
    const newMem: MemoryItem = {
      ...memData,
      id: `mem-${Date.now()}`,
      dateAdded: new Date().toISOString().split('T')[0],
    };
    setMemories((prev) => [newMem, ...prev]);
  };

  const handleDeleteMemory = (id: string) => {
    setMemories((prev) => prev.filter((m) => m.id !== id));
  };

  // Reminders Handlers
  const handleAddReminder = (title: string, minutesFromNow: number, category = 'General') => {
    const triggerTime = Date.now() + minutesFromNow * 60 * 1000;
    const newRem: ReminderItem = {
      id: `rem-${Date.now()}`,
      title,
      triggerTime,
      timeString: `In ${minutesFromNow} minutes`,
      triggered: false,
      category,
    };
    setReminders((prev) => [newRem, ...prev]);
  };

  const handleDeleteReminder = (id: string) => {
    setReminders((prev) => prev.filter((r) => r.id !== id));
  };

  // Reset demo data handler
  const handleResetAllData = () => {
    setUserProfile(initialProfile);
    setTasks(initialTasks);
    setMemories(initialMemories);
    setMessages(initialMessages);
    setReminders(initialReminders);
    soundFx.stopAmbient();
  };

  const pendingTasksCount = tasks.filter((t) => !t.completed).length;
  const activeRemindersCount = reminders.filter((r) => !r.triggered && r.triggerTime > Date.now()).length;
  const focusRemainingMins = Math.ceil(focusState.remainingSeconds / 60);

  return (
    <div className="min-h-screen bg-[#fdfbf7] flex flex-col font-sans selection:bg-amber-200">
      
      {/* Global Alert / Nudge Toast Banner */}
      {activeAlert && (
        <div className="bg-amber-600 text-white px-4 py-2.5 text-xs font-semibold flex items-center justify-between shadow-md z-50 animate-in slide-in-from-top duration-200">
          <div className="flex items-center space-x-2">
            <BellRing className="w-4 h-4 text-amber-200 animate-bounce" />
            <span>{activeAlert}</span>
          </div>
          <button
            onClick={() => setActiveAlert(null)}
            className="px-2 py-0.5 bg-white/20 hover:bg-white/30 rounded text-white text-[11px]"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Companion Header */}
      <Header
        userProfile={userProfile}
        onUpdateProfile={(updates) => setUserProfile((prev) => ({ ...prev, ...updates }))}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        openSettings={() => setIsSettingsOpen(true)}
        pendingTasksCount={pendingTasksCount}
        isFocusRunning={focusState.isActive && !focusState.isPaused}
        focusRemainingText={`${focusRemainingMins}m`}
        isSpeaking={isSpeaking}
        activeRemindersCount={activeRemindersCount}
        onOpenVoiceChat={() => setIsVoiceChatOpen(true)}
      />

      {/* Main Tab Screen Content */}
      <main className="flex-1 pb-10">
        {activeTab === 'chat' && (
          <ChatTab
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={isChatLoading}
            userProfile={userProfile}
            onExecuteAction={handleExecuteAction}
            onClearChat={() => setMessages(initialMessages)}
            onOpenRealityCheckWithDilemma={(dil) => {
              setPassedDilemma(dil);
              setActiveTab('reality');
            }}
            onOpenVoiceChat={() => setIsVoiceChatOpen(true)}
          />
        )}

        {activeTab === 'planner' && (
          <PlannerTab
            tasks={tasks}
            onToggleTask={handleToggleTask}
            onAddTask={handleAddTask}
            onDeleteTask={handleDeleteTask}
            onStartFocusWithTask={handleStartFocusWithTask}
            userProfile={userProfile}
            memories={memories}
          />
        )}

        {activeTab === 'focus' && (
          <FocusTab
            focusState={focusState}
            onStartFocus={handleStartFocus}
            onPauseFocus={handlePauseFocus}
            onResetFocus={handleResetFocus}
            onSetMode={handleSetFocusMode}
            onBindTask={handleBindTask}
            tasks={tasks}
            userProfile={userProfile}
            onUpdateProfile={(updates) => setUserProfile((prev) => ({ ...prev, ...updates }))}
          />
        )}

        {activeTab === 'reality' && (
          <RealityCheckTab
            userProfile={userProfile}
            initialDilemma={passedDilemma}
            onClearInitialDilemma={() => setPassedDilemma('')}
            onApplyActionAsTask={(stepTitle) => {
              handleAddTask({
                title: stepTitle,
                category: 'Wellness',
                priority: 'high',
                completed: false,
                time: 'Right Now',
              });
              setActiveTab('planner');
            }}
          />
        )}

        {activeTab === 'memories' && (
          <MemoryTab
            memories={memories}
            onAddMemory={handleAddMemory}
            onDeleteMemory={handleDeleteMemory}
            userProfile={userProfile}
          />
        )}

        {activeTab === 'reminders' && (
          <RemindersTab
            reminders={reminders}
            onAddReminder={handleAddReminder}
            onDeleteReminder={handleDeleteReminder}
            userProfile={userProfile}
          />
        )}
      </main>

      {/* Profile & Settings Modal */}
      <ProfileModal
        userProfile={userProfile}
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onUpdateProfile={(updates) => setUserProfile((prev) => ({ ...prev, ...updates }))}
        onResetAllData={handleResetAllData}
      />

      {/* Live Voice Chat Modal */}
      <VoiceChatModal
        isOpen={isVoiceChatOpen}
        onClose={() => setIsVoiceChatOpen(false)}
        userProfile={userProfile}
        memories={memories}
        tasks={tasks}
        onAppendVoiceTurn={(role, text) => {
          setMessages((prev) => [
            ...prev,
            {
              id: `voice-${role}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              role,
              content: text,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              mood: role === 'model' ? 'warm' : undefined,
            },
          ]);
        }}
      />

    </div>
  );
}
