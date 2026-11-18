import type { BiomeId } from './domain/game';

type Sound =
  | 'pet'
  | 'feed'
  | 'clean'
  | 'rest'
  | 'success'
  | 'tap'
  | 'travel'
  | 'collect'
  | 'purchase'
  | 'utensil'
  | 'mix'
  | 'cook';
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
const tracks = [
  'pixel-peace',
  'pixel-peace-alternativa',
  'lofi-christmas-remix',
  'morning-nap-in-the-garden',
] as const;
type Track = (typeof tracks)[number];

/** Stream the supplied songs; interaction effects remain synthesized locally. */
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
  const music = document.createElement('audio');
  music.id = 'background-music';
  music.hidden = true;
  music.preload = 'none';
  music.setAttribute('aria-hidden', 'true');
  document.body.append(music);

  let context: AudioContext | undefined;
  let musicBus: GainNode | undefined;
  let musicSource: MediaElementAudioSourceNode | undefined;
  let effectsBus: GainNode | undefined;
  let rhythmBus: GainNode | undefined;
  let rhythmMode = false;
  let unlocked = false;
  let disposed = false;
  let queue: Track[] = [];
  let current: Track | undefined;
  let previous: Track | undefined;
  let generation = 0;
  let failedGeneration = -1;
  let trackPlaying = false;
  let retryAfterPending = false;
  let pending: { generation: number; promise: Promise<void> } | undefined;
  const failed = new Set<Track>();
  const voices = new Set<AudioScheduledSourceNode>();

  function canPlayMusic() {
    return unlocked && !disposed && settings.music && !document.hidden;
  }
  function selectNextTrack() {
    if (!queue.length) {
      queue = tracks.filter((track) => !failed.has(track));
      for (let index = queue.length - 1; index > 0; index--) {
        const other = Math.floor(Math.random() * (index + 1));
        [queue[index], queue[other]] = [queue[other], queue[index]];
      }
      // Avoid repeating the last song when a fresh shuffled round starts.
      if (queue.length > 1 && queue[0] === previous) [queue[0], queue[1]] = [queue[1], queue[0]];
    }
    music.pause();
    trackPlaying = false;
    current = queue.shift();
    generation++;
    if (!current) {
      delete music.dataset.track;
      music.removeAttribute('src');
      music.load();
      return false;
    }
    previous = current;
    music.dataset.track = current;
    music.src = `${import.meta.env.BASE_URL}audio/${current}.mp3`;
    // Load just the selected track, rather than downloading the whole playlist.
    music.preload = 'metadata';
    music.load();
    return true;
  }
  function skipFailedTrack(token: number) {
    if (disposed || token !== generation || failedGeneration === token || !current) return;
    failedGeneration = token;
    failed.add(current);
    queue = queue.filter((track) => !failed.has(track));
    if (selectNextTrack()) startMusic();
  }
  function startMusic() {
    if (!canPlayMusic()) {
      music.pause();
      return;
    }
    if (!current && !selectNextTrack()) return;
    if (!music.paused && !music.ended) return;
    if (pending?.generation === generation) {
      // A new gesture or visibility change can arrive before pause aborts play().
      retryAfterPending = true;
      return;
    }
    const token = generation;
    const attempt = { generation: token, promise: music.play() };
    pending = attempt;
    void attempt.promise
      .catch((error: unknown) => {
        if (disposed || token !== generation) return;
        const name = error instanceof DOMException ? error.name : '';
        // Policy rejections wait for another gesture; pause/source changes are normal.
        if (name === 'NotAllowedError' || name === 'AbortError') return;
        if (music.error) skipFailedTrack(token);
      })
      .finally(() => {
        if (pending !== attempt) return;
        pending = undefined;
        if (!canPlayMusic()) music.pause();
        const retry = retryAfterPending;
        retryAfterPending = false;
        if (retry && canPlayMusic()) startMusic();
      });
  }
  function ended() {
    if (disposed || !trackPlaying) return;
    // One completion can advance only once, until the next track starts playing.
    trackPlaying = false;
    if (selectNextTrack()) startMusic();
  }
  function playing() {
    if (disposed) return;
    if (!canPlayMusic()) music.pause();
    else trackPlaying = true;
  }
  function mediaError() {
    if (music.error) skipFailedTrack(generation);
  }
  music.addEventListener('ended', ended);
  music.addEventListener('playing', playing);
  music.addEventListener('error', mediaError);

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
  function percussion(sound: 'utensil' | 'mix' | 'cook') {
    if (!context || !effectsBus) return;
    if (sound === 'utensil') {
      tone(95, 0.09, 0.18, effectsBus, 0, 'triangle');
      tone(108, 0.14, 0.08, effectsBus, 0.018, 'sine');
      return;
    }
    for (let index = 0; index < (sound === 'mix' ? 3 : 5); index++) {
      const source = context.createBufferSource();
      const length = Math.floor(context.sampleRate * 0.13);
      const buffer = context.createBuffer(1, length, context.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
      source.buffer = buffer;
      const filter = context.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = sound === 'mix' ? 950 + index * 150 : 480;
      filter.Q.value = 0.7;
      const envelope = context.createGain();
      const at = context.currentTime + index * 0.11;
      envelope.gain.setValueAtTime(0, at);
      envelope.gain.linearRampToValueAtTime(0.42, at + 0.016);
      envelope.gain.exponentialRampToValueAtTime(0.001, at + 0.13);
      source.connect(filter).connect(envelope).connect(effectsBus);
      source.start(at);
      source.stop(at + 0.14);
      voices.add(source);
      source.onended = () => {
        voices.delete(source);
        source.disconnect();
        filter.disconnect();
        envelope.disconnect();
      };
    }
    if (sound === 'cook')
      [64, 69, 76].forEach((note, index) => tone(note, 0.3, 0.12, effectsBus!, index * 0.12));
  }
  function mix() {
    if (context && rhythmBus)
      rhythmBus.gain.setTargetAtTime(
        settings.music ? settings.musicVolume * 0.8 : 0,
        context.currentTime,
        0.04,
      );
    if (context && musicBus)
      musicBus.gain.setTargetAtTime(
        settings.music ? settings.musicVolume * (rhythmMode ? 0.18 : 1) : 0,
        context.currentTime,
        0.08,
      );
    else music.volume = settings.music ? settings.musicVolume : 0;
    if (context && effectsBus)
      effectsBus.gain.setTargetAtTime(
        settings.effects ? settings.effectsVolume * 0.35 : 0,
        context.currentTime,
        0.02,
      );
  }
  function resumeAudio() {
    if (disposed || document.hidden || !unlocked) return;
    try {
      if (!context) {
        context = new AudioContext();
        effectsBus = context.createGain();
        effectsBus.gain.value = settings.effects ? settings.effectsVolume * 0.35 : 0;
        effectsBus.connect(context.destination);
        rhythmBus = context.createGain();
        rhythmBus.gain.value = settings.music ? settings.musicVolume * 0.8 : 0;
        rhythmBus.connect(context.destination);
        musicBus = context.createGain();
        musicBus.gain.value = settings.music ? settings.musicVolume : 0;
        musicSource = context.createMediaElementSource(music);
        musicSource.connect(musicBus).connect(context.destination);
        // The gain controls music on mobile browsers that ignore element.volume.
        music.volume = 1;
        mix();
      }
      void context.resume().catch(() => {});
    } catch {
      // Music can still play with the element's volume when Web Audio is unavailable.
      if (!musicSource) {
        musicBus = undefined;
        music.volume = settings.music ? settings.musicVolume : 0;
      }
    }
    // Call play in the gesture itself, rather than after an asynchronous resume.
    startMusic();
  }
  function unlock() {
    if (disposed || document.hidden) return;
    unlocked = true;
    // Exhausted failures retry only on a deliberate gesture, never in a background loop.
    if (!current && failed.size) {
      failed.clear();
      queue = [];
    }
    resumeAudio();
  }
  function visibility() {
    if (document.hidden) {
      music.pause();
      void context?.suspend().catch(() => {});
    } else resumeAudio();
  }
  document.addEventListener('pointerdown', unlock);
  document.addEventListener('keydown', unlock);
  document.addEventListener('visibilitychange', visibility);
  return {
    getSettings: () => ({ ...settings }),
    update(next: Partial<AudioSettings>) {
      for (const key of ['music', 'effects'] as const)
        if (typeof next[key] === 'boolean') settings[key] = next[key];
      for (const key of ['musicVolume', 'effectsVolume'] as const)
        if (typeof next[key] === 'number' && Number.isFinite(next[key]))
          settings[key] = Math.min(1, Math.max(0, next[key]));
      try {
        localStorage.setItem(KEY, JSON.stringify(settings));
      } catch {
        /* Keep session settings. */
      }
      mix();
      if (!settings.music) music.pause();
      else resumeAudio();
    },
    setBiome(_next: BiomeId) {
      // The playlist belongs to the whole game; travelling preserves the current song.
    },
    setRhythmMode(active: boolean) {
      rhythmMode = active;
      mix();
    },
    playRhythm(note: number, hit = false) {
      if (!context || document.hidden || disposed || !rhythmMode || !Number.isFinite(note)) return;
      if (settings.music && rhythmBus) {
        tone(note, 0.24, 0.3, rhythmBus, 0, 'triangle');
        if (hit) tone(note + 12, 0.18, 0.15, rhythmBus, 0.04);
      }
      if (settings.effects && effectsBus && hit) tone(92, 0.07, 0.1, effectsBus);
    },
    play(sound: Sound) {
      if (!context || !effectsBus || !settings.effects || document.hidden || disposed) return;
      if (sound === 'utensil' || sound === 'mix' || sound === 'cook') {
        percussion(sound);
        return;
      }
      const patterns = {
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
      generation++;
      document.removeEventListener('pointerdown', unlock);
      document.removeEventListener('keydown', unlock);
      document.removeEventListener('visibilitychange', visibility);
      music.removeEventListener('ended', ended);
      music.removeEventListener('playing', playing);
      music.removeEventListener('error', mediaError);
      music.pause();
      music.removeAttribute('src');
      music.load();
      music.remove();
      musicSource?.disconnect();
      musicBus?.disconnect();
      effectsBus?.disconnect();
      rhythmBus?.disconnect();
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
