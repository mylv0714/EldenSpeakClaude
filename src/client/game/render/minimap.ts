import { AVENUES, STREETS } from '@shared/content/city';
import type { City } from '../city/generate';
import { AVE_X, type District, HALF_ROAD, LAND, ST_Y } from '../city/layout';
import type { Vec } from '../math';

/** World units per map pixel for the pre-rendered map image. */
export const MAP_SCALE = 5;
export const MAP_ORIGIN = { x: LAND.x - 200, y: LAND.y - 200 };
export const MAP_SIZE = { w: Math.ceil((LAND.w + 400) / MAP_SCALE), h: Math.ceil((LAND.h + 400) / MAP_SCALE) };

const MAP_GROUND: Record<District, string> = {
  downtown: '#b9b5ad',
  commercial: '#c9c2b4',
  residential: '#a8c98f',
  industrial: '#a3a19b',
  harbor: '#a09d96',
  park: '#7fbf68',
  beach: '#eadcb0',
  airport: '#9ea3a8',
};

export const toMap = (x: number, y: number): Vec => ({ x: (x - MAP_ORIGIN.x) / MAP_SCALE, y: (y - MAP_ORIGIN.y) / MAP_SCALE });

/** Renders the whole city once (roads, districts, buildings, street names). */
export function renderMapImage(city: City): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = MAP_SIZE.w;
  c.height = MAP_SIZE.h;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#4a90c2';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.scale(1 / MAP_SCALE, 1 / MAP_SCALE);
  ctx.translate(-MAP_ORIGIN.x, -MAP_ORIGIN.y);

  ctx.fillStyle = '#d8d2c4';
  ctx.fillRect(LAND.x, LAND.y, LAND.w, LAND.h);
  ctx.fillStyle = '#8fbf73';
  ctx.fillRect(LAND.x, LAND.y, LAND.w, ST_Y[0] - HALF_ROAD - LAND.y);
  ctx.fillStyle = '#eadcb0';
  ctx.fillRect(LAND.x, ST_Y[9] + HALF_ROAD, LAND.w, LAND.y + LAND.h - ST_Y[9] - HALF_ROAD);
  for (const b of city.blocks) {
    ctx.fillStyle = MAP_GROUND[b.district];
    ctx.fillRect(b.x, b.y, b.w, b.h);
  }
  ctx.fillStyle = '#4a90c2';
  ctx.beginPath();
  ctx.arc(city.lake.x, city.lake.y, city.lake.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(70,70,80,0.28)';
  for (const b of city.buildings) ctx.fillRect(b.x, b.y, b.w, b.h);

  ctx.fillStyle = '#f7f5f0';
  const g = city.roads;
  for (const s of g.segments) {
    const a = g.node(s.a);
    const b = g.node(s.b);
    if (s.horizontal) ctx.fillRect(Math.min(a.x, b.x) - HALF_ROAD, a.y - HALF_ROAD, Math.abs(a.x - b.x) + HALF_ROAD * 2, HALF_ROAD * 2);
    else ctx.fillRect(a.x - HALF_ROAD, Math.min(a.y, b.y) - HALF_ROAD, HALF_ROAD * 2, Math.abs(a.y - b.y) + HALF_ROAD * 2);
  }

  // Street names (in world units, so they scale with the image).
  ctx.fillStyle = '#5b6470';
  ctx.font = '600 44px "Pretendard Variable", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  STREETS.forEach((name, j) => {
    for (const x of [AVE_X[1] + 300, AVE_X[5] + 280]) ctx.fillText(name, x, ST_Y[j] + 2);
  });
  AVENUES.forEach((name, i) => {
    ctx.save();
    ctx.translate(AVE_X[i] + 2, ST_Y[4] + 280);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(name, 0, 0);
    ctx.restore();
  });
  return c;
}

export interface MinimapMarker {
  x: number;
  y: number;
  icon: string;
  color: string;
  /** Always shown (clamped to the edge when off the minimap). */
  pinned?: boolean;
}

/** Circular, north-up minimap around the player. */
export function drawMinimap(
  ctx: CanvasRenderingContext2D,
  size: number,
  dpr: number,
  map: HTMLCanvasElement,
  focus: Vec,
  heading: number,
  worldPerPx: number,
  markers: MinimapMarker[],
  route: Vec[] | null,
  police: Vec[],
  time: number,
): void {
  if (size < 20) return; // not laid out yet (or hidden)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, size, size);
  const r = size / 2;
  ctx.save();
  ctx.beginPath();
  ctx.arc(r, r, r - 2, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = '#4a90c2';
  ctx.fillRect(0, 0, size, size);

  const k = MAP_SCALE / worldPerPx;
  const m = toMap(focus.x, focus.y);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(map, r - m.x * k, r - m.y * k, map.width * k, map.height * k);

  const toMini = (x: number, y: number): Vec => ({ x: r + (x - focus.x) / worldPerPx, y: r + (y - focus.y) / worldPerPx });

  if (route && route.length > 1) {
    ctx.strokeStyle = '#d946ef';
    ctx.lineWidth = 4;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    route.forEach((p, i) => {
      const q = toMini(p.x, p.y);
      if (i === 0) ctx.moveTo(q.x, q.y);
      else ctx.lineTo(q.x, q.y);
    });
    ctx.stroke();
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const mk of markers) {
    let q = toMini(mk.x, mk.y);
    const d = Math.hypot(q.x - r, q.y - r);
    if (d > r - 10) {
      if (!mk.pinned) continue;
      const a = Math.atan2(q.y - r, q.x - r);
      q = { x: r + Math.cos(a) * (r - 11), y: r + Math.sin(a) * (r - 11) };
    }
    ctx.fillStyle = mk.color;
    ctx.beginPath();
    ctx.arc(q.x, q.y, 8.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.font = '10px system-ui, "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
    ctx.fillText(mk.icon, q.x, q.y + 0.5);
  }

  for (const p of police) {
    const q = toMini(p.x, p.y);
    ctx.fillStyle = Math.floor(time * 6) % 2 ? '#ef4444' : '#3b82f6';
    ctx.beginPath();
    ctx.arc(q.x, q.y, 4.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Player arrow.
  ctx.save();
  ctx.translate(r, r);
  ctx.rotate(heading);
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#111';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(9, 0);
  ctx.lineTo(-6, -6);
  ctx.lineTo(-3, 0);
  ctx.lineTo(-6, 6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  ctx.restore();

  // Rim and north marker.
  ctx.strokeStyle = 'rgba(0,0,0,0.65)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(r, r, r - 2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#111827';
  ctx.beginPath();
  ctx.arc(r, 9, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 10px system-ui, sans-serif';
  ctx.fillText('N', r, 9.5);
}
