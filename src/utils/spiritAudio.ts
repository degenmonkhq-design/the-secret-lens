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
