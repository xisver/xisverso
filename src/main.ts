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
import { createScene } from './render/scene';

const icons: Record<string, string> = {
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
let activeView = 'home';
let sleepingUntil = 0;
let lastCare = -Infinity;
let journal: { text: string; time: string; type: string }[] = [];
let toastTimer: ReturnType<typeof setTimeout>;
let gameTimer: ReturnType<typeof setInterval> | undefined;
let gameRunning = false;
let gameScore = 0;
let gameEnds = 0;
let gameFinished = false;

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <aside class="sidebar">
    <a class="brand" href="#refugio" aria-label="Xisverso, mi refugio"><span class="brand-mark">${icon('leaf')}</span><span>Xisverso<span class="brand-sub">UN MUNDO DE XISSOFT</span></span></a>
    <div class="nav-caption">TU PEQUEÑO UNIVERSO</div>
    <nav class="main-nav" aria-label="Navegación principal">
      <button class="nav-item active" data-view="home" aria-label="Mi refugio">${icon('home')}<span>Mi refugio</span><span class="nav-dot"></span></button>
      <button class="nav-item" data-view="biomes" aria-label="Explorar biomas">${icon('compass')}<span>Explorar biomas</span></button>
      <button class="nav-item" data-view="journal" aria-label="Mi bitácora">${icon('book')}<span>Mi bitácora</span></button>
      <button class="nav-item" data-view="community" aria-label="Comunidad">${icon('friends')}<span>Comunidad</span><span class="soon-dot" title="En desarrollo"></span></button>
    </nav>
    <div class="sidebar-note"><span class="little-flower">✳</span><p>Las grandes amistades<br>empiezan en pequeño.</p><span>CRECE A TU RITMO</span></div>
    <div class="studio"><span class="studio-avatar">X</span><div><strong>XisSoft</strong><span>Laboratorio de mundos</span></div><span class="studio-spark">✧</span></div>
  </aside>
  <main class="main-content">
    <header class="topbar"><span class="breadcrumb">Mi universo <span>/</span> <strong id="view-label">Mi refugio</strong></span><div class="topbar-right"><span class="local-status"><span></span>Guardado local</span><span class="wallet">${icon('coin')}<strong id="coins">80</strong><span>semillas</span></span></div></header>
    <section class="page-intro"><div><p class="eyebrow">UN POQUITO DE CUIDADO, UN MUNDO DE CARIÑO</p><h1 id="page-title">Tu lugar feliz.</h1><p id="page-subtitle">Un nuevo día para crecer juntos, a tu propio ritmo.</p></div><span class="day-chip">${icon('sun')}<span id="date-label"></span></span></section>
    <div id="home-view" class="view">
      <div class="refuge-grid">
        <section class="habitat-card" aria-label="Hábitat de tu mascota">
          <div class="scene-wrap"><canvas id="pet-scene" role="img" aria-label="Nubi, una mascota dibujada por código, en su hábitat"></canvas><div class="scene-top"><span class="biome-pill">${icon('leaf')}<span id="biome-name">Bosque susurrante</span></span><button class="scene-change" data-view="biomes">Cambiar bioma ${icon('arrow')}</button></div><span class="scene-tag">UN PEQUEÑO MUNDO VIVO</span><button class="pet-touch" aria-label="Acariciar a tu mascota" title="Dale una caricia a Nubi"></button><div class="scene-caption"><span class="mood-dot"></span><span id="scene-mood">Nubi está explorando su hogar</span><span class="scene-decoration">✧</span></div></div>
          <div class="pet-profile"><div class="pet-identity"><span class="pet-avatar">${icon('leaf')}</span><div><div class="pet-name-line"><h2 id="pet-name">Nubi</h2><button id="rename-button" class="icon-button" aria-label="Cambiar nombre">${icon('edit')}</button><span class="species-tag">Brotín</span></div><p id="pet-description">Un espíritu curioso del bosque</p></div></div><div class="pet-level"><span class="level-badge">1</span><div><strong id="level-label">Pequeño explorador</strong><span id="xp-label">0 / 100 XP</span><div class="xp-track"><span id="xp-fill"></span></div></div></div></div>
        </section>
        <aside class="wellbeing-card"><div class="card-heading"><span class="eyebrow">LOS PEQUEÑOS CUIDADOS</span><span class="soft-icon">${icon('heart')}</span></div><h2>¿Cómo está <span id="needs-name">Nubi</span>?</h2><p class="muted">Cada detalle le hace bien.</p><div id="needs-list" class="needs-list"></div><div class="bond-panel"><div>${icon('heart')}<strong>Su vínculo contigo</strong><span id="bond-label">0%</span></div><div class="bond-track"><span id="bond-fill"></span></div><p id="bond-description">Una amistad que apenas comienza.</p></div><div class="care-tip">${icon('spark')}<p>Una caricia también cuenta.<br><strong>Estar aquí ya es un gran comienzo.</strong></p></div></aside>
      </div>
      <section class="care-section"><div class="section-title"><h2>Un ratito para ustedes</h2><span>Los pequeños momentos importan</span></div><div class="care-actions">
        <button class="care-action" data-care="feed"><span class="action-icon food">${icon('food')}</span><span><strong>Dar de comer</strong><small>Algo rico para crecer</small></span><span class="action-price">5 ${icon('coin')}</span></button>
        <button class="care-action" data-care="clean"><span class="action-icon water">${icon('drop')}</span><span><strong>Un baño</strong><small>Fresco como una hoja</small></span><span class="action-arrow">↗</span></button>
        <button class="care-action" data-care="pet"><span class="action-icon love">${icon('heart')}</span><span><strong>Dar cariño</strong><small>Su momento favorito</small></span><span class="action-arrow">↗</span></button>
        <button class="care-action" data-care="rest"><span class="action-icon rest">${icon('moon')}</span><span><strong>Descansar</strong><small>Soñar nuevas aventuras</small></span><span class="action-arrow">↗</span></button>
      </div></section>
      <div class="discovery-grid"><section class="adventure-card"><div class="adventure-copy"><span class="eyebrow">UNA PEQUEÑA AVENTURA</span><h2>¡Sigue las lucecitas!</h2><p>Recoge luciérnagas con tu mascota.<br>Un juego, muchas semillas y un ratito juntos.</p><button class="primary-button" id="start-game">Vamos a jugar ${icon('arrow')}</button><span id="best-score" class="best-score">Tu primera aventura te espera</span></div><div class="adventure-art" aria-hidden="true"><span class="art-moon"></span><span class="art-hill hill-one"></span><span class="art-hill hill-two"></span><span class="art-leaf leaf-one"></span><span class="art-leaf leaf-two"></span><span class="art-firefly f1"></span><span class="art-firefly f2"></span><span class="art-firefly f3"></span><span class="art-firefly f4"></span></div></section><section class="moments-card"><div class="section-title"><h2>Pequeños recuerdos</h2>${icon('book')}</div><p class="muted">Lo bonito de esta sesión.</p><div id="recent-events" class="recent-events"></div><button class="text-button" data-view="journal">Abrir mi bitácora ${icon('arrow')}</button></section></div>
    </div>
    <section id="biomes-view" class="view" hidden><div class="section-banner">${icon('compass')}<p>Cada rincón tiene su propio encanto. Explora los tres biomas de esta primera versión con tu mascota.</p></div><div id="biome-cards" class="biome-cards"></div><p class="view-footnote">Próximamente: especies propias de cada bioma y un refugio para varias mascotas.</p></section>
    <section id="journal-view" class="view" hidden><div class="journal-panel"><span class="eyebrow">RECUERDOS DE ESTA SESIÓN</span><h2>Las pequeñas cosas se quedan contigo.</h2><p class="muted">El progreso de tu mascota se guarda en este navegador. Esta bitácora muestra los momentos desde que abriste el juego.</p><div id="journal-events" class="journal-events"></div></div></section>
    <section id="community-view" class="view" hidden><div class="community-hero"><span class="community-illustration">${icon('friends')}</span><span class="eyebrow">EL MUNDO CRECERÁ CONTIGO</span><h2>Las amistades también<br>cruzan biomas.</h2><p>Estamos preparando un lugar para que tu mascota conozca a las de otros jugadores. Por ahora, disfruta de su primer hogar.</p><span class="development-badge">En la ruta de desarrollo</span></div><div class="community-steps"><article>${icon('home')}<h3>Visita otros refugios</h3><p>Conoce mascotas y comparte pequeños momentos.</p></article><article>${icon('friends')}<h3>Convive en tiempo real</h3><p>Salas privadas para jugar con tus amistades.</p></article><article>${icon('spark')}<h3>Jueguen en equipo</h3><p>Minijuegos cooperativos y nuevas aventuras.</p></article></div></section>
    <footer class="page-footer"><span>${icon('leaf')} Hecho para crecer contigo.</span><span>Xisverso <span>·</span> XisSoft <span>·</span> Versión semilla 0.1</span></footer>
  </main>
  <div id="toast" class="toast" role="status" aria-live="polite"></div>
  <dialog id="rename-dialog" class="rename-dialog" aria-labelledby="rename-title"><form id="rename-form"><button type="button" class="dialog-close" data-close="rename-dialog" aria-label="Cerrar">${icon('close')}</button><span class="eyebrow">UNA AMISTAD CON NOMBRE PROPIO</span><h2 id="rename-title">¿Cómo se llama tu mascota?</h2><label for="pet-name-input">Su nombre</label><input id="pet-name-input" name="petName" maxlength="24" required autocomplete="off" placeholder="Nubi" /><p class="muted">Hasta 24 caracteres. Puedes cambiarlo cuando quieras.</p><button class="primary-button" type="submit">Guardar nombre ${icon('check')}</button></form></dialog>
  <dialog id="game-dialog" class="game-dialog" aria-labelledby="game-title"><div class="game-header"><div><span class="eyebrow">UNA AVENTURA JUNTOS</span><h2 id="game-title">Atrapa las luciérnagas</h2></div><button type="button" class="dialog-close" id="exit-game" aria-label="Salir del minijuego">${icon('close')}</button></div><p class="game-instructions">Toca las lucecitas antes de que termine el tiempo. También puedes usar Tab y Enter.</p><div class="game-counters"><span>${icon('sun')}<strong id="game-time">20</strong> segundos</span><span>${icon('spark')}<strong id="game-score">0</strong> luciérnagas</span></div><div class="game-field" id="game-field"><span class="game-horizon"></span></div><div id="game-result" class="game-result" hidden></div><p class="game-tip">Cada luciérnaga cuenta. Las recompensas se entregan al terminar los 20 segundos.</p></dialog>
`;

const $ = <T extends HTMLElement = HTMLElement>(selector: string) =>
  document.querySelector<T>(selector)!;
const scene = createScene($('#pet-scene'), {
  seed: state.pet.seed,
  biome: state.pet.biome,
  mood: getMood(state),
  sleeping: false,
});

function toast(message: string) {
  clearTimeout(toastTimer);
  $('#toast').textContent = message;
  $('#toast').classList.add('visible');
  toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 3800);
}
function reconcileSavedState() {
  try {
    const restored = parseSave(localStorage.getItem(SAVE_KEY), Date.now());
    if (restored) state = restored;
  } catch {
    /* The session remains playable when storage is unavailable. */
  }
}
function persist() {
  try {
    localStorage.setItem(SAVE_KEY, serializeSave(state));
    saveAvailable = true;
  } catch {
    if (saveAvailable)
      toast('No se pudo guardar. Mantén esta pestaña abierta para conservar la sesión.');
    saveAvailable = false;
  }
  const badge = $('.local-status');
  badge.innerHTML = `<span></span>${saveAvailable ? 'Guardado local' : 'Sin guardar'}`;
  badge.classList.toggle('save-error', !saveAvailable);
}
function addEvent(text: string, type = 'heart') {
  journal.unshift({
    text,
    time: new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit' }).format(
      new Date(),
    ),
    type,
  });
  journal = journal.slice(0, 60);
  renderJournal();
}
function renderJournal() {
  const markup = (entries: typeof journal) =>
    entries
      .map(
        (event) =>
          `<div class="journal-event"><span class="event-icon">${icon(event.type)}</span><div><p>${escapeHtml(event.text)}</p><span>${event.time}</span></div></div>`,
      )
      .join('');
  $('#recent-events').innerHTML = markup(journal.slice(0, 2));
  $('#journal-events').innerHTML = markup(journal);
}
const needsMeta = [
  {
    key: 'hunger' as const,
    name: 'Saciedad',
    icon: 'food',
    color: '#d7a164',
    text: 'A pancita llena, corazón contento',
  },
  {
    key: 'energy' as const,
    name: 'Energía',
    icon: 'sun',
    color: '#d1bc6b',
    text: 'Para explorar un poquito más',
  },
  {
    key: 'hygiene' as const,
    name: 'Higiene',
    icon: 'drop',
    color: '#80b9c1',
    text: 'Un pequeño baño le viene bien',
  },
  {
    key: 'joy' as const,
    name: 'Ánimo',
    icon: 'smile',
    color: '#a4b98b',
    text: 'La alegría de estar juntos',
  },
];
function renderState() {
  $('#coins').textContent = `${Math.floor(state.coins)}`;
  $('#pet-name').textContent = state.pet.name;
  $('#needs-name').textContent = state.pet.name;
  $('#biome-name').textContent =
    BIOMES.find((b) => b.id === state.pet.biome)?.name ?? 'Bosque susurrante';
  const species = {
    forest: ['Brotín', 'Un espíritu curioso del bosque'],
    coast: ['Brisín', 'Un espíritu juguetón de la costa'],
    tundra: ['Nevín', 'Un espíritu cálido de la tundra'],
  }[state.pet.biome];
  $('.species-tag').textContent = species[0];
  $('#pet-description').textContent = species[1];
  const levelProgress = getLevelProgress(state);
  $('.level-badge').textContent = `${state.level}`;
  $('#level-label').textContent =
    state.level < 3
      ? 'Pequeño explorador'
      : state.level < 6
        ? 'Compañero de aventuras'
        : 'Gran amistad';
  $('#xp-label').textContent =
    `${Math.floor(levelProgress.current)} / ${levelProgress.required} XP`;
  $('#xp-fill').style.width = `${levelProgress.percent}%`;
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
  const moodMessages: Record<string, string> = {
    'Con sueño': 'tiene un poquito de sueño',
    'Tiene hambre': 'tiene hambre',
    'Quiere un baño': 'quiere un baño',
    'Busca compañía': 'quiere pasar un ratito contigo',
    Radiante: 'se siente radiante',
    'A gusto': 'se siente a gusto',
    'Necesita cuidados': 'necesita un poquito de cuidado',
  };
  $('#scene-mood').textContent = sleeping
    ? `${state.pet.name} está soñando una nueva aventura`
    : `${state.pet.name} ${moodMessages[mood] ?? 'está explorando su hogar'}`;
  $('#pet-scene').setAttribute(
    'aria-label',
    `${state.pet.name}, en ${$('#biome-name').textContent}. ${mood}`,
  );
  $('.pet-touch').setAttribute('aria-label', `Acariciar a ${state.pet.name}`);
  $('#best-score').textContent = state.miniGameBest
    ? `Tu mejor aventura: ${state.miniGameBest} luciérnagas`
    : 'Tu primera aventura te espera';
  scene.update({ seed: state.pet.seed, biome: state.pet.biome, mood, sleeping });
  renderBiomes();
}
function renderBiomes() {
  const details = {
    forest: {
      icon: 'leaf',
      subtitle: 'ENTRE HOJAS Y SUSURROS',
      copy: 'Senderos verdes, honguitos y una brisa que invita a explorar.',
      tag: 'Espíritu del bosque',
      trait: 'La alegría se conserva mejor entre los árboles.',
    },
    coast: {
      icon: 'wave',
      subtitle: 'AL RITMO DE LAS OLAS',
      copy: 'Arena suave, conchas y un horizonte lleno de pequeñas sorpresas.',
      tag: 'Espíritu de la costa',
      trait: 'La brisa salada pide un poco más de cuidado e higiene.',
    },
    tundra: {
      icon: 'mountain',
      subtitle: 'UN ABRAZO ENTRE LA NIEVE',
      copy: 'Montañas de algodón y un rincón cálido para soñar juntos.',
      tag: 'Espíritu de la tundra',
      trait: 'El frío consume más energía: descansar es importante.',
    },
  };
  $('#biome-cards').innerHTML = BIOMES.map((biome) => {
    const detailsForBiome = details[biome.id];
    const selected = state.pet.biome === biome.id;
    return `<article class="biome-card ${biome.id} ${selected ? 'selected' : ''}"><div class="biome-art">${icon(detailsForBiome.icon)}<span class="biome-art-orb"></span><span class="biome-art-ground"></span></div><div class="biome-card-content"><span class="eyebrow">${detailsForBiome.subtitle}</span><h2>${escapeHtml(biome.name)}</h2><p>${detailsForBiome.copy}</p><span class="biome-trait">${icon('spark')}${detailsForBiome.trait}</span><button class="${selected ? 'secondary-button' : 'primary-button'}" data-biome="${biome.id}" ${selected ? 'disabled' : ''}>${selected ? 'Tu hogar actual' : 'Explorar este bioma'} ${icon(selected ? 'check' : 'arrow')}</button></div></article>`;
  }).join('');
}
function showView(view: string) {
  if (!['home', 'biomes', 'journal', 'community'].includes(view)) return;
  activeView = view;
  for (const id of ['home', 'biomes', 'journal', 'community'])
    $(`#${id}-view`).hidden = id !== view;
  document.querySelectorAll<HTMLButtonElement>('.nav-item').forEach((button) => {
    const selected = button.dataset.view === view;
    button.classList.toggle('active', selected);
    if (selected) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  const labels: Record<string, string[]> = {
    home: ['Mi refugio', 'Tu lugar feliz.', 'Un nuevo día para crecer juntos, a tu propio ritmo.'],
    biomes: [
      'Explorar biomas',
      'Un mundo por descubrir.',
      'Tres pequeños rincones. Mil formas de sentirse en casa.',
    ],
    journal: [
      'Mi bitácora',
      'Todo empieza con un recuerdo.',
      'Los pequeños momentos de una amistad que crece.',
    ],
    community: [
      'Comunidad',
      'Mejor, cuando es juntos.',
      'El siguiente capítulo de nuestro pequeño universo.',
    ],
  };
  $('#view-label').textContent = labels[view][0];
  $('#page-title').textContent = labels[view][1];
  $('#page-subtitle').textContent = labels[view][2];
  if (view === 'home') requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
}
function care(action: Action) {
  if (performance.now() - lastCare < 850) return;
  lastCare = performance.now();
  reconcileSavedState();
  const result = applyCare(state, action, Date.now());
  state = result.state;
  if (result.success) {
    if (action === 'rest') sleepingUntil = Date.now() + 10000;
    else sleepingUntil = 0;
    scene.react(action);
    addEvent(result.message, { feed: 'food', clean: 'drop', rest: 'moon', pet: 'heart' }[action]);
    persist();
  }
  renderState();
  toast(result.message);
}
function openRename() {
  $('#pet-name-input').setAttribute('value', state.pet.name);
  const input = $<HTMLInputElement>('#pet-name-input');
  input.value = state.pet.name;
  $<HTMLDialogElement>('#rename-dialog').showModal();
  input.select();
}
function moveFirefly(button: HTMLButtonElement) {
  button.style.left = `${7 + Math.random() * 80}%`;
  button.style.top = `${12 + Math.random() * 66}%`;
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
  const target = (event.target as HTMLElement).closest<HTMLElement>('button, a.brand');
  if (!target) return;
  if (target.dataset.view) showView(target.dataset.view);
  if (target.dataset.care) care(target.dataset.care as Action);
  if (target.classList.contains('pet-touch')) care('pet');
  if (target.classList.contains('brand')) {
    event.preventDefault();
    showView('home');
  }
  if (target.dataset.biome) {
    reconcileSavedState();
    state = changeBiome(state, target.dataset.biome as BiomeId, Date.now());
    sleepingUntil = 0;
    addEvent(
      `${state.pet.name} descubrió ${BIOMES.find((b) => b.id === state.pet.biome)!.name}.`,
      'compass',
    );
    renderState();
    persist();
    showView('home');
    toast('¡Un nuevo rincón para explorar juntos!');
  }
  if (target.id === 'rename-button') openRename();
  if (target.id === 'start-game' || target.id === 'game-again') startGame();
  if (target.id === 'exit-game') closeGame();
  if (target.dataset.close) {
    if (target.dataset.close === 'game-dialog') closeGame();
    else $<HTMLDialogElement>(`#${target.dataset.close}`).close();
  }
});
$('#rename-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const name = $<HTMLInputElement>('#pet-name-input').value.trim();
  if (!name) {
    $<HTMLInputElement>('#pet-name-input').focus();
    return;
  }
  reconcileSavedState();
  state = renamePet(state, name);
  persist();
  renderState();
  $<HTMLDialogElement>('#rename-dialog').close();
  addEvent(`Tu amistad ahora tiene un nombre: ${state.pet.name}.`, 'heart');
  toast(`¡Le queda muy bien ${state.pet.name}!`);
});
$('#game-dialog').addEventListener('cancel', (event) => {
  event.preventDefault();
  closeGame();
});
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
});
document.addEventListener('visibilitychange', () => {
  reconcileSavedState();
  if (!document.hidden) {
    state = advanceTime(state, Date.now());
    renderState();
    if (gameRunning && performance.now() >= gameEnds) finishGame();
  }
  persist();
});
setInterval(() => {
  reconcileSavedState();
  state = advanceTime(state, Date.now());
  if (activeView === 'home') renderState();
  persist();
}, 10000);
$('#date-label').textContent = new Intl.DateTimeFormat('es-MX', {
  day: 'numeric',
  month: 'long',
}).format(new Date());
addEvent(
  initial
    ? `${state.pet.name} se alegra de verte de nuevo.`
    : `${state.pet.name} llegó a su nuevo hogar. Aquí empieza su historia.`,
  'leaf',
);
renderState();
showView('home');
persist();
if (corruptSave) toast('El guardado anterior estaba dañado. Creamos un nuevo hogar para empezar.');
if (!saveAvailable) toast('El navegador no permite guardar. El progreso durará esta sesión.');
