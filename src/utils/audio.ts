/**
 * Web Audio API synthesizer for sound chimes and ambient soundscapes.
 * 100% self-contained without external audio dependencies or network requests.
 */

class AudioSynthesizer {
  private ctx: AudioContext | null = null;
  private currentAmbientNode: {
    stop: () => void;
    setVolume: (val: number) => void;
  } | null = null;
  private ambientType: string = 'none';
  private ambientVolume: number = 0.4;

  private getContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // Play a soft, happy message sent chime (ascending 2-tone)
  playSendChime() {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.08); // E5

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.15);
    } catch (e) {
      console.warn('Audio not allowed yet:', e);
    }
  }

  // Play a warm, comforting message received chime (sweet harp-like 3-tone arpeggio)
  playReceiveChime() {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      const freqs = [587.33, 739.99, 880.0]; // D5, F#5, A5
      
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startTime = now + idx * 0.06;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.07, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.35);
      });
    } catch (e) {
      console.warn('Audio not allowed yet:', e);
    }
  }

  // Play a crisp, delightful button click / action executed chime
  playActionChime() {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.09);

      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.12);
    } catch (e) {
      console.warn('Audio action error:', e);
    }
  }

  // Play a gentle singing-bowl / Pomodoro completion bell
  playBellChime() {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      // Overtones of singing bowl
      const harmonics = [440, 880, 1320, 1760];
      const gains = [0.15, 0.08, 0.04, 0.02];

      harmonics.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(gains[i], now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.5);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 2.5);
      });
    } catch (e) {
      console.warn('Audio bell error:', e);
    }
  }

  // Play an alert reminder chime
  playReminderChime() {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      [659.25, 880, 1046.5].forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const t = now + i * 0.1;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, t);

        gain.gain.setValueAtTime(0.12, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(t);
        osc.stop(t + 0.4);
      });
    } catch (e) {
      console.warn('Reminder audio error:', e);
    }
  }

  // ---------------- AMBIENT SOUND GENERATION ----------------
  startAmbient(type: 'rain' | 'cafe' | 'drone' | 'none') {
    this.stopAmbient();
    this.ambientType = type;
    if (type === 'none') return;

    try {
      const ctx = this.getContext();

      if (type === 'rain') {
        // Synthesize continuous gentle rain using filtered pink/white noise buffer
        const bufferSize = ctx.sampleRate * 2;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          // Pink noise filter approximation
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          b3 = 0.86650 * b3 + white * 0.3104856;
          b4 = 0.55000 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.0168980;
          output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.08;
          b6 = white * 0.115926;
        }

        const whiteNoise = ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        whiteNoise.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1000, ctx.currentTime);

        const masterGain = ctx.createGain();
        masterGain.gain.setValueAtTime(this.ambientVolume * 0.6, ctx.currentTime);

        whiteNoise.connect(filter);
        filter.connect(masterGain);
        masterGain.connect(ctx.destination);

        whiteNoise.start();

        this.currentAmbientNode = {
          stop: () => {
            try {
              whiteNoise.stop();
              whiteNoise.disconnect();
            } catch (_) {}
          },
          setVolume: (val: number) => {
            masterGain.gain.setValueAtTime(val * 0.6, ctx.currentTime);
          },
        };
      } else if (type === 'cafe') {
        // Cozy cafe warm murmur: low-pass filtered brown noise + warm gentle rumble
        const bufferSize = ctx.sampleRate * 2;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        let lastOut = 0.0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          output[i] = (lastOut + 0.02 * white) / 1.02;
          lastOut = output[i];
          output[i] *= 1.8;
        }

        const source = ctx.createBufferSource();
        source.buffer = noiseBuffer;
        source.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(320, ctx.currentTime);
        filter.Q.setValueAtTime(1.2, ctx.currentTime);

        const masterGain = ctx.createGain();
        masterGain.gain.setValueAtTime(this.ambientVolume * 0.5, ctx.currentTime);

        source.connect(filter);
        filter.connect(masterGain);
        masterGain.connect(ctx.destination);

        source.start();

        this.currentAmbientNode = {
          stop: () => {
            try {
              source.stop();
              source.disconnect();
            } catch (_) {}
          },
          setVolume: (val: number) => {
            masterGain.gain.setValueAtTime(val * 0.5, ctx.currentTime);
          },
        };
      } else if (type === 'drone') {
        // Warm Synth Drone: two detuned oscillators (warm root and fifth) with soft LFO filter
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        const masterGain = ctx.createGain();

        osc1.type = 'triangle';
        osc1.frequency.setValueAtTime(130.81, ctx.currentTime); // C3
        
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(196.0, ctx.currentTime); // G3

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(350, ctx.currentTime);

        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(0.15, ctx.currentTime); // gentle breathing
        lfoGain.gain.setValueAtTime(80, ctx.currentTime);
        lfo.connect(filter.frequency);

        masterGain.gain.setValueAtTime(this.ambientVolume * 0.35, ctx.currentTime);

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(masterGain);
        masterGain.connect(ctx.destination);

        osc1.start();
        osc2.start();
        lfo.start();

        this.currentAmbientNode = {
          stop: () => {
            try {
              osc1.stop();
              osc2.stop();
              lfo.stop();
              osc1.disconnect();
              osc2.disconnect();
              lfo.disconnect();
            } catch (_) {}
          },
          setVolume: (val: number) => {
            masterGain.gain.setValueAtTime(val * 0.35, ctx.currentTime);
          },
        };
      }
    } catch (err) {
      console.warn('Ambient start failed:', err);
    }
  }

  stopAmbient() {
    if (this.currentAmbientNode) {
      this.currentAmbientNode.stop();
      this.currentAmbientNode = null;
    }
    this.ambientType = 'none';
  }

  setAmbientVolume(vol: number) {
    this.ambientVolume = Math.max(0, Math.min(1, vol));
    if (this.currentAmbientNode) {
      this.currentAmbientNode.setVolume(this.ambientVolume);
    }
  }

  getAmbientType() {
    return this.ambientType;
  }

  getAmbientVolume() {
    return this.ambientVolume;
  }
}

