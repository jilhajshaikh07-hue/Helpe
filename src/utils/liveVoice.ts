import { apiUrl, wsUrl } from './api';
import { MemoryItem, PlannerTask, UserProfile } from '../types';

export type LiveVoiceName = 'Zephyr' | 'Kore' | 'Puck';

export type VoiceCallStatus =
  | 'idle'
  | 'connecting'
  | 'listening'
  | 'speaking'
  | 'fallback-listening'
  | 'fallback-thinking'
  | 'fallback-speaking'
  | 'error';

export interface LiveVoiceCallbacks {
  onStatusChange: (status: VoiceCallStatus) => void;
  onInputTranscript: (text: string) => void;
  onOutputTranscript: (text: string) => void;
  onTurnComplete: () => void;
  onInputLevel: (level: number) => void;
  onOutputLevel: (level: number) => void;
  onError: (message: string) => void;
}

function downsampleBuffer(buffer: Float32Array, inputRate: number, outputRate: number): Float32Array {
  if (inputRate === outputRate) {
    return buffer;
  }
  const ratio = inputRate / outputRate;
  const newLength = Math.round(buffer.length / ratio);
  const result = new Float32Array(newLength);
  let offsetResult = 0;
  let offsetBuffer = 0;
  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
    let accum = 0;
    let count = 0;
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
      accum += buffer[i];
      count++;
    }
    result[offsetResult] = count > 0 ? accum / count : 0;
    offsetResult++;
    offsetBuffer = nextOffsetBuffer;
  }
  return result;
}

