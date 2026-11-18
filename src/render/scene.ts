/** Xisverso: every shape is drawn at runtime, without image or model assets. */
import type { DecorationId } from '../domain/game';

export interface ScenePet {
  id?: string;
  worldBiome?: 'forest' | 'coast' | 'tundra';
  stage?: 'egg' | 'baby' | 'young' | 'adult';
  companions?: SceneCompanion[];
  decorations?: readonly DecorationId[];
  seed: number;
  biome: 'forest' | 'coast' | 'tundra';
  mood: string;
  sleeping: boolean;
}

export interface SceneCompanion {
  id: string;
  name: string;
  seed: number;
  biome: 'forest' | 'coast' | 'tundra';
  stage: 'adult';
}

export type SceneTool = 'hand' | 'feed' | 'clean' | 'rest';
export interface SceneOptions {
  onPetInteract?: (tool: SceneTool) => void;
  onCompanionInteract?: (id: string) => void;
  onWalk?: (x: number, y: number) => void;
}
type Reaction = 'feed' | 'clean' | 'rest' | 'pet' | 'win';
type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  kind: 'heart' | 'spark' | 'bubble';
  color: string;
};

const WORLD_W = 1000;
const WORLD_H = 560;
const TAU = Math.PI * 2;

function seeded(seed: number): () => number {
  let n = seed | 0 || 1;
  return () => {
    n = (Math.imul(n, 1664525) + 1013904223) | 0;
    return (n >>> 0) / 4294967296;
  };
}

