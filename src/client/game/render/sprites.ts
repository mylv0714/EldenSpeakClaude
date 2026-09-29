import type { PropKind } from '../city/generate';
import { shade } from '../math';
import type { PedLook } from '../peds';
import type { CarModel } from '../vehicle';

const SS = 3; // supersampling for crisp car sprites
const carCache = new Map<string, HTMLCanvasElement>();

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/** Pre-rendered top-down car (facing +x), cached per model and color. */
export function carSprite(model: CarModel, color: string): HTMLCanvasElement {
  const key = `${model.id}|${color}`;
  const cached = carCache.get(key);
  if (cached) return cached;
  const L = model.len;
  const W = model.wid;
  const c = document.createElement('canvas');
  c.width = (L + 4) * SS;
  c.height = (W + 4) * SS;
  const ctx = c.getContext('2d')!;
  ctx.scale(SS, SS);
  ctx.translate(2, 2);

  const dark = shade(color, -0.35);
  const light = shade(color, 0.25);
  const glass = '#1d2a3a';
  const style = model.style;

  // Body with a soft highlight along the spine.
  const g = ctx.createLinearGradient(0, 0, 0, W);
  g.addColorStop(0, dark);
  g.addColorStop(0.5, light);
  g.addColorStop(1, dark);
  ctx.fillStyle = g;
  roundRect(ctx, 0, 0, L, W, style === 'bus' ? 3 : style === 'sports' ? 7 : 5);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.45)';
  ctx.lineWidth = 0.8;
  ctx.stroke();

  if (style === 'bus') {
    ctx.fillStyle = glass;
    ctx.fillRect(L - 6, 2, 4, W - 4);
    ctx.fillStyle = shade(color, 0.1);
    ctx.fillRect(4, 3, L - 12, W - 6);
    ctx.fillStyle = '#d9dde2';
    for (let x = 10; x < L - 16; x += 18) ctx.fillRect(x, W / 2 - 3, 10, 6);
  } else {
    const wsX = style === 'van' ? L * 0.72 : style === 'pickup' ? L * 0.55 : L * 0.58;
    const rearX = style === 'van' ? 4 : style === 'pickup' ? L * 0.32 : L * 0.2;
    // Windshield and rear window.
    ctx.fillStyle = glass;
    ctx.beginPath();
    ctx.moveTo(wsX, 2.5);
    ctx.lineTo(wsX + (style === 'sports' ? 7 : 5), 3.5);
    ctx.lineTo(wsX + (style === 'sports' ? 7 : 5), W - 3.5);
    ctx.lineTo(wsX, W - 2.5);
    ctx.closePath();
    ctx.fill();
    if (style !== 'van') {
      ctx.beginPath();
      ctx.moveTo(rearX, 3.5);
      ctx.lineTo(rearX + 4, 2.5);
      ctx.lineTo(rearX + 4, W - 2.5);
      ctx.lineTo(rearX, W - 3.5);
      ctx.closePath();
      ctx.fill();
    }
    // Roof.
    ctx.fillStyle = shade(color, style === 'sports' ? -0.1 : 0.08);
    roundRect(ctx, rearX + 4, 3, wsX - rearX - 4, W - 6, 2);
    ctx.fill();
    if (style === 'pickup') {
      ctx.fillStyle = shade(color, -0.45);
      ctx.fillRect(2, 3, rearX - 3, W - 6);
    }
    // Mirrors.
    ctx.fillStyle = dark;
    ctx.fillRect(wsX - 1, -1.2, 2.5, 1.6);
    ctx.fillRect(wsX - 1, W - 0.4, 2.5, 1.6);
  }

  // Lights.
  ctx.fillStyle = '#fff6c8';
  ctx.fillRect(L - 2, 1.5, 2, 3.5);
  ctx.fillRect(L - 2, W - 5, 2, 3.5);
  ctx.fillStyle = '#b3141c';
  ctx.fillRect(0, 1.5, 1.6, 3.5);
  ctx.fillRect(0, W - 5, 1.6, 3.5);

  // Special liveries.
  if (model.id === 'taxi') {
    ctx.fillStyle = '#222';
    ctx.fillRect(L * 0.36, W / 2 - 3, 8, 6);
    ctx.fillStyle = '#ffe066';
    ctx.font = 'bold 4px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('TAXI', L * 0.36 + 4, W / 2 + 0.3);
    ctx.fillStyle = '#222';
    for (let x = 4; x < L - 4; x += 4) ctx.fillRect(x, 0.2, 2, 1);
  }
  if (model.id === 'police') {
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(L * 0.25, 0.4, L * 0.45, 2.2);
    ctx.fillRect(L * 0.25, W - 2.6, L * 0.45, 2.2);
    ctx.fillStyle = '#222';
    ctx.fillRect(L * 0.42, 2.5, 3, W - 5);
  }
  if (model.id === 'comet' || model.id === 'comet_gt' || style === 'sports') {
    ctx.fillStyle = model.id === 'comet' ? 'rgba(255,255,255,0.55)' : 'rgba(20,20,20,0.55)';
    ctx.fillRect(2, W / 2 - 2.2, L - 4, 1.4);
    ctx.fillRect(2, W / 2 + 0.8, L - 4, 1.4);
  }
  if (model.id === 'van') {
    ctx.fillStyle = '#c0392b';
    ctx.font = 'bold 5px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.save();
    ctx.translate(L * 0.36, W / 2);
    ctx.rotate(Math.PI / 2);
    ctx.fillText("TONY'S", 0, 0);
    ctx.restore();
  }
  carCache.set(key, c);
  return c;
}

