import './style.css';
import {
  BIOMES,
  createGame,
  advanceTime,
  applyCare,
  changeBiome,
  renamePet,
  rewardMiniGame,
  parseSave,
  serializeSave,
  getMood,
  getLevelProgress,
  type GameState,
  type Action,
  type BiomeId,
} from './domain/game';
import { createScene, type SceneTool } from './render/scene';

const icons: Record<string, string> = {
  apple:
    '<path d="M12 7C5 2 1 10 5 17c3 6 5 3 7 3s4 3 7-3c4-7 0-15-7-10Z"/><path d="M12 7c-1-4 1-6 4-6m-4 4c-4 0-5-2-5-3 3-1 5 0 5 3"/>',
  menu: '<path d="M5 7h14M5 12h14M5 17h14"/>',
  leaf: '<path d="M20 4C10 2 3 7 5 14c2 7 13 7 15-10Z"/><path d="M4 21 15 10M10 15l-1-5m4 2 4 1"/>',
  home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m16 8-2.5 5.5L8 16l2.5-5.5Z"/>',
  book: '<path d="M4 4h6a3 3 0 0 1 2 1 3 3 0 0 1 2-1h6v15h-6a3 3 0 0 0-2 1 3 3 0 0 0-2-1H4ZM12 5v15"/>',
  friends:
    '<circle cx="9" cy="8" r="3"/><path d="M3 20v-3a6 6 0 0 1 12 0v3m1-15a3 3 0 0 1 0 6m3 9v-3a6 6 0 0 0-2-4"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
  coin: '<circle cx="12" cy="12" r="9"/><path d="m12 7 2 3 3 2-3 2-2 3-2-3-3-2 3-2Z"/>',
  heart:
    '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0l-1 1-1-1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
  food: '<path d="M4 11h16a8 8 0 0 1-16 0ZM3 11h18M8 3v4m4-5v5m4-4v4"/>',
  drop: '<path d="M12 2S4 10 4 15a8 8 0 0 0 16 0c0-5-8-13-8-13Z"/><path d="M8 15a4 4 0 0 0 4 4"/>',
  moon: '<path d="M21 13a9 9 0 0 1-10-10A9 9 0 1 0 21 13Z"/>',
  smile: '<circle cx="12" cy="12" r="9"/><path d="M8 14s1 3 4 3 4-3 4-3M8 9h.01M16 9h.01"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  play: '<path d="m9 5 11 7-11 7Z"/>',
  spark: '<path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3ZM20 2v4m-2-2h4"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  edit: '<path d="m16 3 5 5-12 12-6 1 1-6ZM14 5l5 5"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  mountain: '<path d="m2 20 8-16 6 11 3-6 5 11ZM7 10l3 2 3-2"/>',
  wave: '<path d="M2 9c4-6 6 6 10 0s6 6 10 0M2 16c4-6 6 6 10 0s6 6 10 0"/>',
};
const icon = (name: string, cls = '') =>
  `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] ?? icons.spark}</svg>`;
