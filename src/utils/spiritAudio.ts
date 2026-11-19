/**
 * Spatial "Spirit Echo" Web Audio DSP engine.
 * Routes an HTMLAudioElement through a gentle feedback delay + warm low-pass filter
 * and subtle stereo panner to create an ethereal atmospheric whisper effect.
 */

interface ConnectedGraph {
  ctx: AudioContext;
  panner: StereoPannerNode | null;
}

const connectedElements = new WeakMap<HTMLAudioElement, ConnectedGraph>();

export function attachSpiritEcho(audioEl: HTMLAudioElement, pan = 0): void {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const existing = connectedElements.get(audioEl);
    if (existing) {
      if (existing.ctx.state === 'suspended') {
        existing.ctx.resume().catch(() => {});
      }
      if (existing.panner) {
        existing.panner.pan.value = Math.max(-0.85, Math.min(0.85, pan));
      }
      return;
    }

    const ctx = new AudioCtx();
    const source = ctx.createMediaElementSource(audioEl);

    const dryGain = ctx.createGain();
    dryGain.gain.value = 0.88;

    const delay = ctx.createDelay(1.0);
    delay.delayTime.value = 0.24;

    const feedback = ctx.createGain();
    feedback.gain.value = 0.36;

    const wetFilter = ctx.createBiquadFilter();
    wetFilter.type = 'lowpass';
    wetFilter.frequency.value = 1850;

    const wetGain = ctx.createGain();
    wetGain.gain.value = 0.42;

    let panner: StereoPannerNode | null = null;
    if (typeof ctx.createStereoPanner === 'function') {
      panner = ctx.createStereoPanner();
      panner.pan.value = Math.max(-0.85, Math.min(0.85, pan));
    }

    const outNode: AudioNode = panner || ctx.destination;
    if (panner) {
      panner.connect(ctx.destination);
    }

    // Dry path
    source.connect(dryGain);
    dryGain.connect(outNode);

    // Ethereal Spirit Echo feedback loop
    source.connect(delay);
    delay.connect(wetFilter);
    wetFilter.connect(feedback);
    feedback.connect(delay);
    wetFilter.connect(wetGain);
    wetGain.connect(outNode);

    connectedElements.set(audioEl, { ctx, panner });

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
  } catch {
    // Graceful fallback: HTMLAudioElement plays normally without DSP graph
  }
}

let templeChimeCtx: AudioContext | null = null;
let lastChimeTime = 0;

/**
 * Soft, serene harmonic temple-bell & celestial shimmer triggered ONLY
 * when a VIP Royal Eternal memory reveals (never attached to button clicks).
 */
export function playDivineTempleChime(): void {
  const nowMs = Date.now();
  if (nowMs - lastChimeTime < 2200) return;
  lastChimeTime = nowMs;

  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    if (!templeChimeCtx) {
      templeChimeCtx = new AudioCtx();
    }
    const ctx = templeChimeCtx;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const master = ctx.createGain();
    master.gain.value = 0.085;
    master.connect(ctx.destination);

    // Sacred warm overtones (C5 -> E5 -> G5 -> B5 -> C6)
    const freqs = [523.25, 659.25, 783.99, 987.77, 1046.5];
    const now = ctx.currentTime;

    freqs.forEach((f, idx) => {
      const start = now + idx * 0.14;
      const osc = ctx.createOscillator();
      const oscOver = ctx.createOscillator();
      osc.type = 'sine';
      oscOver.type = 'sine';
      osc.frequency.value = f;
      oscOver.frequency.value = f * 2.003;

      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, start);
      g.gain.exponentialRampToValueAtTime(0.28 / (1 + idx * 0.18), start + 0.045);
      g.gain.exponentialRampToValueAtTime(0.0001, start + 2.7);

      const gOver = ctx.createGain();
      gOver.gain.setValueAtTime(0.0001, start);
      gOver.gain.exponentialRampToValueAtTime(0.06, start + 0.03);
      gOver.gain.exponentialRampToValueAtTime(0.0001, start + 1.3);

      osc.connect(g);
      oscOver.connect(gOver);
      g.connect(master);
      gOver.connect(master);

      osc.start(start);
      oscOver.start(start);
      osc.stop(start + 2.8);
      oscOver.stop(start + 1.5);
    });
  } catch {
    // Graceful no-op if audio is blocked
  }
}
