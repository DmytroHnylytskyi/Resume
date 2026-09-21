export type CyberTone =
  | 'hover'
  | 'click'
  | 'sky'
  | 'scroll'
  | 'footstep'
  | 'jump'
  | 'land'
  | 'portal'
  | 'interact';

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
    hover: -Infinity,
    click: -Infinity,
    sky: -Infinity,
    scroll: -Infinity,
    footstep: -Infinity,
    jump: -Infinity,
    land: -Infinity,
    portal: -Infinity,
    interact: -Infinity
  };

  let ambientDroneGain: GainNode | null = null;
  let ambientDroneOscs: OscillatorNode[] = [];

  const silence = () => {
    voices.forEach((voice) => {
      try {
        voice.stop();
      } catch {
        // Already stopped.
      }
    });
  };

  const stopAmbient3D = () => {
    if (!ambientDroneGain || !context) return;
    try {
      const ctx = context;
      const gain = ambientDroneGain;
      const oscs = ambientDroneOscs;
      ambientDroneGain = null;
      ambientDroneOscs = [];
      gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.2);
      setTimeout(() => {
        oscs.forEach((osc) => {
          try {
            osc.stop();
            osc.disconnect();
          } catch (_) {}
        });
        try {
          gain.disconnect();
        } catch (_) {}
      }, 1300);
    } catch (_) {}
  };

  const startAmbient3D = () => {
    if (!context || !master || !enabled || disposed || ambientDroneGain) return;
    try {
      const ctx = context;
      const droneGain = ctx.createGain();
      droneGain.gain.setValueAtTime(0.0001, ctx.currentTime);
      droneGain.gain.exponentialRampToValueAtTime(0.032, ctx.currentTime + 2.5);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(180, ctx.currentTime);

      const osc1 = ctx.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(55, ctx.currentTime); // A1 note (55 Hz)

      const osc2 = ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(82.41, ctx.currentTime); // E2 fifth (82.4 Hz)

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(droneGain);
      droneGain.connect(master);

      osc1.start();
      osc2.start();

      ambientDroneGain = droneGain;
      ambientDroneOscs = [osc1, osc2];
    } catch (_) {}
  };

  const play = (kind: CyberTone, value = 0.5) => {
    const ctx = context;
    const output = master;
    if (!enabled || disposed || document.hidden || !ctx || !output || ctx.state !== 'running') return;

    const now = ctx.currentTime;
    const intensity = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0.5;
    const interval: Record<CyberTone, number> = {
      hover: 0.22,
      click: 0.065,
      sky: 0.24,
      scroll: 0.14,
      footstep: 0.3,
      jump: 0.25,
      land: 0.25,
      portal: 0.75,
      interact: 0.3
    };

    if (now - lastPlayed[kind] < interval[kind] || voices.size > 18) return;
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

    if (kind === 'footstep') {
      const source = ctx.createOscillator();
      source.type = 'sine';
      const pitch = 95 + Math.random() * 25;
      source.frequency.setValueAtTime(pitch, now);
      source.frequency.exponentialRampToValueAtTime(32, now + 0.055);
      spawn(source, 0.06, 0.03, 420);
      return;
    }

    if (kind === 'jump') {
      const source = ctx.createOscillator();
      source.type = 'sine';
      source.frequency.setValueAtTime(170, now);
      source.frequency.exponentialRampToValueAtTime(460, now + 0.14);
      spawn(source, 0.16, 0.055, 1100);
      return;
    }

    if (kind === 'land') {
      const source = ctx.createOscillator();
      source.type = 'sine';
      source.frequency.setValueAtTime(125, now);
      source.frequency.exponentialRampToValueAtTime(30, now + 0.08);
      spawn(source, 0.1, 0.045, 450);
      return;
    }

    if (kind === 'interact') {
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.032);
        spawn(osc, 0.32, 0.035, 2800, idx * 0.032);
      });
      return;
    }

    if (kind === 'portal') {
      [220, 329.63, 440].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.04);
        spawn(osc, 0.65, 0.025, 1600, idx * 0.04);
      });
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
    startAmbient3D,
    stopAmbient3D,
    isEnabled(): boolean {
      return enabled;
    },
    async setEnabled(next: boolean): Promise<boolean> {
      const request = ++version;
      enabled = false;
      silence();
      if (!next || disposed) {
        stopAmbient3D();
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
      stopAmbient3D();
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
      stopAmbient3D();
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

let globalCyberAudio: ReturnType<typeof createCyberAudio> | null = null;

export function getGlobalCyberAudio() {
  if (!globalCyberAudio) {
    globalCyberAudio = createCyberAudio();
  }
  return globalCyberAudio;
}