const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
const SAVE_KEY = 'xisverso.save.v1';
let saveAvailable = true;
let initial: GameState | null = null;
let corruptSave = false;
try {
  const raw = localStorage.getItem(SAVE_KEY);
  initial = raw ? parseSave(raw, Date.now()) : null;
  corruptSave = Boolean(raw && !initial);
} catch {
  saveAvailable = false;
}
let state = initial ?? createGame();
let sleepingUntil = 0;
let lastCare = -Infinity;
let selectedTool: SceneTool = 'hand';
let journal: { text: string; time: string; type: string }[] = [];
let toastTimer: ReturnType<typeof setTimeout>;
let thoughtTimer: ReturnType<typeof setTimeout>;
let gameTimer: ReturnType<typeof setInterval> | undefined;
let gameRunning = false;
let gameScore = 0;
let gameEnds = 0;
let gameFinished = false;
let blockToolClickUntil = 0;
let drag: { tool: SceneTool; x: number; y: number; active: boolean; pointerId: number } | null =
  null;

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <main class="game-shell" data-tool="hand">
    <h1 class="sr-only">Tu refugio en Xisverso</h1>
    <canvas id="pet-scene" class="world-canvas" role="img" aria-label="El refugio de Nubi. Toca el suelo para caminar y a tu mascota para interactuar."></canvas>
    <header class="game-hud">
      <a class="game-brand" href="#refugio" aria-label="Xisverso, tu refugio"><span class="brand-mark">${icon('leaf')}</span><span>Xisverso<small>UN MUNDO DE XISSOFT</small></span></a>
      <button class="location-pill" data-open="travel-dialog" aria-label="Explorar biomas">${icon('leaf')}<span><strong id="biome-name">Bosque Susurro</strong><small class="location-subtitle">Un día para explorar</small></span>${icon('compass')}</button>
      <div class="hud-right"><span class="wallet" title="Semillas disponibles">${icon('coin')}<strong id="coins">80</strong><span>semillas</span></span><button class="menu-button" data-open="menu-dialog" aria-label="Menú">${icon('menu')}</button></div>
    </header>
    <button class="pet-status-button" id="open-pet" data-open="pet-dialog" aria-label="Cómo está Nubi"><span class="pet-status-avatar">${icon('leaf')}</span><span><strong id="pet-name">Nubi</strong><small id="scene-mood">Con ganas de explorar</small></span><span class="status-chevron">${icon('heart')}</span></button>
    <div class="speech-bubble" id="pet-speech"><span id="pet-thought"></span><span class="speech-heart">♡</span></div>
    <button id="pet-interact" class="pet-interact" aria-label="Interactuar con Nubi" aria-describedby="interaction-hint"></button>
    <button class="world-sign travel-sign" data-open="travel-dialog" aria-label="Ir al sendero">${icon('compass')}<span>Otros rincones</span><span>↖</span></button>
    <button class="world-sign" data-play="true" aria-label="Buscar luciérnagas">${icon('spark')}<span>Luciérnagas</span><span>↗</span></button>

    <p class="interaction-hint" id="interaction-hint">Toca a Nubi para darle cariño · Toca el suelo para caminar</p>
    <nav class="toolbelt" aria-label="Herramientas del refugio">
      <button class="tool-button selected" data-tool="hand" aria-label="Caricias" aria-pressed="true" aria-keyshortcuts="1"><span class="tool-key">1</span><span class="tool-icon">${icon('heart')}</span><span class="tool-name">Caricias</span></button>
      <button class="tool-button" data-tool="feed" aria-label="Comida" aria-pressed="false" aria-keyshortcuts="2"><span class="tool-key">2</span><span class="tool-icon">${icon('apple')}</span><span class="tool-name">Comida</span><span class="tool-price">5 ${icon('coin')}</span></button>
      <button class="tool-button" data-tool="clean" aria-label="Burbujas" aria-pressed="false" aria-keyshortcuts="3"><span class="tool-key">3</span><span class="tool-icon">${icon('drop')}</span><span class="tool-name">Burbujas</span></button>
      <button class="tool-button" data-tool="rest" aria-label="Siesta" aria-pressed="false" aria-keyshortcuts="4"><span class="tool-key">4</span><span class="tool-icon">${icon('moon')}</span><span class="tool-name">Siesta</span></button>
      <span class="tool-divider" aria-hidden="true"></span>
      <button class="tool-button play-tool" id="start-game" data-play="true" aria-label="Jugar"><span class="tool-icon">${icon('spark')}</span><span class="tool-name">Jugar</span></button>
    </nav>
    <footer class="world-footer"><span>XisSoft <span>✧</span> Crece a tu ritmo</span><span class="local-status"><span></span>Guardado local</span></footer>
    <span class="tool-cursor" id="tool-cursor" hidden aria-hidden="true"></span>
  </main>
  <div id="toast" class="game-toast" role="status" aria-live="polite"></div>
  <dialog id="pet-dialog" class="sheet-dialog" aria-labelledby="pet-sheet-title"><button class="dialog-close" data-close="pet-dialog" aria-label="Cerrar">${icon('close')}</button><span class="eyebrow">UN RATITO PARA CONOCERSE</span><div class="pet-sheet-heading"><div><h2 id="pet-sheet-title">Cómo está <span id="needs-name">Nubi</span></h2><p class="muted"><span class="species-tag">Brotín</span> · <span id="pet-description">Un espíritu curioso del bosque</span></p></div><button id="rename-button" class="icon-button" aria-label="Cambiar nombre">${icon('edit')}</button></div><div id="needs-list" class="needs-list"></div><div class="bond-panel"><div>${icon('heart')}<strong>Su vínculo contigo</strong><span id="bond-label">12%</span></div><div class="bond-track"><span id="bond-fill"></span></div><p id="bond-description">Una amistad que apenas comienza.</p></div><div class="level-info"><span class="level-badge">1</span><div><strong id="level-label">Pequeño explorador</strong><span id="xp-label">0 / 100 XP</span><div class="xp-track"><span id="xp-fill"></span></div></div></div><p id="best-score" class="best-score">Su primera aventura los espera.</p><button class="text-button" data-close="pet-dialog">Volver a nuestro mundo ${icon('arrow')}</button></dialog>
  <dialog id="travel-dialog" class="travel-dialog" aria-labelledby="travel-title"><button class="dialog-close" data-close="travel-dialog" aria-label="Cerrar">${icon('close')}</button><span class="eyebrow">¿A DÓNDE VAMOS HOY?</span><h2 id="travel-title">Un mundo por descubrir.</h2><p class="muted">Lleva a tu compañero a un nuevo rincón. Su amistad viaja con ustedes.</p><div id="biome-cards" class="biome-cards"></div><p class="view-footnote">Tres biomas para explorar. Las nuevas especies llegarán en otro capítulo.</p></dialog>
  <dialog id="menu-dialog" class="menu-dialog" aria-labelledby="menu-title"><button class="dialog-close" data-close="menu-dialog" aria-label="Cerrar">${icon('close')}</button><span class="eyebrow">XISVERSO</span><h2 id="menu-title">Tu pequeño universo.</h2><div class="menu-actions"><button data-open="pet-dialog">${icon('heart')} Mi compañero ${icon('arrow')}</button><button data-open="travel-dialog">${icon('compass')} Explorar el mundo ${icon('arrow')}</button><button data-open="journal-dialog">${icon('book')} Mi bitácora ${icon('arrow')}</button><button data-open="community-dialog">${icon('friends')} Comunidad ${icon('arrow')}</button></div><p class="controls-help">Toca el suelo para caminar. Elige una herramienta y toca a tu mascota; también puedes arrastrar la herramienta hasta ella.</p><p class="controls-help">Teclado: 1–4 eligen herramienta, flechas para caminar y Espacio para interactuar. Tab recorre los controles.</p><button class="primary-button" data-close="menu-dialog">Volver al refugio ${icon('arrow')}</button></dialog>
  <dialog id="journal-dialog" class="sheet-dialog" aria-labelledby="journal-title"><button class="dialog-close" data-close="journal-dialog" aria-label="Cerrar">${icon('close')}</button><span class="eyebrow">RECUERDOS DE ESTA SESIÓN</span><h2 id="journal-title">Pequeños momentos, gran amistad.</h2><p class="muted">Lo que han vivido desde que abriste el refugio.</p><div id="journal-events" class="journal-events"></div></dialog>
  <dialog id="community-dialog" class="sheet-dialog" aria-labelledby="community-title"><button class="dialog-close" data-close="community-dialog" aria-label="Cerrar">${icon('close')}</button><div class="community-hero">${icon('friends')}<span class="eyebrow">EL SIGUIENTE CAPÍTULO</span><h2 id="community-title">Las amistades cruzarán biomas.</h2><p>Estamos preparando visitas a otros refugios, encuentros entre mascotas y juegos en equipo.</p><span class="development-badge">En la ruta de desarrollo</span></div></dialog>
  <dialog id="rename-dialog" class="rename-dialog" aria-labelledby="rename-title"><form id="rename-form"><button type="button" class="dialog-close" data-close="rename-dialog" aria-label="Cerrar">${icon('close')}</button><span class="eyebrow">UNA AMISTAD CON NOMBRE PROPIO</span><h2 id="rename-title">¿Cómo se llama tu mascota?</h2><label for="pet-name-input">Su nombre</label><input id="pet-name-input" name="petName" maxlength="24" required autocomplete="off" placeholder="Nubi" /><p class="muted">Hasta 24 caracteres. Puedes cambiarlo cuando quieras.</p><button class="primary-button" type="submit">Guardar nombre ${icon('check')}</button></form></dialog>
  <dialog id="game-dialog" class="game-dialog" aria-labelledby="game-title"><div class="game-header"><div><span class="eyebrow">UNA AVENTURA JUNTOS</span><h2 id="game-title">Atrapa las luciérnagas</h2></div><button type="button" class="dialog-close" id="exit-game" aria-label="Salir del minijuego">${icon('close')}</button></div><p class="game-instructions">Toca las lucecitas antes de que termine el tiempo. También puedes usar Tab y Enter.</p><div class="game-counters"><span>${icon('sun')}<strong id="game-time">20</strong> segundos</span><span>${icon('spark')}<strong id="game-score">0</strong> luciérnagas</span></div><div class="game-field" id="game-field"><span class="game-horizon"></span></div><div id="game-result" class="game-result" hidden></div><p class="game-tip">Cada luciérnaga cuenta. Las recompensas se entregan al terminar los 20 segundos.</p></dialog>
