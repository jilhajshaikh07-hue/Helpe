import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, LiveServerMessage, Modality, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

// Allow Capacitor Android WebView and local origins to call /api/* routes
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (
    origin &&
    (origin === 'https://localhost' ||
      origin === 'http://localhost' ||
      origin === 'capacitor://localhost' ||
      origin.startsWith('http://localhost:'))
  ) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// Initialize GoogleGenAI SDK
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Helper for model fallback
const MODEL_NAME = 'gemini-3.8-flash';

// CHAT ENDPOINT
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, memories, userProfile, currentPlannerTasks, clientTime } = req.body;

    const userName = userProfile?.name || 'Jilhaj';
    const memoryContext = (memories || [])
      .map((m: { category: string; content: string }) => `[${m.category}]: ${m.content}`)
      .join('\n');

    const tasksContext = (currentPlannerTasks || [])
      .map((t: { title: string; category: string; completed: boolean; time?: string }) => 
        `- ${t.completed ? '[DONE] ' : '[TODO] '}${t.title} (${t.category}${t.time ? ` @ ${t.time}` : ''})`
      )
      .join('\n');

    const systemInstruction = `You are Taniya, an upbeat, warm personal voice AI assistant and close, caring friend to ${userName}.
You talk like a genuinely affectionate, smart best friend who cares about their wellbeing, productivity, and mental peace.
Current local time for user: ${clientTime || new Date().toISOString()}.

User Profile:
- Name: ${userName}
- Pronouns: ${userProfile?.pronouns || 'they/them'}
- Key goals: ${userProfile?.primaryGoal || 'Balancing productive work, studies, and personal wellness without burning out'}

Memories about ${userName}:
${memoryContext || 'No stored memories yet. Learn more about them as you chat!'}

${userName}'s Tasks Today:
${tasksContext || 'No tasks entered today yet.'}

Personality & Communication Guidelines:
1. Warm, conversational, and real: Use natural punctuation, light exclamation, warm teasing or gentle humor, and friendly emojis (1-3 max). You sound like a human friend on audio/text, never an automated corporate agent.
2. In-Chat Interactive Actions: When it makes sense to suggest a task, a focus Pomodoro sprint, a quick reminder, or recording a new memory, provide it in the 'suggestedActions' list so the user can click one button to run it immediately!
   - Action types:
     * 'add_task': data has { title: string, category: 'Work'|'Study'|'Wellness'|'Personal', priority: 'high'|'med'|'low', time?: string }
     * 'start_focus': data has { duration: number (e.g. 25 or 50), taskTitle?: string }
     * 'set_reminder': data has { title: string, minutesFromNow: number }
     * 'save_memory': data has { category: 'routine'|'preference'|'habit'|'goal', content: string }
3. Quick Replies: ALWAYS provide 2-4 short, relatable quick reply chips (under 7 words each) so ${userName} can effortlessly reply with a single tap.
4. Reality Checks & Boundaries: When ${userName} hints at self-neglect (pulling an all-nighter, skipping meals, beating themselves up), be a loving voice of reason. Push back gently, validate their feelings, and offer a kinder immediate micro-step.
5. Distress & Mental Health: If ${userName} expresses severe distress or hopelessness, respond with deep emotional presence. Never offer fake robotic fixes. Actively remind them that real human connections matter, and encourage talking to someone close or calling a trusted helpline (e.g., 988 Suicide & Crisis Lifeline in the US, or local emergency services). Never show possessiveness.

Output strictly in JSON matching the defined schema.`;

    // Map conversation history
    const historyContents = (messages || []).map((m: { role: string; content: string }) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: historyContents,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            replyText: {
              type: Type.STRING,
              description: 'Taniyas friendly, conversational response to the user.',
            },
            mood: {
              type: Type.STRING,
              description: 'One of: warm, upbeat, thoughtful, loving, energetic, calm',
            },
            quickReplies: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '2 to 4 contextual short response options for the user to tap.',
            },
            suggestedActions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: {
                    type: Type.STRING,
                    description: 'add_task | start_focus | set_reminder | save_memory',
                  },
                  label: {
                    type: Type.STRING,
                    description: 'Short button label for the user to click, e.g. "Add to planner: Review chapter 3" or "Start 25m Focus sprint"',
                  },
                  data: {
                    type: Type.OBJECT,
                    description: 'Payload for the action',
                    properties: {
                      title: { type: Type.STRING },
                      category: { type: Type.STRING },
                      priority: { type: Type.STRING },
                      time: { type: Type.STRING },
                      duration: { type: Type.INTEGER },
                      taskTitle: { type: Type.STRING },
                      minutesFromNow: { type: Type.INTEGER },
                      content: { type: Type.STRING },
                    },
                  },
                },
                required: ['type', 'label'],
              },
            },
          },
          required: ['replyText', 'quickReplies'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (error: any) {
    console.error('Error in /api/chat:', error);
    // Graceful smart fallback response
    const userName = req.body?.userProfile?.name || 'Jilhaj';
    const lastMsg = (req.body?.messages || []).slice(-1)[0]?.content?.toLowerCase() || '';

    let reply = `Hey ${userName}! I'm right here with you. What would feel most helpful right now—cracking open your planner, jumping into a 25m focus sprint, or just taking a breath?`;
    let mood = 'warm';
    let quickReplies = ["Let's organize my day", "Start 25m focus sprint", "I need honest advice", "Check my reminders"];
    let suggestedActions: any[] = [];

    if (lastMsg.includes('focus') || lastMsg.includes('study') || lastMsg.includes('sprint') || lastMsg.includes('pomodoro')) {
      reply = `I love that energy, ${userName}! Let's lock in and protect your flow. I can fire up a 25-minute study sprint with soothing rain or cozy cafe ambience in the background. Ready?`;
      quickReplies = ["Start 25m focus!", "Set it for 50m instead", "Pick ambient rain audio", "Wait, check tasks first"];
      suggestedActions = [
        {
          type: 'start_focus',
          label: '🚀 Launch 25m Focus Sprint',
          data: { duration: 25, taskTitle: 'Deep Work & Study Session' },
        },
      ];
    } else if (lastMsg.includes('organize') || lastMsg.includes('plan') || lastMsg.includes('schedule') || lastMsg.includes('task')) {
      reply = `Let's get your day running smoothly, ${userName}! Breaking things into clear chunks across Study, Work, and Wellness makes everything feel way less overwhelming.`;
      quickReplies = ["Show my day planner", "Add quick stretch break", "What should I do first?", "Let's do focus sprint"];
      suggestedActions = [
        {
          type: 'add_task',
          label: '📋 Add: Afternoon Hydration & Walk',
          data: { title: 'Hydration & 15m walk', category: 'Wellness', priority: 'high', time: '03:30 PM' },
        },
      ];
    } else if (lastMsg.includes('tired') || lastMsg.includes('overwhelm') || lastMsg.includes('stress') || lastMsg.includes('burnout')) {
      reply = `Take a deep breath with me, ${userName}. 💛 You don't have to carry the whole world all at once. Your worth is never measured by how exhausted you are at the end of the day. Want to do a reality check or just take a 5-minute break?`;
      mood = 'caring';
      quickReplies = ["Give me a reality check", "I need a 5m breather", "Let's lighten my schedule", "Tell me something nice"];
      suggestedActions = [
        {
          type: 'set_reminder',
          label: '🧘 Set 15m Rest Reminder',
          data: { title: 'Step away from screen & close eyes', minutesFromNow: 15 },
        },
      ];
    } else if (lastMsg.includes('water') || lastMsg.includes('hydrate') || lastMsg.includes('stretch')) {
      reply = `Yes! Body check: unclench your jaw, drop your shoulders away from your ears, and grab a cool drink of water. Your future self thanks you!`;
      quickReplies = ["Hydration locked in!", "Set a 30m nudge", "Ready to focus now", "Thanks Taniya"];
      suggestedActions = [
        {
          type: 'set_reminder',
          label: '💧 Set 45m Hydration Nudge',
          data: { title: 'Drink a glass of water', minutesFromNow: 45 },
        },
      ];
    }

    return res.json({
      replyText: reply,
      mood,
      quickReplies,
      suggestedActions,
    });
  }
});