export function createScene(
  canvas: HTMLCanvasElement,
  initial: ScenePet,
  options: SceneOptions = {},
): {
  update(pet: ScenePet): void;
  react(action: Reaction): void;
  destroy(): void;
  setTool(tool: SceneTool): void;
  walkTo(x: number, y: number): void;
  getPetPosition(): { x: number; y: number };
  getPetBounds(): { x: number; y: number; width: number; height: number };
  reactTogether(id: string): void;
} {
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Tu navegador necesita Canvas 2D para mostrar la mascota.');
  const ctx = context;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let pet = { ...initial };
  let disposed = false;
  let frame = 0;
  let previous = 0;
  let clock = 0;
  let reaction: Reaction | null = null;
  let reactionUntil = 0;
  let socialId: string | null = null;
  let socialUntil = 0;
  let particles: Particle[] = [];
  let tool: SceneTool = 'hand';
  // Positions describe the contact with the ground, never the centre of the body.
  // Scaling a creature therefore cannot make its feet slide through the scenery.
  let position = { x: 0.5, y: 0.7 };
  let destination = { ...position };
  let walking = false;
  let walkPhase = 0;
  let lastInteraction = 0;
  let nextWander = 9;
  let groundMarker = { x: 0, y: 0, until: 0 };
  let pointerStart: {
    x: number;
    y: number;
    id: number;
    touch: boolean;
    lastX: number;
    lastY: number;
    distance: number;
    stroked: boolean;
    wasOverPet: boolean;
  } | null = null;
  let lastTouchStroke = -Infinity;
  let width = 1;
  let height = 1;
  let pointer = 0;
  let targetPointer = 0;
  const visitorSlots = new Map<string, number>();
  const landmarks = Array.from({ length: 30 }, (_, i) => {
    const random = seeded(i * 163 + 42);
    return {
      x: random() * WORLD_W,
      y: random(),
      size: 0.6 + random() * 1.1,
      phase: random() * TAU,
    };
  });

  function ellipse(x: number, y: number, rx: number, ry: number, color: string, rotation = 0) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, rotation, 0, TAU);
    ctx.fillStyle = color;
    ctx.fill();
  }
  function stroke(color: string, thickness = 2) {
    ctx.strokeStyle = color;
    ctx.lineWidth = thickness;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  }
  function path(fill: string | CanvasGradient, draw: () => void) {
    ctx.beginPath();
    draw();
    ctx.fillStyle = fill;
    ctx.fill();
  }
  function hill(color: string, y: number, left: number, right: number) {
    path(color, () => {
      ctx.moveTo(-100, y);
      ctx.bezierCurveTo(180, left, 660, right, 1100, y - 15);
      ctx.lineTo(1100, 700);
      ctx.lineTo(-100, 700);
      ctx.closePath();
    });
  }
  function pine(x: number, y: number, size: number, color: string, snow = false) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(size, size);
    ctx.fillStyle = snow ? '#8c9391' : '#8c8663';
    ctx.fillRect(-3, -82, 6, 89);
    for (let n = 0; n < 3; n++) {
      const top = -178 + n * 43;
      const spread = 31 + n * 15;
      path(color, () => {
        ctx.moveTo(0, top);
        ctx.quadraticCurveTo(-spread * 0.36, top + 26, -spread, top + 72);
        ctx.quadraticCurveTo(0, top + 91, spread, top + 72);
        ctx.quadraticCurveTo(spread * 0.36, top + 26, 0, top);
      });
      if (snow)
        path('#edf4ec', () => {
          ctx.moveTo(0, top);
          ctx.lineTo(-spread * 0.61, top + 44);
          ctx.quadraticCurveTo(0, top + 59, spread * 0.61, top + 44);
          ctx.closePath();
        });
    }
    ctx.restore();
  }
  function leaf(x: number, y: number, size: number, rotation: number, color: string) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    path(color, () => {
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-size, -size * 0.5, -size * 0.65, -size * 1.4, 0, -size * 1.6);
      ctx.bezierCurveTo(size * 0.7, -size, size * 0.55, -size * 0.35, 0, 0);
    });
    ctx.restore();
  }
  function grass(x: number, y: number, size: number, color: string) {
    ctx.beginPath();
    ctx.moveTo(x - size * 0.55, y);
    ctx.quadraticCurveTo(x - size * 0.8, y - size, x - size * 0.4, y - size * 1.4);
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + size * 0.1, y - size, x - size * 0.12, y - size * 1.8);
    ctx.moveTo(x + size * 0.38, y);
    ctx.quadraticCurveTo(x + size * 0.7, y - size * 0.7, x + size, y - size);
    stroke(color, 2.8);
  }
  function mushroom(x: number, y: number, size: number) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(size, size);
    path('#f1e9ce', () => {
      ctx.moveTo(-5, 0);
      ctx.lineTo(-4, -20);
      ctx.lineTo(5, -20);
      ctx.lineTo(7, 0);
      ctx.closePath();
    });
    path('#c77650', () => {
      ctx.moveTo(-19, -15);
      ctx.bezierCurveTo(-19, -40, 20, -42, 21, -15);
      ctx.quadraticCurveTo(0, -8, -19, -15);
    });
    ellipse(-7, -24, 3, 2.4, '#f5e4b8');
    ellipse(7, -28, 3.5, 2.5, '#f5e4b8');
    ellipse(11, -18, 2.2, 1.9, '#f5e4b8');
    ctx.restore();
  }
  function blossom(x: number, y: number, color: string) {
    for (let i = 0; i < 5; i++)
      ellipse(x + Math.cos((i * TAU) / 5) * 4, y + Math.sin((i * TAU) / 5) * 4, 3.4, 3.4, color);
    ellipse(x, y, 2.5, 2.5, '#e9b458');
  }
  function cloud(x: number, y: number, scale: number) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.globalAlpha = 0.58;
    ellipse(0, 0, 39, 12, '#fffdf1');
    ellipse(-20, -6, 21, 17, '#fffdf1');
    ellipse(9, -13, 23, 21, '#fffdf1');
    ellipse(29, -3, 21, 13, '#fffdf1');
    ctx.restore();
  }

  function worldBiome() {
    return pet.worldBiome ?? pet.biome;
  }
  function palm(x: number, y: number, size: number) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(size, size);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(24, -100, -6, -205);
    stroke('#b0a079', 15);
    for (let index = 0; index < 7; index++) {
      ctx.save();
      ctx.translate(-6, -205);
      ctx.rotate(-Math.PI + index * 0.48);
      path(index % 2 ? '#6b9b7c' : '#7ca88a', () => {
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(65, -38, 106, 17);
        ctx.quadraticCurveTo(54, -1, 0, 0);
      });
      ctx.restore();
    }
    ellipse(-14, -190, 10, 13, '#9b8862');
    ellipse(1, -185, 9, 12, '#a3916e');
    ctx.restore();
  }
  function background() {
    const coast = worldBiome() === 'coast';
    const tundra = worldBiome() === 'tundra';
    const sky = ctx.createLinearGradient(0, 0, 0, WORLD_H);
    sky.addColorStop(0, tundra ? '#dce8ef' : coast ? '#dceee6' : '#e9edda');
    sky.addColorStop(1, tundra ? '#f3efe8' : coast ? '#f5edce' : '#f3eed8');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);
    ellipse(790, 108, 65, 65, tundra ? '#f6f4e6' : '#f5e3a5');
    ellipse(790, 108, 49, 49, tundra ? '#fefbf0' : '#ffe9b1');
    cloud(310 + Math.sin(clock * 0.04) * 34, 95, 0.7);
    cloud(670 + Math.sin(clock * 0.035 + 1) * 26, 170, 0.55);
    cloud(940 + Math.sin(clock * 0.03 + 2) * 31, 66, 0.8);
    if (coast) {
      hill('#c7dcd2', 305, 220, 195);
      ctx.fillStyle = '#9dcac5';
      ctx.fillRect(0, 300, WORLD_W, 180);
      for (let i = 0; i < 7; i++) {
        const y = 321 + i * 20;
        ctx.beginPath();
        ctx.moveTo(0, y);
        for (let x = 0; x <= 1040; x += 40)
          ctx.lineTo(x, y + Math.sin(x * 0.02 + clock * 0.6 + i) * 3);
        stroke(i % 2 ? '#b9dcd2' : '#d6e6d5', 2);
      }
      hill('#e6d6a3', 428, 344, 438);
      hill('#f0dfb1', 491, 386, 463);
      for (const item of landmarks.slice(0, 10)) {
        const x = item.x,
          y = 450 + item.y * 100;
        ellipse(x, y, 9 * item.size, 4 * item.size, '#cabc91');
      }
      // Coastal plants stay coastal in both landscape and portrait.
      // Shells and a starfish.
      ctx.save();
      ctx.translate(760, 466);
      ctx.rotate(-0.2);
      path('#e9ad8f', () => {
        ctx.moveTo(-18, 7);
        ctx.bezierCurveTo(-37, -22, -20, -31, -13, -24);
        ctx.bezierCurveTo(-10, -37, 3, -36, 8, -26);
        ctx.bezierCurveTo(21, -34, 35, -17, 19, 7);
        ctx.closePath();
      });
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(0, 7);
        ctx.lineTo(i * 9, -20);
        stroke('#d68f75', 1.4);
      }
      ctx.restore();
      star(222, 496, 18, '#d99d6d');
      grass(852, 483, 20, '#8ea17a');
      grass(131, 490, 23, '#8ea17a');
    } else if (tundra) {
      path('#bdccd6', () => {
        ctx.moveTo(-40, 330);
        ctx.lineTo(130, 154);
        ctx.lineTo(270, 312);
        ctx.lineTo(425, 150);
        ctx.lineTo(600, 329);
        ctx.lineTo(810, 180);
        ctx.lineTo(1050, 330);
        ctx.lineTo(1050, 560);
        ctx.lineTo(-40, 560);
      });
      path('#ecf0ed', () => {
        ctx.moveTo(60, 225);
        ctx.lineTo(130, 154);
        ctx.lineTo(196, 238);
        ctx.lineTo(147, 224);
        ctx.lineTo(125, 239);
        ctx.lineTo(97, 221);
        ctx.closePath();
      });
      path('#edf1ec', () => {
        ctx.moveTo(353, 231);
        ctx.lineTo(425, 150);
        ctx.lineTo(510, 239);
        ctx.lineTo(460, 218);
        ctx.lineTo(424, 242);
        ctx.lineTo(393, 219);
        ctx.closePath();
      });
      hill('#d3dfe1', 390, 318, 293);
      hill('#e9efeb', 465, 372, 374);
      hill('#f5f5eb', 548, 434, 468);
      for (const item of landmarks.slice(0, 20)) {
        const y = (item.y * WORLD_H + clock * 9 * item.size) % WORLD_H;
        ellipse(
          item.x + Math.sin(clock + item.phase) * 8,
          y,
          2 * item.size,
          2 * item.size,
          '#ffffffb0',
        );
      }
      grass(228, 487, 15, '#b2c1b4');
      grass(882, 496, 12, '#b2c1b4');
    } else {
      hill('#ccd8b8', 322, 189, 210);
      hill('#bccdaa', 369, 270, 255);
      hill('#b2c593', 441, 326, 334);
      hill('#cad4a5', 514, 414, 424);
      path('#ded9af', () => {
        ctx.moveTo(443, 560);
        ctx.bezierCurveTo(523, 496, 662, 472, 644, 433);
        ctx.bezierCurveTo(634, 409, 578, 401, 603, 382);
        ctx.bezierCurveTo(542, 411, 597, 424, 570, 443);
        ctx.bezierCurveTo(534, 470, 386, 485, 291, 560);
        ctx.closePath();
      });
      // A large tree with rounded leaves creates a soft frame.
      path('#8a9271', () => {
        ctx.moveTo(53, 472);
        ctx.quadraticCurveTo(83, 293, 54, 164);
        ctx.lineTo(83, 152);
        ctx.quadraticCurveTo(110, 330, 90, 475);
        ctx.closePath();
      });
      ctx.beginPath();
      ctx.moveTo(80, 270);
      ctx.lineTo(129, 222);
      ctx.moveTo(74, 226);
      ctx.lineTo(26, 190);
      stroke('#8a9271', 12);
      ellipse(40, 137, 112, 86, '#91ae83');
      ellipse(115, 167, 78, 67, '#a5bc8c');
      ellipse(4, 218, 73, 59, '#a0b58a');
      ellipse(53, 99, 87, 60, '#adc391');
      for (const item of landmarks.slice(0, 14)) {
        const y = 433 + item.y * 110;
        grass(item.x, y, 6 * item.size, '#8da676');
        if (item.x < 380 || item.x > 680)
          blossom(item.x + 13, y - 4, item.x % 2 > 1 ? '#f1e4bb' : '#e5c0a2');
      }
      for (let i = 0; i < 3; i++) {
        const x = 357 + i * 252 + Math.sin(clock * 0.4 + i) * 12;
        const y = 204 + i * 29 + Math.cos(clock * 0.7 + i) * 8;
        const flap = 0.5 + Math.abs(Math.sin(clock * 4 + i)) * 0.5;
        ellipse(x - 4 * flap, y, 5 * flap, 7, '#e6bc68', -0.4);
        ellipse(x + 4 * flap, y, 5 * flap, 7, '#f0cf86', 0.4);
        ctx.beginPath();
        ctx.moveTo(x, y - 3);
        ctx.lineTo(x, y + 5);
        stroke('#8b9570', 1.3);
      }
    }
    // Foreground foliage anchors the illustration without covering the pet.
    if (!tundra) {
      const color = coast ? '#8ba785' : '#829d71';
      for (let i = 0; i < 5; i++) {
        leaf(25 + i * 13, 567, 48 + i * 5, -0.9 + i * 0.35, color);
        leaf(
          967 + i * 9,
          575,
          36 + i * 4,
          -1 + i * 0.3,
          i % 2 ? color : coast ? '#a2b58e' : '#9eb184',
        );
      }
    }
  }

  function star(x: number, y: number, size: number, color: string) {
    path(color, () => {
      for (let i = 0; i < 10; i++) {
        const angle = -Math.PI / 2 + (i * Math.PI) / 5;
        const radius = i % 2 ? size * 0.47 : size;
        const px = x + Math.cos(angle) * radius,
          py = y + Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
    });
  }
  function heart(x: number, y: number, size: number, color: string) {
    path(color, () => {
      ctx.moveTo(x, y + size * 0.7);
      ctx.bezierCurveTo(x - size * 1.2, y, x - size * 0.8, y - size, x, y - size * 0.4);
      ctx.bezierCurveTo(x + size * 0.8, y - size, x + size * 1.2, y, x, y + size * 0.7);
    });
  }

  function growingCreature(model: ScenePet, companion: boolean) {
    const baby = model.stage === 'baby';
    const coast = model.biome === 'coast';
    const tundra = model.biome === 'tundra';
    const base = coast ? '#7bb7ba' : tundra ? '#b7adc9' : '#a7bb82';
    const shade = coast ? '#64a4aa' : tundra ? '#9c91b5' : '#8fa56a';
    const light = coast ? '#c0e1db' : tundra ? '#e2d9ea' : '#d7dfb2';
    const active = companion
      ? model.id === socialId && clock < socialUntil
      : reaction !== null && clock < reactionUntil;
    const asleep = model.sleeping || (active && reaction === 'rest');
    const moving = !companion && walking;
    const looking = companion ? 0 : pointer;
    const lift = motion.matches
      ? 0
      : baby
        ? 5 + Math.sin(clock * 2.1) * 4 + (active ? 7 : 0)
        : moving
          ? Math.abs(Math.sin(walkPhase)) * 6
          : active
            ? Math.abs(Math.sin(clock * 7)) * 8
            : Math.sin(clock * 2) * 1.4;
    ellipse(522, 472, baby ? 67 : 83, baby ? 10 : 13, '#40583a1c');
    ctx.save();
    ctx.translate(522 + looking * 2, (baby ? 375 : 365) - lift);
    const body = ctx.createLinearGradient(-65, -85, 68, 98);
    body.addColorStop(0, light);
    body.addColorStop(0.48, base);
    body.addColorStop(1, shade);
    if (baby) {
      // The infant is a little living orb: no paws, ears, tail or adult markings.
      path(body, () => {
        ctx.moveTo(0, -83);
        ctx.bezierCurveTo(-67, -83, -88, -29, -80, 29);
        ctx.bezierCurveTo(-76, 74, -46, 88, -22, 81);
        ctx.quadraticCurveTo(-8, 96, 5, 83);
        ctx.quadraticCurveTo(25, 95, 40, 79);
        ctx.bezierCurveTo(83, 79, 89, 34, 81, -6);
        ctx.bezierCurveTo(82, -55, 50, -83, 0, -83);
      });
      ellipse(-32, -44, 16, 24, '#ffffff38', 0.4);
    } else {
      // A young pet acquires small limbs and the first hints of its adult species.
      ellipse(72, 66, 22, 12, shade, -0.65);
      for (const side of [-1, 1]) {
        ellipse(side * 41, -76, coast ? 16 : 13, coast ? 25 : 38, base, side * 0.22);
        ellipse(side * 43, -80, 7, coast ? 15 : 23, light, side * 0.22);
        ellipse(
          side * 43,
          98 - (moving ? Math.max(0, Math.sin(walkPhase + side)) * 6 : 0),
          22,
          12,
          shade,
        );
      }
      path(body, () => {
        ctx.moveTo(0, -76);
        ctx.bezierCurveTo(-65, -79, -86, -33, -80, 22);
        ctx.bezierCurveTo(-93, 79, -60, 106, 0, 107);
        ctx.bezierCurveTo(60, 106, 93, 79, 80, 22);
        ctx.bezierCurveTo(86, -33, 65, -79, 0, -76);
      });
      ellipse(0, 62, 45, 35, '#edf0cf');
      ellipse(-76, 49, 12, 22, base, -0.33);
      ellipse(76, 49, 12, 22, base, 0.33);
      ellipse(-46, 22, 12, 6, coast ? '#e9b5a1' : '#dfb599');
      ellipse(46, 22, 12, 6, coast ? '#e9b5a1' : '#dfb599');
      if (coast) ellipse(0, -72, 13, 7, '#e6b78e');
      else if (tundra) {
        path('#eee8e4', () => {
          ctx.moveTo(-15, -70);
          ctx.lineTo(-6, -91);
          ctx.lineTo(2, -79);
          ctx.lineTo(12, -85);
          ctx.lineTo(17, -70);
        });
      } else leaf(0, -73, 13, 0.55, '#819e5f');
      ctx.beginPath();
      ctx.moveTo(-7, 31);
      ctx.quadraticCurveTo(0, 38, 7, 31);
      stroke('#35483d', 2.5);
    }
    const blink = !motion.matches && Math.sin(clock * 0.73 + seeded(model.seed)() * 4) > 0.989;
    for (const side of [-1, 1]) {
      const eyeX = side * (baby ? 25 : 28) + looking * 3;
      if (asleep || blink || active) {
        ctx.beginPath();
        ctx.moveTo(eyeX - 8, 3);
        ctx.quadraticCurveTo(eyeX, active && !asleep ? -7 : 9, eyeX + 8, 3);
        stroke('#35483d', 3.8);
      } else {
        ellipse(eyeX, 0, baby ? 10 : 9, baby ? 15 : 12, '#35483d');
        ellipse(eyeX - 2, -5, 3.2, 4.4, '#fffdf2');
      }
    }
    if (asleep) {
      ctx.font = '600 23px system-ui, sans-serif';
      ctx.fillStyle = '#667d76';
      ctx.fillText('z', 95, -62);
    }
    if (active && reaction === 'feed') {
      ellipse(-93, 47, 13, 14, '#d3946c');
      leaf(-93, 35, 8, 0.5, '#719455');
    }
    ctx.restore();
  }

  function creature(model: ScenePet = pet, companion = false) {
    if (model.stage === 'baby' || model.stage === 'young') {
      growingCreature(model, companion);
      return;
    }
    const coast = model.biome === 'coast';
    const tundra = model.biome === 'tundra';
    const appearance = seeded(model.seed)();
    const moving = !companion && walking;
    const looking = companion ? 0 : pointer;
    const active = companion
      ? model.id === socialId && clock < socialUntil
      : reaction !== null && clock < reactionUntil;
    const happy = active && reaction !== 'rest';
    const sleepy = model.sleeping || (!companion && active && reaction === 'rest');
    const bounce = !motion.matches
      ? happy
        ? Math.abs(Math.sin((reactionUntil - clock) * 7)) * 14
        : moving
          ? Math.abs(Math.sin(walkPhase)) * 8
          : 0
      : 0;
    const breathing = motion.matches ? 0 : Math.sin(clock * (sleepy ? 1.7 : 2.1)) * 2.4;
    const base = coast ? '#7bb7ba' : tundra ? '#b7adc9' : '#a7bb82';
    const shade = coast ? '#64a4aa' : tundra ? '#9c91b5' : '#8fa56a';
    const light = coast ? '#a4d0ce' : tundra ? '#cec5d9' : '#c2d09d';
    const ink = '#35483d';
    const offset = looking * 3;
    ellipse(522, 472, 99 - bounce * 0.45, 17 - bounce * 0.1, '#40583a19');
    ellipse(522, 471, 75, 9, '#40583a13');
    ctx.save();
    ctx.translate(522 + offset, 344 - bounce);
    ctx.rotate(
      motion.matches ? 0 : moving ? Math.sin(walkPhase) * 0.035 : Math.sin(clock * 1.4) * 0.012,
    );
    ctx.scale(1 + breathing * 0.001, 1 + breathing * 0.003);
    // Tail stays behind the silhouette.
    ctx.save();
    ctx.translate(91, 64);
    ctx.rotate(-0.3 + (motion.matches ? 0 : Math.sin(clock * 2.3) * 0.1));
    if (coast) {
      path(shade, () => {
        ctx.moveTo(-12, 6);
        ctx.bezierCurveTo(12, -18, 49, -31, 48, -11);
        ctx.quadraticCurveTo(81, -8, 46, 17);
        ctx.quadraticCurveTo(17, 34, -12, 19);
      });
    } else {
      path(shade, () => {
        ctx.moveTo(-12, 16);
        ctx.bezierCurveTo(42, 7, 72, -52, 43, -61);
        ctx.bezierCurveTo(65, -14, 18, -15, -12, -2);
      });
      if (tundra) ellipse(48, -45, 15, 22, '#ece8e3', -0.3);
    }
    ctx.restore();
    // Soft, long ears, with a distinct silhouette for each habitat.
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.scale(side, 1);
      ctx.translate(51, -67);
      ctx.rotate(0.17 + (motion.matches ? 0 : Math.sin(clock * 1.9 + side) * 0.025));
      if (coast) {
        path(base, () => {
          ctx.moveTo(-14, 18);
          ctx.bezierCurveTo(-21, -30, 10, -74, 34, -72);
          ctx.bezierCurveTo(49, -55, 27, -2, 7, 22);
        });
        path(light, () => {
          ctx.moveTo(-2, -5);
          ctx.quadraticCurveTo(7, -48, 26, -56);
          ctx.quadraticCurveTo(26, -19, 10, 0);
        });
      } else {
        path(base, () => {
          ctx.moveTo(-23, 20);
          ctx.bezierCurveTo(-41, -30, -24, -103, 0, -111);
          ctx.bezierCurveTo(23, -91, 28, -32, 19, 19);
        });
        path(tundra ? '#e8dce0' : '#d8ddad', () => {
          ctx.moveTo(-10, -5);
          ctx.bezierCurveTo(-20, -40, -10, -82, 0, -89);
          ctx.bezierCurveTo(10, -62, 13, -29, 7, -6);
        });
      }
      ctx.restore();
    }
    // Feet are separate to keep the idle movement readable.
    ellipse(-57, 111 - (moving ? Math.max(0, Math.sin(walkPhase)) * 9 : 0), 31, 15, shade, -0.12);
    ellipse(57, 111 - (moving ? Math.max(0, -Math.sin(walkPhase)) * 9 : 0), 31, 15, shade, 0.12);
    const bodyGradient = ctx.createLinearGradient(-60, -100, 80, 120);
    bodyGradient.addColorStop(0, light);
    bodyGradient.addColorStop(0.5, base);
    bodyGradient.addColorStop(1, shade);
    ctx.beginPath();
    ctx.moveTo(0, -105);
    ctx.bezierCurveTo(-72, -111, -105, -71, -102, -10);
    ctx.bezierCurveTo(-116, 41, -109, 105, -65, 115);
    ctx.bezierCurveTo(-20, 130, 54, 128, 83, 107);
    ctx.bezierCurveTo(116, 84, 114, 37, 102, -10);
    ctx.bezierCurveTo(104, -72, 72, -111, 0, -105);
    ctx.closePath();
    ctx.fillStyle = bodyGradient;
    ctx.fill();
    ellipse(0, 61, 65, 58, tundra ? '#eee8df' : '#edf0cf');
    // Tiny side paws and their highlight.
    ellipse(-91, 57, 17, 32, base, -0.36 - (happy ? 0.2 : 0));
    ellipse(91, 57, 17, 32, base, 0.36 + (happy ? 0.2 : 0));
    ctx.beginPath();
    ctx.moveTo(-98, 58);
    ctx.quadraticCurveTo(-98, 73, -89, 80);
    stroke(shade, 2);
    ctx.beginPath();
    ctx.moveTo(98, 58);
    ctx.quadraticCurveTo(98, 73, 89, 80);
    stroke(shade, 2);
    // Facial markings are deterministic per pet.
    if (appearance > 0.42) {
      ellipse(-69, -31, 8, 5, light, -0.4);
      ellipse(69, -31, 8, 5, light, 0.4);
    }
    ellipse(-58, 17, 17, 9, coast ? '#e9b5a1' : tundra ? '#dbaeb9' : '#dfb599');
    ellipse(58, 17, 17, 9, coast ? '#e9b5a1' : tundra ? '#dbaeb9' : '#dfb599');
    const blink = !motion.matches && Math.sin(clock * 0.73 + appearance * 4) > 0.989;
    const sad = /trist|cansad|hambr|suci|agotad/i.test(model.mood);
    for (const side of [-1, 1]) {
      const x = side * 36 + looking * 2;
      if (sleepy || blink || happy) {
        ctx.beginPath();
        ctx.moveTo(x - 11, -3);
        ctx.quadraticCurveTo(x, happy ? -17 : 8, x + 11, -3);
        stroke(ink, 4);
      } else {
        ellipse(x, -6, 10, sad ? 11 : 14, ink);
        ellipse(x - 2, -11, 3.6, 4.6, '#fffcef');
        ellipse(x + 3, -1, 1.6, 1.7, '#fffcef');
        if (sad) {
          ctx.beginPath();
          ctx.moveTo(x - 11, -26);
          ctx.lineTo(x + 9, -31 + side * 4);
          stroke(shade, 3);
        }
      }
    }
    ellipse(0, 15, 5, 3.7, ink);
    ctx.beginPath();
    ctx.moveTo(0, 18);
    ctx.lineTo(0, 23);
    ctx.moveTo(-12, 23);
    ctx.quadraticCurveTo(-6, 31, 0, 23);
    ctx.quadraticCurveTo(6, 31, 12, 23);
    stroke(ink, 2.8);
    if (happy) {
      path('#725b4d', () => {
        ctx.moveTo(-10, 27);
        ctx.quadraticCurveTo(0, 34, 10, 27);
        ctx.quadraticCurveTo(8, 45, 0, 45);
        ctx.quadraticCurveTo(-8, 45, -10, 27);
      });
      ellipse(0, 39, 6, 3, '#db9f8a');
    }
    // A sprout, shell crest, or winter tuft gives each biome a species identity.
    if (coast) {
      ellipse(0, -97, 16, 9, '#e6b78e');
      ctx.beginPath();
      ctx.moveTo(0, -91);
      ctx.lineTo(0, -105);
      stroke('#cf9c76', 1.7);
    } else if (tundra) {
      path('#eee8e4', () => {
        ctx.moveTo(-24, -91);
        ctx.lineTo(-14, -116);
        ctx.lineTo(-4, -104);
        ctx.lineTo(8, -124);
        ctx.lineTo(17, -106);
        ctx.lineTo(31, -108);
        ctx.lineTo(25, -90);
        ctx.closePath();
      });
    } else {
      ctx.beginPath();
      ctx.moveTo(0, -99);
      ctx.quadraticCurveTo(-1, -114, 7, -127);
      stroke('#718957', 4);
      leaf(3, -117, 17, -0.8, '#789957');
      leaf(6, -121, 16, 0.8, '#91aa65');
    }
    if (model.stage === 'adult') {
      if (coast) {
        for (const side of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(side * 70, 51);
          ctx.quadraticCurveTo(side * 95, 42, side * 102, 32);
          stroke('#d5e8d2', 3);
        }
        ellipse(-18, -97, 9, 6, '#ebc6a0');
        ellipse(18, -97, 9, 6, '#ebc6a0');
      } else if (tundra) {
        for (let tuft = -2; tuft <= 2; tuft++)
          ellipse(tuft * 19, 78 + Math.abs(tuft) * 3, 15, 12, '#eee8e3');
      } else {
        leaf(-9, -120, 13, -1.45, '#79985b');
        leaf(14, -125, 13, 1.25, '#89a563');
        for (const side of [-1, 1]) leaf(side * 73, 75, 17, side * 1.05, '#829f61');
      }
    }
    if (sleepy) {
      ctx.font = '600 24px system-ui, sans-serif';
      ctx.fillStyle = '#667d76';
      ctx.globalAlpha = 0.65;
      ctx.fillText('z', 124, -74 - Math.sin(clock) * 4);
      ctx.font = '600 17px system-ui, sans-serif';
      ctx.fillText('z', 147, -103 - Math.sin(clock + 1) * 4);
      ctx.globalAlpha = 1;
    }
    if (active && reaction === 'feed') {
      ctx.save();
      ctx.translate(-134, 69);
      ctx.rotate(-0.25);
      ellipse(0, 0, 15, 17, '#d3946c');
      leaf(0, -15, 9, 0.5, '#719455');
      ctx.restore();
    }
    ctx.restore();
  }

  function basePetScale(): number {
    const bodyWidth =
      width < 600 ? Math.min(106, width * 0.27) : Math.min(148, Math.max(112, width * 0.115));
    const compactLandscape = width > 700 && height <= 500;
    const availableScale = compactLandscape
      ? Math.min(0.4, Math.max(0.2, (height - 185) / 330))
      : Math.max(0.25, (height - 230) / 340);
    return Math.min(bodyWidth / 220, availableScale);
  }
  function depthScale(groundY: number): number {
    return Math.max(0.7, Math.min(1.14, 0.72 + (groundY - 0.42) * 1.3));
  }
  function petScale(): number {
    const stageScale =
      pet.stage === 'baby' ? 0.72 : pet.stage === 'young' ? 0.86 : pet.stage === 'egg' ? 0.85 : 1;
    return basePetScale() * stageScale * depthScale(position.y);
  }
  function companionScale(groundY: number): number {
    return basePetScale() * 0.85 * depthScale(groundY);
  }
  function petBounds() {
    const scale = petScale();
    const baby = pet.stage === 'baby';
    const young = pet.stage === 'young';
    const eggStage = pet.stage === 'egg';
    const halfWidth = baby ? 92 : young ? 105 : eggStage ? 102 : 145;
    const bodyHeight = baby ? 194 : young ? 222 : eggStage ? 270 : 330;
    const renderedWidth = Math.max(44, halfWidth * 2 * scale);
    const renderedHeight = Math.max(44, bodyHeight * scale);
    return {
      x: position.x * width - renderedWidth / 2,
      y: position.y * height - renderedHeight,
      width: renderedWidth,
      height: renderedHeight,
    };
  }
  function companionLocation(index: number, id: string) {
    const slots =
      width < 600
        ? [
            { x: 0.19, y: 0.65 },
            { x: 0.81, y: 0.68 },
            { x: 0.76, y: 0.52 },
          ]
        : [
            { x: 0.29, y: 0.7 },
            { x: 0.75, y: 0.67 },
            { x: 0.16, y: 0.53 },
          ];
    const slot = slots[(visitorSlots.get(id) ?? index) % slots.length];
    const compact = width > 700 && height <= 500;
    const bottomSafe = compact ? 115 : width < 600 ? 164 : 176;
    let x = slot.x;
    let y = Math.max(
      Math.min(0.62, (96 + 280 * basePetScale()) / height),
      Math.min(slot.y, (height - bottomSafe) / height),
    );
    if (id === socialId && clock < socialUntil && !motion.matches) {
      const approach = Math.sin(Math.max(0, (socialUntil - clock) / 3) * Math.PI) * 0.28;
      x += (position.x - x) * approach;
      y += (position.y - y) * approach;
    }
    return { x, y };
  }
  function visitOffset(id: string): number {
    let hash = 0;
    for (const character of id) hash = (Math.imul(hash, 31) + character.charCodeAt(0)) >>> 0;
    return hash % 180;
  }
  function companions() {
    const seconds = Math.floor(Date.now() / 1000);
    // Each released pet drops by for 24 seconds during its own three-minute cycle.
    // Reloading does not restart its visit, and reduced motion does not freeze it.
    const visible = (pet.companions ?? [])
      .filter(
        (friend) =>
          (friend.id === socialId && clock < socialUntil) ||
          (seconds + visitOffset(friend.id)) % 180 < 24,
      )
      .sort((left, right) => Number(right.id === socialId) - Number(left.id === socialId))
      .slice(0, 2);
    for (const id of visitorSlots.keys())
      if (!visible.some((friend) => friend.id === id)) visitorSlots.delete(id);
    for (const friend of visible) {
      if (visitorSlots.has(friend.id)) continue;
      const used = new Set(visitorSlots.values());
      visitorSlots.set(friend.id, [0, 1, 2].find((slot) => !used.has(slot)) ?? 0);
    }
    return visible;
  }
  function companionAt(x: number, y: number): SceneCompanion | undefined {
    const available = companions();
    for (let index = available.length - 1; index >= 0; index--) {
      const point = companionLocation(index, available[index].id);
      const scale = companionScale(point.y);
      const dx = ((x - point.x) * width) / (120 * scale);
      const dy = ((y - point.y) * height + 150 * scale) / (166 * scale);
      if (dx * dx + dy * dy < 1) return available[index];
    }
  }
  function egg() {
    const coast = pet.biome === 'coast';
    const tundra = pet.biome === 'tundra';
    const shell = coast ? '#e5eee3' : tundra ? '#eee6ef' : '#f3efcf';
    const shade = coast ? '#a8cfcc' : tundra ? '#c8b9d5' : '#c7d49f';
    const ink = coast ? '#82b5b6' : tundra ? '#a895bd' : '#a2b77c';
    const warm = reaction !== null && clock < reactionUntil;
    const wiggle = motion.matches
      ? 0
      : warm
        ? Math.sin(clock * 8) * 0.055
        : Math.sin(clock * 1.8) * 0.012;
    ellipse(522, 471, 100, 16, '#40583a17');
    ellipse(522, 466, 94, 20, '#cabd91');
    ellipse(522, 461, 83, 15, '#e5dcb8');
    ctx.save();
    ctx.translate(522, 354);
    ctx.rotate(wiggle);
    const gradient = ctx.createLinearGradient(-75, -130, 75, 110);
    gradient.addColorStop(0, '#fffdf1');
    gradient.addColorStop(0.48, shell);
    gradient.addColorStop(1, shade);
    path(gradient, () => {
      ctx.moveTo(0, -141);
      ctx.bezierCurveTo(-48, -139, -95, -46, -88, 26);
      ctx.bezierCurveTo(-82, 130, 84, 130, 88, 26);
      ctx.bezierCurveTo(95, -46, 48, -139, 0, -141);
      ctx.closePath();
    });
    ctx.save();
    ctx.clip();
    // The chosen shell pattern is carried by the saved seed, independently of its biome.
    const pattern = pet.seed % 3;
    const random = seeded(pet.seed);
    if (pattern === 0) {
      for (let index = 0; index < 12; index++) {
        const x = (random() - 0.5) * 150;
        const y = -108 + random() * 198;
        ellipse(
          x,
          y,
          7 + random() * 8,
          4 + random() * 5,
          index % 3 === 0 ? '#ffffff80' : ink,
          random() * 2,
        );
      }
    } else if (pattern === 1) {
      ctx.globalAlpha = 0.67;
      for (const y of [-87, -39, 11, 61]) {
        ctx.beginPath();
        ctx.moveTo(-105, y + 10);
        ctx.bezierCurveTo(-55, y - 15, 43, y + 26, 105, y - 8);
        stroke(ink, 13);
      }
    } else {
      const constellations = [
        [-10, -104, 12],
        [39, -69, 15],
        [-43, -49, 13],
        [5, -18, 19],
        [54, 17, 12],
        [-49, 31, 15],
        [8, 63, 13],
      ];
      for (const [x, y, size] of constellations) {
        ctx.globalAlpha = 0.74;
        star(x + (random() - 0.5) * 5, y + (random() - 0.5) * 5, size, ink);
      }
      ctx.globalAlpha = 0.8;
      ellipse(-19, 27, 3, 3, ink);
      ellipse(27, 39, 3, 3, ink);
      ellipse(-26, -83, 2.5, 2.5, ink);
    }
    ctx.restore();
    ctx.beginPath();
    ctx.ellipse(-33, -60, 16, 35, -0.3, 0, TAU);
    stroke('#ffffff85', 7);
    if (warm) {
      heart(0, -186, 12, '#cf9984');
    }
    ctx.restore();
  }
  function drawCompanion(friend: SceneCompanion, index: number) {
    const visitAge = (Date.now() / 1000 + visitOffset(friend.id)) % 180;
    const fade =
      friend.id === socialId && clock < socialUntil
        ? 1
        : Math.max(0, Math.min(1, visitAge / 1.5, (24 - visitAge) / 1.5));
    ctx.save();
    ctx.globalAlpha = fade;
    const point = companionLocation(index, friend.id);
    const scale = companionScale(point.y);
    const model: ScenePet = {
      id: friend.id,
      seed: friend.seed,
      biome: friend.biome,
      stage: 'adult',
      mood: 'A gusto',
      sleeping: false,
    };
    ctx.save();
    ctx.translate(point.x * width, point.y * height);
    ctx.scale(scale, scale);
    ctx.translate(-522, -472);
    creature(model, true);
    ctx.restore();
    const label = friend.name.length > 12 ? `${friend.name.slice(0, 11)}…` : friend.name;
    ctx.save();
    ctx.font = `600 ${width < 600 ? 10 : 11}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    const textWidth = Math.min(100, ctx.measureText(label).width + 18);
    const labelY = point.y * height - 340 * scale;
    ctx.beginPath();
    ctx.roundRect(point.x * width - textWidth / 2, labelY - 10, textWidth, 21, 8);
    ctx.fillStyle = '#fffdf0df';
    ctx.fill();
    ctx.fillStyle = '#748663';
    ctx.fillText(label, point.x * width, labelY + 4);
    ctx.restore();
    if (friend.id === socialId && clock < socialUntil) {
      const heartX = ((point.x + position.x) * width) / 2;
      const heartY = ((point.y + position.y) * height) / 2 - 210 * scale;
      heart(heartX, heartY, 9, '#d39d95');
    }
    ctx.restore();
  }
  function clampDestination(x: number, y: number): { x: number; y: number } {
    const compactLandscape = width > 700 && height <= 500;
    const bottomSafe = compactLandscape ? 114 : width < 600 ? 165 : 174;
    const lower = Math.max(0.42, Math.min(0.83, (height - bottomSafe) / height));
    const upper = Math.min(lower, Math.max(0.44, (100 + 260 * basePetScale()) / height));
    const sideMargin = Math.min(0.3, Math.max(0.11, (145 * basePetScale() + 10) / width));
    return {
      x: Math.max(sideMargin, Math.min(1 - sideMargin, Number.isFinite(x) ? x : 0.5)),
      y: Math.max(upper, Math.min(lower, Number.isFinite(y) ? y : 0.7)),
    };
  }
  function moveTo(x: number, y: number, fromInput = false) {
    if (disposed || pet.stage === 'egg') return;
    destination = clampDestination(x, y);
    if (fromInput) {
      lastInteraction = clock;
      nextWander = clock + 11;
      groundMarker = { ...destination, until: clock + 1.3 };
      options.onWalk?.(destination.x, destination.y);
    }
    if (motion.matches) position = { ...destination };
    requestFrame();
  }
  function habitatObjects() {
    const unit = Math.min(width / 1000, height / 650);
    ctx.save();
    ctx.translate(width * 0.2, height * 0.73);
    ctx.scale(unit, unit);
    ellipse(0, 0, 105, 29, worldBiome() === 'tundra' ? '#c3d8dc' : '#b8c5a0');
    ellipse(0, -4, 95, 25, worldBiome() === 'tundra' ? '#bad8df' : '#98c2b3');
    ellipse(-8, -8, 74, 16, worldBiome() === 'tundra' ? '#d6e8e8' : '#afd3c0');
    ctx.beginPath();
    ctx.ellipse(4, -5, 53 + Math.sin(clock * 1.8) * 3, 11, 0, 0, TAU);
    stroke('#e9f2d880', 1.5);
    ellipse(-83, 2, 14, 9, '#a6ad8b');
    ellipse(78, 1, 20, 12, '#c0c3a1');
    grass(-86, -3, 16, '#789979');
    grass(82, 2, 13, '#789979');
    ctx.restore();
    // A little woven sleeping blanket belongs to this world rather than a menu.
    ctx.save();
    ctx.translate(width * 0.8, height * 0.73);
    ctx.scale(unit, unit);
    ctx.rotate(-0.1);
    ellipse(0, 6, 76, 29, '#3e573411');
    ellipse(0, 0, 73, 28, '#c8b88b');
    ellipse(0, -4, 66, 23, worldBiome() === 'tundra' ? '#d9c4c6' : '#e4d8b5');
    ctx.beginPath();
    ctx.ellipse(0, -4, 55, 17, 0, 0, TAU);
    stroke('#b9a780', 1.3);
    ellipse(35, -11, 19, 10, '#f3eacb', 0.1);
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 11, -20);
      ctx.lineTo(i * 11 - 8, 10);
      stroke('#c7b98d55', 1);
    }
    ctx.restore();
    // Floating pollen/light motes remain light enough to keep focus on the creature.
    for (const mote of landmarks.slice(14, 23)) {
      const x = (mote.x / WORLD_W) * width + Math.sin(clock * 0.24 + mote.phase) * 12;
      const y = height * (0.32 + mote.y * 0.42) + Math.cos(clock * 0.45 + mote.phase) * 9;
      ellipse(
        x,
        y,
        1.5 * mote.size,
        1.5 * mote.size,
        worldBiome() === 'tundra' ? '#ffffffa6' : '#f6ecc599',
      );
    }
  }
  type DepthNode = { y: number; draw: () => void };

  function drawDecoration(id: DecorationId, x: number, y: number) {
    const unit = Math.max(0.32, Math.min(0.84, width / 1250)) * depthScale(y);
    ctx.save();
    ctx.translate(x * width, y * height);
    ctx.scale(unit, unit);
    ellipse(0, 1, id === 'arch' ? 87 : 69, 12, '#40583a19');
    if (id === 'lantern') {
      const glow = ctx.createRadialGradient(0, -88, 4, 0, -88, 70);
      glow.addColorStop(0, '#ffe2a077');
      glow.addColorStop(1, '#ffe2a000');
      ctx.fillStyle = glow;
      ctx.fillRect(-75, -160, 150, 145);
      ctx.fillStyle = '#8a795f';
      ctx.fillRect(-4, -139, 8, 140);
      ctx.beginPath();
      ctx.moveTo(0, -136);
      ctx.quadraticCurveTo(37, -158, 44, -128);
      stroke('#8a795f', 6);
      ctx.fillStyle = '#b39769';
      ctx.fillRect(27, -127, 35, 8);
      ctx.fillStyle = '#ffe8ac';
      ctx.fillRect(30, -119, 29, 37);
      ctx.fillStyle = '#a58a61';
      ctx.fillRect(27, -84, 35, 7);
      ctx.beginPath();
      ctx.moveTo(35, -118);
      ctx.lineTo(35, -85);
      ctx.moveTo(53, -118);
      ctx.lineTo(53, -85);
      stroke('#c6a672', 3);
    } else if (id === 'flowers') {
      ellipse(0, -1, 65, 15, '#94ad7e');
      for (let index = 0; index < 9; index++) {
        const random = seeded(index * 31 + 9);
        const flowerX = (random() - 0.5) * 115;
        const flowerY = -8 - random() * 25;
        grass(flowerX, 0, 13 + random() * 7, '#78955d');
        blossom(flowerX, flowerY, ['#f4d3a0', '#edb4ac', '#e7d5ed'][index % 3]);
      }
    } else if (id === 'fountain') {
      ellipse(0, -4, 75, 24, '#b1beb3');
      ellipse(0, -11, 66, 19, '#d1dbcc');
      ellipse(0, -14, 57, 14, '#9ecdc8');
      ctx.fillStyle = '#b2c1b6';
      ctx.fillRect(-9, -77, 18, 64);
      ellipse(0, -76, 35, 11, '#dbe2cf');
      ellipse(0, -80, 30, 8, '#a4d3ca');
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(side * 4, -78);
        ctx.quadraticCurveTo(side * 42, -114, side * 47, -20);
        stroke('#c2e6dfcc', 3);
      }
      if (!motion.matches) {
        const dropY = -74 + ((clock * 35) % 55);
        ellipse(-46, dropY, 2, 4, '#dcf2e9');
        ellipse(46, dropY - 10, 2, 4, '#dcf2e9');
      }
    } else if (id === 'bench') {
      ctx.fillStyle = '#8c795d';
      ctx.fillRect(-54, -37, 7, 38);
      ctx.fillRect(47, -37, 7, 38);
      ctx.fillRect(-61, -78, 7, 61);
      ctx.fillRect(54, -78, 7, 61);
      ctx.fillStyle = '#c1a67d';
      ctx.fillRect(-65, -78, 130, 13);
      ctx.fillRect(-65, -59, 130, 13);
      ctx.fillStyle = '#d5bc90';
      ctx.fillRect(-69, -36, 138, 16);
      ctx.fillStyle = '#a18a66';
      ctx.fillRect(-69, -20, 138, 5);
    } else if (id === 'mushrooms') {
      mushroom(-22, -1, 1.4);
      mushroom(25, 1, 0.9);
      mushroom(53, 4, 0.65);
      grass(-49, 0, 15, '#78955d');
      grass(1, 3, 12, '#78955d');
    } else if (id === 'arch') {
      ctx.beginPath();
      ctx.moveTo(-67, 0);
      ctx.lineTo(-67, -107);
      ctx.bezierCurveTo(-67, -179, 67, -179, 67, -107);
      ctx.lineTo(67, 0);
      stroke('#a4936b', 11);
      for (const side of [-1, 1]) {
        for (let index = 0; index < 5; index++)
          leaf(side * (66 - index * 2), -20 - index * 24, 13, side * 1.05, '#7f9c65');
        blossom(side * 52, -126, '#ecc5b7');
        blossom(side * 27, -149, '#eeddb1');
      }
      leaf(-6, -155, 16, 0.8, '#91ad70');
    }
    ctx.restore();
  }

  function sceneryNodes(): DepthNode[] {
    const nodes: DepthNode[] = [];
    const worldScale = Math.max(width / WORLD_W, height / WORLD_H);
    const offsetX = (width - WORLD_W * worldScale) / 2;
    const offsetY = height - WORLD_H * worldScale;
    const addWorld = (groundY: number, draw: () => void) => {
      nodes.push({
        y: offsetY + groundY * worldScale,
        draw: () => {
          ctx.save();
          ctx.translate(offsetX, offsetY);
          ctx.scale(worldScale, worldScale);
          draw();
          ctx.restore();
        },
      });
    };
    if (worldBiome() === 'coast') {
      addWorld(430, () => palm(105, 430, 1.08));
      addWorld(405, () => palm(925, 405, 0.83));
    } else if (worldBiome() === 'tundra') {
      addWorld(418, () => pine(130, 418, 1.2, '#a9bfc2', true));
      addWorld(392, () => pine(847, 392, 0.9, '#a9bfc2', true));
      addWorld(443, () => pine(956, 443, 1.25, '#9ab3b7', true));
      addWorld(484, () => {
        ellipse(752, 484, 33, 8, '#dce7e5');
        ellipse(752, 474, 28, 17, '#b7cdd2');
        ellipse(748, 469, 25, 10, '#cbdcdd');
      });
    } else {
      addWorld(385, () => pine(225, 385, 0.88, '#99b391'));
      addWorld(361, () => pine(305, 361, 0.64, '#a6bd98'));
      addWorld(382, () => pine(745, 382, 0.82, '#a3b893'));
      addWorld(404, () => pine(866, 404, 1.2, '#91aa87'));
      addWorld(470, () => mushroom(179, 470, 1.2));
      addWorld(480, () => mushroom(205, 480, 0.7));
      addWorld(454, () => mushroom(812, 454, 0.8));
      addWorld(478, () => {
        ellipse(723, 472, 25, 8, '#acb896');
        ellipse(723, 466, 20, 12, '#bcc2a7');
        ellipse(751, 478, 14, 7, '#a9b492');
      });
    }
    if (width / height < 1.05) {
      const unit = Math.min(width / 1000, height / 650);
      if (worldBiome() === 'coast') {
        nodes.push({ y: height * 0.62, draw: () => palm(width * 0.02, height * 0.62, unit * 1.6) });
        nodes.push({ y: height * 0.6, draw: () => palm(width * 0.96, height * 0.6, unit * 1.65) });
      } else {
        const snow = worldBiome() === 'tundra';
        nodes.push({
          y: height * 0.57,
          draw: () =>
            pine(width * 0.045, height * 0.57, unit * 1.45, snow ? '#9cb8b7' : '#8ca77b', snow),
        });
        nodes.push({
          y: height * 0.61,
          draw: () =>
            pine(width * 0.96, height * 0.61, unit * 1.7, snow ? '#8fa9ad' : '#819e77', snow),
        });
      }
    }
    nodes.push({
      y: height * 0.64,
      draw: () => {
        const unit = Math.min(width / 1000, height / 650);
        ctx.save();
        ctx.translate(width * 0.12, height * 0.64);
        ctx.scale(unit, unit);
        ellipse(0, 0, 25, 7, '#4d64331c');
        ellipse(-9, -17, 14, 17, '#cf8d5d', -0.1);
        ellipse(9, -17, 14, 17, '#d49a69', 0.1);
        leaf(0, -30, 14, 0.5, '#779758');
        ellipse(-12, -22, 4, 6, '#e9b382', 0.3);
        ctx.restore();
      },
    });
    const places: Record<DecorationId, { x: number; y: number }> = {
      lantern: { x: 0.32, y: 0.68 },
      flowers: { x: 0.66, y: 0.78 },
      fountain: { x: 0.7, y: 0.63 },
      bench: { x: 0.84, y: 0.69 },
      mushrooms: { x: 0.17, y: 0.79 },
      arch: { x: 0.45, y: 0.54 },
    };
    for (const id of pet.decorations ?? []) {
      const place = places[id];
      if (place)
        nodes.push({ y: place.y * height, draw: () => drawDecoration(id, place.x, place.y) });
    }
    return nodes;
  }

  function drawActivePet() {
    ctx.save();
    ctx.translate(position.x * width, position.y * height);
    ctx.scale(petScale(), petScale());
    ctx.translate(-522, -472);
    if (pet.stage === 'egg') egg();
    else creature();
    for (const p of particles) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, (p.life - p.age) * 1.7);
      if (p.kind === 'heart') heart(p.x, p.y, 8 + p.age * 2, p.color);
      else if (p.kind === 'spark') star(p.x, p.y, 7, p.color);
      else {
        ellipse(p.x, p.y, 8, 8, '#f9fffb55');
        ctx.beginPath();
        ctx.arc(p.x, p.y, 8, 0, TAU);
        stroke('#f9fffbcc', 1.5);
        ellipse(p.x - 2, p.y - 3, 2, 2, '#ffffff');
      }
      ctx.restore();
    }
    ctx.restore();
  }

  function render() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    const scale = Math.max(width / WORLD_W, height / WORLD_H);
    ctx.translate((width - WORLD_W * scale) / 2, height - WORLD_H * scale);
    ctx.scale(scale, scale);
    background();
    ctx.restore();
    habitatObjects();
    if (clock < groundMarker.until && !motion.matches) {
      const alpha = Math.max(0, (groundMarker.until - clock) / 1.3);
      ctx.save();
      ctx.globalAlpha = alpha * 0.7;
      ctx.beginPath();
      ctx.ellipse(
        groundMarker.x * width,
        groundMarker.y * height,
        17 + (1 - alpha) * 12,
        6,
        0,
        0,
        TAU,
      );
      stroke('#fff7db', 2);
      ctx.restore();
    }
    const visible = companions();
    const nodes = sceneryNodes();
    visible.forEach((friend, index) =>
      nodes.push({
        y: companionLocation(index, friend.id).y * height,
        draw: () => drawCompanion(friend, index),
      }),
    );
    nodes.push({ y: position.y * height, draw: drawActivePet });
    nodes.sort((left, right) => left.y - right.y).forEach((node) => node.draw());
    canvas.dataset.companions = String(visible.length);
    canvas.dataset.companionCount = String(visible.length);
    canvas.dataset.petGroundX = position.x.toFixed(4);
    canvas.dataset.petGroundY = position.y.toFixed(4);
    canvas.dataset.petScale = petScale().toFixed(4);
  }
  function animate(time: number) {
    frame = 0;
    if (disposed || document.hidden) return;
    const dt = Math.min(previous ? (time - previous) / 1000 : 0, 0.05);
    previous = time;
    if (!motion.matches) clock += dt;
    pointer += (targetPointer - pointer) * Math.min(1, dt * 5);
    if (
      pet.stage !== 'egg' &&
      !pet.sleeping &&
      !reaction &&
      !motion.matches &&
      clock > nextWander &&
      clock - lastInteraction > 8
    ) {
      const random = seeded(pet.seed + Math.floor(clock / 5) * 71);
      moveTo(position.x + (random() - 0.5) * 0.22, position.y + (random() - 0.5) * 0.055);
      nextWander = clock + 10 + random() * 8;
    }
    const dx = (destination.x - position.x) * width;
    const dy = (destination.y - position.y) * height;
    const distance = Math.hypot(dx, dy);
    walking = pet.stage !== 'egg' && !pet.sleeping && !motion.matches && distance > 1;
    if (walking) {
      const step = Math.min(1, ((width < 600 ? 92 : 125) * dt) / distance);
      position.x += (destination.x - position.x) * step;
      position.y += (destination.y - position.y) * step;
      walkPhase += dt * 10;
    }
    if (reaction && clock >= reactionUntil) reaction = null;
    if (socialId && clock >= socialUntil) socialId = null;
    for (const p of particles) {
      p.age += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy -= dt * 7;
    }
    particles = particles.filter((p) => p.age < p.life);
    render();
    if (!motion.matches || particles.length > 0) frame = requestAnimationFrame(animate);
  }
  function requestFrame() {
    if (!disposed && !document.hidden && !frame) {
      previous = 0;
      frame = requestAnimationFrame(animate);
    }
  }
  function resize() {
    if (disposed) return;
    const bounds = canvas.getBoundingClientRect();
    width = Math.max(bounds.width, 1);
    height = Math.max(bounds.height, 1);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    position = clampDestination(position.x, position.y);
    destination = clampDestination(destination.x, destination.y);
    render();
    requestFrame();
  }
  function visibility() {
    if (document.hidden) {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      previous = 0;
    } else requestFrame();
  }
  function eventPosition(event: PointerEvent) {
    const bounds = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - bounds.left) / Math.max(bounds.width, 1),
      y: (event.clientY - bounds.top) / Math.max(bounds.height, 1),
    };
  }
  function overPet(x: number, y: number) {
    const bounds = petBounds();
    const dx = (x * width - bounds.x - bounds.width / 2) / (bounds.width / 2);
    const dy = (y * height - bounds.y - bounds.height / 2) / (bounds.height / 2);
    return dx * dx + dy * dy < 1;
  }
  function pointerMove(event: PointerEvent) {
    const point = eventPosition(event);
    const contact = pointerStart;
    if (contact?.touch && contact.id === event.pointerId && tool === 'hand') {
      const inside = overPet(point.x, point.y);
      if (inside && contact.wasOverPet)
        contact.distance += Math.hypot(
          event.clientX - contact.lastX,
          event.clientY - contact.lastY,
        );
      contact.lastX = event.clientX;
      contact.lastY = event.clientY;
      contact.wasOverPet = inside;
      if (inside && contact.distance >= 28 && performance.now() - lastTouchStroke >= 300) {
        contact.distance = 0;
        contact.stroked = true;
        lastTouchStroke = performance.now();
        lastInteraction = clock;
        nextWander = clock + 12;
        destination = { ...position };
        walking = false;
        options.onPetInteract?.('hand');
      }
    }
    targetPointer = Math.max(-1, Math.min(1, (point.x - position.x) * 4));
    canvas.style.cursor = overPet(point.x, point.y)
      ? tool === 'hand'
        ? 'grab'
        : 'pointer'
      : companionAt(point.x, point.y)
        ? 'pointer'
        : 'default';
    if (motion.matches) {
      pointer = targetPointer;
      render();
    }
  }
  function pointerDown(event: PointerEvent) {
    if (!event.isPrimary || event.button !== 0) return;
    const point = eventPosition(event);
    const touch = event.pointerType === 'touch' && tool === 'hand';
    pointerStart = {
      x: event.clientX,
      y: event.clientY,
      id: event.pointerId,
      touch,
      lastX: event.clientX,
      lastY: event.clientY,
      distance: 0,
      stroked: false,
      wasOverPet: overPet(point.x, point.y),
    };
    if (touch) {
      try {
        canvas.setPointerCapture(event.pointerId);
      } catch {
        /* Synthetic events need no capture. */
      }
      if (pointerStart.wasOverPet) {
        destination = { ...position };
        walking = false;
        lastInteraction = clock;
        nextWander = clock + 12;
      }
    }
  }
  function releasePointer(id: number) {
    try {
      if (canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
    } catch {
      /* Already released. */
    }
  }
  function pointerUp(event: PointerEvent) {
    const start = pointerStart;
    if (start && start.id !== event.pointerId) return;
    pointerStart = null;
    if (start) releasePointer(start.id);
    const point = eventPosition(event);
    // Touch affection is a stroke, while taps still operate other tools and walking.
    if (
      start?.touch &&
      tool === 'hand' &&
      (start.stroked || start.wasOverPet || overPet(point.x, point.y))
    )
      return;
    if (
      !start ||
      start.id !== event.pointerId ||
      Math.hypot(event.clientX - start.x, event.clientY - start.y) > 14
    )
      return;
    if (overPet(point.x, point.y)) {
      lastInteraction = clock;
      nextWander = clock + 12;
      destination = { ...position };
      walking = false;
      options.onPetInteract?.(tool);
    } else {
      const friend = companionAt(point.x, point.y);
      if (friend) options.onCompanionInteract?.(friend.id);
      else if (point.y > 0.32 && pet.stage !== 'egg') moveTo(point.x, point.y, true);
    }
  }
  function pointerCancel(event?: PointerEvent) {
    if (pointerStart && event && pointerStart.id !== event.pointerId) return;
    const start = pointerStart;
    pointerStart = null;
    if (start) releasePointer(start.id);
    targetPointer = 0;
    canvas.style.cursor = 'default';
  }
  function pointerLeave() {
    if (pointerStart?.touch && canvas.hasPointerCapture(pointerStart.id)) return;
    pointerCancel();
  }
  function motionChange() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    render();
    requestFrame();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  document.addEventListener('visibilitychange', visibility);
  canvas.style.touchAction = 'none';
  canvas.addEventListener('pointermove', pointerMove);
  canvas.addEventListener('pointerdown', pointerDown);
  canvas.addEventListener('pointerup', pointerUp);
  canvas.addEventListener('pointercancel', pointerCancel);
  canvas.addEventListener('lostpointercapture', pointerCancel);
  canvas.addEventListener('pointerleave', pointerLeave);
  motion.addEventListener('change', motionChange);
  // Reduced motion stops animation frames, but visitors still follow real time.
  const visitorTimer = window.setInterval(() => {
    if (motion.matches && pet.companions?.length) requestFrame();
  }, 1000);
  resize();

  return {
    update(next) {
      if (disposed) return;
      const changedBiome = (pet.worldBiome ?? pet.biome) !== (next.worldBiome ?? next.biome);
      const changedPet = pet.id !== next.id || pet.seed !== next.seed;
      const hatched = pet.stage === 'egg' && next.stage !== 'egg';
      pet = { ...next };
      if (changedPet) {
        reaction = null;
        socialId = null;
        socialUntil = 0;
      }
      if (changedBiome || changedPet) {
        visitorSlots.clear();
        position = clampDestination(0.5, 0.7);
        destination = { ...position };
        particles = [];
        walking = false;
        lastInteraction = clock;
        nextWander = clock + 11;
      }
      canvas.dataset.stage = pet.stage ?? 'adult';
      canvas.dataset.eggPattern = ['speckled', 'striped', 'starry'][pet.seed % 3];
      canvas.dataset.originBiome = pet.biome;
      canvas.dataset.worldBiome = worldBiome();
      canvas.dataset.companions = String(companions().length);
      canvas.dataset.companionCount = String(companions().length);
      if (hatched) {
        reaction = 'win';
        reactionUntil = clock + (motion.matches ? 0 : 2.4);
      }

      render();
      requestFrame();
    },
    react(action) {
      if (disposed) return;
      lastInteraction = clock;
      nextWander = clock + 12;
      destination = { ...position };
      walking = false;
      reaction = action;
      reactionUntil = clock + (motion.matches ? 0 : 2.4);
      if (!motion.matches) {
        const random = seeded(pet.seed + Math.round(clock * 1000));
        const kind = action === 'clean' ? 'bubble' : action === 'win' ? 'spark' : 'heart';
        const color = action === 'win' ? '#edbd68' : action === 'feed' ? '#cda069' : '#cf9984';
        for (let i = 0; i < 9; i++)
          particles.push({
            x: 450 + random() * 145,
            y: 285 + random() * 100,
            vx: (random() - 0.5) * 40,
            vy: -22 - random() * 35,
            age: 0,
            life: 1.3 + random() * 0.9,
            kind,
            color,
          });
      }
      render();
      requestFrame();
    },
    setTool(nextTool) {
      if (disposed) return;
      tool = nextTool;
      canvas.dataset.tool = tool;
      lastInteraction = clock;
      nextWander = clock + 12;
    },
    walkTo(x, y) {
      moveTo(x, y, true);
    },
    getPetPosition() {
      return { ...position };
    },
    getPetBounds() {
      return petBounds();
    },
    reactTogether(id) {
      if (disposed || pet.stage === 'egg' || !pet.companions?.some((friend) => friend.id === id))
        return;
      socialId = id;
      socialUntil = clock + (motion.matches ? 0 : 3);
      reaction = 'pet';
      reactionUntil = clock + (motion.matches ? 0 : 2.4);
      destination = { ...position };
      walking = false;
      lastInteraction = clock;
      nextWander = clock + 12;
      render();
      requestFrame();
    },
    destroy() {
      disposed = true;
      if (frame) cancelAnimationFrame(frame);
      clearInterval(visitorTimer);
      observer.disconnect();
      document.removeEventListener('visibilitychange', visibility);
      canvas.removeEventListener('pointermove', pointerMove);
      canvas.removeEventListener('pointerdown', pointerDown);
      canvas.removeEventListener('pointerup', pointerUp);
      pointerCancel();
      canvas.removeEventListener('pointercancel', pointerCancel);
      canvas.removeEventListener('lostpointercapture', pointerCancel);
      canvas.removeEventListener('pointerleave', pointerLeave);
      motion.removeEventListener('change', motionChange);
      particles = [];
    },
  };
}
