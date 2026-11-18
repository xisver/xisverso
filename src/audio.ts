import type { BiomeId } from './domain/game';

type Sound =
  'pet' | 'feed' | 'clean' | 'rest' | 'success' | 'tap' | 'travel' | 'collect' | 'purchase';
export interface AudioSettings {
  music: boolean;
  effects: boolean;
  musicVolume: number;
  effectsVolume: number;
}
const KEY = 'xisverso.audio.v1';
const defaults: AudioSettings = {
  music: true,
  effects: true,
  musicVolume: 0.25,
  effectsVolume: 0.45,
};
const scales: Record<BiomeId, number[]> = {
  forest: [48, 55, 60, 64, 67, 72, 76, 79],
  coast: [50, 57, 62, 65, 69, 74, 77, 81],
  tundra: [45, 52, 57, 60, 64, 69, 72, 76],
};

/** Original, procedural music: no downloads, samples or external audio services. */
export function createAudio() {
  let settings = { ...defaults };
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (saved && typeof saved === 'object') {
      const data = saved as Record<string, unknown>;
      for (const key of ['music', 'effects'] as const)
        if (typeof data[key] === 'boolean') settings[key] = data[key];
      for (const key of ['musicVolume', 'effectsVolume'] as const)
        if (typeof data[key] === 'number' && Number.isFinite(data[key]))
          settings[key] = Math.min(1, Math.max(0, data[key]));
    }
  } catch {
    /* Audio is optional when storage is unavailable. */
  }
  let context: AudioContext | undefined;
  let musicBus: GainNode | undefined;
  let effectsBus: GainNode | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let biome: BiomeId = 'forest';
  let beat = 0;
  let unlocked = false;
  let disposed = false;
  const voices = new Set<OscillatorNode>();

  function tone(
    midi: number,
    duration: number,
    volume: number,
    bus: GainNode,
    delay = 0,
    type: OscillatorType = 'sine',
  ) {
    if (!context || disposed) return;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    const at = context.currentTime + delay;
    oscillator.type = type;
    oscillator.frequency.value = 440 * 2 ** ((midi - 69) / 12);
    envelope.gain.setValueAtTime(0, at);
    envelope.gain.linearRampToValueAtTime(volume, at + Math.min(0.3, duration / 4));
    envelope.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    oscillator.connect(envelope).connect(bus);
    oscillator.start(at);
    oscillator.stop(at + duration + 0.04);
    voices.add(oscillator);
    oscillator.onended = () => {
      voices.delete(oscillator);
      oscillator.disconnect();
      envelope.disconnect();
    };
  }
  function mix() {
    if (!context) return;
    musicBus?.gain.setTargetAtTime(
      settings.music ? settings.musicVolume * 0.24 : 0,
      context.currentTime,
      0.12,
    );
    effectsBus?.gain.setTargetAtTime(
      settings.effects ? settings.effectsVolume * 0.35 : 0,
      context.currentTime,
      0.02,
    );
  }
  function schedule() {
    clearTimeout(timer);
    timer = undefined;
    if (!context || !musicBus || !settings.music || document.hidden || disposed || !unlocked)
      return;
    const notes = scales[biome];
    // Slow suspended chords and a sparse pentatonic melody leave room for the world.
    if (beat % 4 === 0) {
      const chord = Math.floor(beat / 4) % 3;
      for (const offset of [0, 2, 4])
        tone(notes[(chord + offset) % notes.length] - 12, 8, 0.11, musicBus);
    }
    const melody = [4, 6, 3, 5, 7, 4, 2, 5, 6, 3, 4, 1];
    if (beat % 3 !== 2) tone(notes[melody[beat % melody.length]], 3.2, 0.18, musicBus);
    beat++;
    timer = setTimeout(schedule, 1900);
  }
  async function unlock() {
    if (disposed || document.hidden) return;
    try {
      if (!context) {
        context = new AudioContext();
        musicBus = context.createGain();
        effectsBus = context.createGain();
        musicBus.connect(context.destination);
        effectsBus.connect(context.destination);
        mix();
      }
      await context.resume();
      unlocked = true;
      if (!timer) schedule();
    } catch {
      /* A browser may require another direct user gesture. */
    }
  }
  function visibility() {
    if (document.hidden) {
      clearTimeout(timer);
      timer = undefined;
      void context?.suspend().catch(() => {});
    } else if (unlocked) void unlock();
  }
  document.addEventListener('pointerdown', unlock);
  document.addEventListener('keydown', unlock);
  document.addEventListener('visibilitychange', visibility);
  return {
    getSettings: () => ({ ...settings }),
    update(next: Partial<AudioSettings>) {
      settings = { ...settings, ...next };
      settings.musicVolume = Math.min(1, Math.max(0, settings.musicVolume));
      settings.effectsVolume = Math.min(1, Math.max(0, settings.effectsVolume));
      try {
        localStorage.setItem(KEY, JSON.stringify(settings));
      } catch {
        /* Keep session settings. */
      }
      mix();
      clearTimeout(timer);
      timer = undefined;
      if (settings.music) {
        void unlock();
      }
    },
    setBiome(next: BiomeId) {
      biome = next;
    },
    play(sound: Sound) {
      if (!context || !effectsBus || !settings.effects || document.hidden) return;
      const patterns: Record<Sound, number[]> = {
        pet: [76, 79],
        feed: [60, 64, 67],
        clean: [84, 88, 91],
        rest: [67, 64, 60],
        success: [72, 76, 79, 84],
        tap: [79],
        travel: [60, 67, 74],
        collect: [81, 88],
        purchase: [67, 72, 76, 79],
      };
      patterns[sound].forEach((note, index) => tone(note, 0.25, 0.24, effectsBus!, index * 0.065));
    },
    destroy() {
      if (disposed) return;
      disposed = true;
      clearTimeout(timer);
      document.removeEventListener('pointerdown', unlock);
      document.removeEventListener('keydown', unlock);
      document.removeEventListener('visibilitychange', visibility);
      for (const voice of voices) {
        try {
          voice.stop();
        } catch {
          /* Already ended. */
        }
      }
      void context?.close().catch(() => {});
    },
  };
}