/** City Share cars get a green roof badge so players can spot drivable cars. */
export function drawShareBadge(ctx: CanvasRenderingContext2D, len: number) {
  ctx.fillStyle = '#22c55e';
  ctx.beginPath();
  ctx.arc(-len * 0.08, 0, 3.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1;
  ctx.stroke();
}

/** Top-down person: shoulders, arms, head seen from above. */
export function drawPerson(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, phase: number, look: PedLook, moving: boolean, knocked = false) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath();
  ctx.ellipse(1.5, 1.5, knocked ? 11 : 7, knocked ? 6 : 8, 0, 0, Math.PI * 2);
  ctx.fill();
  if (knocked) {
    ctx.fillStyle = look.pants;
    ctx.fillRect(-11, -3.5, 9, 7);
    ctx.fillStyle = look.shirt;
    ctx.beginPath();
    ctx.ellipse(1, 0, 6, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = look.bald ? look.skin : look.hair;
    ctx.beginPath();
    ctx.arc(8.5, 0, 3.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }
  const swing = moving ? Math.sin(phase) * 3.2 : 0;
  // Feet.
  ctx.fillStyle = shade(look.pants, -0.3);
  ctx.beginPath();
  ctx.ellipse(swing, -3, 2.6, 1.8, 0, 0, Math.PI * 2);
  ctx.ellipse(-swing, 3, 2.6, 1.8, 0, 0, Math.PI * 2);
  ctx.fill();
  // Arms.
  ctx.fillStyle = look.skin;
  ctx.beginPath();
  ctx.arc(-swing * 0.8, -6.8, 1.9, 0, Math.PI * 2);
  ctx.arc(swing * 0.8, 6.8, 1.9, 0, Math.PI * 2);
  ctx.fill();
  // Shoulders / torso.
  ctx.fillStyle = look.shirt;
  ctx.beginPath();
  ctx.ellipse(0, 0, 4.4, 6.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 0.6;
  ctx.stroke();
  // Head: hair covers the back, face peeks out front.
  ctx.fillStyle = look.skin;
  ctx.beginPath();
  ctx.arc(0.6, 0, 3.7, 0, Math.PI * 2);
  ctx.fill();
  if (!look.bald) {
    ctx.fillStyle = look.hair;
    ctx.beginPath();
    ctx.arc(-0.4, 0, 3.6, Math.PI * 0.35, Math.PI * 1.65);
    ctx.fill();
  }
  ctx.restore();
}

export function drawProp(ctx: CanvasRenderingContext2D, kind: PropKind, x: number, y: number, angle: number, knocked: boolean) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  switch (kind) {
    case 'hydrant':
      ctx.fillStyle = '#d62828';
      ctx.beginPath();
      ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f77f00';
      ctx.beginPath();
      ctx.arc(0, 0, 2, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'trash':
      ctx.fillStyle = knocked ? '#3a5a40' : '#2d6a4f';
      if (knocked) ctx.fillRect(-7, -4.5, 14, 9);
      else {
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1b4332';
        ctx.beginPath();
        ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case 'bench':
      ctx.fillStyle = '#7f5539';
      ctx.fillRect(-10, -3.5, 20, 7);
      ctx.fillStyle = '#9c6644';
      ctx.fillRect(-10, -3.5, 20, 2);
      break;
    case 'mailbox':
      ctx.fillStyle = '#1d4ed8';
      ctx.fillRect(-4.5, -5, 9, 10);
      ctx.fillStyle = '#93c5fd';
      ctx.fillRect(-3, -1, 6, 2);
      break;
    case 'cone':
      ctx.fillStyle = '#fb8500';
      ctx.beginPath();
      ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(0, 0, 2, 0, Math.PI * 2);
      ctx.fill();
      break;
  }
  ctx.restore();
}
