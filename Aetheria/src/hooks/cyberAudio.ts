export type CyberTone =
  | 'hover'
  | 'click'
  | 'sky'
  | 'scroll'
  | 'footstep'
  | 'jump'
  | 'land'
  | 'portal'
  | 'interact'
  | 'warp';

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
    interact: -Infinity,
    warp: -Infinity
  };

  let ambientDroneGain: GainNode | null = null;
  let ambientDroneOscs: OscillatorNode[] = [];

  let bgmAudio: HTMLAudioElement | null = null;
  let bgmSource: MediaElementAudioSourceNode | null = null;
  let bgmGain: GainNode | null = null;
  let bgmActive = false;

  const silence = () => {
    voices.forEach((voice) => {
      try {
        voice.stop();
      } catch {
        // Already stopped.
      }
    });
  };

  const getNoiseBuffer = (ctx: AudioContext): AudioBuffer => {
    if (!noise) {
      noise = ctx.createBuffer(1, Math.round(ctx.sampleRate * 2.5), ctx.sampleRate);
      const data = noise.getChannelData(0);
      let previous = 0;
      for (let i = 0; i < data.length; i += 1) {
        previous = (previous + (Math.random() * 2 - 1) * 0.14) / 1.14;
        data[i] = previous * 2.6;
      }
    }
    return noise;
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
      droneGain.gain.exponentialRampToValueAtTime(0.06, ctx.currentTime + 2.5);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(260, ctx.currentTime);

      const osc1 = ctx.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(73.42, ctx.currentTime); // D2 note (73.4 Hz)

      const osc2 = ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(110.0, ctx.currentTime); // A2 fifth (110 Hz)

      const osc3 = ctx.createOscillator();
      osc3.type = 'triangle';
      osc3.frequency.setValueAtTime(146.83, ctx.currentTime); // D3 octave (146.8 Hz)

      osc1.connect(filter);
      osc2.connect(filter);
      osc3.connect(filter);
      filter.connect(droneGain);
      droneGain.connect(master);

      osc1.start();
      osc2.start();
      osc3.start();

      ambientDroneGain = droneGain;
      ambientDroneOscs = [osc1, osc2, osc3];
    } catch (_) {}
  };

  const startBGM = (url = '/audio/aetheria-ambient.mp3') => {
    bgmActive = true;
    if (!enabled || disposed) return;
    try {
      if (!bgmAudio && typeof Audio !== 'undefined') {
        bgmAudio = new Audio(url);
        bgmAudio.loop = true;
        bgmAudio.preload = 'auto';
        bgmAudio.crossOrigin = 'anonymous';
      }
      if (!bgmAudio) return;

      if (context && master && !bgmSource) {
        try {
          if (!bgmGain) {
            bgmGain = context.createGain();
            bgmGain.gain.setValueAtTime(0.001, context.currentTime);
            bgmGain.connect(master);
          }
          bgmSource = context.createMediaElementSource(bgmAudio);
          bgmSource.connect(bgmGain);
        } catch {
          // Fallback: direct element volume control
        }
      }

      if (bgmGain && context && context.state === 'running') {
        bgmGain.gain.cancelScheduledValues(context.currentTime);
        bgmGain.gain.setValueAtTime(Math.max(0.001, bgmGain.gain.value), context.currentTime);
        bgmGain.gain.exponentialRampToValueAtTime(0.35, context.currentTime + 2.0);
      } else {
        bgmAudio.volume = 0.35;
      }

      void bgmAudio.play().catch(() => {
        // Fallback to procedural synth drone if audio element fails to play
        startAmbient3D();
      });
    } catch {
      startAmbient3D();
    }
  };

  const stopBGM = () => {
    bgmActive = false;
    stopAmbient3D();
    if (!bgmAudio) return;
    try {
      if (bgmGain && context && context.state === 'running') {
        bgmGain.gain.cancelScheduledValues(context.currentTime);
        bgmGain.gain.setValueAtTime(Math.max(0.0001, bgmGain.gain.value), context.currentTime);
        bgmGain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 1.2);
        setTimeout(() => {
          if (!bgmActive && bgmAudio) {
            bgmAudio.pause();
          }
        }, 1300);
      } else {
        bgmAudio.pause();
      }
    } catch {
      bgmAudio.pause();
    }
  };

  const play = (kind: CyberTone, value = 0.5) => {
    const ctx = context;
    const output = master;
    if (!enabled || disposed || document.hidden || !ctx || !output || ctx.state !== 'running') return;

    const now = ctx.currentTime;
    const intensity = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0.5;
    const interval: Record<CyberTone, number> = {
      hover: 0.18,
      click: 0.065,
      sky: 0.24,
      scroll: 0.14,
      footstep: 0.18,
      jump: 0.25,
      land: 0.25,
      portal: 0.8,
      interact: 0.3,
      warp: 1.6
    };

    if (now - lastPlayed[kind] < interval[kind] || voices.size > 24) return;
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
      const source = ctx.createBufferSource();
      source.buffer = getNoiseBuffer(ctx);
      source.playbackRate.value = 0.8 + intensity * 0.8;
      spawn(source, 0.26, 0.045 + intensity * 0.14, 500 + intensity * 2400);
      return;
    }

    if (kind === 'click') {
      const source = ctx.createOscillator();
      source.type = 'sine';
      source.frequency.setValueAtTime(1200, now);
      source.frequency.exponentialRampToValueAtTime(220, now + 0.075);
      spawn(source, 0.1, 0.18, 2600);
      return;
    }

    if (kind === 'warp') {
      // 1. Deep gravitational suction sub-sweep
      const subOsc = ctx.createOscillator();
      subOsc.type = 'sawtooth';
      subOsc.frequency.setValueAtTime(160, now);
      subOsc.frequency.exponentialRampToValueAtTime(36, now + 1.6);
      spawn(subOsc, 1.7, 0.28, 480);

      // 2. High-speed particle acceleration noise sweep
      const noiseSrc = ctx.createBufferSource();
      noiseSrc.buffer = getNoiseBuffer(ctx);
      noiseSrc.playbackRate.value = 1.0;
      const noiseGain = ctx.createGain();
      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.Q.value = 2.4;
      noiseFilter.frequency.setValueAtTime(220, now);
      noiseFilter.frequency.exponentialRampToValueAtTime(3400, now + 1.2);
      noiseFilter.frequency.exponentialRampToValueAtTime(320, now + 1.75);

      noiseGain.gain.setValueAtTime(0.001, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.32, now + 1.1);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.75);

      noiseSrc.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(output);
      voices.add(noiseSrc);
      noiseSrc.onended = () => {
        voices.delete(noiseSrc);
        noiseSrc.disconnect();
        noiseFilter.disconnect();
        noiseGain.disconnect();
      };
      noiseSrc.start(now);
      noiseSrc.stop(now + 1.8);

      // 3. Ethereal dimensional distortion chord (A3, C#4, E4, A4)
      [220, 277.18, 329.63, 440].forEach((freq, idx) => {
        const chordOsc = ctx.createOscillator();
        chordOsc.type = 'sine';
        chordOsc.frequency.setValueAtTime(freq, now + 0.3 + idx * 0.08);
        chordOsc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + 1.6);
        spawn(chordOsc, 1.4, 0.12, 2400, 0.3 + idx * 0.08);
      });
      return;
    }

    if (kind === 'footstep') {
      const stepPitch = 140 + Math.random() * 30;
      // Layer 1: Ground low-mid punch (clearly audible on laptop/phone speakers)
      const source = ctx.createOscillator();
      source.type = 'triangle';
      source.frequency.setValueAtTime(stepPitch, now);
      source.frequency.exponentialRampToValueAtTime(45, now + 0.065);
      spawn(source, 0.07, 0.16, 500);

      // Layer 2: Texture surface crunch (bandpass noise)
      const noiseSrc = ctx.createBufferSource();
      noiseSrc.buffer = getNoiseBuffer(ctx);
      noiseSrc.playbackRate.value = 0.9 + Math.random() * 0.3;
      const nGain = ctx.createGain();
      const nFilter = ctx.createBiquadFilter();
      nFilter.type = 'bandpass';
      nFilter.Q.value = 1.6;
      nFilter.frequency.setValueAtTime(1100 + Math.random() * 300, now);
      nGain.gain.setValueAtTime(0.001, now);
      nGain.gain.linearRampToValueAtTime(0.12, now + 0.012);
      nGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.055);
      noiseSrc.connect(nFilter);
      nFilter.connect(nGain);
      nGain.connect(output);
      voices.add(noiseSrc);
      noiseSrc.onended = () => {
        voices.delete(noiseSrc);
        noiseSrc.disconnect();
        nFilter.disconnect();
        nGain.disconnect();
      };
      noiseSrc.start(now);
      noiseSrc.stop(now + 0.06);
      return;
    }

    if (kind === 'jump') {
      // 1. Aerodynamic ascending whoosh
      const noiseSrc = ctx.createBufferSource();
      noiseSrc.buffer = getNoiseBuffer(ctx);
      noiseSrc.playbackRate.value = 1.3;
      const nGain = ctx.createGain();
      const nFilter = ctx.createBiquadFilter();
      nFilter.type = 'bandpass';
      nFilter.Q.value = 2.0;
      nFilter.frequency.setValueAtTime(280, now);
      nFilter.frequency.exponentialRampToValueAtTime(1400, now + 0.18);
      nGain.gain.setValueAtTime(0.001, now);
      nGain.gain.linearRampToValueAtTime(0.20, now + 0.04);
      nGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
      noiseSrc.connect(nFilter);
      nFilter.connect(nGain);
      nGain.connect(output);
      voices.add(noiseSrc);
      noiseSrc.onended = () => {
        voices.delete(noiseSrc);
        noiseSrc.disconnect();
        nFilter.disconnect();
        nGain.disconnect();
      };
      noiseSrc.start(now);
      noiseSrc.stop(now + 0.19);

      // 2. Rising impulse tone
      const source = ctx.createOscillator();
      source.type = 'sine';
      source.frequency.setValueAtTime(240, now);
      source.frequency.exponentialRampToValueAtTime(720, now + 0.16);
      spawn(source, 0.18, 0.18, 1600);
      return;
    }

    if (kind === 'land') {
      // Solid landing thud + surface rustle
      const source = ctx.createOscillator();
      source.type = 'triangle';
      source.frequency.setValueAtTime(180, now);
      source.frequency.exponentialRampToValueAtTime(50, now + 0.12);
      spawn(source, 0.14, 0.26, 600);

      const noiseSrc = ctx.createBufferSource();
      noiseSrc.buffer = getNoiseBuffer(ctx);
      const nGain = ctx.createGain();
      const nFilter = ctx.createBiquadFilter();
      nFilter.type = 'lowpass';
      nFilter.frequency.setValueAtTime(800, now);
      nFilter.frequency.exponentialRampToValueAtTime(200, now + 0.1);
      nGain.gain.setValueAtTime(0.001, now);
      nGain.gain.linearRampToValueAtTime(0.18, now + 0.02);
      nGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);
      noiseSrc.connect(nFilter);
      nFilter.connect(nGain);
      nGain.connect(output);
      voices.add(noiseSrc);
      noiseSrc.onended = () => {
        voices.delete(noiseSrc);
        noiseSrc.disconnect();
        nFilter.disconnect();
        nGain.disconnect();
      };
      noiseSrc.start(now);
      noiseSrc.stop(now + 0.12);
      return;
    }

    if (kind === 'interact') {
      [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.038);
        spawn(osc, 0.38, 0.14, 3200, idx * 0.038);
      });
      return;
    }

    if (kind === 'portal') {
      [220, 329.63, 440, 554.37, 659.25].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.04);
        spawn(osc, 1.2, 0.18, 2200, idx * 0.04);
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
    startBGM,
    stopBGM,
    isBGMPlaying(): boolean {
      return bgmActive;
    },
    isEnabled(): boolean {
      return enabled;
    },
    async setEnabled(next: boolean): Promise<boolean> {
      const request = ++version;
      enabled = false;
      silence();
      if (!next || disposed) {
        stopBGM();
        stopAmbient3D();
        if (context?.state === 'running') await context.suspend().catch(() => {});
        return false;
      }
      try {
        if (!context) {
          context = new AudioContext();
          master = context.createGain();
          master.gain.value = 0.42;
          compressor = context.createDynamicsCompressor();
          compressor.threshold.value = -18;
          compressor.knee.value = 16;
          compressor.ratio.value = 4;
          compressor.attack.value = 0.003;
          compressor.release.value = 0.18;
          master.connect(compressor);
          compressor.connect(context.destination);
        }
        const ctx = context;
        await ctx.resume();
        if (disposed || request !== version) return false;
        enabled = ctx.state === 'running';
        if (document.hidden) {
          await ctx.suspend().catch(() => {});
        } else if (enabled) {
          if (bgmActive) {
            startBGM();
          }
          play('click');
        }
        return enabled;
      } catch {
        return false;
      }
    },
    suspend() {
      silence();
      stopBGM();
      stopAmbient3D();
      if (context?.state === 'running') void context.suspend().catch(() => {});
    },
    resume() {
      if (enabled && !disposed && !document.hidden) {
        if (context?.state === 'suspended') {
          void context.resume().catch(() => {});
        }
        if (bgmActive && bgmAudio && bgmAudio.paused) {
          void bgmAudio.play().catch(() => {});
        }
      }
    },
    dispose() {
      disposed = true;
      enabled = false;
      bgmActive = false;
      version += 1;
      silence();
      stopBGM();
      stopAmbient3D();
      voices.clear();
      if (bgmAudio) {
        bgmAudio.pause();
        bgmAudio = null;
      }
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
