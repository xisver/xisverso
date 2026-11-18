import './style.css';
import {
  BIOMES,
  DECORATIONS,
  purchaseDecoration,
  type DecorationId,
  STARTER_EGGS,
  createStarterGame,
  type StarterEggId,
  MATERIALS,
  RECIPES,
  getLifeProgress,
  releaseAdult,
  craftFood,
  selectFood,
  startExpedition,
  completeExpedition,
  interactPets,
  type RecipeId,
  type MaterialId,
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
import { createScene, type SceneTool, type ScenePet } from './render/scene';
import { createAudio } from './audio';
import { MINI_GAMES, mountMiniGame, type MiniGameId } from './minigames';
import {
  firebaseConfigured,
  connectVisits,
  publishWorld,
  visitWorld,
  unpublishWorld,
  describeVisitError,
} from './social/firebase';

const audio = createAudio();

const icons: Record<string, string> = {
  apple:
    '<path d="M12 7C5 2 1 10 5 17c3 6 5 3 7 3s4 3 7-3c4-7 0-15-7-10Z"/><path d="M12 7c-1-4 1-6 4-6m-4 4c-4 0-5-2-5-3 3-1 5 0 5 3"/>',
  egg: '<path d="M20 15c0 5-3 7-8 7s-8-2-8-7S8 2 12 2s8 8 8 13Z"/><path d="m9 12 2-2 3 3 2-2"/>',
  bag: '<path d="M5 8h14l2 13H3ZM8 8V5a4 4 0 0 1 8 0v3"/>',
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
const SAVE_KEY = 'xisverso.save.v3';
const PREVIOUS_SAVE_KEY = 'xisverso.save.v2';
const LEGACY_SAVE_KEY = 'xisverso.save.v1';
let lastSeenRaw: string | null = null;
let unsavedChanges = false;
let saveAvailable = true;
let initial: GameState | null = null;
let corruptSave = false;
let restoredBackup = false;
try {
  lastSeenRaw = localStorage.getItem(SAVE_KEY);
  for (const key of [SAVE_KEY, PREVIOUS_SAVE_KEY, LEGACY_SAVE_KEY]) {
    const raw = localStorage.getItem(key);
    if (!raw) continue;
    const parsed = parseSave(raw, Date.now());
    if (parsed) {
      initial = parsed;
      restoredBackup = corruptSave;
      break;
    }
    corruptSave = true;
  }
} catch {
  saveAvailable = false;
}
let state = initial ?? createGame();
let needsOnboarding = initial === null;
let starterEgg: StarterEggId = 'speckled';
let starterBiome: BiomeId = 'forest';
let sleepingUntil = 0;
let selectedCompanions = new Set<string>();
let lastRenderedId = state.pet.id;
let lastRenderedStage = state.pet.stage;
let lastAutoSave = Date.now();
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
let selectedGame: MiniGameId = 'fireflies';
let gameController: ReturnType<typeof mountMiniGame> | undefined;
let visitScene: ReturnType<typeof createScene> | undefined;
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
      <div class="hud-right"><button class="menu-button" data-open="audio-dialog" aria-label="Sonido y música" title="Sonido y música">♫</button><span class="wallet" title="Puntos para decorar">${icon('coin')}<strong id="coins">80</strong><span>puntos</span></span><button class="menu-button" data-open="menu-dialog" aria-label="Menú">${icon('menu')}</button></div>
    </header>
    <button class="pet-status-button" id="open-pet" data-open="pet-dialog" aria-label="Cómo está Nubi"><span class="pet-status-avatar">${icon('leaf')}</span><span><strong id="pet-name">Nubi</strong><small id="scene-mood">Con ganas de explorar</small></span><span class="status-chevron">${icon('heart')}</span></button>
    <div class="speech-bubble" id="pet-speech"><span id="pet-thought"></span><span class="speech-heart">♡</span></div>
    <button id="pet-interact" class="pet-interact" aria-label="Interactuar con Nubi" aria-describedby="interaction-hint"></button>
    <button class="world-sign travel-sign" data-open="travel-dialog" aria-label="Ir al sendero">${icon('compass')}<span>Otros rincones</span><span>↖</span></button>
    <button class="world-sign explore-sign" data-open="explore-dialog" aria-label="Explorar">${icon('compass')}<span id="explore-sign-label">Explorar</span><span>↗</span></button>

    <p class="interaction-hint" id="interaction-hint">Toca a Nubi para darle cariño · Toca el suelo para caminar</p>
    <nav class="toolbelt" aria-label="Herramientas del refugio">
      <button class="tool-button selected" data-tool="hand" aria-label="Caricias" aria-pressed="true" aria-keyshortcuts="1"><span class="tool-key">1</span><span class="tool-icon">${icon('heart')}</span><span class="tool-name">Caricias</span></button>
      <div class="feed-tool-wrap"><div id="food-options" class="food-options" hidden><strong>Su próxima comida</strong><button data-open="kitchen-dialog">${icon('food')} Cocinar</button><button data-open="food-dialog">${icon('apple')} Elegir alimento</button></div><button class="tool-button" data-tool="feed" aria-label="Alimentar" aria-pressed="false" aria-expanded="false" aria-controls="food-options" aria-keyshortcuts="2"><span class="tool-key">2</span><span class="tool-icon">${icon('apple')}</span><span class="tool-name">Alimentar</span><span class="tool-price" title="Raciones preparadas"><span id="food-count">1</span> ${icon('food')}</span></button></div>
      <button class="tool-button" data-tool="clean" aria-label="Burbujas" aria-pressed="false" aria-keyshortcuts="3"><span class="tool-key">3</span><span class="tool-icon">${icon('drop')}</span><span class="tool-name">Burbujas</span></button>
      <button class="tool-button" data-tool="rest" aria-label="Siesta" aria-pressed="false" aria-keyshortcuts="4"><span class="tool-key">4</span><span class="tool-icon">${icon('moon')}</span><span class="tool-name">Siesta</span></button>
      <span class="tool-divider" aria-hidden="true"></span>
      <button class="tool-button play-tool" id="start-game" data-play="true" aria-label="Jugar"><span class="tool-icon">${icon('spark')}</span><span class="tool-name">Jugar</span></button>
    </nav>
    <footer class="world-footer"><span>XisSoft <span>✧</span> Crece a tu ritmo</span><span class="local-status"><span></span>Guardado local</span></footer>
    <span class="tool-cursor" id="tool-cursor" hidden aria-hidden="true"></span>
  </main>
  <div id="toast" class="game-toast" role="status" aria-live="polite"></div>
  <dialog id="welcome-dialog" class="welcome-dialog" aria-labelledby="welcome-title" aria-describedby="welcome-description">
    <form id="welcome-form">
      <div class="welcome-intro"><span class="welcome-brand">${icon('leaf')} Xisverso <small>UN MUNDO DE XISSOFT</small></span><p class="eyebrow">CADA GRAN AMISTAD EMPIEZA EN PEQUEÑO</p><h2 id="welcome-title">Su historia<br> empieza contigo.</h2><p id="welcome-description">Elige un pequeño huevo y el primer lugar que llamarán hogar.</p><div id="starter-preview" class="starter-preview" aria-hidden="true">${starterEggSvg(starterEgg, starterBiome, 'hero')}</div><div class="starter-preview-caption"><span class="preview-spark">✧</span><strong id="starter-summary">Moteado · Bosque Susurro</strong><p>Un mundo entero por descubrir juntos.</p></div></div>
      <div class="welcome-choices"><fieldset class="starter-fieldset"><legend><span>01</span> Elige tu huevo</legend><p class="starter-section-note">Tres pequeños comienzos, todos llenos de posibilidades.</p><div class="starter-egg-grid">${STARTER_EGGS.map((egg) => `<label class="starter-choice egg-choice"><input type="radio" name="starter-egg" value="${egg.id}" aria-label="Huevo ${egg.name}" ${egg.id === starterEgg ? 'checked' : ''} /><span class="starter-egg-art" data-egg-preview="${egg.id}" aria-hidden="true">${starterEggSvg(egg.id, starterBiome, 'card')}</span><strong>${egg.name}</strong><small>${egg.description}</small></label>`).join('')}</div></fieldset>
      <fieldset class="starter-fieldset"><legend><span>02</span> Su primer hogar</legend><p class="starter-section-note">Este bioma le dará sus rasgos. Después podrán viajar sin cambiarlos.</p><div class="starter-biome-grid">${BIOMES.map((biome) => `<label class="starter-choice biome-choice ${biome.id}"><input type="radio" name="starter-biome" value="${biome.id}" aria-label="${biome.name}" ${biome.id === starterBiome ? 'checked' : ''}/><span class="starter-biome-icon" aria-hidden="true">${icon({ forest: 'leaf', coast: 'wave', tundra: 'mountain' }[biome.id])}</span><strong>${biome.label}</strong><small>${biome.name}</small></label>`).join('')}</div></fieldset>
      <p id="welcome-notice" class="welcome-notice" role="status" hidden></p><button id="begin-adventure" class="primary-button welcome-start" type="submit">Comenzar nuestra historia ${icon('arrow')}</button><p class="welcome-save-note">Tu elección se guarda al comenzar. Crezcan a su propio ritmo.</p></div>
    </form>
  </dialog>
  <dialog id="pet-dialog" class="sheet-dialog" aria-labelledby="pet-sheet-title"><button class="dialog-close" data-close="pet-dialog" aria-label="Cerrar">${icon('close')}</button><span class="eyebrow">UN RATITO PARA CONOCERSE</span><div class="pet-sheet-heading"><div><h2 id="pet-sheet-title">Cómo está <span id="needs-name">Nubi</span></h2><p class="muted"><span class="species-tag">Brotín</span> · <span id="pet-description">Un espíritu curioso del bosque</span></p></div><button id="rename-button" class="icon-button" aria-label="Cambiar nombre">${icon('edit')}</button></div><div class="life-panel"><div><strong id="life-label">Huevo</strong><span id="life-next">Un nuevo comienzo</span></div><div id="life-progress" class="life-track" role="progressbar" aria-label="Crecimiento" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span id="life-fill"></span></div><p id="origin-biome" class="muted"></p><p id="life-help" class="muted"></p></div><div id="needs-list" class="needs-list"></div><div class="bond-panel"><div>${icon('heart')}<strong>Su vínculo contigo</strong><span id="bond-label">12%</span></div><div class="bond-track"><span id="bond-fill"></span></div><p id="bond-description">Una amistad que apenas comienza.</p></div><div class="level-info"><span class="level-badge">1</span><div><strong id="level-label">Pequeño explorador</strong><span id="xp-label">0 / 100 XP</span><div class="xp-track"><span id="xp-fill"></span></div></div></div><button id="release-pet" class="secondary-button release-button" hidden>Dejar libre y criar otro huevo ${icon('leaf')}</button><p id="best-score" class="best-score">Su primera aventura los espera.</p><button class="text-button" data-close="pet-dialog">Volver a nuestro mundo ${icon('arrow')}</button></dialog>
  <dialog id="travel-dialog" class="travel-dialog" aria-labelledby="travel-title"><button class="dialog-close" data-close="travel-dialog" aria-label="Cerrar">${icon('close')}</button><span class="eyebrow">¿A DÓNDE VAMOS HOY?</span><h2 id="travel-title">Un mundo por descubrir.</h2><p class="muted">Lleva a tu compañero a un nuevo rincón. Su amistad viaja con ustedes.</p><div id="biome-cards" class="biome-cards"></div><p class="view-footnote">Viajar conserva su identidad. Un nuevo huevo hereda los rasgos del bioma donde comienza su crianza.</p></dialog>
  <dialog id="menu-dialog" class="menu-dialog" aria-labelledby="menu-title"><button class="dialog-close" data-close="menu-dialog" aria-label="Cerrar">${icon('close')}</button><span class="eyebrow">XISVERSO</span><h2 id="menu-title">Tu pequeño universo.</h2><div class="menu-actions"><button data-open="pet-dialog">${icon('heart')} Mi compañero ${icon('arrow')}</button><button data-open="travel-dialog">${icon('compass')} Explorar el mundo ${icon('arrow')}</button><button data-open="sanctuary-dialog">${icon('friends')} Mis mascotas ${icon('arrow')}</button><button data-open="shop-dialog">${icon('spark')} Decoraciones ${icon('arrow')}</button><button data-open="audio-dialog">♫ Sonido y música ${icon('arrow')}</button><button data-open="explore-dialog">${icon('compass')} Expediciones ${icon('arrow')}</button><button data-open="journal-dialog">${icon('book')} Mi bitácora ${icon('arrow')}</button><button data-open="community-dialog">${icon('friends')} Visitar amigos ${icon('arrow')}</button></div><p class="controls-help">Toca el suelo para caminar. Elige una herramienta y toca a tu mascota; también puedes arrastrar la herramienta hasta ella.</p><p class="controls-help">Teclado: 1–4 eligen herramienta, flechas para caminar y Espacio para interactuar. Tab recorre los controles.</p><button class="primary-button" data-close="menu-dialog">Volver al refugio ${icon('arrow')}</button></dialog>
  <dialog id="journal-dialog" class="sheet-dialog" aria-labelledby="journal-title"><button class="dialog-close" data-close="journal-dialog" aria-label="Cerrar">${icon('close')}</button><span class="eyebrow">RECUERDOS DE ESTA SESIÓN</span><h2 id="journal-title">Pequeños momentos, gran amistad.</h2><p class="muted">Lo que han vivido desde que abriste el refugio.</p><div id="journal-events" class="journal-events"></div></dialog>
  <dialog id="community-dialog" class="sheet-dialog friends-dialog" aria-labelledby="community-title"><button class="dialog-close" data-close="community-dialog" aria-label="Cerrar">${icon('close')}</button><span class="eyebrow">UN RATITO EN SU MUNDO</span><h2 id="community-title">Visitar amigos</h2><p class="muted">Comparte una vista de tu refugio o entra al de un amigo con su código. Cada uno conserva su propia partida.</p><p id="firebase-status" class="connection-notice" role="status"></p><button id="connect-visits" class="secondary-button">Conectar las visitas</button><label for="world-name">Nombre de tu refugio</label><input id="world-name" maxlength="36" value="Mi rincón de Xisverso"/><div class="friends-actions"><button id="publish-world" class="primary-button">Compartir mi refugio</button><button id="unpublish-world" class="text-button">Retirar mi refugio</button></div><div id="share-code-panel" hidden><label for="my-visit-code">Tu código para compartir</label><input id="my-visit-code" readonly/><button id="copy-visit-code" class="secondary-button">Copiar código</button></div><p class="muted small-note">Tu código pertenece a este navegador. Conserva sus datos para poder actualizar o retirar tu refugio. Compartir no transfiere puntos ni objetos.</p><form id="visit-form"><label for="friend-code">Código del refugio de tu amigo</label><input id="friend-code" required maxlength="128" autocomplete="off" spellcheck="false"/><button class="primary-button" type="submit">Visitar refugio ${icon('arrow')}</button></form><p id="visit-message" class="connection-notice" role="status"></p></dialog>
  <dialog id="visit-dialog" class="visit-dialog" aria-labelledby="visit-title"><button class="dialog-close" data-close="visit-dialog" aria-label="Volver a mi refugio">${icon('close')}</button><span class="eyebrow">DE VISITA</span><h2 id="visit-title"></h2><p id="visit-caption" class="muted"></p><canvas id="visit-scene" role="img" aria-label="El refugio de tu amigo"></canvas><p class="muted">Toca el suelo para pasear con su mascota. Esta visita muestra el refugio que tu amigo compartió.</p><button class="primary-button" data-close="visit-dialog">Volver a mi refugio</button></dialog>
  <dialog id="audio-dialog" class="sheet-dialog audio-dialog" aria-labelledby="audio-title"><button class="dialog-close" data-close="audio-dialog" aria-label="Cerrar">${icon('close')}</button><span class="eyebrow">EL SONIDO DE TU MUNDO</span><h2 id="audio-title">Un poco de calma.</h2><p class="muted">Melodías suaves para cada bioma y pequeños sonidos para sus aventuras.</p><label class="audio-toggle"><input id="music-enabled" type="checkbox"/> Música ambiental</label><label for="music-volume">Volumen de la música</label><input id="music-volume" type="range" min="0" max="100"/><label class="audio-toggle"><input id="effects-enabled" type="checkbox"/> Efectos de sonido</label><label for="effects-volume">Volumen de los efectos</label><input id="effects-volume" type="range" min="0" max="100"/><button id="try-sound" class="secondary-button">Escuchar un sonido</button></dialog>
  <dialog id="shop-dialog" class="sheet-dialog shop-dialog" aria-labelledby="shop-title"><button class="dialog-close" data-close="shop-dialog" aria-label="Cerrar">${icon('close')}</button><span class="eyebrow">UN REFUGIO MÁS TUYO</span><h2 id="shop-title">Pequeños tesoros.</h2><p class="muted">Gana puntos jugando con tu mascota. Tus decoraciones acompañan al refugio en todos los biomas.</p><p class="shop-wallet"><strong id="shop-points">80</strong> puntos disponibles</p><div id="decoration-list" class="decoration-list"></div><p class="muted small-note">Los puntos se ganan dentro del juego. No hay compras con dinero real.</p></dialog>
  <dialog id="food-dialog" class="sheet-dialog" aria-labelledby="food-title"><button class="dialog-close" data-close="food-dialog" aria-label="Cerrar">${icon('close')}</button><span class="eyebrow">ALGO RICO PARA SU PANCITA</span><h2 id="food-title">Elegir alimento</h2><p class="muted">Elige una ración y después toca a tu mascota para alimentarla.</p><div id="food-choice-list" class="prepared-food"></div><button class="secondary-button" data-open="kitchen-dialog">Cocinar más raciones</button></dialog>
  <dialog id="games-dialog" class="sheet-dialog games-dialog" aria-labelledby="games-title"><button class="dialog-close" data-close="games-dialog" aria-label="Cerrar">${icon('close')}</button><span class="eyebrow">SEIS AVENTURAS EN COMPAÑÍA</span><h2 id="games-title">¿A qué jugamos?</h2><p id="games-notice" class="muted"></p><div id="minigame-list" class="minigame-list"></div></dialog>
  <dialog id="explore-dialog" class="sheet-dialog explore-dialog" aria-labelledby="explore-title"><button class="dialog-close" data-close="explore-dialog" aria-label="Cerrar">${icon('close')}</button><span class="eyebrow">UNA SALIDA EN COMPAÑÍA</span><h2 id="explore-title">Explorar y descubrir</h2><p id="explore-location" class="muted"></p><div id="expedition-setup"><p class="section-description">Recoge ingredientes para preparar comida. Puedes invitar hasta tres de tus mascotas libres; cada acompañante aumenta la cosecha.</p><div id="expedition-party" class="expedition-party"></div><p id="party-count" class="party-count">0/3 acompañantes · Cosecha ×1</p><button id="start-expedition" class="primary-button">Salir a explorar ${icon('compass')}</button></div><div id="expedition-progress" class="expedition-journey" hidden><span class="journey-icon">${icon('compass')}</span><h3 id="expedition-caption">Recorriendo el sendero</h3><p><strong id="expedition-time">20</strong> <span id="expedition-unit">segundos para volver</span></p><div class="journey-track"><span id="expedition-fill"></span></div><p id="expedition-team" class="muted"></p><button id="claim-expedition" class="primary-button" disabled>Recoger materiales ${icon('bag')}</button></div><div id="explore-rewards" class="explore-rewards" role="status"></div></dialog>
  <dialog id="kitchen-dialog" class="sheet-dialog kitchen-dialog" aria-labelledby="kitchen-title"><button class="dialog-close" data-close="kitchen-dialog" aria-label="Cerrar">${icon('close')}</button><span class="eyebrow">DE LA EXPLORACIÓN A SU PANCITA</span><h2 id="kitchen-title">Cocina y mochila</h2><p class="muted">Prepara una ración y llévasela a tu compañero. Su alimentación queda registrada para las futuras evoluciones.</p><h3 class="small-heading">Tus ingredientes</h3><div id="material-inventory" class="material-inventory"></div><h3 class="small-heading">Para cocinar</h3><div id="recipe-list" class="recipe-list"></div><h3 class="small-heading">Comida preparada</h3><div id="prepared-food" class="prepared-food"></div></dialog>
  <dialog id="sanctuary-dialog" class="sheet-dialog sanctuary-dialog" aria-labelledby="sanctuary-title"><button class="dialog-close" data-close="sanctuary-dialog" aria-label="Cerrar">${icon('close')}</button><span class="eyebrow">UNA FAMILIA QUE SIGUE CRECIENDO</span><h2 id="sanctuary-title">Mis mascotas</h2><p class="muted">Los adultos que dejas libres conservan su hogar. Visítalos, jueguen juntos o invítalos a explorar.</p><div class="collection-summary"><span id="free-pet-count">0</span> mascotas libres</div><div id="sanctuary-list" class="sanctuary-list"></div></dialog>
  <dialog id="release-dialog" class="sheet-dialog" aria-labelledby="release-title"><button class="dialog-close" data-close="release-dialog" aria-label="Cerrar">${icon('close')}</button><span class="eyebrow">SU PROPIA AVENTURA</span><h2 id="release-title">Un hogar en libertad</h2><p id="release-description" class="section-description"></p><p class="muted">Podrás seguir visitándole, jugar juntos e invitarle a explorar. Un nuevo huevo empezará su crianza en el bioma que estás visitando.</p><button id="confirm-release" class="primary-button">Dejar libre y cuidar otro huevo ${icon('leaf')}</button></dialog>
  <dialog id="rename-dialog" class="rename-dialog" aria-labelledby="rename-title"><form id="rename-form"><button type="button" class="dialog-close" data-close="rename-dialog" aria-label="Cerrar">${icon('close')}</button><span class="eyebrow">UNA AMISTAD CON NOMBRE PROPIO</span><h2 id="rename-title">¿Cómo se llama tu mascota?</h2><label for="pet-name-input">Su nombre</label><input id="pet-name-input" name="petName" maxlength="24" required autocomplete="off" placeholder="Nubi" /><p class="muted">Hasta 24 caracteres. Puedes cambiarlo cuando quieras.</p><button class="primary-button" type="submit">Guardar nombre ${icon('check')}</button></form></dialog>
  <dialog id="game-dialog" class="game-dialog" aria-labelledby="game-title"><div class="game-header"><div><span class="eyebrow">UNA AVENTURA JUNTOS</span><h2 id="game-title">Atrapa las luciérnagas</h2></div><button type="button" class="dialog-close" id="exit-game" aria-label="Salir del minijuego">${icon('close')}</button></div><p id="game-instructions" class="game-instructions"></p><div class="game-counters"><span>${icon('sun')}<strong id="game-time">20</strong> segundos</span><span>${icon('spark')}<strong id="game-score">0</strong> <span id="game-unit">luciérnagas</span></span></div><div class="game-field" id="game-field"><span class="game-horizon"></span></div><div id="game-result" class="game-result" hidden></div><p class="game-tip">Los puntos se entregan una sola vez al completar los 20 segundos. Salir antes no entrega puntos.</p></dialog>
`;
const $ = <T extends HTMLElement = HTMLElement>(selector: string) =>
  document.querySelector<T>(selector)!;
const canvas = $<HTMLCanvasElement>('#pet-scene');
function sceneModel(): ScenePet {
  return {
    id: state.pet.id,
    seed: state.pet.seed,
    biome: state.pet.biome,
    worldBiome: state.currentBiome,
    stage: state.pet.stage,
    mood: getMood(state),
    sleeping: Date.now() < sleepingUntil,
    decorations: state.decorations,
    companions: state.freePets
      .filter((pet) => pet.habitatBiome === state.currentBiome)
      .map((pet) => ({
        id: pet.id,
        name: pet.name,
        seed: pet.seed,
        biome: pet.biome,
        stage: 'adult' as const,
      })),
  };
}
const scene = createScene(canvas, sceneModel(), {
  onPetInteract: (tool) => interactWithPet(tool),
  onWalk: () => {
    sleepingUntil = 0;
    scene.update(sceneModel());
    say('¡Voy contigo!', 1800);
  },
  onCompanionInteract: (id) => socialize(id),
});
const toolDetails: Record<SceneTool, { icon: string; hint: string }> = {
  hand: { icon: 'heart', hint: 'Toca a tu mascota para darle cariño · Toca el suelo para caminar' },
  feed: { icon: 'food', hint: 'Lleva una ración preparada a tu mascota' },
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
  closeFoodOptions();
  if (gameRunning && $<HTMLDialogElement>('#game-dialog').open) closeGame();
  document.querySelectorAll<HTMLDialogElement>('dialog[open]').forEach((dialog) => dialog.close());
}
function openDialog(id: string) {
  closeDialogs();
  if (id === 'pet-dialog') renderState();
  if (id === 'travel-dialog') renderBiomes();
  if (id === 'explore-dialog') renderExplore();
  if (id === 'kitchen-dialog') renderKitchen();
  if (id === 'sanctuary-dialog') renderSanctuary();
  if (id === 'food-dialog') renderFoodChoices();
  if (id === 'shop-dialog') renderShop();
  if (id === 'games-dialog') renderGames();
  if (id === 'audio-dialog') renderAudioSettings();
  if (id === 'community-dialog') renderFriends();
  $<HTMLDialogElement>(`#${id}`).showModal();
  $('#tool-cursor').hidden = true;
}
function refreshOpenPanels() {
  if ($<HTMLDialogElement>('#kitchen-dialog').open) renderKitchen();
  if ($<HTMLDialogElement>('#sanctuary-dialog').open) renderSanctuary();
  if ($<HTMLDialogElement>('#explore-dialog').open && state.expedition) renderExplore();
  if ($<HTMLDialogElement>('#shop-dialog').open) renderShop();
  if ($<HTMLDialogElement>('#food-dialog').open) renderFoodChoices();
}
function formatDuration(seconds: number) {
  const hours = Math.ceil(seconds / 3600);
  if (seconds < 3600) return `${Math.max(1, Math.ceil(seconds / 60))} min restantes`;
  return hours >= 48
    ? `${Math.floor(hours / 24)} d ${hours % 24} h restantes`
    : `${hours} h restantes`;
}
function closeFoodOptions() {
  $('#food-options').hidden = true;
  $('[data-tool="feed"].tool-button').setAttribute('aria-expanded', 'false');
}
function toggleFoodOptions() {
  const panel = $('#food-options');
  panel.hidden = !panel.hidden;
  $('[data-tool="feed"].tool-button').setAttribute('aria-expanded', String(!panel.hidden));
}
function renderFoodChoices() {
  $('#food-choice-list').innerHTML = RECIPES.map(
    (recipe) =>
      `<div class="prepared-item"><span class="prepared-food-icon">${icon('food')}</span><div><strong>${recipe.name}</strong><span>${state.inventory.food[recipe.id]} raciones · +${recipe.hungerRelief} apetito</span></div><button class="secondary-button food-select" data-select-food="${recipe.id}" ${state.inventory.food[recipe.id] ? '' : 'disabled'}>${state.selectedFood === recipe.id ? 'Elegido' : 'Elegir'}</button></div>`,
  ).join('');
}
function renderShop() {
  $('#shop-points').textContent = `${state.coins}`;
  const symbols: Record<DecorationId, string> = {
    lantern: '✧',
    flowers: '❀',
    fountain: '≋',
    bench: '▱',
    mushrooms: '♧',
    arch: '⌒',
  };
  $('#decoration-list').innerHTML = DECORATIONS.map((item) => {
    const owned = state.decorations.includes(item.id);
    return `<article class="decoration-card"><span class="decoration-symbol">${symbols[item.id]}</span><h3>${item.name}</h3><p>${item.description}</p><button class="${owned ? 'secondary-button' : 'primary-button'}" data-buy-decoration="${item.id}" ${owned || state.coins < item.price ? 'disabled' : ''}>${owned ? 'En tu refugio' : `Comprar · ${item.price} puntos`}</button></article>`;
  }).join('');
}
function renderGames() {
  const egg = state.pet.stage === 'egg';
  $('#games-notice').textContent = egg
    ? 'Las aventuras empiezan cuando nazca tu bebé. Mientras tanto puedes explorar, cocinar y decorar su mundo.'
    : 'Tu mascota participa en cada aventura. Completa una partida para ganar puntos y decorar el refugio.';
  $('#minigame-list').innerHTML = MINI_GAMES.map(
    (game) =>
      `<button class="minigame-card" data-minigame="${game.id}" ${egg ? 'disabled' : ''}><span>${game.icon}</span><strong>${game.name}</strong><small>${game.instructions}</small><b>Jugar juntos · 20 s</b></button>`,
  ).join('');
}
function renderAudioSettings() {
  const settings = audio.getSettings();
  $<HTMLInputElement>('#music-enabled').checked = settings.music;
  $<HTMLInputElement>('#effects-enabled').checked = settings.effects;
  $<HTMLInputElement>('#music-volume').value = String(Math.round(settings.musicVolume * 100));
  $<HTMLInputElement>('#effects-volume').value = String(Math.round(settings.effectsVolume * 100));
}
let visitsBusy = false;
function renderFriends() {
  const configured = firebaseConfigured();
  $('#firebase-status').textContent = configured
    ? 'Comparte tu código solo con quienes quieras invitar. El refugio se actualiza cuando vuelves a compartirlo.'
    : 'Las visitas están preparadas y esperan la conexión del proyecto de Xisverso. Tu partida local sigue disponible.';
  document
    .querySelectorAll<HTMLButtonElement>('#community-dialog button:not([data-close])')
    .forEach((button) => (button.disabled = !configured || visitsBusy));
}
async function withVisitAction(action: () => Promise<void>) {
  if (visitsBusy) return;
  visitsBusy = true;
  renderFriends();
  $('#visit-message').textContent = 'Conectando…';
  try {
    await action();
  } catch (error) {
    $('#visit-message').textContent = describeVisitError(error);
  } finally {
    visitsBusy = false;
    renderFriends();
  }
}
function showVisitCode(code: string) {
  $('#share-code-panel').hidden = false;
  $<HTMLInputElement>('#my-visit-code').value = code;
}
async function openFriendWorld(code: string) {
  const world = await visitWorld(code);
  openDialog('visit-dialog');
  $('#visit-title').textContent = world.name;
  $('#visit-caption').textContent =
    `${world.pet.name} · ${biomeName(world.biome)} · Compartido el ${new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium' }).format(world.updatedAt)}`;
  visitScene?.destroy();
  visitScene = createScene(
    $<HTMLCanvasElement>('#visit-scene'),
    {
      id: `visit-${code}`,
      ...world.pet,
      worldBiome: world.biome,
      decorations: world.decorations,
      mood: 'A gusto',
      sleeping: false,
    },
    { onPetInteract: () => visitScene?.react('pet') },
  );
  $('#visit-message').textContent = 'La visita está lista.';
}
function starterEggSvg(egg: StarterEggId, biome: BiomeId, context: string) {
  const palette = {
    forest: { shell: '#e9edd0', shade: '#b5c991', ink: '#8da96b' },
    coast: { shell: '#dceee8', shade: '#97c9ca', ink: '#689ea6' },
    tundra: { shell: '#eee5f0', shade: '#c4afd1', ink: '#9c83b3' },
  }[biome];
  const id = `starter-${context}-${egg}-${biome}`;
  const shape = 'M90 18C58 19 28 81 32 122C37 181 143 181 148 122C152 81 122 19 90 18Z';
  const marks =
    egg === 'speckled'
      ? '<ellipse cx="72" cy="68" rx="9" ry="6" transform="rotate(-25 72 68)"/><ellipse cx="111" cy="87" rx="7" ry="11" transform="rotate(20 111 87)"/><ellipse cx="57" cy="122" rx="8" ry="6"/><ellipse cx="96" cy="135" rx="10" ry="7" transform="rotate(-15 96 135)"/><ellipse cx="127" cy="124" rx="5" ry="8"/><circle cx="92" cy="102" r="4"/>'
      : egg === 'striped'
        ? `<g fill="none" stroke="${palette.ink}" stroke-width="10" stroke-linecap="round"><path d="M30 66Q90 96 150 66"/><path d="M22 99Q90 132 158 99"/><path d="M25 133Q90 159 155 133"/></g>`
        : '<path d="m67 61 3 9 10 1-8 6 2 10-8-6-8 5 3-9-7-6 10-1Z"/><path d="m112 93 3 10 11 2-9 6 2 11-8-7-9 6 3-10-8-7 11-1Z"/><path d="m72 125 3 9 10 2-8 6 2 10-8-6-9 5 4-10-8-6 11-1Z"/><circle cx="97" cy="65" r="3"/><circle cx="57" cy="102" r="3"/><circle cx="121" cy="139" r="3"/>';
  return `<svg viewBox="0 0 180 200" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="${id}-g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fffdf4"/><stop offset=".55" stop-color="${palette.shell}"/><stop offset="1" stop-color="${palette.shade}"/></linearGradient><clipPath id="${id}-clip"><path d="${shape}"/></clipPath></defs><ellipse cx="90" cy="174" rx="63" ry="12" fill="#80975b15"/><ellipse cx="90" cy="170" rx="52" ry="10" fill="#d7c99d"/><path d="${shape}" fill="url(#${id}-g)" stroke="#ffffffa0" stroke-width="2"/><g clip-path="url(#${id}-clip)" fill="${palette.ink}" opacity=".65">${marks}</g><ellipse cx="59" cy="70" rx="9" ry="22" fill="#fffdf7" opacity=".55" transform="rotate(24 59 70)"/></svg>`;
}
function renderStarterChoice() {
  $('#starter-preview').innerHTML = starterEggSvg(starterEgg, starterBiome, 'hero');
  $('#starter-preview').dataset.biome = starterBiome;
  $('#starter-summary').textContent =
    `${STARTER_EGGS.find((egg) => egg.id === starterEgg)!.name} · ${biomeName(starterBiome)}`;
  document.querySelectorAll<HTMLElement>('[data-egg-preview]').forEach((preview) => {
    preview.innerHTML = starterEggSvg(
      preview.dataset.eggPreview as StarterEggId,
      starterBiome,
      'card',
    );
  });
  state = createStarterGame(starterEgg, starterBiome, Date.now());
  lastRenderedId = state.pet.id;
  lastRenderedStage = state.pet.stage;
  renderState();
}
function useExistingGame(restored: GameState) {
  state = restored;
  if (needsOnboarding) {
    needsOnboarding = false;
    $<HTMLDialogElement>('#welcome-dialog').close();
    lastRenderedId = state.pet.id;
    lastRenderedStage = state.pet.stage;
    addEvent(`${state.pet.name} se alegra de verte de nuevo.`, 'leaf');
    say('¡Aquí estamos! Nuestra aventura continúa.');
  }
  renderState();
  refreshOpenPanels();
}
function beginAdventure() {
  if (!needsOnboarding) return;
  // A different tab may already have started a valid game while this chooser was open.
  try {
    const existing =
      parseSave(localStorage.getItem(SAVE_KEY), Date.now()) ??
      parseSave(localStorage.getItem(PREVIOUS_SAVE_KEY), Date.now()) ??
      parseSave(localStorage.getItem(LEGACY_SAVE_KEY), Date.now());
    if (existing) {
      useExistingGame(existing);
      persist();
      return;
    }
  } catch {
    /* Storage can be blocked; the chosen game still runs for this session. */
  }
  state = createStarterGame(starterEgg, starterBiome, Date.now());
  needsOnboarding = false;
  lastRenderedId = state.pet.id;
  lastRenderedStage = state.pet.stage;
  lastAutoSave = Date.now();
  sleepingUntil = 0;
  lastCare = -Infinity;
  $<HTMLDialogElement>('#welcome-dialog').close();
  renderState();
  renderBiomes();
  selectTool('hand');
  persist();
  addEvent(`${state.pet.name} empieza su historia en ${biomeName(state.currentBiome)}.`, 'egg');
  say('Un pequeño comienzo. Dale calor a tu huevo.', 6500);
  if (!saveAvailable) toast('El navegador no permite guardar. El progreso durará esta sesión.');
}
function showWelcome() {
  renderStarterChoice();
  const notice = $('#welcome-notice');
  notice.hidden = !corruptSave && saveAvailable;
  notice.textContent = corruptSave
    ? 'No pudimos recuperar la partida anterior. Elige un nuevo comienzo.'
    : 'El navegador no permite guardar. Podrás jugar durante esta sesión.';
  $<HTMLDialogElement>('#welcome-dialog').showModal();
  $('#tool-cursor').hidden = true;
}
function reconcileSavedState() {
  if (unsavedChanges) return;
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw === lastSeenRaw) return;
    const restored = parseSave(raw, Date.now());
    if (restored) {
      state = restored;
      lastSeenRaw = raw;
    }
  } catch {
    /* A blocked save must not prevent playing this session. */
  }
}
function persist() {
  if (needsOnboarding) return;
  try {
    const raw = serializeSave(state);
    localStorage.setItem(SAVE_KEY, raw);
    lastSeenRaw = raw;
    unsavedChanges = false;
    saveAvailable = true;
  } catch {
    if (saveAvailable)
      toast('No se pudo guardar. Mantén abierto el refugio para conservar esta sesión.');
    saveAvailable = false;
    unsavedChanges = true;
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
  { key: 'appetite' as const, name: 'Apetito', icon: 'food', color: '#d7a164' },
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
  $('#biome-name').textContent = BIOMES.find((b) => b.id === state.currentBiome)!.name;
  const origin = BIOMES.find((b) => b.id === state.pet.biome)!;
  const species = {
    forest: ['Brotín', 'Rasgos del bosque'],
    coast: ['Brisín', 'Rasgos de la costa'],
    tundra: ['Nevín', 'Rasgos de la tundra'],
  }[state.pet.biome];
  $('.species-tag').textContent = state.pet.stage === 'egg' ? 'Huevo' : species[0];
  $('#pet-description').textContent = species[1];
  $('.pet-status-avatar').innerHTML = icon(
    state.pet.stage === 'egg'
      ? 'egg'
      : { forest: 'leaf', coast: 'wave', tundra: 'mountain' }[state.pet.biome],
  );
  const life = getLifeProgress(state.pet);
  $('#life-label').textContent = life.label;
  $('#life-progress').setAttribute('aria-valuenow', `${Math.round(life.percent)}`);
  $('#life-fill').style.width = `${life.percent}%`;
  $('#life-next').textContent = life.nextStage
    ? `${Math.round(life.percent)}% hacia ${life.nextStage.toLowerCase()} · ${formatDuration(life.remainingSeconds)}`
    : 'Listo para su propia aventura';
  $('#origin-biome').textContent =
    `Bioma de cría: ${origin.name}. Sus rasgos se conservan al viajar.`;
  $('#life-help').textContent =
    state.pet.stage === 'egg'
      ? 'Dale calor tocando el huevo. La incubación dura 5 horas. Puedes acompañarlo y acariciarlo sin adelantar su reloj.'
      : state.pet.stage === 'baby'
        ? 'Bebé durante 20 horas: una pequeña bolita que está descubriendo su mundo.'
        : state.pet.stage === 'young'
          ? 'Esta etapa dura 3 días. Sus rasgos van tomando forma mientras crece.'
          : 'Puedes dejarlo vivir libre aquí y empezar a cuidar un nuevo huevo.';
  $('#release-pet').hidden = state.pet.stage !== 'adult';
  $<HTMLButtonElement>('#release-pet').disabled = Boolean(state.expedition);
  $('#release-pet').title = state.expedition
    ? 'Primero termina y recoge la expedición pendiente.'
    : '';
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
      const urgent = value < 25;
      return `<div class="need-row"><div class="need-label">${icon(need.icon)}<span>${need.name}</span><strong>${value}<small>/100</small></strong></div><div class="need-track" role="progressbar" aria-label="${need.name}" aria-valuenow="${value}" aria-valuemin="0" aria-valuemax="100" aria-valuetext="${value} de 100${need.key === 'appetite' ? '; 100 lleno, 0 con mucha hambre' : ''}"><span style="width:${value}%;background:${urgent ? '#cb7870' : need.color}"></span></div>${need.key === 'appetite' ? '<p class="need-caption">100 = lleno · 0 = mucha hambre</p>' : ''}</div>`;
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
  const moods: Record<string, string> = {
    'Con sueño': 'Un poquito de sueño',
    'Tiene hambre': 'Su pancita hace ruiditos',
    'Quiere un baño': 'Necesita unas burbujas',
    'Busca compañía': 'Con ganas de un abrazo',
    Radiante: 'Feliz de estar contigo',
    'A gusto': 'Con ganas de explorar',
    'Necesita cuidados': 'Necesita tus cuidados',
    Incubando: 'Un nuevo comienzo',
  };
  $('#scene-mood').textContent =
    state.pet.stage === 'egg'
      ? `Huevo · Incubación ${Math.round(life.percent)}%`
      : `${life.label} · ${Date.now() < sleepingUntil ? 'Soñando aventuras' : (moods[getMood(state)] ?? 'Explorando')}`;
  canvas.setAttribute(
    'aria-label',
    `${state.pet.name}, ${life.label}, de ${origin.name}, visitando ${$('#biome-name').textContent}. ${state.pet.stage === 'egg' ? 'Toca el huevo para darle calor.' : 'Toca el suelo para caminar y a tu mascota para cuidarla.'}`,
  );
  $('#best-score').textContent = state.miniGameBest
    ? `Su mejor aventura: ${state.miniGameBest} aciertos`
    : 'Su primera aventura los espera.';
  $('#food-count').textContent =
    `${Object.values(state.inventory.food).reduce((sum, value) => sum + value, 0)}`;
  $('#free-pet-count').textContent = `${state.freePets.length}`;
  if (state.pet.stage === 'egg')
    $('#interaction-hint').textContent =
      'Toca el huevo para darle calor · Nacerá después de cinco horas';
  else if (selectedTool === 'feed')
    $('#interaction-hint').textContent =
      `Lleva ${RECIPES.find((recipe) => recipe.id === state.selectedFood)!.name.toLowerCase()} a ${state.pet.name} · Toca Alimentar para cocinar o elegir una ración`;
  else
    $('#interaction-hint').textContent = toolDetails[selectedTool].hint.replace(
      'tu mascota',
      state.pet.name,
    );
  scene.update(sceneModel());
  audio.setBiome(state.currentBiome);
  updateExpeditionStatus();
  if (lastRenderedId === state.pet.id && lastRenderedStage !== state.pet.stage) {
    const message =
      state.pet.stage === 'baby'
        ? `¡${state.pet.name} salió del huevo!`
        : `¡${state.pet.name} ya es ${state.pet.stage === 'young' ? 'joven' : 'adulto'}!`;
    addEvent(message, 'spark');
    audio.play('success');
    say(state.pet.stage === 'baby' ? '¡Hola! ¡Ya estoy aquí!' : '¡Mira cuánto he crecido!');
  }
  lastRenderedId = state.pet.id;
  lastRenderedStage = state.pet.stage;
}
function renderBiomes() {
  const details = {
    forest: {
      icon: 'leaf',
      subtitle: 'ENTRE HOJAS Y SUSURROS',
      copy: 'Senderos verdes, honguitos y una brisa que invita a explorar.',
      trait: 'Bayas, granos y hierbas para tu cocina.',
    },
    coast: {
      icon: 'wave',
      subtitle: 'AL RITMO DE LAS OLAS',
      copy: 'Arena suave, conchas y un horizonte lleno de sorpresas.',
      trait: 'Algas frescas para preparar sopas.',
    },
    tundra: {
      icon: 'mountain',
      subtitle: 'UN ABRAZO ENTRE LA NIEVE',
      copy: 'Montañas de algodón y un rincón cálido para soñar.',
      trait: 'Raíces resistentes al frío para cocinar.',
    },
  };
  $('#biome-cards').innerHTML = BIOMES.map((biome) => {
    const detail = details[biome.id];
    const selected = state.currentBiome === biome.id;
    return `<article class="biome-card ${biome.id} ${selected ? 'selected' : ''}"><div class="biome-art">${icon(detail.icon)}<span class="biome-art-orb"></span><span class="biome-art-ground"></span></div><div class="biome-card-content"><span class="eyebrow">${detail.subtitle}</span><h3>${escapeHtml(biome.name)}</h3><p>${detail.copy}</p><span class="biome-trait">${icon('spark')}${detail.trait}</span><button class="${selected ? 'secondary-button' : 'primary-button'}" data-biome="${biome.id}" ${selected ? 'disabled' : ''}>${selected ? 'Estamos aquí' : 'Vamos para allá'} ${icon(selected ? 'check' : 'arrow')}</button></div></article>`;
  }).join('');
}
function materialIcon(id: MaterialId) {
  return { berries: 'apple', grain: 'leaf', kelp: 'wave', root: 'mountain', herb: 'leaf' }[id];
}
function biomeName(id: BiomeId) {
  return BIOMES.find((biome) => biome.id === id)!.name;
}
function renderKitchen() {
  $('#material-inventory').innerHTML = MATERIALS.map(
    (material) =>
      `<div class="material-chip"><span class="material-icon">${icon(materialIcon(material.id))}</span><span>${material.name}</span><strong id="material-${material.id}" class="material-count">${state.inventory.materials[material.id]}</strong></div>`,
  ).join('');
  $('#recipe-list').innerHTML = RECIPES.map((recipe) => {
    const available = Object.entries(recipe.ingredients).every(
      ([id, amount]) => state.inventory.materials[id as MaterialId] >= amount!,
    );
    const ingredients = Object.entries(recipe.ingredients)
      .map(
        ([id, amount]) =>
          `<span class="ingredient-row ${state.inventory.materials[id as MaterialId] >= amount! ? 'enough' : 'missing'}">${MATERIALS.find((material) => material.id === id)!.name} <strong>${state.inventory.materials[id as MaterialId]}/${amount}</strong></span>`,
      )
      .join('');
    return `<article class="recipe-card"><div class="recipe-top"><span class="recipe-icon">${icon(recipe.id === 'fruit-bowl' ? 'apple' : recipe.id === 'sea-soup' ? 'wave' : 'food')}</span><h3>${recipe.name}</h3></div><p>${recipe.description}</p><div class="recipe-ingredients">${ingredients}</div><p class="recipe-nutrition">Recupera ${recipe.hungerRelief} de apetito</p><div class="recipe-actions"><button class="primary-button" data-craft="${recipe.id}" ${available ? '' : 'disabled'}>Preparar ${recipe.name.toLowerCase()} ${icon('food')}</button></div></article>`;
  }).join('');
  $('#prepared-food').innerHTML = RECIPES.map(
    (recipe) =>
      `<div class="prepared-item"><span class="prepared-food-icon">${icon('food')}</span><div><strong>${recipe.name}</strong><span><b id="food-${recipe.id}">${state.inventory.food[recipe.id]}</b> ${state.inventory.food[recipe.id] === 1 ? 'ración preparada' : 'raciones preparadas'}</span></div><button class="${state.selectedFood === recipe.id ? 'secondary-button' : 'primary-button'} food-select" data-select-food="${recipe.id}" ${state.inventory.food[recipe.id] ? '' : 'disabled'}>${state.selectedFood === recipe.id ? 'Elegida' : 'Llevar'} ${icon(state.selectedFood === recipe.id ? 'check' : 'arrow')}</button></div>`,
  ).join('');
}
function updatePartySelection() {
  const count = selectedCompanions.size;
  $('#party-count').textContent = `${count}/3 acompañantes · Cosecha ×${1 + count}`;
  document
    .querySelectorAll<HTMLInputElement>('#expedition-party input[data-companion]')
    .forEach((input) => {
      input.disabled = count >= 3 && !input.checked;
    });
}
function renderExplore() {
  selectedCompanions = new Set(
    [...selectedCompanions].filter((id) => state.freePets.some((pet) => pet.id === id)).slice(0, 3),
  );
  $('#explore-location').textContent =
    `Destino: ${biomeName(state.expedition?.biome ?? state.currentBiome)}. Una salida de 20 segundos.`;
  $('#expedition-party').innerHTML = state.freePets.length
    ? state.freePets
        .map(
          (pet) =>
            `<label class="companion-option"><input type="checkbox" data-companion="${pet.id}" value="${pet.id}" ${selectedCompanions.has(pet.id) ? 'checked' : ''}/><span class="companion-avatar ${pet.biome}">${icon({ forest: 'leaf', coast: 'wave', tundra: 'mountain' }[pet.biome])}</span><span class="companion-meta"><strong>${escapeHtml(pet.name)}</strong><small>Vive en ${biomeName(pet.habitatBiome)}</small></span></label>`,
        )
        .join('')
    : '<p class="empty-state">Cuando uno de tus adultos viva libre, podrás invitarlo. Mientras tanto, puedes explorar y encontrar ingredientes por tu cuenta.</p>';
  updatePartySelection();
  updateExpeditionStatus();
}
function updateExpeditionStatus() {
  const expedition = state.expedition;
  $('#expedition-setup').hidden = Boolean(expedition);
  $('#expedition-progress').hidden = !expedition;
  if (!expedition) {
    $('#explore-sign-label').textContent = 'Explorar';
    return;
  }
  const remaining = Math.max(0, Math.ceil((expedition.endsAt - Date.now()) / 1000));
  const duration = Math.max(1, expedition.endsAt - expedition.startedAt);
  $('#expedition-time').textContent = `${remaining}`;
  $('#expedition-unit').textContent = remaining ? 'segundos para volver' : '¡El equipo ya volvió!';
  $('#expedition-caption').textContent = remaining
    ? `Recorriendo ${biomeName(expedition.biome)}`
    : 'Una mochila llena de hallazgos';
  $('#expedition-fill').style.width =
    `${Math.max(0, Math.min(100, (1 - (expedition.endsAt - Date.now()) / duration) * 100))}%`;
  const names = expedition.companionIds.map(
    (id) => state.freePets.find((pet) => pet.id === id)!.name,
  );
  $('#expedition-team').textContent = names.length
    ? `Compañeros: ${names.join(', ')} · Cosecha ×${1 + names.length}`
    : 'Una aventura por tu cuenta · Cosecha ×1';
  $<HTMLButtonElement>('#claim-expedition').disabled = remaining > 0;
  $('#explore-sign-label').textContent = remaining
    ? `Explorando · ${remaining}s`
    : 'Recoger materiales';
}
function renderSanctuary() {
  $('#free-pet-count').textContent = `${state.freePets.length}`;
  $('#sanctuary-list').innerHTML = state.freePets.length
    ? state.freePets
        .map((pet) => {
          const present = pet.habitatBiome === state.currentBiome;
          return `<article class="resident-card"><span class="resident-avatar ${pet.biome}">${icon({ forest: 'leaf', coast: 'wave', tundra: 'mountain' }[pet.biome])}</span><div class="resident-copy"><h3>${escapeHtml(pet.name)}</h3><p>Adulto · Origen ${biomeName(pet.biome)}</p><small>Vive libre en ${biomeName(pet.habitatBiome)}</small></div><div class="resident-actions"><button class="secondary-button" data-visit-pet="${pet.id}">Visitar a ${escapeHtml(pet.name)} ${icon('compass')}</button><button class="primary-button" data-socialize="${pet.id}" ${present && state.pet.stage !== 'egg' ? '' : 'disabled'}>Jugar con ${escapeHtml(pet.name)} ${icon('heart')}</button></div></article>`;
        })
        .join('')
    : state.pet.stage === 'adult'
      ? `<p class="empty-state">${escapeHtml(state.pet.name)} ya es adulto. Desde su ficha puedes dejarlo vivir libre aquí y empezar a cuidar otro huevo.</p><button class="secondary-button" data-open="pet-dialog">Ver a ${escapeHtml(state.pet.name)} ${icon('heart')}</button>`
      : '<p class="empty-state">Tu familia está creciendo. Cuando tu compañero sea adulto, podrás dejarlo vivir libre y cuidar un nuevo huevo.</p>';
}
function socialize(id: string) {
  if (performance.now() - lastCare < 850) return;
  lastCare = performance.now();
  reconcileSavedState();
  const result = interactPets(state, id, Date.now());
  state = result.state;
  if (result.success) {
    persist();
    closeDialogs();
    renderState();
    scene.reactTogether(id);
    audio.play('pet');
    addEvent(result.message, 'friends');
    say(result.message);
  } else {
    renderState();
    toast(result.message);
  }
}
function prepareRelease() {
  reconcileSavedState();
  state = advanceTime(state, Date.now());
  if (state.pet.stage !== 'adult') {
    renderState();
    toast('Tu compañero todavía está creciendo.');
    return;
  }
  $('#release-description').textContent =
    `${state.pet.name} vivirá libre en ${biomeName(state.currentBiome)}. Mantendrá sus rasgos y su historia; podrás volver a verle aquí.`;
  openDialog('release-dialog');
}
function confirmRelease() {
  reconcileSavedState();
  const result = releaseAdult(state, Date.now());
  state = result.state;
  if (!result.success) {
    toast(result.message);
    return;
  }
  sleepingUntil = 0;
  persist();
  closeDialogs();
  renderState();
  selectTool('hand');
  addEvent(result.message, 'leaf');
  say('Un nuevo comienzo. Tu pequeño huevo necesita calor.');
}
function beginExploration() {
  reconcileSavedState();
  const result = startExpedition(state, [...selectedCompanions], Date.now());
  state = result.state;
  if (!result.success) {
    toast(result.message);
    return;
  }
  persist();
  renderState();
  renderExplore();
  $('#explore-rewards').textContent = '';
  addEvent(result.message, 'compass');
}
function claimExploration() {
  reconcileSavedState();
  const result = completeExpedition(state, Date.now());
  state = result.state;
  if (!result.success) {
    updateExpeditionStatus();
    toast(result.message);
    return;
  }
  persist();
  renderState();
  renderExplore();
  $('#explore-rewards').innerHTML = `<strong>¡Esto encontramos!</strong><div>${MATERIALS.filter(
    (material) => result.rewards[material.id] > 0,
  )
    .map(
      (material) =>
        `<span class="reward-chip">${icon(materialIcon(material.id))}+${result.rewards[material.id]} ${material.name.toLowerCase()}</span>`,
    )
    .join(
      '',
    )}</div><button class="text-button" data-open="kitchen-dialog">Vamos a cocinar ${icon('arrow')}</button>`;
  addEvent(result.message, 'bag');
  toast(result.message);
}
function cook(recipe: RecipeId) {
  reconcileSavedState();
  const result = craftFood(state, recipe, Date.now());
  state = result.state;
  if (result.success) {
    audio.play('feed');
    persist();
    renderState();
    renderKitchen();
    selectTool('feed');
    addEvent(result.message, 'food');
  }
  toast(result.message);
}
function selectTool(tool: SceneTool) {
  if (tool !== 'feed') closeFoodOptions();
  selectedTool = tool;
  scene.setTool(tool);
  $('.game-shell').dataset.tool = tool;
  document.querySelectorAll<HTMLButtonElement>('[data-tool].tool-button').forEach((button) => {
    const selected = button.dataset.tool === tool;
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', `${selected}`);
  });
  const meal = RECIPES.find((recipe) => recipe.id === state.selectedFood)!;
  $('#interaction-hint').textContent =
    state.pet.stage === 'egg'
      ? 'Toca el huevo para darle calor · Nacerá después de cinco horas'
      : tool === 'feed'
        ? `Lleva ${meal.name.toLowerCase()} a ${state.pet.name} · Toca Alimentar para cocinar o elegir una ración`
        : toolDetails[tool].hint.replace('tu mascota', state.pet.name);
  $('#tool-cursor').innerHTML = icon(toolDetails[tool].icon);
  $('#tool-cursor').dataset.tool = tool;
  $('#tool-cursor').hidden = true;
}
function interactWithPet(tool: SceneTool = selectedTool) {
  care(tool === 'hand' ? 'pet' : tool);
}
function care(action: Action) {
  if (needsOnboarding) return;
  if (performance.now() - lastCare < 850) return;
  lastCare = performance.now();
  reconcileSavedState();
  const result = applyCare(state, action, Date.now());
  state = result.state;
  if (result.success) {
    sleepingUntil = action === 'rest' ? Date.now() + 10000 : 0;
    scene.react(action);
    audio.play(action);
    addEvent(result.message, { feed: 'food', clean: 'drop', rest: 'moon', pet: 'heart' }[action]);
    persist();
    say(
      {
        feed: '¡Ñam! ¡Estaba deliciosa!',
        clean: '¡Burbujas! Una más, una más…',
        pet:
          state.pet.stage === 'egg'
            ? 'El huevo se acomoda con tu calor. ♡'
            : 'Contigo se está muy bien. ♡',
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
function finishGame() {
  if (!gameRunning || gameFinished) return;
  gameFinished = true;
  gameRunning = false;
  clearInterval(gameTimer);
  gameTimer = undefined;
  gameController?.destroy();
  gameController = undefined;
  reconcileSavedState();
  const result = rewardMiniGame(state, gameScore, Date.now());
  state = result.state;
  persist();
  renderState();
  scene.react('win');
  audio.play('success');
  const game = MINI_GAMES.find((item) => item.id === selectedGame)!;
  addEvent(`${game.name}: ${gameScore} aciertos y ${result.reward} puntos.`, 'spark');
  $('#game-time').textContent = '0';
  $('#game-field').classList.add('finished');
  $('#game-result').hidden = false;
  $('#game-result').innerHTML =
    `<span class="result-spark">${icon('spark')}</span><h3>¡Un recuerdo más juntos!</h3><p>${gameScore} ${game.unit} · <strong>+${result.reward} puntos</strong></p><button class="primary-button" id="game-again">Otra aventura ${icon('arrow')}</button><button class="text-button" data-close="game-dialog">Volver al refugio</button>`;
  $('#game-again').focus();
}
function startGame(kind: MiniGameId = selectedGame) {
  if (state.pet.stage === 'egg') {
    toast('Las aventuras comienzan cuando nazca tu bebé.');
    return;
  }
  if (!MINI_GAMES.some((item) => item.id === kind)) return;
  gameController?.destroy();
  closeDialogs();
  clearInterval(gameTimer);
  selectedGame = kind;
  gameScore = 0;
  gameFinished = false;
  gameRunning = true;
  const game = MINI_GAMES.find((item) => item.id === kind)!;
  $('#game-title').textContent = game.name;
  $('#game-instructions').textContent = game.instructions;
  $('#game-unit').textContent = game.unit;
  $('#game-result').hidden = true;
  $('#game-result').innerHTML = '';
  $('#game-score').textContent = '0';
  $('#game-time').textContent = '20';
  $<HTMLDialogElement>('#game-dialog').showModal();
  const field = $('#game-field');
  field.classList.remove('finished');
  gameController = mountMiniGame({
    field,
    kind,
    pet: state.pet,
    onScore(score) {
      if (!gameRunning || performance.now() >= gameEnds) {
        finishGame();
        return;
      }
      gameScore = score;
      $('#game-score').textContent = String(score);
    },
    onSound: () => audio.play('collect'),
  });
  gameEnds = performance.now() + 20000;
  gameTimer = setInterval(() => {
    const remaining = Math.max(0, Math.ceil((gameEnds - performance.now()) / 1000));
    $('#game-time').textContent = String(remaining);
    if (remaining === 0) finishGame();
  }, 100);
}
function closeGame() {
  const wasRunning = gameRunning;
  clearInterval(gameTimer);
  gameTimer = undefined;
  gameController?.destroy();
  gameController = undefined;
  gameRunning = false;
  $<HTMLDialogElement>('#game-dialog').close();
  if (wasRunning)
    toast('Aventura terminada antes de tiempo. Puedes volver a jugar cuando quieras.');
}

document.addEventListener('change', (event) => {
  const input = event.target;
  if (!(input instanceof HTMLInputElement)) return;
  if (needsOnboarding && (input.name === 'starter-egg' || input.name === 'starter-biome')) {
    if (input.name === 'starter-egg') starterEgg = input.value as StarterEggId;
    else starterBiome = input.value as BiomeId;
    renderStarterChoice();
    return;
  }
  if (!input.matches('#expedition-party input[data-companion]')) return;
  if (!state.freePets.some((pet) => pet.id === input.value)) {
    input.checked = false;
    return;
  }
  if (input.checked) {
    if (selectedCompanions.size >= 3) {
      input.checked = false;
      toast('Puedes invitar hasta tres compañeros libres.');
    } else selectedCompanions.add(input.value);
  } else selectedCompanions.delete(input.value);
  updatePartySelection();
});
$('#welcome-form').addEventListener('submit', (event) => {
  event.preventDefault();
  beginAdventure();
});
$('#welcome-dialog').addEventListener('cancel', (event) => {
  if (needsOnboarding) event.preventDefault();
});
document.addEventListener('click', (event) => {
  if (!(event.target as Element).closest('.feed-tool-wrap')) closeFoodOptions();
  const target = (event.target as Element).closest<HTMLElement>('button, a.game-brand');
  if (!target) return;
  if (target.dataset.tool) {
    if (performance.now() < blockToolClickUntil) return;
    selectTool(target.dataset.tool as SceneTool);
    if (target.dataset.tool === 'feed') toggleFoodOptions();
  }
  if (target.dataset.open) openDialog(target.dataset.open);
  if (target.id === 'release-pet') prepareRelease();
  if (target.id === 'confirm-release') confirmRelease();
  if (target.id === 'start-expedition') beginExploration();
  if (target.id === 'claim-expedition') claimExploration();
  if (target.dataset.craft) cook(target.dataset.craft as RecipeId);
  if (target.dataset.selectFood) {
    reconcileSavedState();
    state = selectFood(state, target.dataset.selectFood as RecipeId);
    persist();
    renderState();
    selectTool('feed');
    closeDialogs();
    say('¡Una ración lista! Acércamela cuando tenga hambre.');
  }
  if (target.dataset.socialize) socialize(target.dataset.socialize);
  if (target.dataset.visitPet) {
    reconcileSavedState();
    const friend = state.freePets.find((pet) => pet.id === target.dataset.visitPet);
    if (friend) {
      state = changeBiome(state, friend.habitatBiome, Date.now());
      persist();
      renderState();
      closeDialogs();
      say(`¡Vamos a saludar a ${friend.name}!`);
    }
  }
  if (target.dataset.play) openDialog('games-dialog');
  if (target.dataset.minigame) startGame(target.dataset.minigame as MiniGameId);
  if (target.id === 'game-again') startGame();
  if (target.dataset.buyDecoration) {
    reconcileSavedState();
    const result = purchaseDecoration(
      state,
      target.dataset.buyDecoration as DecorationId,
      Date.now(),
    );
    state = result.state;
    if (result.success) {
      persist();
      renderState();
      audio.play('purchase');
    }
    renderShop();
    toast(result.message);
  }
  if (target.id === 'try-sound') audio.play('success');
  if (target.id === 'connect-visits')
    void withVisitAction(async () => {
      const { code } = await connectVisits();
      showVisitCode(code);
      $('#visit-message').textContent = 'Conectado. Comparte tu refugio para recibir visitas.';
    });
  if (target.id === 'publish-world')
    void withVisitAction(async () => {
      reconcileSavedState();
      const { code } = await publishWorld(state, $<HTMLInputElement>('#world-name').value);
      showVisitCode(code);
      $('#visit-message').textContent = 'Tu refugio ya se puede visitar con este código.';
      audio.play('success');
    });
  if (target.id === 'unpublish-world')
    void withVisitAction(async () => {
      await unpublishWorld();
      $('#share-code-panel').hidden = true;
      $('#visit-message').textContent = 'Tu refugio dejó de estar disponible para visitas.';
    });
  if (target.id === 'copy-visit-code') {
    const input = $<HTMLInputElement>('#my-visit-code');
    void navigator.clipboard
      .writeText(input.value)
      .then(() => toast('Código copiado.'))
      .catch(() => {
        input.select();
        toast('Selecciona y copia tu código.');
      });
  }
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
      `${state.pet.name} descubrió ${BIOMES.find((b) => b.id === state.currentBiome)!.name}.`,
      'compass',
    );
    closeDialogs();
    renderState();
    persist();
    audio.play('travel');
    say('Un nuevo lugar… ¡vamos a explorarlo!');
  }
});
$('#visit-form').addEventListener('submit', (event) => {
  event.preventDefault();
  void withVisitAction(() => openFriendWorld($<HTMLInputElement>('#friend-code').value));
});
$('#visit-dialog').addEventListener('close', () => {
  visitScene?.destroy();
  visitScene = undefined;
  audio.setBiome(state.currentBiome);
});
$('#audio-dialog').addEventListener('input', () => {
  audio.update({
    music: $<HTMLInputElement>('#music-enabled').checked,
    effects: $<HTMLInputElement>('#effects-enabled').checked,
    musicVolume: Number($<HTMLInputElement>('#music-volume').value) / 100,
    effectsVolume: Number($<HTMLInputElement>('#effects-volume').value) / 100,
  });
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
    if (tools[event.key] === 'feed') toggleFoodOptions();
  }
  if (event.key === 'Escape') {
    closeFoodOptions();
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
    const bounds = canvas.getBoundingClientRect();
    const petBounds = scene.getPetBounds();
    const dx = event.clientX - bounds.left - petBounds.x - petBounds.width / 2;
    const dy = event.clientY - bounds.top - petBounds.y - petBounds.height / 2;
    if (Math.hypot(dx / (petBounds.width / 2), dy / (petBounds.height / 2)) < 1)
      interactWithPet(tool);
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
  const bounds = scene.getPetBounds();
  const x = bounds.x + bounds.width / 2;
  const y = bounds.y + bounds.height / 2;
  const proxy = $('#pet-interact');
  proxy.style.left = `${bounds.x}px`;
  proxy.style.top = `${bounds.y}px`;
  proxy.style.width = `${bounds.width}px`;
  proxy.style.height = `${bounds.height}px`;
  $('.game-shell').style.setProperty('--pet-x', `${x}px`);
  $('.game-shell').style.setProperty('--pet-y', `${y}px`);
  $('.game-shell').style.setProperty('--pet-top', `${bounds.y}px`);
  if (!document.hidden) positionFrame = requestAnimationFrame(followPet);
  else positionFrame = 0;
}
let positionFrame = requestAnimationFrame(followPet);
window.addEventListener('storage', (event) => {
  if (event.key !== SAVE_KEY || !event.newValue) return;
  if (unsavedChanges || event.newValue === lastSeenRaw) return;
  const restored = parseSave(event.newValue, Date.now());
  if (restored) {
    lastSeenRaw = event.newValue;
    useExistingGame(restored);
  }
});
window.addEventListener('pagehide', () => {
  if (needsOnboarding) {
    if (positionFrame) cancelAnimationFrame(positionFrame);
    positionFrame = 0;
    return;
  }
  reconcileSavedState();
  state = advanceTime(state, Date.now());
  persist();
  if (positionFrame) cancelAnimationFrame(positionFrame);
  positionFrame = 0;
});
window.addEventListener('pageshow', () => {
  if (needsOnboarding) {
    if (!document.hidden && !positionFrame) positionFrame = requestAnimationFrame(followPet);
    return;
  }
  reconcileSavedState();
  state = advanceTime(state, Date.now());
  renderState();
  if (!document.hidden && !positionFrame) positionFrame = requestAnimationFrame(followPet);
  if (gameRunning && performance.now() >= gameEnds) finishGame();
});
document.addEventListener('visibilitychange', () => {
  if (needsOnboarding) {
    if (!document.hidden && !positionFrame) positionFrame = requestAnimationFrame(followPet);
    return;
  }
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
  if (needsOnboarding) return;
  const previousStage = state.pet.stage;
  reconcileSavedState();
  state = advanceTime(state, Date.now());
  renderState();
  if (Date.now() - lastAutoSave >= 10000 || previousStage !== state.pet.stage) {
    persist();
    lastAutoSave = Date.now();
  }
}, 1000);
setInterval(() => {
  if (
    needsOnboarding ||
    document.hidden ||
    document.querySelector('dialog[open]') ||
    gameRunning ||
    state.pet.stage === 'egg' ||
    Date.now() < sleepingUntil
  )
    return;
  const needs = state.pet.needs;
  say(
    needs.appetite < 35
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
renderState();
renderBiomes();
selectTool('hand');
if (needsOnboarding) showWelcome();
else {
  addEvent(`${state.pet.name} se alegra de verte de nuevo.`, 'leaf');
  persist();
  say(
    state.pet.stage === 'egg'
      ? 'Un pequeño comienzo. Dale calor a tu huevo.'
      : '¡Volviste! ¿Damos una vuelta?',
    6500,
  );
}
if (corruptSave)
  toast(
    restoredBackup
      ? 'El guardado anterior estaba dañado. Recuperamos la copia de tu partida anterior.'
      : 'El guardado anterior estaba dañado. Elige un huevo para empezar una nueva historia.',
  );
if (!saveAvailable) toast('El navegador no permite guardar. El progreso durará esta sesión.');