`;
const $ = <T extends HTMLElement = HTMLElement>(selector: string) =>
  document.querySelector<T>(selector)!;
const canvas = $<HTMLCanvasElement>('#pet-scene');
const scene = createScene(
  canvas,
  { seed: state.pet.seed, biome: state.pet.biome, mood: getMood(state), sleeping: false },
  {
    onPetInteract: (tool) => interactWithPet(tool),
    onWalk: () => {
      sleepingUntil = 0;
      scene.update({
        seed: state.pet.seed,
        biome: state.pet.biome,
        mood: getMood(state),
        sleeping: false,
      });
      say('¡Voy contigo!', 1800);
    },
  },
);
const toolDetails: Record<SceneTool, { icon: string; hint: string }> = {
  hand: { icon: 'heart', hint: 'Toca a tu mascota para darle cariño · Toca el suelo para caminar' },
  feed: { icon: 'apple', hint: 'Acerca la manzana a tu mascota · 5 semillas al darle de comer' },
  clean: { icon: 'drop', hint: 'Toca a tu mascota con las burbujas para darle un baño' },
  rest: { icon: 'moon', hint: 'Toca a tu mascota para ayudarla a descansar un ratito' },
};
function toast(message: string) {
  clearTimeout(toastTimer);
  $('#toast').textContent = message;
  $('#toast').classList.add('visible');
  toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 3800);
}
function say(message: string, duration = 5000) {
  clearTimeout(thoughtTimer);
  $('#pet-thought').textContent = message;
  $('#pet-speech').classList.add('visible');
  thoughtTimer = setTimeout(() => $('#pet-speech').classList.remove('visible'), duration);
}
function closeDialogs() {
  document.querySelectorAll<HTMLDialogElement>('dialog[open]').forEach((dialog) => dialog.close());
}
function openDialog(id: string) {
  closeDialogs();
  if (id === 'pet-dialog') renderState();
  if (id === 'travel-dialog') renderBiomes();
  $<HTMLDialogElement>(`#${id}`).showModal();
  $('#tool-cursor').hidden = true;
}
function reconcileSavedState() {
  try {
    const restored = parseSave(localStorage.getItem(SAVE_KEY), Date.now());
    if (restored) state = restored;
  } catch {
    /* A blocked save must not prevent playing this session. */
  }
}
function persist() {
  try {
    localStorage.setItem(SAVE_KEY, serializeSave(state));
    saveAvailable = true;
  } catch {
    if (saveAvailable)
      toast('No se pudo guardar. Mantén abierto el refugio para conservar esta sesión.');
    saveAvailable = false;
  }
  $('.local-status').innerHTML = `<span></span>${saveAvailable ? 'Guardado local' : 'Sin guardar'}`;
  $('.local-status').classList.toggle('save-error', !saveAvailable);
}
function addEvent(text: string, type = 'heart') {
  journal.unshift({
    text,
    type,
    time: new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit' }).format(
      new Date(),
    ),
  });
  journal = journal.slice(0, 60);
  $('#journal-events').innerHTML = journal
    .map(
      (event) =>
        `<div class="journal-event"><span class="event-icon">${icon(event.type)}</span><div><p>${escapeHtml(event.text)}</p><span>${event.time}</span></div></div>`,
    )
    .join('');
}
const needsMeta = [
  { key: 'hunger' as const, name: 'Saciedad', icon: 'food', color: '#d7a164' },
  { key: 'energy' as const, name: 'Energía', icon: 'sun', color: '#d1bc6b' },
  { key: 'hygiene' as const, name: 'Higiene', icon: 'drop', color: '#80b9c1' },
  { key: 'joy' as const, name: 'Ánimo', icon: 'smile', color: '#a4b98b' },
];
function renderState() {
  $('#coins').textContent = `${Math.floor(state.coins)}`;
  $('#pet-name').textContent = state.pet.name;
  $('#needs-name').textContent = state.pet.name;
  $('#open-pet').setAttribute('aria-label', `Cómo está ${state.pet.name}`);
  $('#pet-interact').setAttribute('aria-label', `Interactuar con ${state.pet.name}`);
  $('#biome-name').textContent = BIOMES.find((b) => b.id === state.pet.biome)!.name;
  const species = {
    forest: ['Brotín', 'Un espíritu curioso del bosque'],
    coast: ['Brisín', 'Un espíritu juguetón de la costa'],
    tundra: ['Nevín', 'Un espíritu cálido de la tundra'],
  }[state.pet.biome];
  $('.species-tag').textContent = species[0];
  $('#pet-description').textContent = species[1];
  $('.pet-status-avatar').innerHTML = icon(
    { forest: 'leaf', coast: 'wave', tundra: 'mountain' }[state.pet.biome],
  );
  const progress = getLevelProgress(state);
  $('.level-badge').textContent = `${state.level}`;
  $('#level-label').textContent =
    state.level < 3
      ? 'Pequeño explorador'
      : state.level < 6
        ? 'Compañero de aventuras'
        : 'Gran amistad';
  $('#xp-label').textContent = `${Math.floor(progress.current)} / ${progress.required} XP`;
  $('#xp-fill').style.width = `${progress.percent}%`;
  $('#needs-list').innerHTML = needsMeta
    .map((need) => {
      const value = Math.round(state.pet.needs[need.key]);
      return `<div class="need-row"><div class="need-label">${icon(need.icon)}<span>${need.name}</span><strong>${value}<small>/100</small></strong></div><div class="need-track" role="progressbar" aria-label="${need.name}" aria-valuenow="${value}" aria-valuemin="0" aria-valuemax="100"><span style="width:${value}%;background:${value < 25 ? '#cb7870' : need.color}"></span></div></div>`;
    })
    .join('');
  $('#bond-label').textContent = `${Math.round(state.pet.bond)}%`;
  $('#bond-fill').style.width = `${state.pet.bond}%`;
  $('#bond-description').textContent =
    state.pet.bond > 60
      ? 'Un vínculo que se siente como un hogar.'
      : state.pet.bond > 25
        ? 'Ya empiezan a entenderse sin palabras.'
        : 'Una amistad que apenas comienza.';
  const sleeping = Date.now() < sleepingUntil;
  const mood = getMood(state);
  const moods: Record<string, string> = {
    'Con sueño': 'Un poquito de sueño',
    'Tiene hambre': 'Su pancita hace ruiditos',
    'Quiere un baño': 'Necesita unas burbujas',
    'Busca compañía': 'Con ganas de un abrazo',
    Radiante: 'Feliz de estar contigo',
    'A gusto': 'Con ganas de explorar',
    'Necesita cuidados': 'Necesita tus cuidados',
  };
  $('#scene-mood').textContent = sleeping ? 'Soñando una nueva aventura' : moods[mood];
  canvas.setAttribute(
    'aria-label',
    `${state.pet.name} en ${$('#biome-name').textContent}. Toca el suelo para caminar. Herramienta: ${selectedTool === 'hand' ? 'caricias' : selectedTool === 'feed' ? 'comida' : selectedTool === 'clean' ? 'burbujas' : 'siesta'}.`,
  );
  $('#best-score').textContent = state.miniGameBest
    ? `Su mejor aventura: ${state.miniGameBest} luciérnagas`
    : 'Su primera aventura los espera.';
  scene.update({ seed: state.pet.seed, biome: state.pet.biome, mood, sleeping });
}
function renderBiomes() {
  const details = {
    forest: {
      icon: 'leaf',
      subtitle: 'ENTRE HOJAS Y SUSURROS',
      copy: 'Senderos verdes, honguitos y una brisa que invita a explorar.',
      trait: 'Aquí el ánimo se conserva un poquito mejor.',
    },
    coast: {
      icon: 'wave',
      subtitle: 'AL RITMO DE LAS OLAS',
      copy: 'Arena suave, conchas y un horizonte lleno de sorpresas.',
      trait: 'La brisa salada pide más cuidado e higiene.',
    },
    tundra: {
      icon: 'mountain',
      subtitle: 'UN ABRAZO ENTRE LA NIEVE',
      copy: 'Montañas de algodón y un rincón cálido para soñar.',
      trait: 'El frío consume más energía. Descansar importa.',
    },
  };
  $('#biome-cards').innerHTML = BIOMES.map((biome) => {
    const detail = details[biome.id];
    const selected = state.pet.biome === biome.id;
    return `<article class="biome-card ${biome.id} ${selected ? 'selected' : ''}"><div class="biome-art">${icon(detail.icon)}<span class="biome-art-orb"></span><span class="biome-art-ground"></span></div><div class="biome-card-content"><span class="eyebrow">${detail.subtitle}</span><h3>${escapeHtml(biome.name)}</h3><p>${detail.copy}</p><span class="biome-trait">${icon('spark')}${detail.trait}</span><button class="${selected ? 'secondary-button' : 'primary-button'}" data-biome="${biome.id}" ${selected ? 'disabled' : ''}>${selected ? 'Nuestro hogar' : 'Vamos para allá'} ${icon(selected ? 'check' : 'arrow')}</button></div></article>`;
  }).join('');
}
function selectTool(tool: SceneTool) {
  selectedTool = tool;
  scene.setTool(tool);
  $('.game-shell').dataset.tool = tool;
  document.querySelectorAll<HTMLButtonElement>('[data-tool].tool-button').forEach((button) => {
    const selected = button.dataset.tool === tool;
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', `${selected}`);
  });
  $('#interaction-hint').textContent = toolDetails[tool].hint.replace('tu mascota', state.pet.name);
  $('#tool-cursor').innerHTML = icon(toolDetails[tool].icon);
  $('#tool-cursor').hidden = true;
}
function interactWithPet(tool: SceneTool = selectedTool) {
  care(tool === 'hand' ? 'pet' : tool);
}
function care(action: Action) {
  if (performance.now() - lastCare < 850) return;
  lastCare = performance.now();
  reconcileSavedState();
  const result = applyCare(state, action, Date.now());
  state = result.state;
  if (result.success) {
    sleepingUntil = action === 'rest' ? Date.now() + 10000 : 0;
    scene.react(action);
    addEvent(result.message, { feed: 'food', clean: 'drop', rest: 'moon', pet: 'heart' }[action]);
    persist();
    say(
      {
        feed: '¡Ñam! ¡Estaba deliciosa!',
        clean: '¡Burbujas! Una más, una más…',
        pet: 'Contigo se está muy bien. ♡',
        rest: 'Solo cinco minutitos… zzz',
      }[action],
    );
  } else say(result.message);
  renderState();
  if (!result.success) toast(result.message);
  else {
    clearTimeout(toastTimer);
    $('#toast').classList.remove('visible');
    $('#toast').textContent = result.message;
  }
}
function openRename() {
  openDialog('rename-dialog');
  const input = $<HTMLInputElement>('#pet-name-input');
  input.value = state.pet.name;
  input.select();
}
function moveFirefly(button: HTMLButtonElement) {
  const field = $('#game-field');
  const bounds = field.getBoundingClientRect();
  const others = Array.from(field.querySelectorAll<HTMLButtonElement>('.firefly')).filter(
    (other) => other !== button,
  );
  const margin = Math.max(9, (32 / Math.max(bounds.width, 1)) * 100);
  let best = { x: 50, y: 45, spacing: -1 };
  for (let attempt = 0; attempt < 35; attempt++) {
    const x = margin + Math.random() * (100 - 2 * margin);
    const y = 16 + Math.random() * 63;
    const spacing = others.length
      ? Math.min(
          ...others.map((other) =>
            Math.hypot(
              ((x - parseFloat(other.style.left)) * bounds.width) / 100,
              ((y - parseFloat(other.style.top)) * bounds.height) / 100,
            ),
          ),
        )
      : Infinity;
    if (spacing > best.spacing) best = { x, y, spacing };
    if (spacing >= 66) break;
  }
  button.style.left = `${best.x}%`;
  button.style.top = `${best.y}%`;
}
function finishGame() {
  if (!gameRunning || gameFinished) return;
  gameFinished = true;
  gameRunning = false;
  clearInterval(gameTimer);
  gameTimer = undefined;
  reconcileSavedState();
  const result = rewardMiniGame(state, gameScore, Date.now());
  state = result.state;
  persist();
  renderState();
  scene.react('win');
  addEvent(`Atraparon ${gameScore} luciérnagas y ganaron ${result.reward} semillas.`, 'spark');
  $('#game-time').textContent = '0';
  $('#game-field')
    .querySelectorAll('button')
    .forEach((button) => button.remove());
  $('#game-field').classList.add('finished');
  $('#game-result').hidden = false;
  $('#game-result').innerHTML =
    `<span class="result-spark">${icon('spark')}</span><h3>¡Un recuerdo más juntos!</h3><p>${gameScore} luciérnagas · <strong>+${result.reward} semillas</strong></p><button class="primary-button" id="game-again">Otra aventura ${icon('arrow')}</button><button class="text-button" data-close="game-dialog">Volver al refugio</button>`;
  $('#game-again').focus();
}
function startGame() {
  closeDialogs();
  clearInterval(gameTimer);
  gameScore = 0;
  gameFinished = false;
  gameRunning = true;
  $('#game-result').hidden = true;
  $('#game-result').innerHTML = '';
  $('#game-score').textContent = '0';
  $('#game-time').textContent = '20';
  const field = $('#game-field');
  field.classList.remove('finished');
  field.querySelectorAll('button').forEach((button) => button.remove());
  for (let index = 0; index < 5; index++) {
    const fly = document.createElement('button');
    fly.className = 'firefly';
    fly.type = 'button';
    fly.setAttribute('aria-label', `Atrapar luciérnaga ${index + 1}`);
    fly.innerHTML =
      '<span class="fly-wing left"></span><span class="fly-wing right"></span><span class="fly-body"></span>';
    moveFirefly(fly);
    fly.addEventListener('click', () => {
      if (!gameRunning || performance.now() >= gameEnds) {
        finishGame();
        return;
      }
      gameScore++;
      $('#game-score').textContent = `${gameScore}`;
      moveFirefly(fly);
    });
    field.append(fly);
  }
  const dialog = $<HTMLDialogElement>('#game-dialog');
  if (!dialog.open) dialog.showModal();
  gameEnds = performance.now() + 20000;
  gameTimer = setInterval(() => {
    const remaining = Math.max(0, Math.ceil((gameEnds - performance.now()) / 1000));
    $('#game-time').textContent = `${remaining}`;
    if (remaining === 0) finishGame();
  }, 100);
}
function closeGame() {
  const wasRunning = gameRunning;
  clearInterval(gameTimer);
  gameTimer = undefined;
  gameRunning = false;
  $<HTMLDialogElement>('#game-dialog').close();
  if (wasRunning)
    toast('Aventura terminada antes de tiempo. Puedes volver a jugar cuando quieras.');
}

