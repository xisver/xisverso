import type { GameState, Pet } from './domain/game';

/** A visual journey; the domain alone owns timers, participants and rewards. */
export function mountExpedition(canvas: HTMLCanvasElement, getState: () => GameState) {
  const ctx = canvas.getContext('2d')!;
  const dialog = canvas.closest('dialog')!;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0;
  let disposed = false;
  let width = 600,
    height = 260;
  const colors = {
    forest: ['#c8dfb4', '#70975a', '#edf3d5'],
    coast: ['#c5e5df', '#b9aa70', '#f5e9c5'],
    tundra: ['#dde8f0', '#a2adc8', '#f1f3f8'],
  };
  function oval(x: number, y: number, rx: number, ry: number, fill: string) {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  function pet(model: Pet, x: number, y: number, scale: number, time: number) {
    const palette = {
      forest: ['#a9c477', '#42604a'],
      coast: ['#8bc4c7', '#3f7081'],
      tundra: ['#b7acd5', '#626387'],
    }[model.biome];
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    oval(0, 10, 27, 7, '#3b5b4b20');
    const bob = reduced.matches ? 0 : Math.sin(time * 7 + model.seed) * 3;
    ctx.translate(0, bob);
    oval(0, -13, 23, 27, palette[0]);
    oval(-16, -34, 7, 12, palette[0]);
    oval(16, -34, 7, 12, palette[0]);
    oval(-7, -17, 2.5, 3, palette[1]);
    oval(7, -17, 2.5, 3, palette[1]);
    ctx.strokeStyle = palette[1];
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, -9, 4, 0, Math.PI);
    ctx.stroke();
    const stride = reduced.matches ? 0 : Math.sin(time * 8) * 3;
    oval(-12, 10 + stride, 7, 5, palette[1]);
    oval(12, 10 - stride, 7, 5, palette[1]);
    ctx.restore();
  }
  function draw() {
    if (disposed) return;
    const state = getState(),
      expedition = state.expedition;
    ctx.clearRect(0, 0, width, height);
    if (!expedition) {
      canvas.dataset.phase = 'idle';
      return;
    }
    const palette = colors[expedition.biome];
    const elapsed = Math.max(0, (Date.now() - expedition.startedAt) / 1000);
    const duration = (expedition.endsAt - expedition.startedAt) / 1000;
    const progress = Math.min(1, elapsed / duration);
    const phase =
      progress >= 1
        ? 'complete'
        : progress < 0.12
          ? 'depart'
          : progress < 0.8
            ? 'gather'
            : 'return';
    canvas.dataset.phase = phase;
    const team = [
      ...(expedition.principalParticipates ? [state.pet] : []),
      ...expedition.companionIds.flatMap((id) => state.freePets.filter((p) => p.id === id)),
    ];
    canvas.dataset.participants = String(team.length);
    const sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, palette[0]);
    sky.addColorStop(1, palette[2]);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);
    oval(width * 0.83, height * 0.18, 21, 21, '#fff9dfb0');
    for (let i = 0; i < 7; i++) {
      const x = ((i + 0.5) * width) / 7;
      oval(x, height * 0.75, 70, 40, palette[1] + '35');
      if (expedition.biome === 'coast') {
        ctx.strokeStyle = '#9f8c5f';
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.moveTo(x, height * 0.64);
        ctx.quadraticCurveTo(x + 8, height * 0.33, x - 2, height * 0.25);
        ctx.stroke();
        for (let j = 0; j < 4; j++) {
          ctx.strokeStyle = '#799c70';
          ctx.lineWidth = 9;
          ctx.beginPath();
          ctx.moveTo(x - 2, height * 0.25);
          ctx.quadraticCurveTo(
            x + (j - 1.5) * 18,
            height * 0.17,
            x + (j - 1.5) * 28,
            height * 0.29,
          );
          ctx.stroke();
        }
      } else if (expedition.biome === 'forest') {
        ctx.fillStyle = '#6c945d55';
        ctx.beginPath();
        ctx.moveTo(x, height * 0.16);
        ctx.lineTo(x - 35, height * 0.64);
        ctx.lineTo(x + 35, height * 0.64);
        ctx.fill();
      } else {
        ctx.fillStyle = '#ffffff99';
        ctx.beginPath();
        ctx.moveTo(x, height * 0.22);
        ctx.lineTo(x - 44, height * 0.66);
        ctx.lineTo(x + 48, height * 0.66);
        ctx.fill();
      }
    }
    ctx.fillStyle = palette[2];
    ctx.fillRect(0, height * 0.78, width, height * 0.22);
    ctx.strokeStyle = '#ffffff60';
    ctx.lineWidth = 22;
    ctx.beginPath();
    ctx.moveTo(0, height * 0.91);
    ctx.quadraticCurveTo(width * 0.5, height * 0.7, width, height * 0.91);
    ctx.stroke();
    const moving = reduced.matches ? 0 : Math.sin(elapsed * 1.6);
    const center =
      phase === 'depart'
        ? width * (0.1 + progress * 2.6)
        : phase === 'return'
          ? width * (0.5 + (progress - 0.8) * 1.8)
          : phase === 'complete'
            ? width * 0.72
            : width * (0.48 + moving * 0.075);
    const scale = Math.min(1.15, width / 500);
    team.forEach((member, index) => {
      const x = center + (index - (team.length - 1) / 2) * 65 * scale;
      const y = height * 0.78 + (index % 2) * 12;
      pet(member, x, y, scale, elapsed + index);
      ctx.fillStyle = '#53654f';
      ctx.font = `600 ${Math.max(10, 12 * scale)}px system-ui`;
      ctx.textAlign = 'center';
      ctx.fillText(member.name.slice(0, 13), x, y + 29 * scale);
    });
    const basketX = width * 0.8,
      basketY = height * 0.75;
    ctx.fillStyle = '#bd9165';
    ctx.beginPath();
    ctx.roundRect(basketX - 25, basketY, 50, 33, 5);
    ctx.fill();
    ctx.strokeStyle = '#9a704a';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(basketX, basketY + 2, 20, Math.PI, Math.PI * 2);
    ctx.stroke();
    const rewardMaterials = Object.entries(expedition.rewards).filter(([, amount]) => amount > 0);
    for (let i = 0; i < Math.floor(progress * 9); i++)
      oval(
        basketX - 17 + (i % 4) * 11,
        basketY + 6 - Math.floor(i / 4) * 6,
        6,
        6,
        ['#ce7f7f', '#99b16b', '#dfc078'][i % 3],
      );
    if (phase === 'gather') {
      const gatherCycle = (elapsed * 1.15) % 1;
      for (let i = 0; i < Math.min(team.length, 4); i++) {
        const fromX = center + (i - (team.length - 1) / 2) * 65 * scale,
          fromY = height * 0.71;
        const t = reduced.matches ? 0.6 : (gatherCycle + i * 0.18) % 1;
        const x = fromX + (basketX - fromX) * t,
          y = fromY + (basketY - fromY) * t - Math.sin(Math.PI * t) * 65;
        oval(x, y, 7, 7, ['#ce7f7f', '#99b16b', '#dfc078'][i % 3]);
        ctx.strokeStyle = '#67855e';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, y - 5);
        ctx.lineTo(x + 2, y - 11);
        ctx.stroke();
      }
    }
    canvas.setAttribute(
      'aria-label',
      `${team.map((p) => p.name).join(', ')}: ${phase === 'gather' ? 'recogiendo ingredientes' : phase === 'complete' ? 'de vuelta con los ingredientes' : phase === 'return' ? 'volviendo con la cosecha' : 'saliendo a explorar'}. ${rewardMaterials.length} tipos de ingredientes en la mochila.`,
    );
  }
  function tick() {
    frame = 0;
    if (disposed || document.hidden || !dialog.open) return;
    draw();
    if ((getState().expedition?.endsAt ?? 0) > Date.now() && !reduced.matches)
      frame = requestAnimationFrame(tick);
  }
  function update() {
    draw();
    if (!frame && !disposed && !document.hidden && dialog.open && getState().expedition)
      frame = requestAnimationFrame(tick);
  }
  function resize() {
    const b = canvas.getBoundingClientRect();
    width = Math.max(1, b.width);
    height = Math.max(1, b.height);
    const d = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * d);
    canvas.height = Math.round(height * d);
    ctx.setTransform(d, 0, 0, d, 0, 0);
    update();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  function visibility() {
    if (document.hidden) {
      cancelAnimationFrame(frame);
      frame = 0;
    } else update();
  }
  document.addEventListener('visibilitychange', visibility);
  function closed() {
    cancelAnimationFrame(frame);
    frame = 0;
  }
  dialog.addEventListener('close', closed);
  return {
    update,
    destroy() {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener('visibilitychange', visibility);
      dialog.removeEventListener('close', closed);
    },
  };
}
