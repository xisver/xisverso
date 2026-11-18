import type { Pet } from './domain/game';

export type MiniGameId =
  'fireflies' | 'fruit' | 'puddles' | 'rhythm' | 'memory' | 'ball' | 'coconut';
export const MINI_GAMES: {
  id: MiniGameId;
  name: string;
  icon: string;
  instructions: string;
  unit: string;
  durationSeconds: number;
}[] = [
  {
    id: 'fireflies',
    name: 'Luciérnagas en compañía',
    icon: '✧',
    instructions:
      'Elige una luciérnaga. Tu mascota irá a buscarla: cuenta cuando llegue hasta ella.',
    unit: 'luciérnagas',
    durationSeconds: 20,
  },
  {
    id: 'fruit',
    name: 'Lluvia de frutas',
    icon: '●',
    instructions:
      'Mueve a tu mascota a izquierda o derecha para recoger la fruta antes de que toque el suelo.',
    unit: 'frutas',
    durationSeconds: 20,
  },
  {
    id: 'puddles',
    name: 'Salta los charcos',
    icon: '≈',
    instructions:
      'Espera a que el charco llegue a tu mascota y pulsa Saltar. Un salto a tiempo vale un punto.',
    unit: 'saltos',
    durationSeconds: 20,
  },
  {
    id: 'rhythm',
    name: 'Ritmo del bosque',
    icon: '♫',
    instructions:
      'Escucha la melodía y sigue la flecha justo cuando el aro cierre al compás. Usa las flechas o los botones.',
    unit: 'pasos',
    durationSeconds: 20,
  },
  {
    id: 'memory',
    name: 'Sendero de recuerdos',
    icon: '❖',
    instructions:
      'Mira las piedras que se iluminan y repite el camino en ese orden. Tu mascota recorrerá cada paso.',
    unit: 'recuerdos',
    durationSeconds: 20,
  },
  {
    id: 'ball',
    name: 'Pelota al claro',
    icon: '◉',
    instructions:
      'Toca el claro para guiar a tu mascota. Acércate a la pelota desde el lado opuesto al arco y empújala hasta la meta. Las flechas también sirven.',
    unit: 'goles',
    durationSeconds: 20,
  },
  {
    id: 'coconut',
    name: '¿Bajo qué coco?',
    icon: '◒',
    instructions:
      'Mira dónde se esconde tu mascota, sigue los cocos al mezclarse y encuéntrala tres veces. Cada ronda se mezcla más rápido. Elige con 1, 2, 3 o los botones.',
    unit: 'encuentros',
    durationSeconds: 60,
  },
];

interface Options {
  field: HTMLElement;
  kind: MiniGameId;
  pet: Pick<Pet, 'name' | 'seed' | 'biome' | 'stage'>;
  onScore: (score: number) => void;
  onSound: () => void;
  onRhythmBeat?: (midi: number, hit?: boolean) => void;
  onComplete?: () => void;
}
const clamp = (n: number, a = 0, b = 1) => Math.min(b, Math.max(a, n));
const directions = ['←', '↑', '→', '↓'];
const keyDirections: Record<string, number> = {
  ArrowLeft: 0,
  ArrowUp: 1,
  ArrowRight: 2,
  ArrowDown: 3,
};