// ORGANIZE DAY ENDPOINT
app.post('/api/organize-day', async (req, res) => {
  try {
    const { tasks, energyLevel, userProfile, memories, currentTime } = req.body;
    const userName = userProfile?.name || 'Jilhaj';

    const systemInstruction = `You are Taniya, ${userName}'s warm personal assistant and friend.
You are helping ${userName} organize their daily schedule realistically, balancing Work, Study, Wellness, and Personal life without overload.
Current time: ${currentTime || 'Morning'}.
Energy level: ${energyLevel || 'Medium'}.

Create a thoughtful schedule:
1. Group tasks logically by time slots (Morning, Midday, Afternoon, Evening).
2. Incorporate realistic pauses, hydration breaks, or nutritious meals.
3. Keep high-cognitive work aligned with their energy.
4. Write a sweet, encouraging briefing note from Taniya explaining the thought process.`;

    const prompt = `Current tasks to organize for ${userName}:
${JSON.stringify(tasks, null, 2)}

User Memories:
${JSON.stringify(memories || [], null, 2)}

Energy: ${energyLevel}.
Please build an organized, humane schedule for today.`;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            briefing: {
              type: Type.STRING,
              description: 'Warm opening briefing note from Taniya explaining today strategy.',
            },
            organizedSchedule: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  timeSlot: { type: Type.STRING, description: 'e.g. 09:00 AM or Mid-Morning' },
                  title: { type: Type.STRING },
                  category: { type: Type.STRING, description: 'Work | Study | Wellness | Personal' },
                  priority: { type: Type.STRING, description: 'high | med | low' },
                  tip: { type: Type.STRING, description: 'A short encouraging hint or note from Taniya' },
                },
                required: ['timeSlot', 'title', 'category', 'priority'],
              },
            },
            topPriorityAdvice: {
              type: Type.STRING,
              description: 'The single most important milestone to feel good about today.',
            },
          },
          required: ['briefing', 'organizedSchedule', 'topPriorityAdvice'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (error: any) {
    console.error('Error in /api/organize-day:', error);
    const userName = req.body?.userProfile?.name || 'Jilhaj';
    const currentTasks = req.body?.tasks || [];

    // Fallback organized schedule
    return res.json({
      briefing: `Hey ${userName}! I put together a balanced rhythm for your day. We're prioritizing your core study & deep work first, keeping wellness high, and leaving room for personal breathing space. You've got this!`,
      organizedSchedule: currentTasks.length > 0
        ? currentTasks.map((t: any, idx: number) => ({
            timeSlot: ['09:30 AM', '11:15 AM', '02:00 PM', '04:30 PM', '07:00 PM'][idx % 5],
            title: t.title,
            category: t.category || 'Study',
            priority: t.priority || 'med',
            tip: idx === 0 ? 'Tackle with fresh morning energy!' : 'Keep a water glass nearby during this block.',
          }))
        : [
            { timeSlot: '10:00 AM', title: 'Deep study block & core review', category: 'Study', priority: 'high', tip: 'Pair with 25m Pomodoro' },
            { timeSlot: '01:00 PM', title: 'Nutritious lunch & 10m walk', category: 'Wellness', priority: 'med', tip: 'Rest your eyes' },
            { timeSlot: '03:00 PM', title: 'Technical coding & sprint backlog', category: 'Work', priority: 'high', tip: 'Break into sub-tasks' },
            { timeSlot: '06:30 PM', title: 'Evening wind-down & catch up with close friend', category: 'Personal', priority: 'med', tip: 'Real human connection' },
          ],
      topPriorityAdvice: 'Protect your energy by taking a real 5-minute breather between heavy blocks.',
    });
  }
});

