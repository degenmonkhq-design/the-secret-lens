/**
 * Soulful, Tear-Jerking Emotional Violin/Cello & Soft Warm Piano Pad Engine (Web Audio API)
 *
 * Synthesizes slow, expressive minor-key melodies (D minor: Dm9 -> Bbmaj7 -> Gm7 -> A)
 * with singing bowed cello/violin vibrato, legato pitch glides, and silky warm low-pass
 * filtering through a 3.6-second concert hall reverb at 15% soothing volume.
 *
 * Strictly stays OFF recorded videos: exposes pauseForRecording() / resumeAfterRecording()
 * so the speaker tune pauses cleanly during mic-only video recording.
 */

interface MelancholicPhrase {
  padFreqs: number[];
  soloNotes: Array<{ freq: number; isCello?: boolean }>;
}

// Deeply emotional D-minor progression (Dm9 -> Bbmaj7 -> Gm7 -> Asus4/A)
const EMOTIONAL_PROGRESSION: MelancholicPhrase[] = [
  {
    padFreqs: [146.83, 220.0, 261.63, 329.63], // Dm9 (D3, A3, C4, E4)
    soloNotes: [
      { freq: 146.83, isCello: true }, // D3 warm cello sigh
      { freq: 174.61, isCello: true }, // F3 expressive swell
      { freq: 440.0 },                 // A4 singing violin
      { freq: 466.16 },                // Bb4 poignant half-step yearning
    ],
  },
  {
    padFreqs: [116.54, 174.61, 220.0, 293.66], // Bbmaj7 (Bb2, F3, A3, D4)
    soloNotes: [
      { freq: 440.0 },                 // A4 gentle cry
      { freq: 392.0 },                 // G4 falling teardrop
      { freq: 174.61, isCello: true }, // F3 cello warmth
      { freq: 349.23 },                // F4 soft violin resolution
    ],
  },
  {
    padFreqs: [98.0, 146.83, 174.61, 233.08], // Gm7 (G2, D3, F3, Bb3)
    soloNotes: [
      { freq: 392.0 },                 // G4 yearning
      { freq: 349.23 },                // F4
      { freq: 329.63 },                // E4
      { freq: 146.83, isCello: true }, // D3 deep cello anchor
    ],
  },
  {
    padFreqs: [110.0, 164.81, 220.0, 277.18], // A / Asus4 -> C#3 warmth
    soloNotes: [
      { freq: 329.63 },                // E4
      { freq: 293.66 },                // D4
      { freq: 138.59, isCello: true }, // C#3 heartfelt tension
      { freq: 146.83, isCello: true }, // D3 tender home resolve
    ],
  },
];

class SoulfulStringsEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private padBus: GainNode | null = null;
  private stringsBus: GainNode | null = null;

  private isPlaying = false;
  private isEnabled = true;
  private pausedForRecording = false;
  private phraseIndex = 0;
  private noteStep = 0;

  private activeSources: AudioScheduledSourceNode[] = [];
  private activeTimers: number[] = [];

  private ensureContext(): AudioContext | null {
    if (this.ctx) return this.ctx;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;

    const ctx = new AudioCtx();

    const masterGain = ctx.createGain();
    masterGain.gain.value = 0.0001;

    // Silky warm velvet ceiling so strings never sound buzzy or harsh
    const silkCeiling = ctx.createBiquadFilter();
    silkCeiling.type = 'lowpass';
    silkCeiling.frequency.value = 1650;
    silkCeiling.Q.value = 0.35;

    // Deep 3.6-second concert hall reverb
    const convolver = ctx.createConvolver();
    convolver.buffer = this.createConcertReverbIR(ctx, 3.6, 2.2);

    const reverbDarken = ctx.createBiquadFilter();
    reverbDarken.type = 'lowpass';
    reverbDarken.frequency.value = 1150;
    reverbDarken.Q.value = 0.3;

    const dryGain = ctx.createGain();
    dryGain.gain.value = 0.48;

    const wetGain = ctx.createGain();
    wetGain.gain.value = 0.62;

    const padBus = ctx.createGain();
    padBus.gain.value = 0.56;

    const stringsBus = ctx.createGain();
    stringsBus.gain.value = 0.66;

    padBus.connect(dryGain);
    padBus.connect(convolver);
    stringsBus.connect(dryGain);
    stringsBus.connect(convolver);

    dryGain.connect(silkCeiling);
    convolver.connect(reverbDarken);
    reverbDarken.connect(wetGain);
    wetGain.connect(silkCeiling);

    silkCeiling.connect(masterGain);
    masterGain.connect(ctx.destination);

    this.ctx = ctx;
    this.masterGain = masterGain;
    this.padBus = padBus;
    this.stringsBus = stringsBus;
    return ctx;
  }

  private createConcertReverbIR(
    ctx: AudioContext,
    durationSec: number,
    decay: number
  ): AudioBuffer {
    const length = Math.floor(ctx.sampleRate * durationSec);
    const ir = ctx.createBuffer(2, length, ctx.sampleRate);

    for (let ch = 0; ch < 2; ch++) {
      const data = ir.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < length; i++) {
        const progress = i / length;
        const env = Math.pow(1 - progress, decay) * Math.min(1, i / (ctx.sampleRate * 0.06));
        const white = Math.random() * 2 - 1;
        lp = lp * 0.76 + white * 0.24;
        data[i] = lp * env;
      }
    }
    return ir;
  }

  private schedulePianoPadPhrase(): void {
    if (!this.isPlaying || !this.isEnabled || this.pausedForRecording) return;
    const ctx = this.ctx;
    const padBus = this.padBus;
    if (!ctx || !padBus) return;

    const phrase = EMOTIONAL_PROGRESSION[this.phraseIndex % EMOTIONAL_PROGRESSION.length];
    const now = ctx.currentTime;
    const attackSec = 2.8;
    const holdSec = 2.6;
    const releaseSec = 4.2;
    const totalSec = attackSec + holdSec + releaseSec;

    const padFilter = ctx.createBiquadFilter();
    padFilter.type = 'lowpass';
    padFilter.frequency.setValueAtTime(280, now);
    padFilter.frequency.linearRampToValueAtTime(420, now + attackSec);
    padFilter.frequency.linearRampToValueAtTime(270, now + totalSec);
    padFilter.Q.value = 0.35;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, now);
    env.gain.linearRampToValueAtTime(0.34, now + attackSec);
    env.gain.setValueAtTime(0.31, now + attackSec + holdSec);
    env.gain.linearRampToValueAtTime(0.0001, now + totalSec);

    padFilter.connect(env);
    env.connect(padBus);

    phrase.padFreqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.detune.value = idx % 2 === 0 ? -2.2 : 2.2;

      const g = ctx.createGain();
      g.gain.value = idx === 0 ? 0.3 : 0.17;

      osc.connect(g);
      g.connect(padFilter);
      osc.start(now);
      osc.stop(now + totalSec + 0.1);
      this.activeSources.push(osc);
    });

    const nextTimer = window.setTimeout(() => {
      this.phraseIndex = (this.phraseIndex + 1) % EMOTIONAL_PROGRESSION.length;
      this.noteStep = 0;
      this.schedulePianoPadPhrase();
    }, 7600);
    this.activeTimers.push(nextTimer);
  }

  private scheduleExpressiveStringNote(): void {
    if (!this.isPlaying || !this.isEnabled || this.pausedForRecording) return;
    const ctx = this.ctx;
    const stringsBus = this.stringsBus;
    if (!ctx || !stringsBus) return;

    const phrase = EMOTIONAL_PROGRESSION[this.phraseIndex % EMOTIONAL_PROGRESSION.length];
    const spec = phrase.soloNotes[this.noteStep % phrase.soloNotes.length];
    this.noteStep += 1;

    const now = ctx.currentTime;
    const dur = 3.6;

    // Warm bowed string pair: smooth sine core + soft filtered sawtooth harmonic body
    const oscSine = ctx.createOscillator();
    oscSine.type = 'sine';
    oscSine.frequency.setValueAtTime(spec.freq * 0.985, now); // Subtle expressive slide-in
    oscSine.frequency.exponentialRampToValueAtTime(spec.freq, now + 0.42);

    const oscBody = ctx.createOscillator();
    oscBody.type = 'triangle';
    oscBody.frequency.setValueAtTime(spec.freq * 0.985, now);
    oscBody.frequency.exponentialRampToValueAtTime(spec.freq, now + 0.42);

    // Delayed singing human vibrato (swells in after bow settles)
    const vibLfo = ctx.createOscillator();
    vibLfo.type = 'sine';
    vibLfo.frequency.value = spec.isCello ? 4.2 : 4.8;
    const vibDepth = ctx.createGain();
    vibDepth.gain.setValueAtTime(0.0, now);
    vibDepth.gain.linearRampToValueAtTime(spec.isCello ? 3.5 : 5.2, now + 1.1);
    vibLfo.connect(vibDepth);
    vibDepth.connect(oscSine.detune);
    vibDepth.connect(oscBody.detune);

    // Formant-like warm string body filter
    const stringFilter = ctx.createBiquadFilter();
    stringFilter.type = 'lowpass';
    stringFilter.frequency.setValueAtTime(spec.isCello ? 540 : 880, now);
    stringFilter.frequency.linearRampToValueAtTime(spec.isCello ? 760 : 1180, now + 1.1);
    stringFilter.frequency.linearRampToValueAtTime(spec.isCello ? 480 : 720, now + dur);
    stringFilter.Q.value = 0.55;

    const sineGain = ctx.createGain();
    sineGain.gain.value = 0.28;
    const bodyGain = ctx.createGain();
    bodyGain.gain.value = 0.14;

    // Expressive slow bow swell envelope (0.85s attack, singing sustain, 1.6s tail)
    const noteEnv = ctx.createGain();
    noteEnv.gain.setValueAtTime(0.0001, now);
    noteEnv.gain.linearRampToValueAtTime(0.36, now + 0.85);
    noteEnv.gain.setValueAtTime(0.32, now + 1.75);
    noteEnv.gain.linearRampToValueAtTime(0.0001, now + dur);

    oscSine.connect(sineGain);
    oscBody.connect(bodyGain);
    sineGain.connect(stringFilter);
    bodyGain.connect(stringFilter);
    stringFilter.connect(noteEnv);
    noteEnv.connect(stringsBus);

    oscSine.start(now);
    oscBody.start(now);
    vibLfo.start(now);
    oscSine.stop(now + dur + 0.1);
    oscBody.stop(now + dur + 0.1);
    vibLfo.stop(now + dur + 0.1);

    this.activeSources.push(oscSine, oscBody, vibLfo);
    if (this.activeSources.length > 64) {
      this.activeSources = this.activeSources.slice(-36);
    }

    const nextTimer = window.setTimeout(() => {
      this.scheduleExpressiveStringNote();
    }, 1900);
    this.activeTimers.push(nextTimer);
  }

  public start(): void {
    if (!this.isEnabled || this.pausedForRecording) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    if (this.isPlaying) return;
    this.isPlaying = true;
    this.phraseIndex = 0;
    this.noteStep = 0;

    this.schedulePianoPadPhrase();
    const firstStringTimer = window.setTimeout(() => {
      this.scheduleExpressiveStringNote();
    }, 650);
    this.activeTimers.push(firstStringTimer);

    // Smooth fade-in to gentle 15% soothing volume
    this.masterGain.gain.cancelScheduledValues(ctx.currentTime);
    this.masterGain.gain.setValueAtTime(Math.max(0.0001, this.masterGain.gain.value), ctx.currentTime);
    this.masterGain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 2.0);
  }

  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (!enabled) {
      this.stop();
    } else if (!this.pausedForRecording) {
      this.start();
    }
  }

  /**
   * Immediately pauses speaker audio while recording video so zero tune bleeds into the mic.
   */
  public pauseForRecording(): void {
    this.pausedForRecording = true;
    this.stop();
  }

  /**
   * Restores the soulful violin/cello & piano pad cleanly after video recording finishes.
   */
  public resumeAfterRecording(): void {
    this.pausedForRecording = false;
    if (this.isEnabled) {
      this.start();
    }
  }

  public stop(): void {
    this.isPlaying = false;
    this.activeTimers.forEach((id) => window.clearTimeout(id));
    this.activeTimers = [];

    const ctx = this.ctx;
    if (ctx && this.masterGain) {
      this.masterGain.gain.cancelScheduledValues(ctx.currentTime);
      this.masterGain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.05);
    }

    const sourcesToStop = this.activeSources;
    this.activeSources = [];
    const stopAt = ctx ? ctx.currentTime + 0.18 : 0;
    sourcesToStop.forEach((src) => {
      try {
        src.stop(stopAt);
      } catch {
        // already stopped
      }
    });
  }
}

export const sufiTune = new SoulfulStringsEngine();
