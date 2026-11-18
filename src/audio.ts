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
const harmonies: Record<BiomeId, readonly (readonly number[])[]> = {
  forest: [
    [48, 55, 59, 64],
    [45, 52, 60, 64],
    [41, 48, 55, 60],
    [43, 50, 57, 62],
  ],
  coast: [
    [50, 57, 60, 65],
    [46, 53, 60, 62],
    [48, 55, 62, 65],
    [45, 52, 57, 64],
  ],
  tundra: [
    [45, 52, 59, 60],
    [41, 48, 55, 64],
    [48, 55, 59, 62],
    [43, 50, 57, 60],
  ],
};
interface PianoEvent {
  tones: readonly number[];
  octave: number;
  velocity: number;
  pause: number;
}
// These original phrases leave a long breath between each small musical thought.
const phrases: readonly (readonly PianoEvent[])[] = [
  [
    { tones: [0], octave: 0, velocity: 0.21, pause: 0.23 },
    { tones: [1, 3], octave: 0, velocity: 0.12, pause: 1.85 },
    { tones: [2], octave: 12, velocity: 0.16, pause: 2.7 },
    { tones: [3], octave: 0, velocity: 0.15, pause: 3.8 },
    { tones: [1], octave: 12, velocity: 0.12, pause: 4.6 },
    { tones: [2, 3], octave: 0, velocity: 0.085, pause: 9.4 },
  ],
  [
    { tones: [0, 2], octave: 0, velocity: 0.13, pause: 2.6 },
    { tones: [3], octave: 0, velocity: 0.18, pause: 1.45 },
    { tones: [1], octave: 12, velocity: 0.13, pause: 3.9 },
    { tones: [2], octave: 0, velocity: 0.12, pause: 2.4 },
    { tones: [3], octave: 0, velocity: 0.095, pause: 11.2 },
  ],
  [
    { tones: [0], octave: 0, velocity: 0.19, pause: 0.36 },
    { tones: [1, 2], octave: 0, velocity: 0.1, pause: 3.2 },
    { tones: [3], octave: 0, velocity: 0.17, pause: 2.1 },
    { tones: [2], octave: 12, velocity: 0.11, pause: 5.7 },
    { tones: [1, 3], octave: 0, velocity: 0.09, pause: 10.3 },
  ],
];

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
  let pianoBus: GainNode | undefined;
  let effectsBus: GainNode | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let biome: BiomeId = 'forest';
  let phraseNumber = 0;
  let phraseStep = 0;
  let nextNoteAt: number | undefined;
  let unlocked = false;
  let disposed = false;
  const voices = new Set<OscillatorNode>();
  const pianoVoices = new Map<OscillatorNode, GainNode>();

  function createRoom() {
    if (!context || !pianoBus || !musicBus) return;
    const room = context.createConvolver();
    const wet = context.createGain();
    const length = Math.ceil(context.sampleRate * 2.8);
    const impulse = context.createBuffer(2, length, context.sampleRate);
    let seed = 91427;
    for (let channel = 0; channel < 2; channel++) {
      const samples = impulse.getChannelData(channel);
      let softened = 0;
      for (let i = 0; i < length; i++) {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        softened = softened * 0.68 + ((seed / 0x1_0000_0000) * 2 - 1) * 0.32;
        samples[i] = i < context.sampleRate * 0.018 ? 0 : softened * Math.exp((-5 * i) / length);
      }
    }
    room.buffer = impulse;
    wet.gain.value = 0.2;
    pianoBus.connect(room).connect(wet).connect(musicBus);
  }

  function piano(midi: number, velocity: number, delay = 0) {
    if (!context || !pianoBus || disposed) return;
    const at = context.currentTime + delay;
    const pan = context.createStereoPanner();
    pan.pan.value = Math.max(-0.24, Math.min(0.24, (midi - 60) / 90));
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 2250;
    filter.Q.value = 0.35;
    pan.connect(filter).connect(pianoBus);
    const partials = [
      { ratio: 1, gain: 1, duration: midi < 55 ? 7.8 : 5.6 },
      { ratio: 2.001, gain: 0.26, duration: 2.4 },
      { ratio: 3.006, gain: 0.085, duration: 1.45 },
      { ratio: 4.014, gain: 0.025, duration: 0.8 },
    ];
    let remaining = partials.length;
    for (const partial of partials) {
      const oscillator = context.createOscillator();
      const envelope = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = 440 * 2 ** ((midi - 69) / 12) * partial.ratio;
      oscillator.detune.value = Math.sin(midi * 0.7 + partial.ratio) * 0.22;
      const volume = velocity * partial.gain;
      envelope.gain.setValueAtTime(0, at);
      envelope.gain.linearRampToValueAtTime(volume, at + 0.008);
      envelope.gain.exponentialRampToValueAtTime(
        Math.max(0.0001, volume * 0.22),
        at + Math.min(0.65, partial.duration * 0.35),
      );
      envelope.gain.exponentialRampToValueAtTime(0.0001, at + partial.duration);
      oscillator.connect(envelope).connect(pan);
      oscillator.start(at);
      oscillator.stop(at + partial.duration + 0.05);
      voices.add(oscillator);
      pianoVoices.set(oscillator, envelope);
      oscillator.onended = () => {
        voices.delete(oscillator);
        pianoVoices.delete(oscillator);
        oscillator.disconnect();
        envelope.disconnect();
        if (--remaining === 0) {
          pan.disconnect();
          filter.disconnect();
        }
      };
    }
  }

  function releasePiano() {
    if (!context) return;
    for (const [oscillator, envelope] of pianoVoices) {
      envelope.gain.cancelScheduledValues(context.currentTime);
      envelope.gain.setTargetAtTime(0.0001, context.currentTime, 0.045);
      try {
        oscillator.stop(context.currentTime + 0.24);
      } catch {
        /* A note may already have ended. */
      }
    }
  }

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
      settings.music ? settings.musicVolume * 0.4 : 0,
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
    nextNoteAt ??= context.currentTime + 0.18;
    const wait = nextNoteAt - context.currentTime;
    if (wait > 0.025) {
      timer = setTimeout(schedule, wait * 1000);
      return;
    }
    const chord = harmonies[biome][phraseNumber % harmonies[biome].length];
    const phrase = phrases[(phraseNumber + Math.floor(phraseNumber / 4)) % phrases.length];
    const event = phrase[phraseStep];
    const touch = 0.95 + Math.sin(phraseNumber * 1.7 + phraseStep * 2.3) * 0.07;
    event.tones.forEach((degree, index) =>
      piano(chord[degree] + event.octave, event.velocity * touch, index * 0.075),
    );
    nextNoteAt =
      context.currentTime + event.pause * (1 + Math.sin(phraseNumber + phraseStep * 1.3) * 0.035);
    phraseStep++;
    if (phraseStep === phrase.length) {
      phraseStep = 0;
      phraseNumber++;
    }
    timer = setTimeout(schedule, Math.max(25, (nextNoteAt - context.currentTime) * 1000));
  }
  async function unlock() {
    if (disposed || document.hidden) return;
    try {
      if (!context) {
        context = new AudioContext();
        musicBus = context.createGain();
        pianoBus = context.createGain();
        effectsBus = context.createGain();
        musicBus.gain.value = 0;
        effectsBus.gain.value = 0;
        musicBus.connect(context.destination);
        pianoBus.connect(musicBus);
        effectsBus.connect(context.destination);
        createRoom();
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
      const wasPlaying = settings.music;
      settings = { ...settings, ...next };
      settings.musicVolume = Math.min(1, Math.max(0, settings.musicVolume));
      settings.effectsVolume = Math.min(1, Math.max(0, settings.effectsVolume));
      try {
        localStorage.setItem(KEY, JSON.stringify(settings));
      } catch {
        /* Keep session settings. */
      }
      mix();
      if (wasPlaying && !settings.music) {
        clearTimeout(timer);
        timer = undefined;
        releasePiano();
      } else if (!wasPlaying && settings.music) {
        nextNoteAt = undefined;
        void unlock();
      }
    },
    setBiome(next: BiomeId) {
      if (next === biome) return;
      biome = next;
      phraseNumber = 0;
      phraseStep = 0;
      nextNoteAt = undefined;
      releasePiano();
      clearTimeout(timer);
      timer = undefined;
      if (unlocked) schedule();
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