document.addEventListener('click', (event) => {
  const target = (event.target as Element).closest<HTMLElement>('button, a.game-brand');
  if (!target) return;
  if (target.dataset.tool) {
    if (performance.now() < blockToolClickUntil) return;
    selectTool(target.dataset.tool as SceneTool);
  }
  if (target.dataset.open) openDialog(target.dataset.open);
  if (target.dataset.play || target.id === 'game-again') startGame();
  if (target.id === 'pet-interact') interactWithPet();
  if (target.id === 'rename-button') openRename();
  if (target.id === 'exit-game') closeGame();
  if (target.classList.contains('game-brand')) {
    event.preventDefault();
    closeDialogs();
    selectTool('hand');
  }
  if (target.dataset.close) {
    if (target.dataset.close === 'game-dialog') closeGame();
    else $<HTMLDialogElement>(`#${target.dataset.close}`).close();
  }
  if (target.dataset.biome) {
    reconcileSavedState();
    state = changeBiome(state, target.dataset.biome as BiomeId, Date.now());
    sleepingUntil = 0;
    addEvent(
      `${state.pet.name} descubrió ${BIOMES.find((b) => b.id === state.pet.biome)!.name}.`,
      'compass',
    );
    closeDialogs();
    renderState();
    persist();
    say('Un nuevo lugar… ¡vamos a explorarlo!');
  }
});
$('#rename-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const name = $<HTMLInputElement>('#pet-name-input').value.trim();
  if (!name) return;
  reconcileSavedState();
  state = renamePet(state, name);
  persist();
  renderState();
  selectTool(selectedTool);
  $<HTMLDialogElement>('#rename-dialog').close();
  addEvent(`Tu amistad ahora tiene un nombre: ${state.pet.name}.`);
  say(`¡${state.pet.name}! Me gusta cómo suena.`);
});
$('#game-dialog').addEventListener('cancel', (event) => {
  event.preventDefault();
  closeGame();
});
$('#pet-interact').addEventListener('keydown', (event) => {
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key))
    event.preventDefault();
});
document.addEventListener('keydown', (event) => {
  if (
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    document.querySelector('dialog[open]') ||
    (event.target as Element).closest('input,textarea,[contenteditable=true]')
  )
    return;
  const tools: Record<string, SceneTool> = { '1': 'hand', '2': 'feed', '3': 'clean', '4': 'rest' };
  if (tools[event.key]) {
    event.preventDefault();
    selectTool(tools[event.key]);
  }
  if (event.key === 'Escape') {
    selectTool('hand');
    $('#tool-cursor').hidden = true;
    drag = null;
  }
  const steps: Record<string, [number, number]> = {
    ArrowLeft: [-0.09, 0],
    ArrowRight: [0.09, 0],
    ArrowUp: [0, -0.055],
    ArrowDown: [0, 0.055],
  };
  if (steps[event.key]) {
    event.preventDefault();
    sleepingUntil = 0;
    renderState();
    const position = scene.getPetPosition();
    scene.walkTo(position.x + steps[event.key][0], position.y + steps[event.key][1]);
  }
  if (event.key === ' ' && !(event.target as Element).closest('button,a')) {
    event.preventDefault();
    interactWithPet();
  }
});
// A held tool can be carried straight into the world, with a tap alternative on touch.
document.querySelectorAll<HTMLButtonElement>('.tool-button[data-tool]').forEach((button) => {
  button.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    drag = {
      tool: button.dataset.tool as SceneTool,
      x: event.clientX,
      y: event.clientY,
      active: false,
      pointerId: event.pointerId,
    };
  });
});
window.addEventListener('pointermove', (event) => {
  const cursor = $('#tool-cursor');
  if (drag && event.pointerType === 'mouse' && event.buttons === 0) drag = null;
  if (drag && drag.pointerId === event.pointerId) {
    if (!drag.active && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > 10) {
      drag.active = true;
      selectTool(drag.tool);
    }
    if (drag.active) {
      cursor.hidden = false;
      cursor.classList.add('dragging');
      cursor.style.left = `${event.clientX}px`;
      cursor.style.top = `${event.clientY}px`;
      return;
    }
  }
  cursor.classList.remove('dragging');
  const onWorld =
    event.target === canvas &&
    !document.querySelector('dialog[open]') &&
    event.pointerType !== 'touch';
  cursor.hidden = !onWorld || selectedTool === 'hand';
  cursor.style.left = `${event.clientX}px`;
  cursor.style.top = `${event.clientY}px`;
});
window.addEventListener(
  'pointerup',
  (event) => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const wasDragging = drag.active;
    const tool = drag.tool;
    drag = null;
    if (!wasDragging) return;
    blockToolClickUntil = performance.now() + 200;
    $('#tool-cursor').hidden = true;
    $('#tool-cursor').classList.remove('dragging');
    const position = scene.getPetPosition();
    const bounds = canvas.getBoundingClientRect();
    const dx = event.clientX - bounds.left - position.x * bounds.width;
    const dy = event.clientY - bounds.top - position.y * bounds.height;
    const radius = innerWidth < 600 ? 78 : 112;
    if (Math.hypot(dx / radius, dy / (radius * 1.3)) < 1) interactWithPet(tool);
    event.stopPropagation();
    event.preventDefault();
  },
  true,
);
window.addEventListener('blur', () => {
  drag = null;
  $('#tool-cursor').hidden = true;
});
window.addEventListener('pointercancel', () => {
  drag = null;
  $('#tool-cursor').hidden = true;
  $('#tool-cursor').classList.remove('dragging');
});
function followPet() {
  const position = scene.getPetPosition();
  const bounds = canvas.getBoundingClientRect();
  const x = position.x * bounds.width;
  const y = position.y * bounds.height;
  const proxy = $('#pet-interact');
  proxy.style.left = `${x}px`;
  proxy.style.top = `${y}px`;
  $('.game-shell').style.setProperty('--pet-x', `${x}px`);
  $('.game-shell').style.setProperty('--pet-y', `${y}px`);
  if (!document.hidden) positionFrame = requestAnimationFrame(followPet);
  else positionFrame = 0;
}
let positionFrame = requestAnimationFrame(followPet);
window.addEventListener('storage', (event) => {
  if (event.key !== SAVE_KEY || !event.newValue) return;
  const restored = parseSave(event.newValue, Date.now());
  if (restored) {
    state = restored;
    renderState();
  }
});
window.addEventListener('pagehide', () => {
  reconcileSavedState();
  state = advanceTime(state, Date.now());
  persist();
  if (positionFrame) cancelAnimationFrame(positionFrame);
  positionFrame = 0;
});
window.addEventListener('pageshow', () => {
  reconcileSavedState();
  state = advanceTime(state, Date.now());
  renderState();
  if (!document.hidden && !positionFrame) positionFrame = requestAnimationFrame(followPet);
  if (gameRunning && performance.now() >= gameEnds) finishGame();
});
document.addEventListener('visibilitychange', () => {
  reconcileSavedState();
  if (!document.hidden) {
    state = advanceTime(state, Date.now());
    renderState();
    if (!positionFrame) positionFrame = requestAnimationFrame(followPet);
    if (gameRunning && performance.now() >= gameEnds) finishGame();
  }
  persist();
});
setInterval(() => {
  reconcileSavedState();
  state = advanceTime(state, Date.now());
  renderState();
  persist();
}, 10000);
setInterval(() => {
  if (
    document.hidden ||
    document.querySelector('dialog[open]') ||
    gameRunning ||
    Date.now() < sleepingUntil
  )
    return;
  const needs = state.pet.needs;
  say(
    needs.hunger < 35
      ? 'Mi pancita hace ruiditos…'
      : needs.energy < 35
        ? 'Me vendría bien una siestita.'
        : needs.hygiene < 35
          ? '¿Jugamos con unas burbujas?'
          : [
              '¿Qué habrá al final del sendero?',
              'Qué bonito es estar aquí contigo.',
              '¿Has visto las lucecitas?',
              '¡Podría explorar todo el día!',
            ][Math.floor(Math.random() * 4)],
    4500,
  );
}, 25000);
addEvent(
  initial
    ? `${state.pet.name} se alegra de verte de nuevo.`
    : `${state.pet.name} llegó a su nuevo hogar. Aquí empieza su historia.`,
  'leaf',
);
renderState();
renderBiomes();
selectTool('hand');
persist();
say(initial ? '¡Volviste! ¿Damos una vuelta?' : 'Hola… ¿exploramos juntos?', 6500);
if (corruptSave) toast('El guardado anterior estaba dañado. Creamos un nuevo hogar para empezar.');
if (!saveAvailable) toast('El navegador no permite guardar. El progreso durará esta sesión.');