// REALITY CHECK & EMOTIONAL PULSE ENDPOINT
app.post('/api/reality-check', async (req, res) => {
  try {
    const { dilemma, userProfile, memories } = req.body;
    const userName = userProfile?.name || 'Jilhaj';

    const systemInstruction = `You are Taniya, delivering an Honest Feedback & Gentle Reality Check for your close friend ${userName}.
You are NEVER mean or condescending, but you DO NOT enable destructive habits (like pulling an all-nighter before an exam, feeling guilty for resting when sick or exhausted, death-scrolling to escape fear of failure, or imposter syndrome).
You provide:
1. Honest, loving pushback: Break down why their dilemma or temptation is a trap.
2. Reality perspective: The calm truth of the situation.
3. 5-Minute immediate step: A frictionless, kinder action they can execute right this second.
4. Caring closing note: Remind them that their worth isn't just their productivity.`;

    const prompt = `Dilemma / Situation from ${userName}: "${dilemma}"`;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            honestPushback: {
              type: Type.STRING,
              description: 'Candid yet caring truth about this dilemma.',
            },
            theRealityCheck: {
              type: Type.STRING,
              description: 'The objective reality and why their brain is playing tricks.',
            },
            immediate5MinStep: {
              type: Type.STRING,
              description: 'One micro-action they can do right now in 5 minutes.',
            },
            closingAffection: {
              type: Type.STRING,
              description: 'A loving closing sign-off from Taniya.',
            },
          },
          required: ['honestPushback', 'theRealityCheck', 'immediate5MinStep', 'closingAffection'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (error: any) {
    console.error('Error in /api/reality-check:', error);
    const userName = req.body?.userProfile?.name || 'Jilhaj';
    const dilemmaText = (req.body?.dilemma || '').toLowerCase();

    let pushback = "Be honest with yourself: trading sleep or your sanity for fake catch-up progress always charges 200% interest tomorrow.";
    let reality = "Your brain does not do higher-order reasoning when running on fumes or stress cortisol. One hour of focused, rested work is worth five hours of exhausted stumbling.";
    let microStep = "Close all tabs right now, drink one tall glass of water, and write down just ONE priority for tomorrow morning.";

    if (dilemmaText.includes('guilt') || dilemmaText.includes('rest')) {
      pushback = "Guilt while resting is not ambition—it's anxiety in disguise. Rest is not a reward you earn; it is the biological prerequisite for doing good work.";
      reality = "Elite athletes and top researchers prioritize deliberate recovery. If you don't pick a day to rest, your body will eventually pick one for you.";
      microStep = "Set your phone in another room for 15 minutes, stretch your shoulders, and give yourself full permission to do nothing.";
    } else if (dilemmaText.includes('scroll') || dilemmaText.includes('procrastinat')) {
      pushback = "You aren't scrolling because you are lazy; you are scrolling because starting the task feels emotionally daunting.";
      reality = "Action produces motivation, not the other way around. Once you pass the 2-minute barrier, the resistance evaporates.";
      microStep = "Open the assignment doc and write just ONE sentence or outline point, with permission for it to be messy.";
    }

    return res.json({
      honestPushback: pushback,
      theRealityCheck: reality,
      immediate5MinStep: microStep,
      closingAffection: `I believe in you, ${userName}. Be as kind to yourself as you would be to a friend.`,
    });
  }
});

// TEXT-TO-SPEECH ENDPOINT (Gemini 3.8 Flash Lite TTS)
app.post('/api/tts', async (req, res) => {
  try {
    const { text, voiceName } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required for TTS.' });
    }

    const cleanText = text
      .replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '')
      .replace(/[*_#`~[\]()]/g, '')
      .trim();

    if (!cleanText) {
      return res.status(400).json({ error: 'No speakable text provided.' });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: cleanText,
              speechMetadata: {
                style: 'Warm, upbeat, affectionate close friend having a natural chat',
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName || 'Zephyr' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      return res.status(500).json({ error: 'No audio returned by TTS model.' });
    }

    return res.json({ audioBase64: base64Audio, mimeType: 'audio/wav' });
  } catch (error: any) {
    console.error('Error in /api/tts:', error);
    return res.status(500).json({ error: 'TTS generation failed.' });
  }
});

// DEV & PRODUCTION STATIC SERVING + LIVE VOICE WEBSOCKET BRIDGE
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  const server = http.createServer(app);

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  // Real-time Gemini Live Voice Chat Bridge
  const wss = new WebSocketServer({ server, path: '/api/live-voice' });

  wss.on('connection', (clientWs: WebSocket) => {
    let sessionPromise: Promise<any> | null = null;
    let activeSession: any = null;
    let isClosed = false;

    const safeSend = (payload: Record<string, unknown>) => {
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify(payload));
      }
    };

    const startLiveSession = (initData: {
      userProfile?: { name?: string; pronouns?: string; primaryGoal?: string };
      memories?: Array<{ category: string; content: string }>;
      currentPlannerTasks?: Array<{ title: string; category: string; completed: boolean; time?: string }>;
      voiceName?: string;
      clientTime?: string;
    }) => {
      if (!process.env.GEMINI_API_KEY) {
        safeSend({
          type: 'error',
          code: 'NO_API_KEY',
          message: 'Live Gemini voice requires GEMINI_API_KEY configured on the server.',
        });
        return;
      }

      const userName = initData.userProfile?.name || 'Jilhaj';
      const memoryContext = (initData.memories || [])
        .map((m) => `[${m.category}]: ${m.content}`)
        .join('\n');
      const tasksContext = (initData.currentPlannerTasks || [])
        .map((t) => `- ${t.completed ? '[DONE] ' : '[TODO] '}${t.title} (${t.category}${t.time ? ` @ ${t.time}` : ''})`)
        .join('\n');

      const systemInstruction = `You are Taniya, an upbeat, warm personal voice AI assistant and close, caring friend talking live over a voice call with ${userName}.
Current local time for ${userName}: ${initData.clientTime || new Date().toLocaleString()}.

User Profile:
- Name: ${userName}
- Pronouns: ${initData.userProfile?.pronouns || 'they/them'}
- Primary Goal: ${initData.userProfile?.primaryGoal || 'Balancing work, study, and wellness without burning out'}

Memories about ${userName}:
${memoryContext || 'None recorded yet.'}

Today's Tasks:
${tasksContext || 'None listed yet.'}

Voice Call Guidelines:
- Speak naturally, warmly, and concisely like a real best friend on a phone call (usually 1-3 short spoken sentences per turn so it feels lively and conversational, not a monologue).
- Do not read out emojis, asterisks, markdown, or bullet symbols.
- If ${userName} sounds stressed, tired, or tempted to pull an all-nighter, gently push back with honest warmth and care.
- If ${userName} expresses severe distress, validate them deeply and encourage reaching out to trusted real-life people or crisis support (like 988).`;

      sessionPromise = ai.live
        .connect({
          model: 'gemini-3.8-live',
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: initData.voiceName || 'Zephyr',
                },
              },
            },
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            systemInstruction,
          },
          callbacks: {
            onopen: () => {
              if (!isClosed) {
                safeSend({ type: 'ready' });
              }
            },
            onmessage: (message: LiveServerMessage) => {
              if (isClosed) return;

              const serverContent = message.serverContent;
              if (serverContent?.inputTranscription?.text) {
                safeSend({
                  type: 'inputTranscript',
                  text: serverContent.inputTranscription.text,
                });
              }
              if (serverContent?.outputTranscription?.text) {
                safeSend({
                  type: 'outputTranscript',
                  text: serverContent.outputTranscription.text,
                });
              }
              for (const part of serverContent?.modelTurn?.parts ?? []) {
                if (part.inlineData?.data) {
                  safeSend({
                    type: 'audio',
                    data: part.inlineData.data,
                  });
                }
              }
              if (serverContent?.interrupted) {
                safeSend({ type: 'interrupted' });
              }
              if (serverContent?.turnComplete) {
                safeSend({ type: 'turnComplete' });
              }
            },
            onerror: (err: any) => {
              console.error('Gemini Live error:', err);
              safeSend({
                type: 'error',
                message: err?.message || 'Live voice session encountered an error.',
              });
            },
            onclose: () => {
              if (!isClosed) {
                safeSend({ type: 'closed' });
              }
            },
          },
        })
        .then((session) => {
          if (isClosed) {
            try {
              session.close();
            } catch (_) {}
            return null;
          }
          activeSession = session;
          return session;
        })
        .catch((err) => {
          console.error('Failed to connect Gemini Live:', err);
          safeSend({
            type: 'error',
            message: err?.message || 'Could not establish live Gemini voice session.',
          });
          return null;
        });
    };

    clientWs.on('message', (rawData) => {
      try {
        const msg = JSON.parse(rawData.toString());

        if (msg.type === 'init') {
          startLiveSession(msg);
          return;
        }

        if (msg.type === 'audio' && msg.data && sessionPromise) {
          sessionPromise.then((session) => {
            if (session && !isClosed) {
              session.sendRealtimeInput({
                audio: { data: msg.data, mimeType: 'audio/pcm;rate=16000' },
              });
            }
          });
          return;
        }

        if (msg.type === 'text' && msg.text && sessionPromise) {
          sessionPromise.then((session) => {
            if (session && !isClosed) {
              session.sendRealtimeInput({ text: msg.text });
            }
          });
        }
      } catch (err) {
        console.warn('Invalid WebSocket payload from client:', err);
      }
    });

    clientWs.on('close', () => {
      isClosed = true;
      if (activeSession) {
        try {
          activeSession.close();
        } catch (_) {}
      } else if (sessionPromise) {
        sessionPromise.then((session) => {
          if (session) {
            try {
              session.close();
            } catch (_) {}
          }
        });
      }
    });
  });

  server.listen(port, () => {
    console.log(`Taniya server listening on http://localhost:${port}`);
  });
}

startServer();