export const soundFx = new AudioSynthesizer();

/**
 * Speech Synthesis (Text-to-Speech) wrapper
 */
class SpeechController {
  private enabled: boolean = true;
  private voice: SpeechSynthesisVoice | null = null;
  private rate: number = 1.05;
  private pitch: number = 1.1; // warm, slightly higher friendly pitch

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.initVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        this.initVoices();
      };
    }
  }

  private initVoices() {
    if (!('speechSynthesis' in window)) return;
    const voices = window.speechSynthesis.getVoices();
    // Prefer friendly natural English voices
    const preferred = voices.find(
      (v) =>
        (v.name.includes('Samantha') ||
          v.name.includes('Natural') ||
          v.name.includes('Victoria') ||
          v.name.includes('Google US English') ||
          v.name.includes('Karen') ||
          v.name.includes('Zira') ||
          v.name.includes('Female')) &&
        v.lang.startsWith('en')
    );
    this.voice = preferred || voices.find((v) => v.lang.startsWith('en')) || voices[0] || null;
  }

  speak(text: string, onEnd?: () => void) {
    if (!this.enabled || !('speechSynthesis' in window)) {
      onEnd?.();
      return;
    }
    window.speechSynthesis.cancel(); // cancel pending speech

    // Remove emojis or markdown before speech for smooth narration
    const cleanText = text
      .replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '')
      .replace(/[*_#`~[\]()]/g, '')
      .trim();

    if (!cleanText) {
      onEnd?.();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(cleanText);
    if (this.voice) {
      utterance.voice = this.voice;
    }
    utterance.rate = this.rate;
    utterance.pitch = this.pitch;

    utterance.onend = () => onEnd?.();
    utterance.onerror = () => onEnd?.();

    window.speechSynthesis.speak(utterance);
  }

  stop() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  toggleEnabled(): boolean {
    this.enabled = !this.enabled;
    if (!this.enabled) {
      this.stop();
    }
    return this.enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  setEnabled(val: boolean) {
    this.enabled = val;
    if (!val) this.stop();
  }
}

export const speechCtrl = new SpeechController();
