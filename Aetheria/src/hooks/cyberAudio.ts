export type CyberTone = 'hover' | 'click' | 'sky' | 'scroll';

export function createCyberAudio() {
  let context: AudioContext | null = null;
  let master: GainNode | null = null;
  let compressor: DynamicsCompressorNode | null = null;
  let noise: AudioBuffer | null = null;
  let enabled = false;
  let disposed = false;
  let version = 0;
  const voices = new Set<AudioScheduledSourceNode>();
  const lastPlayed: Record<CyberTone, number> = {
    hover: -Infinity, click: -Infinity, sky: -Infinity, scroll: -Infinity
  };

  const silence = () => {
    voices.forEach((voice) => {
      try {
        voice.stop();
      } catch {
        // Already stopped.
      }
    });
  };

  const play = (kind: CyberTone, value = 0.5) => {
    const ctx = context;
    const output = master;
    if (!enabled || disposed || document.hidden || !ctx || !output || ctx.state !== 'running') return;

    const now = ctx.currentTime;
    const intensity = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0.5;
    const interval = { hover: 0.22, click: 0.065, sky: 0.24, scroll: 0.14 }[kind];
    if (now - lastPlayed[kind] < interval || voices.size > 15) return;
    if (kind === 'scroll' && intensity < 0.12) return;
    lastPlayed[kind] = now;

    const spawn = (
      source: AudioScheduledSourceNode,
      duration: number,
      peak: number,
      cutoff: number,
      delay = 0
    ) => {
      const start = now + delay;
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      filter.type = kind === 'scroll' ? 'bandpass' : 'lowpass';
      filter.Q.value = kind === 'scroll' ? 0.65 : 0.7;
      filter.frequency.setValueAtTime(cutoff, start);
      filter.frequency.exponentialRampToValueAtTime(Math.max(90, cutoff * 0.45), start + duration);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(peak, start + Math.min(0.025, duration * 0.15));
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(output);
      voices.add(source);
      source.onended = () => {
        voices.delete(source);
        source.disconnect();
        filter.disconnect();
        gain.disconnect();
      };
      source.start(start);
      source.stop(start + duration + 0.025);
    };

    if (kind === 'scroll') {
      if (!noise) {
        noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
        const data = noise.getChannelData(0);
        let previous = 0;
        for (let i = 0; i < data.length; i += 1) {
          previous = (previous + (Math.random() * 2 - 1) * 0.12) / 1.12;
          data[i] = previous * 2.2;
        }
      }
      const source = ctx.createBufferSource();
      source.buffer = noise;
      source.playbackRate.value = 0.8 + intensity * 0.8;
      spawn(source, 0.26, 0.035 + intensity * 0.12, 450 + intensity * 2100);
      return;
    }

    if (kind === 'click') {
      const source = ctx.createOscillator();
      source.type = 'sine';
      source.frequency.setValueAtTime(1150, now);
      source.frequency.exponentialRampToValueAtTime(180, now + 0.075);
      spawn(source, 0.1, 0.13, 2200);
      return;
    }

    const root = kind === 'sky' ? 98 + intensity * 98 : 392;
    const ratios = kind === 'sky' ? [1, 1.5, 2] : [1, 1.25, 1.5];
    ratios.forEach((ratio, index) => {
      const oscillator = ctx.createOscillator();
      const delay = index * 0.012;
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(root * ratio, now + delay);
      oscillator.detune.setValueAtTime(index === 1 ? 3 : -2, now + delay);
      spawn(
        oscillator,
        kind === 'sky' ? 0.85 : 0.34,
        (kind === 'sky' ? 0.065 : 0.04) / (1 + index * 0.3),
        2000,
        delay
      );
    });
  };

  return {
    play,
    async setEnabled(next: boolean): Promise<boolean> {
      const request = ++version;
      enabled = false;
      silence();
      if (!next || disposed) {
        if (context?.state === 'running') await context.suspend().catch(() => {});
        return false;
      }
      try {
        if (!context) {
          context = new AudioContext();
          master = context.createGain();
          master.gain.value = 0.24;
          compressor = context.createDynamicsCompressor();
          compressor.threshold.value = -22;
          compressor.knee.value = 18;
          compressor.ratio.value = 5;
          compressor.attack.value = 0.003;
          compressor.release.value = 0.18;
          master.connect(compressor);
          compressor.connect(context.destination);
        }
        const ctx = context;
        await ctx.resume();
        if (disposed || request !== version) return false;
        enabled = ctx.state === 'running';
        if (document.hidden) await ctx.suspend().catch(() => {});
        else if (enabled) play('click');
        return enabled;
      } catch {
        return false;
      }
    },
    suspend() {
      silence();
      if (context?.state === 'running') void context.suspend().catch(() => {});
    },
    resume() {
      if (enabled && !disposed && !document.hidden && context?.state === 'suspended') {
        void context.resume().catch(() => {});
      }
    },
    dispose() {
      disposed = true;
      enabled = false;
      version += 1;
      silence();
      voices.clear();
      if (context && context.state !== 'closed') void context.close().catch(() => {});
      master?.disconnect();
      compressor?.disconnect();
      context = null;
      master = null;
      compressor = null;
      noise = null;
    }
  };
}