function float32ToBase64Pcm16(float32: Float32Array): string {
  const int16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  const bytes = new Uint8Array(int16.buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function base64Pcm16ToFloat32(base64: string): Float32Array {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const int16 = new Int16Array(bytes.buffer);
  const float32 = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i++) {
    float32[i] = int16[i] / 32768;
  }
  return float32;
}

function computeRms(samples: Float32Array): number {
  if (samples.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    sum += samples[i] * samples[i];
  }
  return Math.min(1, Math.sqrt(sum / samples.length) * 4);
}

export class LiveVoiceClient {
  private ws: WebSocket | null = null;
  private inputCtx: AudioContext | null = null;
  private outputCtx: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private activeSources = new Set<AudioBufferSourceNode>();
  private nextStartTime = 0;
  private isMuted = false;
  private isStopped = false;
  private callbacks: LiveVoiceCallbacks;

  constructor(callbacks: LiveVoiceCallbacks) {
    this.callbacks = callbacks;
  }

  async start(params: {
    userProfile: UserProfile;
    memories: MemoryItem[];
    tasks: PlannerTask[];
    voiceName: LiveVoiceName;
  }): Promise<boolean> {
    this.isStopped = false;
    this.isMuted = false;
    this.callbacks.onStatusChange('connecting');

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.inputCtx = new AudioCtx({ sampleRate: 16000 });
      this.outputCtx = new AudioCtx({ sampleRate: 24000 });

      if (this.inputCtx.state === 'suspended') await this.inputCtx.resume();
      if (this.outputCtx.state === 'suspended') await this.outputCtx.resume();

      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    } catch (err: any) {
      this.cleanupAudio();
      this.callbacks.onError(
        err?.name === 'NotAllowedError'
          ? 'Microphone permission was denied. Please enable mic access to start Voice Chat.'
          : 'Could not access microphone on this device.'
      );
      this.callbacks.onStatusChange('error');
      return false;
    }

    return new Promise((resolve) => {
      let resolved = false;
      const socket = new WebSocket(wsUrl('/api/live-voice'));
      this.ws = socket;

      const timeout = window.setTimeout(() => {
        if (!resolved) {
          resolved = true;
          this.stop();
          this.callbacks.onError('Live voice connection timed out.');
          this.callbacks.onStatusChange('error');
          resolve(false);
        }
      }, 10000);

      socket.onopen = () => {
        socket.send(
          JSON.stringify({
            type: 'init',
            userProfile: params.userProfile,
            memories: params.memories,
            currentPlannerTasks: params.tasks,
            voiceName: params.voiceName,
            clientTime: new Date().toLocaleString(),
          })
        );
      };

      socket.onmessage = (event) => {
        if (this.isStopped) return;
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === 'ready') {
            clearTimeout(timeout);
            if (!resolved) {
              resolved = true;
              this.startMicCapture();
              this.callbacks.onStatusChange('listening');
              // Ask Taniya to warmly greet the user as the call connects
              socket.send(
                JSON.stringify({
                  type: 'text',
                  text: `Hey Taniya, I just hopped on a voice call with you! Say a quick warm hello to ${params.userProfile.name}.`,
                })
              );
              resolve(true);
            }
            return;
          }

          if (msg.type === 'audio' && msg.data) {
            this.callbacks.onStatusChange('speaking');
            this.enqueueOutputAudio(msg.data);
            return;
          }

          if (msg.type === 'inputTranscript' && msg.text) {
            this.callbacks.onInputTranscript(msg.text);
            return;
          }

          if (msg.type === 'outputTranscript' && msg.text) {
            this.callbacks.onOutputTranscript(msg.text);
            return;
          }

          if (msg.type === 'interrupted') {
            this.clearPlaybackQueue();
            this.callbacks.onStatusChange('listening');
            return;
          }

          if (msg.type === 'turnComplete') {
            this.callbacks.onTurnComplete();
            if (this.activeSources.size === 0) {
              this.callbacks.onOutputLevel(0);
              this.callbacks.onStatusChange('listening');
            }
            return;
          }

          if (msg.type === 'error') {
            clearTimeout(timeout);
            const message = msg.message || 'Live voice session failed.';
            this.callbacks.onError(message);
            if (!resolved) {
              resolved = true;
              this.stop();
              this.callbacks.onStatusChange('error');
              resolve(false);
            }
          }
        } catch (err) {
          console.warn('Live voice message parse error:', err);
        }
      };

      socket.onerror = () => {
        clearTimeout(timeout);
        if (!resolved) {
          resolved = true;
          this.stop();
          this.callbacks.onError('Could not connect to live voice server.');
          this.callbacks.onStatusChange('error');
          resolve(false);
        }
      };

      socket.onclose = () => {
        clearTimeout(timeout);
        if (!resolved) {
          resolved = true;
          this.stop();
          resolve(false);
        }
      };
    });
  }

  private startMicCapture() {
    if (!this.inputCtx || !this.mediaStream || !this.ws) return;

    this.sourceNode = this.inputCtx.createMediaStreamSource(this.mediaStream);
    this.processor = this.inputCtx.createScriptProcessor(4096, 1, 1);

    const silentGain = this.inputCtx.createGain();
    silentGain.gain.value = 0;

    this.sourceNode.connect(this.processor);
    this.processor.connect(silentGain);
    silentGain.connect(this.inputCtx.destination);

    this.processor.onaudioprocess = (e) => {
      if (this.isStopped || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;

      const rawSamples = e.inputBuffer.getChannelData(0);
      if (this.isMuted) {
        this.callbacks.onInputLevel(0);
        return;
      }

      const level = computeRms(rawSamples);
      this.callbacks.onInputLevel(level);

      const inputRate = this.inputCtx?.sampleRate || 16000;
      const pcm16k = downsampleBuffer(rawSamples, inputRate, 16000);
      const base64 = float32ToBase64Pcm16(pcm16k);
      this.ws.send(JSON.stringify({ type: 'audio', data: base64 }));
    };
  }

  private enqueueOutputAudio(base64Pcm: string) {
    if (!this.outputCtx || this.isStopped) return;

    const float32 = base64Pcm16ToFloat32(base64Pcm);
    if (float32.length === 0) return;

    const level = computeRms(float32);
    this.callbacks.onOutputLevel(level);

    const buffer = this.outputCtx.createBuffer(1, float32.length, 24000);
    buffer.getChannelData(0).set(float32);

    const source = this.outputCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(this.outputCtx.destination);

    const now = this.outputCtx.currentTime;
    const startAt = Math.max(now + 0.02, this.nextStartTime);
    this.nextStartTime = startAt + buffer.duration;

    this.activeSources.add(source);
    source.onended = () => {
      this.activeSources.delete(source);
      if (this.activeSources.size === 0 && !this.isStopped) {
        this.callbacks.onOutputLevel(0);
        this.callbacks.onStatusChange('listening');
      }
    };

    source.start(startAt);
  }

  clearPlaybackQueue() {
    for (const src of this.activeSources) {
      try {
        src.stop();
        src.disconnect();
      } catch (_) {}
    }
    this.activeSources.clear();
    this.nextStartTime = 0;
    this.callbacks.onOutputLevel(0);
  }

  sendPromptText(text: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'text', text }));
    }
  }

  setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      this.callbacks.onInputLevel(0);
    }
  }

  private cleanupAudio() {
    this.clearPlaybackQueue();
    try {
      this.processor?.disconnect();
    } catch (_) {}
    try {
      this.sourceNode?.disconnect();
    } catch (_) {}
    this.processor = null;
    this.sourceNode = null;

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    if (this.inputCtx) {
      this.inputCtx.close().catch(() => {});
      this.inputCtx = null;
    }
    if (this.outputCtx) {
      this.outputCtx.close().catch(() => {});
      this.outputCtx = null;
    }
  }

  stop() {
    this.isStopped = true;
    if (this.ws) {
      try {
        this.ws.close();
      } catch (_) {}
      this.ws = null;
    }
    this.cleanupAudio();
    this.callbacks.onInputLevel(0);
    this.callbacks.onOutputLevel(0);
    this.callbacks.onStatusChange('idle');
  }
}

export async function fetchGeminiTtsAudio(
  text: string,
  voiceName: LiveVoiceName = 'Zephyr'
): Promise<HTMLAudioElement | null> {
  try {
    const res = await fetch(apiUrl('/api/tts'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voiceName }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.audioBase64) return null;
    return new Audio(`data:${data.mimeType || 'audio/wav'};base64,${data.audioBase64}`);
  } catch {
    return null;
  }
}