/** Every score is driven by a pet action, a catch, a timed jump, a dance or a solved path. */
export function mountMiniGame({
  field,
  kind,
  pet,
  onScore,
  onSound,
  onRhythmBeat,
  onComplete,
}: Options) {
  field.innerHTML =
    '<canvas class="activity-canvas" role="img"></canvas><p class="activity-status" role="status"></p><div class="activity-controls"></div>';
  const canvas = field.querySelector<HTMLCanvasElement>('canvas')!;
  canvas.setAttribute(
    'aria-label',
    `${pet.name} participa en ${MINI_GAMES.find((game) => game.id === kind)!.name}`,
  );
  const ctx = canvas.getContext('2d')!;
  const status = field.querySelector<HTMLElement>('.activity-status')!;
  const controls = field.querySelector<HTMLElement>('.activity-controls')!;
  field.dataset.minigame = kind;
  let width = 600,
    height = 330,
    score = 0,
    frame = 0,
    disposed = false,
    previous = 0,
    time = 0;
  const player = { x: 0.5, y: 0.73, tx: 0.5, ty: 0.73 };
  let jumping = 0;
  let dance = -1;
  let danceAt = -10;
  const fruits: { x: number; y: number; speed: number }[] = [];
  let nextFruit = 0.3;
  let puddleX = 1.2,
    puddleResolved = false;
  let pendingFly: HTMLButtonElement | null = null;
  let rhythmDirection = 0,
    rhythmStart = 0,
    rhythmResolved = false;
  let sequence = [0, 2],
    answerIndex = 0,
    memoryStart = 0,
    memoryWaiting = false;
  let pendingStone: number | null = null;
  const stonePoints = [
    { x: 0.25, y: 0.47 },
    { x: 0.43, y: 0.6 },
    { x: 0.62, y: 0.47 },
    { x: 0.78, y: 0.64 },
  ];
  const ball = { x: 0.45, y: 0.61, vx: 0, vy: 0 };
  let goalY = 0.55;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let nextBeat = 0;
  let beatNumber = 0;
  const melody = [60, 64, 67, 72, 67, 64, 62, 67, 65, 69, 72, 76, 72, 69, 67, 62];
  type CoconutPhase = 'reveal' | 'shuffle' | 'choose' | 'result' | 'complete';
  let coconutPhase: CoconutPhase = 'reveal';
  let coconutRound = 0;
  let coconutTarget = Math.floor(Math.random() * 3);
  let coconutPositions = [0, 1, 2];
  let coconutFrom = [0, 1, 2];
  let coconutSwap = [0, 1];
  let coconutSwapsDone = 0;
  let coconutPhaseAt = 0;
  let coconutCorrect = false;
  let coconutSelection = -1;
  let coconutFinished = false;
  const coconutButtons: HTMLButtonElement[] = [];
  const coconutSwapSeconds = () => [0.7, 0.48, 0.29][coconutRound];
  const say = (text: string) => {
    if (status.textContent !== text) status.textContent = text;
  };
  function award() {
    score++;
    onScore(score);
    onSound();
  }
  function button(text: string, label: string, action: () => void) {
    const result = document.createElement('button');
    result.type = 'button';
    result.textContent = text;
    result.setAttribute('aria-label', label);
    result.addEventListener('click', action);
    controls.append(result);
    return result;
  }
  function moveHorizontal(delta: number) {
    player.tx = clamp(player.tx + delta, 0.08, 0.92);
  }
  function jump() {
    if (jumping <= 0) {
      jumping = 0.85;
      say('¡Arriba!');
    }
  }
  function rhythmInput(direction: number) {
    if (rhythmResolved) return;
    dance = direction;
    danceAt = time;
    const offset = time - rhythmStart;
    rhythmResolved = true;
    if (direction === rhythmDirection && Math.abs(offset - 1) < 0.3) {
      award();
      onRhythmBeat?.(84 + direction * 2, true);
      say('¡Al compás!');
    } else
      say(
        offset < 0.7
          ? 'Espera a que el aro llegue al centro.'
          : 'Sigue la flecha en el próximo compás.',
      );
  }
  function chooseStone(index: number) {
    if (!memoryWaiting || pendingStone !== null) return;
    if (index !== sequence[answerIndex]) {
      say('Casi. Mira otra vez el camino.');
      answerIndex = 0;
      memoryWaiting = false;
      memoryStart = time + 0.6;
      return;
    }
    pendingStone = index;
    player.tx = stonePoints[index].x;
    player.ty = stonePoints[index].y;
    say('Tu mascota sigue la piedra…');
  }
  function prepareCoconutSwap() {
    coconutFrom = [...coconutPositions];
    const first = Math.floor(Math.random() * 3);
    let second = Math.floor(Math.random() * 2);
    if (second >= first) second++;
    coconutSwap = [first, second];
    coconutPhaseAt = time;
  }
  function restartCoconutRound() {
    coconutPhase = 'reveal';
    coconutPhaseAt = time;
    coconutPositions = [0, 1, 2];
    coconutFrom = [...coconutPositions];
    coconutTarget = Math.floor(Math.random() * 3);
    coconutSwapsDone = 0;
    coconutSelection = -1;
    coconutButtons.forEach((item) => (item.disabled = true));
    say('Ronda ' + (coconutRound + 1) + '/3 · Mira dónde se esconde ' + pet.name + '.');
  }
  function chooseCoconut(slot: number) {
    if (disposed || coconutPhase !== 'choose' || coconutFinished) return;
    coconutSelection = slot;
    coconutCorrect = coconutPositions[coconutTarget] === slot;
    coconutPhase = 'result';
    coconutPhaseAt = time;
    coconutButtons.forEach((item) => (item.disabled = true));
    if (coconutCorrect) {
      if (score === 2) {
        coconutFinished = true;
        coconutPhase = 'complete';
      }
      award();
      say(
        score === 3
          ? '¡Encontraste a tu mascota las tres veces!'
          : '¡Ahí está! ' + score + '/3 encuentros.',
      );
      if (coconutFinished) onComplete?.();
    } else {
      onSound();
      say('Estaba bajo otro coco. Mira de nuevo: puedes repetir esta ronda.');
    }
  }
  function stepCoconuts() {
    if (coconutPhase === 'reveal' && time - coconutPhaseAt >= 1.25) {
      coconutPhase = 'shuffle';
      coconutSwapsDone = 0;
      prepareCoconutSwap();
      say('Ronda ' + (coconutRound + 1) + '/3 · Sigue los cocos.');
    } else if (coconutPhase === 'shuffle' && time - coconutPhaseAt >= coconutSwapSeconds()) {
      const [first, second] = coconutSwap;
      [coconutPositions[first], coconutPositions[second]] = [
        coconutPositions[second],
        coconutPositions[first],
      ];
      coconutSwapsDone++;
      if (coconutSwapsDone >= 4 + coconutRound * 2) {
        coconutPhase = 'choose';
        coconutButtons.forEach((item) => (item.disabled = false));
        say('Ronda ' + (coconutRound + 1) + '/3 · ¿Bajo qué coco está ' + pet.name + '?');
      } else prepareCoconutSwap();
    } else if (coconutPhase === 'result' && time - coconutPhaseAt >= 1.15) {
      if (coconutCorrect) coconutRound++;
      restartCoconutRound();
    }
    field.dataset.coconutPhase = coconutPhase;
    field.dataset.coconutRound = String(coconutRound + 1);
    field.dataset.coconutSpeed = coconutSwapSeconds().toFixed(2);
  }
  function newFly(button: HTMLButtonElement, index: number) {
    // Five separate lanes keep targets apart and within reach on small screens.
    button.style.left = `${15 + index * 17}%`;
    button.style.top = `${28 + Math.random() * 27}%`;
    button.dataset.catching = 'false';
  }
  if (kind === 'fireflies') {
    say('Elige una luz y acompaña a tu mascota.');
    for (let i = 0; i < 5; i++) {
      const fly = document.createElement('button');
      fly.type = 'button';
      fly.className = 'firefly';
      fly.setAttribute('aria-label', `Atrapar luciérnaga ${i + 1}`);
      fly.innerHTML =
        '<span class="fly-wing left"></span><span class="fly-wing right"></span><span class="fly-body"></span>';
      newFly(fly, i);
      fly.addEventListener('click', () => {
        if (pendingFly) pendingFly.dataset.catching = 'false';
        pendingFly = fly;
        fly.dataset.catching = 'true';
        player.tx = parseFloat(fly.style.left) / 100;
        player.ty = parseFloat(fly.style.top) / 100 + 0.05;
        say(`${pet.name} va por esa luciérnaga…`);
      });
      field.append(fly);
    }
  } else if (kind === 'fruit') {
    say('Busca la fruta que está cayendo.');
    button('←', 'Mover izquierda', () => moveHorizontal(-0.16));
    button('→', 'Mover derecha', () => moveHorizontal(0.16));
  } else if (kind === 'puddles') {
    player.x = player.tx = 0.28;
    say('Salta cuando el charco esté cerca.');
    button('Saltar ↑', 'Saltar', jump);
  } else if (kind === 'rhythm') {
    say('Sigue la flecha cuando el aro cierre.');
    directions.forEach((direction, i) =>
      button(direction, `Bailar ${['izquierda', 'arriba', 'derecha', 'abajo'][i]}`, () =>
        rhythmInput(i),
      ),
    );
  } else if (kind === 'coconut') {
    for (let i = 0; i < 3; i++)
      coconutButtons.push(button(String(i + 1), 'Coco ' + (i + 1), () => chooseCoconut(i)));
    restartCoconutRound();
  } else if (kind === 'memory') {
    say('Mira el camino iluminado.');
    stonePoints.forEach((_, i) => button(`${i + 1}`, `Piedra ${i + 1}`, () => chooseStone(i)));
  } else {
    say('Empuja la pelota hacia el arco luminoso.');
    directions.forEach((direction, i) =>
      button(direction, `Caminar ${['izquierda', 'arriba', 'derecha', 'abajo'][i]}`, () => {
        if (i === 0 || i === 2) moveHorizontal(i === 0 ? -0.12 : 0.12);
        else player.ty = clamp(player.ty + (i === 1 ? -0.1 : 0.1), 0.3, 0.78);
      }),
    );
  }
  function keydown(event: KeyboardEvent) {
    if (disposed || (event.target as Element).closest('input,textarea')) return;
    const direction = keyDirections[event.key];
    if (direction !== undefined) {
      event.preventDefault();
      if (kind === 'fruit') moveHorizontal(direction === 0 ? -0.16 : direction === 2 ? 0.16 : 0);
      if (kind === 'puddles' && direction === 1) jump();
      if (kind === 'rhythm') rhythmInput(direction);
      if (kind === 'ball') {
        if (direction === 0 || direction === 2) moveHorizontal(direction === 0 ? -0.12 : 0.12);
        else player.ty = clamp(player.ty + (direction === 1 ? -0.1 : 0.1), 0.3, 0.78);
      }
    }
    if (kind === 'coconut' && /^[1-3]$/.test(event.key)) {
      event.preventDefault();
      chooseCoconut(Number(event.key) - 1);
    }
    if (kind === 'memory' && /^[1-4]$/.test(event.key)) {
      event.preventDefault();
      chooseStone(Number(event.key) - 1);
    }
    if (kind === 'puddles' && event.key === ' ' && !(event.target as Element).closest('button')) {
      event.preventDefault();
      jump();
    }
  }
  function point(event: PointerEvent) {
    if (kind !== 'ball' && kind !== 'fruit') return;
    const bounds = canvas.getBoundingClientRect();
    player.tx = clamp((event.clientX - bounds.left) / bounds.width, 0.06, 0.94);
    if (kind === 'ball') player.ty = clamp((event.clientY - bounds.top) / bounds.height, 0.3, 0.78);
  }
  canvas.addEventListener('pointerdown', point);
  document.addEventListener('keydown', keydown);
  function ellipse(x: number, y: number, rx: number, ry: number, color: string) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  function drawPet() {
    const jumpHeight = jumping > 0 ? Math.sin((1 - jumping / 0.85) * Math.PI) * height * 0.22 : 0;
    const bounce = danceAt + 0.4 > time ? Math.sin(((time - danceAt) * Math.PI) / 0.4) * 14 : 0;
    const x = player.x * width,
      floor = player.y * height;
    const size =
      clamp(width / 600, 0.65, 1.1) * (pet.stage === 'baby' ? 22 : pet.stage === 'young' ? 27 : 32);
    const color = { forest: '#b3d2a4', coast: '#a5d8e3', tundra: '#d9c5e9' }[pet.biome];
    ellipse(x, floor + 6, size * 0.85, size * 0.2, '#243b4e35');
    ctx.save();
    ctx.translate(x, floor - size - jumpHeight - bounce);
    if (danceAt + 0.4 > time)
      ctx.rotate((dance === 0 ? -1 : 1) * Math.sin((time - danceAt) * 8) * 0.2);
    if (pet.stage === 'adult') {
      ellipse(size * 0.85, size * 0.35, size * 0.55, size * 0.24, color);
      ellipse(-size * 0.55, -size * 0.8, size * 0.22, size * 0.6, color);
      ellipse(size * 0.55, -size * 0.8, size * 0.22, size * 0.6, color);
    }
    if (pet.stage !== 'baby') {
      ellipse(-size * 0.45, size * 0.84, size * 0.25, size * 0.25, color);
      ellipse(size * 0.45, size * 0.84, size * 0.25, size * 0.25, color);
      ellipse(-size * 0.85, size * 0.2, size * 0.22, size * 0.32, color);
      ellipse(size * 0.85, size * 0.2, size * 0.22, size * 0.32, color);
    }
    ellipse(0, 0, size, size * (pet.stage === 'baby' ? 0.95 : 1.1), color);
    ellipse(-size * 0.29, -size * 0.08, size * 0.12, size * 0.19, '#263e48');
    ellipse(size * 0.29, -size * 0.08, size * 0.12, size * 0.19, '#263e48');
    ellipse(-size * 0.32, -size * 0.14, size * 0.035, size * 0.05, '#fff');
    ellipse(size * 0.26, -size * 0.14, size * 0.035, size * 0.05, '#fff');
    if (pet.stage !== 'baby') {
      ctx.strokeStyle = '#53715c';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, size * 0.25, size * 0.15, 0, Math.PI);
      ctx.stroke();
      if (pet.stage === 'adult') {
        ellipse(0, size * 0.62, size * 0.46, size * 0.3, '#f4ebd880');
        ellipse(-size * 0.6, size * 0.1, size * 0.17, size * 0.09, '#eaaca480');
        ellipse(size * 0.6, size * 0.1, size * 0.17, size * 0.09, '#eaaca480');
      }
    }
    ctx.restore();
    ctx.fillStyle = '#f7f4e9';
    ctx.font = '12px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(pet.name, x, floor + 24);
  }
  function drawCoconuts() {
    const centerY = height * 0.66;
    const radius = Math.min(68, width * 0.115);
    const positions = [...coconutPositions];
    let swapProgress = 0;
    if (coconutPhase === 'shuffle') {
      swapProgress = clamp((time - coconutPhaseAt) / coconutSwapSeconds());
      const ease = swapProgress * swapProgress * (3 - 2 * swapProgress);
      const [first, second] = coconutSwap;
      positions[first] = coconutFrom[first] + (coconutFrom[second] - coconutFrom[first]) * ease;
      positions[second] = coconutFrom[second] + (coconutFrom[first] - coconutFrom[second]) * ease;
    }
    const reveal =
      coconutPhase === 'reveal' || coconutPhase === 'result' || coconutPhase === 'complete';
    if (reveal) {
      const saved = { x: player.x, y: player.y };
      player.x = 0.2 + positions[coconutTarget] * 0.3;
      player.y = 0.66;
      drawPet();
      player.x = saved.x;
      player.y = saved.y;
    }
    for (let i = 0; i < 3; i++) {
      const x = (0.2 + positions[i] * 0.3) * width;
      const moving = coconutPhase === 'shuffle' && coconutSwap.includes(i);
      const arc = moving
        ? Math.sin(swapProgress * Math.PI) *
          (i === coconutSwap[0] ? -1 : 1) *
          (reducedMotion.matches ? 7 : 34)
        : 0;
      const lifted = reveal && i === coconutTarget;
      const lift = lifted ? radius * 1.8 : 0;
      ellipse(x, centerY + 16 + arc * 0.2, radius * 1.08, radius * 0.2, '#3b43312d');
      ctx.save();
      ctx.translate(x, centerY + arc - lift);
      const brown = ctx.createLinearGradient(0, -radius, 0, radius * 0.3);
      brown.addColorStop(0, '#ae7e4e');
      brown.addColorStop(1, '#67442e');
      ctx.beginPath();
      ctx.moveTo(-radius, 12);
      ctx.bezierCurveTo(-radius * 1.05, -radius * 1.25, radius * 1.05, -radius * 1.25, radius, 12);
      ctx.closePath();
      ctx.fillStyle = brown;
      ctx.fill();
      ctx.strokeStyle = '#593f2d';
      ctx.lineWidth = 3;
      ctx.stroke();
      for (let line = -2; line <= 2; line++) {
        ctx.beginPath();
        ctx.moveTo(line * radius * 0.2, -radius * 0.65);
        ctx.quadraticCurveTo(line * radius * 0.32, -radius * 0.15, line * radius * 0.37, 7);
        ctx.strokeStyle = '#d1a57270';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      ellipse(0, 12, radius, radius * 0.17, '#f4e7cb');
      ellipse(0, 12, radius * 0.82, radius * 0.08, '#a68358');
      // Small markings let players follow the physical shells, including reduced motion.
      for (let mark = 0; mark <= i; mark++)
        ellipse((mark - i / 2) * 8, -radius * 0.42, 2.3, 2.3, '#f3ddab');
      ctx.restore();
    }
    ctx.textAlign = 'center';
    ctx.font = '600 16px system-ui';
    ctx.fillStyle = '#fff6d5';
    ctx.fillText('RONDA ' + (coconutRound + 1) + ' DE 3', width / 2, height * 0.15);
    for (let i = 0; i < 3; i++) {
      ellipse(width / 2 + (i - 1) * 24, height * 0.23, 7, 7, i < score ? '#ffdf7d' : '#ffffff45');
      ctx.fillStyle = '#fff6d5';
      ctx.fillText(String(i + 1), width * (0.2 + i * 0.3), centerY + radius + 22);
    }
    if (coconutPhase === 'result' && !coconutCorrect && coconutSelection >= 0) {
      ctx.font = '20px system-ui';
      ctx.fillText('↗', width * (0.2 + coconutSelection * 0.3), centerY + radius + 46);
    }
  }
  function draw() {
    const night = kind === 'fireflies';
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, night ? '#172b45' : '#5a9094');
    gradient.addColorStop(1, night ? '#2d5361' : '#b5cfa4');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    for (let i = 0; i < 5; i++)
      ellipse(
        width * (i / 4),
        height * 0.94,
        width * 0.28,
        height * (0.43 + (i % 2) * 0.06),
        night ? '#294d4d' : '#83af8b',
      );
    for (let i = 0; i < 12; i++)
      ellipse(
        (((i * 79 + 31) % 600) / 600) * width,
        (0.35 + ((i * 13) % 40) / 100) * height,
        2,
        1,
        '#e1f1bd55',
      );
    if (kind === 'fruit') {
      for (const fruit of fruits) {
        ellipse(fruit.x * width, fruit.y * height, 11, 12, '#efad71');
        ellipse(fruit.x * width + 4, fruit.y * height - 12, 6, 3, '#4d7857');
      }
    }
    if (kind === 'puddles') {
      ellipse(puddleX * width, height * 0.75, width * 0.07, height * 0.035, '#7ac2da');
      ellipse(puddleX * width, height * 0.747, width * 0.05, height * 0.02, '#bfebef');
      ctx.fillStyle = '#edf4d6';
      ctx.font = '15px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('SALTA AQUÍ', player.x * width, height * 0.39);
    }
    if (kind === 'rhythm') {
      const progress = clamp(time - rhythmStart);
      ctx.strokeStyle = '#fff8c6';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(width * 0.5, height * 0.25, 22 + (1 - progress) * 38, 0, Math.PI * 2);
      ctx.stroke();
      ctx.font = 'bold 34px system-ui';
      ctx.fillStyle = '#fff8df';
      ctx.textAlign = 'center';
      ctx.fillText(directions[rhythmDirection], width * 0.5, height * 0.25 + 11);
      field.dataset.rhythmDirection = String(rhythmDirection);
      field.dataset.rhythmPhase = String(Math.round((time - rhythmStart) * 1000));
    }
    if (kind === 'memory') {
      const showingIndex = Math.floor((time - memoryStart) / 0.65);
      const flashPhase = (time - memoryStart) % 0.65;
      stonePoints.forEach((point, index) => {
        // A dark interval makes consecutive repetitions of the same stone readable.
        const active =
          !memoryWaiting &&
          showingIndex >= 0 &&
          showingIndex < sequence.length &&
          flashPhase < 0.45 &&
          sequence[showingIndex] === index;
        ellipse(point.x * width, point.y * height + 8, 25, 12, active ? '#fff2a4' : '#a9bcbb');
        ctx.font = 'bold 17px system-ui';
        ctx.fillStyle = '#274c53';
        ctx.textAlign = 'center';
        ctx.fillText(String(index + 1), point.x * width, point.y * height + 12);
      });
      field.dataset.memoryPhase = memoryWaiting ? 'answer' : 'watch';
    }
    if (kind === 'ball') {
      ctx.strokeStyle = '#fff3bb';
      ctx.lineWidth = 5;
      ctx.strokeRect(width * 0.88, (goalY - 0.1) * height, width * 0.08, height * 0.2);
      ellipse(ball.x * width, ball.y * height, 13, 13, '#fff1c4');
      ellipse(ball.x * width - 3, ball.y * height - 3, 5, 5, '#d09b69');
      field.dataset.ballX = ball.x.toFixed(3);
      field.dataset.ballY = ball.y.toFixed(3);
    }
    if (kind === 'coconut') drawCoconuts();
    else drawPet();
    canvas.dataset.petX = player.x.toFixed(3);
    canvas.dataset.petY = player.y.toFixed(3);
  }
  function step(now: number) {
    if (disposed) return;
    const dt = Math.min(previous ? (now - previous) / 1000 : 0, 0.05);
    previous = now;
    time += dt;
    if (!document.hidden) {
      const dx = player.tx - player.x,
        dy = player.ty - player.y;
      const distance = Math.hypot(dx, dy);
      const speed = Math.min(1, (dt * 0.65) / Math.max(distance, 0.001));
      player.x += dx * speed;
      player.y += dy * speed;
      jumping = Math.max(0, jumping - dt);
      if (kind === 'fireflies' && pendingFly && distance < 0.025) {
        const fly = pendingFly;
        pendingFly = null;
        award();
        say('¡La encontró! Elige otra lucecita.');
        newFly(fly, Array.from(field.querySelectorAll('.firefly')).indexOf(fly));
      }
      if (kind === 'fruit') {
        if (time >= nextFruit) {
          fruits.push({
            x: 0.12 + Math.random() * 0.76,
            y: 0.15,
            speed: 0.16 + Math.random() * 0.04,
          });
          nextFruit = time + 0.9;
        }
        for (let i = fruits.length - 1; i >= 0; i--) {
          const fruit = fruits[i];
          fruit.y += fruit.speed * dt;
          if (fruit.y > 0.6 && fruit.y < 0.79 && Math.abs(fruit.x - player.x) < 0.065) {
            fruits.splice(i, 1);
            award();
            say('¡Una fruta en su cesta!');
          } else if (fruit.y > 0.85) fruits.splice(i, 1);
        }
      }
      if (kind === 'puddles') {
        puddleX -= dt * 0.34;
        if (!puddleResolved && Math.abs(puddleX - player.x) < 0.035) {
          puddleResolved = true;
          if (jumping > 0.18 && jumping < 0.72) {
            award();
            say('¡Un salto perfecto!');
          } else say('Unas gotitas. Prueba a saltar un poco antes.');
        }
        if (puddleX < -0.12) {
          puddleX = 1.15;
          puddleResolved = false;
        }
        field.dataset.puddleX = puddleX.toFixed(3);
      }
      if (kind === 'rhythm' && time >= nextBeat) {
        onRhythmBeat?.(melody[beatNumber % melody.length]);
        beatNumber++;
        nextBeat += 0.5;
        field.dataset.rhythmBeat = String(beatNumber);
      }
      if (kind === 'coconut') stepCoconuts();
      if (kind === 'rhythm' && time - rhythmStart >= 2) {
        rhythmStart = time;
        rhythmDirection = (rhythmDirection + 1 + Math.floor(Math.random() * 3)) % 4;
        rhythmResolved = false;
        say('Mira la flecha. Espera al centro.');
      }
      if (kind === 'memory') {
        if (!memoryWaiting && time - memoryStart >= sequence.length * 0.65 + 0.35) {
          memoryWaiting = true;
          answerIndex = 0;
          say('Ahora tú: repite el camino.');
        }
        if (pendingStone !== null && distance < 0.025) {
          pendingStone = null;
          answerIndex++;
          if (answerIndex === sequence.length) {
            award();
            say('¡Recordaron el camino! Mira el siguiente.');
            sequence = [...sequence, Math.floor(Math.random() * 4)];
            memoryWaiting = false;
            memoryStart = time + 0.75;
          } else say('Bien. ¿Qué piedra sigue?');
        }
      }
      if (kind === 'ball') {
        const bx = (ball.x - player.x) * width,
          by = (ball.y - player.y) * height;
        const separation = Math.hypot(bx, by);
        const petRadius =
          clamp(width / 600, 0.65, 1.1) *
          (pet.stage === 'baby' ? 22 : pet.stage === 'young' ? 27 : 32);
        const contactRadius = 13 + petRadius * 0.8;
        if (separation < contactRadius && separation > 0.001) {
          const nx = bx / separation,
            ny = by / separation;
          // Resolve contact before pushing: walking through the ball used to cancel
          // the impulse from its opposite side and made a normal tap miss the goal.
          player.x = ball.x - (nx * contactRadius) / width;
          player.y = ball.y - (ny * contactRadius) / height;
          ball.vx += nx * dt * 2;
          ball.vy += ny * dt * 2;
        }
        ball.x = clamp(ball.x + ball.vx * dt, 0.04, 0.97);
        ball.y = clamp(ball.y + ball.vy * dt, 0.3, 0.79);
        ball.vx *= Math.exp(-dt * 2.5);
        ball.vy *= Math.exp(-dt * 2.5);
        if (ball.x > 0.89 && Math.abs(ball.y - goalY) < 0.105) {
          award();
          say('¡Gol de tu mascota!');
          ball.x = 0.4;
          ball.y = 0.53;
          ball.vx = ball.vy = 0;
          player.x = player.tx = 0.22;
          goalY = 0.47 + Math.random() * 0.18;
        }
      }
    }
    draw();
    if (!disposed) frame = requestAnimationFrame(step);
  }
  function resize() {
    const bounds = field.getBoundingClientRect();
    width = Math.max(1, bounds.width);
    height = Math.max(1, bounds.height);
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(field);
  resize();
  frame = requestAnimationFrame(step);
  return {
    getScore: () => score,
    destroy() {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener('keydown', keydown);
      canvas.removeEventListener('pointerdown', point);
      field.querySelectorAll('button').forEach((button) => (button.disabled = true));
    },
  };
}
