// Canvas 2D renderer. Ground is flat; buildings and trees use a pinhole projection around the camera
// (the classic GTA 2 "lean"), sorted far → near so nearer rooftops overlap correctly.
import type { Building, City, Tree } from '../city/generate';
import { CAM_HEIGHT, HALF_ROAD } from '../city/layout';
import type { Fx } from '../fx';
import { hash2, type Rect, shade } from '../math';
import type { Ped, PedLook } from '../peds';
import type { Prop } from '../props';
import type { Vehicle } from '../vehicle';
import { carSprite, drawPerson, drawProp, drawShareBadge } from './sprites';

export interface Marker {
  x: number;
  y: number;
  kind: 'story' | 'place' | 'job' | 'door' | 'romance';
  icon: string;
}

export interface RenderInput {
  cam: { x: number; y: number; zoom: number };
  width: number;
  height: number;
  time: number;
  clock: number;
  quality: 'high' | 'low';
  city: City;
  vehicles: Vehicle[];
  peds: Ped[];
  props: Prop[];
  fx: Fx;
  player: { x: number; y: number; angle: number; phase: number; moving: boolean; look: PedLook; vehicle: Vehicle | null };
  markers: Marker[];
  coins: { x: number; y: number }[];
  waypoint: { x: number; y: number } | null;
}

const MAIN_ROADS = new Set(['Main Street', 'Central Avenue', 'Ocean Drive', 'Airport Road']);

export function nightFactor(clock: number): number {
  const h = clock / 60;
  if (h >= 7 && h < 17.5) return 0;
  if (h >= 17.5 && h < 20.5) return ((h - 17.5) / 3) * 0.62;
  if (h >= 20.5 || h < 5) return 0.62;
  return (1 - (h - 5) / 2) * 0.62;
}

export class WorldRenderer {
  private readonly light = document.createElement('canvas');
  private readonly lctx = this.light.getContext('2d')!;
  private readonly tall: (Building | Tree)[] = [];

  constructor(private readonly ctx: CanvasRenderingContext2D) {}

  render(r: RenderInput, dpr: number): void {
    const { ctx } = this;
    const { cam, width: W, height: H } = r;
    const z = cam.zoom;
    const shake = r.fx.shake;
    const ox = shake ? (Math.random() - 0.5) * shake : 0;
    const oy = shake ? (Math.random() - 0.5) * shake : 0;
    const view: Rect = { x: cam.x - W / 2 / z, y: cam.y - H / 2 / z, w: W / z, h: H / z };
    const night = nightFactor(r.clock);
    const high = r.quality === 'high';

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#2b7fb3';
    ctx.fillRect(0, 0, W, H);
    ctx.setTransform(dpr * z, 0, 0, dpr * z, dpr * (W / 2 - cam.x * z + ox), dpr * (H / 2 - cam.y * z + oy));

    if (high) this.drawWaves(view, r.time);
    this.drawGround(r.city, view);
    this.drawRoads(r.city, view);
    this.drawSkids(r.fx, view);
    this.drawGroundMarkers(r.markers, r.time, view);
    if (high && night < 0.35) this.drawShadows(r, view, night);
    this.drawBoatsAndPlanes(r.city, view, r.time);
    this.drawProps(r.props, view);
    this.drawPeds(r.peds, view);
    this.drawVehicles(r.vehicles, view, r.time);
    if (!r.player.vehicle) {
      drawPerson(ctx, r.player.x, r.player.y, r.player.angle, r.player.phase, r.player.look, r.player.moving);
    }
    this.drawTall(r, view, night);
    this.drawCoins(r.coins, r.time, view);
    this.drawParticles(r.fx, view);
    this.drawPlayerChevron(r);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.drawLighting(r, view, night);
    this.drawScreenOverlays(r, view);
  }

  // ── Ground ─────────────────────────────────────────────────────────────

  private visible(x: number, y: number, w: number, h: number, v: Rect, m = 0): boolean {
    return x < v.x + v.w + m && x + w > v.x - m && y < v.y + v.h + m && y + h > v.y - m;
  }

  private drawWaves(v: Rect, time: number): void {
    const ctx = this.ctx;
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const step = 90;
    for (let x = Math.floor(v.x / step) * step; x < v.x + v.w; x += step) {
      for (let y = Math.floor(v.y / step) * step; y < v.y + v.h; y += step) {
        const ph = hash2(x, y) * 6.28;
        const dx = Math.sin(time * 0.8 + ph) * 10;
        ctx.moveTo(x + dx, y + (hash2(y, x) * 40));
        ctx.lineTo(x + dx + 22, y + (hash2(y, x) * 40));
      }
    }
    ctx.stroke();
  }

  private drawGround(city: City, v: Rect): void {
    const ctx = this.ctx;
    for (const g of city.ground) {
      if (!this.visible(g.x, g.y, g.w, g.h, v)) continue;
      ctx.fillStyle = g.color;
      switch (g.kind) {
        case 'fill':
        case 'path':
          ctx.fillRect(g.x, g.y, g.w, g.h);
          break;
        case 'ellipse':
          ctx.beginPath();
          ctx.ellipse(g.x + g.w / 2, g.y + g.h / 2, g.w / 2, g.h / 2, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,0.35)';
          ctx.lineWidth = 3;
          ctx.stroke();
          break;
        case 'pool':
          ctx.fillRect(g.x, g.y, g.w, g.h);
          ctx.strokeStyle = '#e8f6fb';
          ctx.lineWidth = 2;
          ctx.strokeRect(g.x, g.y, g.w, g.h);
          break;
        case 'plaza':
          ctx.fillRect(g.x, g.y, g.w, g.h);
          ctx.strokeStyle = 'rgba(0,0,0,0.06)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          for (let x = g.x + 16; x < g.x + g.w; x += 16) {
            ctx.moveTo(x, g.y);
            ctx.lineTo(x, g.y + g.h);
          }
          for (let y = g.y + 16; y < g.y + g.h; y += 16) {
            ctx.moveTo(g.x, y);
            ctx.lineTo(g.x + g.w, y);
          }
          ctx.stroke();
          break;
        case 'parking': {
          ctx.fillRect(g.x, g.y, g.w, g.h);
          ctx.strokeStyle = 'rgba(255,255,255,0.55)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          if (g.vertical) {
            for (let y = g.y + 5; y < g.y + g.h - 5; y += 30) {
              ctx.moveTo(g.x + 4, y);
              ctx.lineTo(g.x + Math.min(54, g.w / 2 - 4), y);
              ctx.moveTo(g.x + g.w - 4, y);
              ctx.lineTo(g.x + g.w - Math.min(54, g.w / 2 - 4), y);
            }
          } else {
            for (let x = g.x + 5; x < g.x + g.w - 5; x += 30) {
              ctx.moveTo(x, g.y + 4);
              ctx.lineTo(x, g.y + Math.min(54, g.h / 2 - 4));
              ctx.moveTo(x, g.y + g.h - 4);
              ctx.lineTo(x, g.y + g.h - Math.min(54, g.h / 2 - 4));
            }
          }
          ctx.stroke();
          break;
        }
        case 'runway': {
          ctx.fillRect(g.x, g.y, g.w, g.h);
          ctx.strokeStyle = '#f1f1f1';
          ctx.lineWidth = 3;
          ctx.setLineDash([30, 24]);
          ctx.beginPath();
          if (g.h > g.w) {
            ctx.moveTo(g.x + g.w / 2, g.y + 40);
            ctx.lineTo(g.x + g.w / 2, g.y + g.h - 40);
          } else {
            ctx.moveTo(g.x + 10, g.y + g.h / 2);
            ctx.lineTo(g.x + g.w - 10, g.y + g.h / 2);
          }
          ctx.stroke();
          ctx.setLineDash([]);
          if (g.h > g.w) {
            ctx.fillStyle = '#f1f1f1';
            for (let x = g.x + 10; x < g.x + g.w - 10; x += 12) {
              ctx.fillRect(x, g.y + 8, 6, 24);
              ctx.fillRect(x, g.y + g.h - 32, 6, 24);
            }
          }
          break;
        }
        case 'pier':
          ctx.fillRect(g.x, g.y, g.w, g.h);
          ctx.strokeStyle = 'rgba(0,0,0,0.2)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          for (let x = g.x + 8; x < g.x + g.w; x += 8) {
            ctx.moveTo(x, g.y);
            ctx.lineTo(x, g.y + g.h);
          }
          ctx.stroke();
          break;
        case 'field':
          ctx.fillRect(g.x, g.y, g.w, g.h);
          ctx.strokeStyle = 'rgba(255,255,255,0.7)';
          ctx.lineWidth = 2;
          ctx.strokeRect(g.x + 6, g.y + 6, g.w - 12, g.h - 12);
          ctx.beginPath();
          ctx.moveTo(g.x + g.w / 2, g.y + 6);
          ctx.lineTo(g.x + g.w / 2, g.y + g.h - 6);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(g.x + g.w / 2, g.y + g.h / 2, 24, 0, Math.PI * 2);
          ctx.stroke();
          break;
      }
    }
    // Curbs.
    ctx.strokeStyle = '#8f8b82';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (const b of city.blocks) if (this.visible(b.x, b.y, b.w, b.h, v)) ctx.rect(b.x, b.y, b.w, b.h);
    ctx.stroke();
  }

  private drawRoads(city: City, v: Rect): void {
    const ctx = this.ctx;
    const g = city.roads;
    const segs = g.segments.filter((s) => {
      const a = g.node(s.a);
      const b = g.node(s.b);
      const x = Math.min(a.x, b.x) - HALF_ROAD;
      const y = Math.min(a.y, b.y) - HALF_ROAD;
      return this.visible(x, y, Math.abs(a.x - b.x) + HALF_ROAD * 2, Math.abs(a.y - b.y) + HALF_ROAD * 2, v);
    });
    ctx.fillStyle = '#3d4046';
    ctx.beginPath();
    for (const s of segs) {
      const a = g.node(s.a);
      const b = g.node(s.b);
      if (s.horizontal) ctx.rect(Math.min(a.x, b.x) - HALF_ROAD, a.y - HALF_ROAD, Math.abs(a.x - b.x) + HALF_ROAD * 2, HALF_ROAD * 2);
      else ctx.rect(a.x - HALF_ROAD, Math.min(a.y, b.y) - HALF_ROAD, HALF_ROAD * 2, Math.abs(a.y - b.y) + HALF_ROAD * 2);
    }
    ctx.fill();

    // Center lines.
    const dashed = new Path2D();
    const solid = new Path2D();
    for (const s of segs) {
      const a = g.node(s.a);
      const b = g.node(s.b);
      const path = MAIN_ROADS.has(s.name) ? solid : dashed;
      if (s.horizontal) {
        const x0 = Math.min(a.x, b.x) + HALF_ROAD + 20;
        const x1 = Math.max(a.x, b.x) - HALF_ROAD - 20;
        if (path === solid) {
          path.moveTo(x0, a.y - 2.5);
          path.lineTo(x1, a.y - 2.5);
          path.moveTo(x0, a.y + 2.5);
          path.lineTo(x1, a.y + 2.5);
        } else {
          path.moveTo(x0, a.y);
          path.lineTo(x1, a.y);
        }
      } else {
        const y0 = Math.min(a.y, b.y) + HALF_ROAD + 20;
        const y1 = Math.max(a.y, b.y) - HALF_ROAD - 20;
        if (path === solid) {
          path.moveTo(a.x - 2.5, y0);
          path.lineTo(a.x - 2.5, y1);
          path.moveTo(a.x + 2.5, y0);
          path.lineTo(a.x + 2.5, y1);
        } else {
          path.moveTo(a.x, y0);
          path.lineTo(a.x, y1);
        }
      }
    }
    ctx.strokeStyle = '#e8c547';
    ctx.lineWidth = 2.5;
    ctx.stroke(solid);
    ctx.setLineDash([18, 14]);
    ctx.stroke(dashed);
    ctx.setLineDash([]);

    // Crosswalks and stop lines.
    ctx.fillStyle = 'rgba(240,240,240,0.85)';
    ctx.beginPath();
    for (const s of segs) {
      const a = g.node(s.a);
      const b = g.node(s.b);
      for (const [n, dir] of [
        [a, 1],
        [b, -1],
      ] as const) {
        if (n.links.length < 3) continue;
        if (s.horizontal) {
          const x = n.x + dir * (HALF_ROAD + 4) - (dir < 0 ? 14 : 0);
          for (let y = n.y - HALF_ROAD + 6; y < n.y + HALF_ROAD - 6; y += 10) ctx.rect(x, y, 14, 5);
        } else {
          const y = n.y + dir * (HALF_ROAD + 4) - (dir < 0 ? 14 : 0);
          for (let x = n.x - HALF_ROAD + 6; x < n.x + HALF_ROAD - 6; x += 10) ctx.rect(x, y, 5, 14);
        }
      }
    }
    ctx.fill();
  }

  private drawSkids(fx: Fx, v: Rect): void {
    const ctx = this.ctx;
    ctx.strokeStyle = 'rgba(20,20,20,0.35)';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    const s = fx.skids;
    for (let i = 0; i < fx.skidCount; i++) {
      const o = i * 5;
      const x = s[o];
      const y = s[o + 1];
      if (x < v.x - 20 || x > v.x + v.w + 20 || y < v.y - 20 || y > v.y + v.h + 20) continue;
      ctx.moveTo(x, y);
      ctx.lineTo(s[o + 2], s[o + 3]);
    }
    ctx.stroke();
    ctx.lineCap = 'butt';
  }

  private drawGroundMarkers(markers: Marker[], time: number, v: Rect): void {
    const ctx = this.ctx;
    for (const m of markers) {
      if (!this.visible(m.x - 40, m.y - 40, 80, 80, v)) continue;
      const pulse = (Math.sin(time * 4) + 1) / 2;
      const color = m.kind === 'story' ? '255,204,0' : m.kind === 'romance' ? '236,72,153' : m.kind === 'job' ? '52,211,153' : m.kind === 'door' ? '251,133,0' : '56,189,248';
      const r = m.kind === 'story' ? 20 : m.kind === 'place' ? 14 : 22;
      ctx.fillStyle = `rgba(${color},${0.18 + pulse * 0.12})`;
      ctx.beginPath();
      ctx.arc(m.x, m.y, r + pulse * 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(${color},0.95)`;
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }
  }

  private sun(clock: number) {
    const h = clock / 60;
    const sx = Math.cos((Math.PI * (h - 6)) / 12);
    const len = 0.28 + 0.55 * Math.abs(sx);
    return { dx: -sx * len, dy: -0.25 * len };
  }

  private drawShadows(r: RenderInput, v: Rect, night: number): void {
    const ctx = this.ctx;
    const { dx, dy } = this.sun(r.clock);
    ctx.fillStyle = `rgba(0,0,0,${0.2 * (1 - night / 0.35)})`;
    ctx.beginPath();
    for (const b of r.city.buildings) {
      if (!this.visible(b.x, b.y, b.w, b.h, v, 200)) continue;
      const sx = dx * b.height;
      const sy = dy * b.height;
      const x0 = b.x;
      const y0 = b.y;
      const x1 = b.x + b.w;
      const y1 = b.y + b.h;
      // Convex hull of the footprint and its shifted copy (sx < 0, sy < 0 or sx > 0).
      if (sx <= 0) {
        ctx.moveTo(x1, y1);
        ctx.lineTo(x0, y1);
        ctx.lineTo(x0 + sx, y1 + sy);
        ctx.lineTo(x0 + sx, y0 + sy);
        ctx.lineTo(x1 + sx, y0 + sy);
        ctx.lineTo(x1, y0);
      } else {
        ctx.moveTo(x0, y1);
        ctx.lineTo(x1, y1);
        ctx.lineTo(x1 + sx, y1 + sy);
        ctx.lineTo(x1 + sx, y0 + sy);
        ctx.lineTo(x0 + sx, y0 + sy);
        ctx.lineTo(x0, y0);
      }
      ctx.closePath();
    }
    ctx.fill();
  }

  private drawBoatsAndPlanes(city: City, v: Rect, time: number): void {
    const ctx = this.ctx;
    for (const b of city.boats) {
      if (!this.visible(b.x - 60, b.y - 60, 120, 120, v)) continue;
      ctx.save();
      ctx.translate(b.x, b.y + Math.sin(time + b.x) * 2);
      ctx.rotate(b.angle);
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath();
      ctx.ellipse(3, 4, b.len / 2, b.len / 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.moveTo(b.len / 2, 0);
      ctx.quadraticCurveTo(b.len / 4, -b.len / 5, -b.len / 2, -b.len / 6);
      ctx.lineTo(-b.len / 2, b.len / 6);
      ctx.quadraticCurveTo(b.len / 4, b.len / 5, b.len / 2, 0);
      ctx.fill();
      ctx.fillStyle = '#d6e4ee';
      ctx.fillRect(-b.len / 5, -b.len / 12, b.len / 3, b.len / 6);
      ctx.restore();
    }
    for (const p of city.planes) {
      if (!this.visible(p.x - 70, p.y - 70, 140, 140, v)) continue;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fillRect(-44, -6, 96, 16);
      ctx.fillStyle = '#f4f6f8';
      ctx.beginPath();
      ctx.ellipse(0, 0, 48, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(6, 0);
      ctx.lineTo(-10, -44);
      ctx.lineTo(-20, -44);
      ctx.lineTo(-10, 0);
      ctx.lineTo(-20, 44);
      ctx.lineTo(-10, 44);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-36, 0);
      ctx.lineTo(-46, -16);
      ctx.lineTo(-50, -16);
      ctx.lineTo(-44, 0);
      ctx.lineTo(-50, 16);
      ctx.lineTo(-46, 16);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#2563eb';
      ctx.fillRect(-40, -1.5, 70, 3);
      ctx.restore();
    }
  }

  // ── Entities ──────────────────────────────────────────────────────────

  private drawProps(props: Prop[], v: Rect): void {
    for (const p of props) if (this.visible(p.x - 12, p.y - 12, 24, 24, v)) drawProp(this.ctx, p.kind, p.x, p.y, p.angle, p.knocked);
  }

  private drawPeds(peds: Ped[], v: Rect): void {
    for (const p of peds) {
      if (!this.visible(p.x - 14, p.y - 14, 28, 28, v)) continue;
      const moving = p.state !== 'idle' && (p.state !== 'follow' || Math.hypot(p.vx, p.vy) > 10);
      drawPerson(this.ctx, p.x, p.y, p.angle, p.phase, p.look, moving, p.state === 'knocked');
    }
  }

  private drawVehicles(vehicles: Vehicle[], v: Rect, time: number): void {
    const ctx = this.ctx;
    for (const car of vehicles) {
      const L = car.model.len;
      const W = car.model.wid;
      if (!this.visible(car.x - L, car.y - L, L * 2, L * 2, v)) continue;
      ctx.save();
      ctx.translate(car.x, car.y);
      ctx.rotate(car.angle);
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.beginPath();
      ctx.roundRect(-L / 2 + 2, -W / 2 + 3, L, W, 5);
      ctx.fill();
      ctx.drawImage(carSprite(car.model, car.color), -L / 2 - 2, -W / 2 - 2, L + 4, W + 4);
      if (car.dead) {
        ctx.fillStyle = 'rgba(20,20,20,0.55)';
        ctx.fillRect(-L / 2, -W / 2, L, W);
      }
      if (car.role === 'parked' && car.drivable) drawShareBadge(ctx, L);
      if (car.braking) {
        ctx.fillStyle = 'rgba(255,40,40,0.9)';
        ctx.fillRect(-L / 2 - 1.5, -W / 2 + 1, 2.5, 4);
        ctx.fillRect(-L / 2 - 1.5, W / 2 - 5, 2.5, 4);
      }
      if (car.siren || car.model.id === 'police') {
        const on = car.siren && Math.floor(time * 8) % 2 === 0;
        ctx.fillStyle = on ? '#ff2d2d' : car.siren ? '#6b0000' : '#7a1d1d';
        ctx.fillRect(-2, -W / 2 + 2, 4, W / 2 - 2);
        ctx.fillStyle = !on && car.siren ? '#2d6bff' : '#1d2f6b';
        ctx.fillRect(-2, 0, 4, W / 2 - 2);
      }
      ctx.restore();
    }
  }

  private project(x: number, y: number, h: number, cx: number, cy: number): [number, number] {
    const k = CAM_HEIGHT / (CAM_HEIGHT - h);
    return [cx + (x - cx) * k, cy + (y - cy) * k];
  }

  private drawTall(r: RenderInput, v: Rect, night: number): void {
    const { cam } = r;
    const list = this.tall;
    list.length = 0;
    const m = 260;
    for (const b of r.city.buildings) if (this.visible(b.x, b.y, b.w, b.h, v, m)) list.push(b);
    for (const t of r.city.trees) if (t.x > v.x - 80 && t.x < v.x + v.w + 80 && t.y > v.y - 80 && t.y < v.y + v.h + 80) list.push(t);
    const cx = cam.x;
    const cy = cam.y;
    const dist = (o: Building | Tree) => ('w' in o ? Math.hypot(o.x + o.w / 2 - cx, o.y + o.h / 2 - cy) : Math.hypot(o.x - cx, o.y - cy));
    list.sort((a, b) => dist(b) - dist(a));
    for (const o of list) {
      if ('w' in o) this.drawBuilding(o, cx, cy, night, r.quality === 'high', r.time);
      else this.drawTree(o, cx, cy);
    }
  }

  private drawTree(t: Tree, cx: number, cy: number): void {
    const ctx = this.ctx;
    const [px, py] = this.project(t.x, t.y, t.h, cx, cy);
    const k = CAM_HEIGHT / (CAM_HEIGHT - t.h);
    const r = t.r * k;
    if (t.kind === 'palm') {
      ctx.fillStyle = '#7b5e3b';
      ctx.beginPath();
      ctx.arc(t.x, t.y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#8a6a44';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(t.x, t.y);
      ctx.lineTo(px, py);
      ctx.stroke();
      ctx.fillStyle = '#3f8f3a';
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2 + t.x;
        ctx.beginPath();
        ctx.ellipse(px + Math.cos(a) * r * 0.55, py + Math.sin(a) * r * 0.55, r * 0.62, r * 0.2, a, 0, Math.PI * 2);
        ctx.fill();
      }
      return;
    }
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.arc(t.x + 4, t.y + 5, t.r * 0.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = t.kind === 'pine' ? shade(t.color, -0.2) : t.color;
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = shade(t.color, t.kind === 'pine' ? -0.05 : 0.18);
    ctx.beginPath();
    ctx.arc(px - r * 0.22, py - r * 0.22, r * (t.kind === 'pine' ? 0.45 : 0.6), 0, Math.PI * 2);
    ctx.fill();
  }

  private drawBuilding(b: Building, cx: number, cy: number, night: number, high: boolean, time: number): void {
    const ctx = this.ctx;
    const k = CAM_HEIGHT / (CAM_HEIGHT - b.height);
    const x0 = b.x;
    const y0 = b.y;
    const x1 = b.x + b.w;
    const y1 = b.y + b.h;
    const rx0 = cx + (x0 - cx) * k;
    const ry0 = cy + (y0 - cy) * k;
    const rx1 = cx + (x1 - cx) * k;
    const ry1 = cy + (y1 - cy) * k;

    const quad = (ax: number, ay: number, bx: number, by: number, cx2: number, cy2: number, dx: number, dy: number, color: string) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.lineTo(cx2, cy2);
      ctx.lineTo(dx, dy);
      ctx.closePath();
      ctx.fill();
    };

    const walls: [number, number, number, number, string][] = [];
    if (cy < y0) walls.push([x0, y0, x1, y0, shade(b.wall, -0.12)]);
    if (cy > y1) walls.push([x0, y1, x1, y1, shade(b.wall, 0.08)]);
    if (cx < x0) walls.push([x0, y0, x0, y1, shade(b.wall, -0.02)]);
    if (cx > x1) walls.push([x1, y0, x1, y1, shade(b.wall, -0.2)]);
    for (const [ax, ay, bx, by, color] of walls) {
      const [pax, pay] = [cx + (ax - cx) * k, cy + (ay - cy) * k];
      const [pbx, pby] = [cx + (bx - cx) * k, cy + (by - cy) * k];
      quad(ax, ay, bx, by, pbx, pby, pax, pay, color);
    }

    // Windows as floor bands on visible walls.
    const windowed = b.style === 'tower' || b.style === 'office' || b.style === 'landmark';
    if (high && windowed && b.height > 50 && walls.length > 0) {
      const floors = Math.min(16, Math.floor((b.height - 10) / 30));
      const dark = new Path2D();
      const lit = new Path2D();
      for (let f = 0; f < floors; f++) {
        const hb = 10 + f * 30;
        const kb = CAM_HEIGHT / (CAM_HEIGHT - hb);
        const kt = CAM_HEIGHT / (CAM_HEIGHT - hb - 14);
        walls.forEach(([ax, ay, bx, by], wi) => {
          const path = night > 0.15 && hash2(b.seed + f * 7, wi) < 0.55 ? lit : dark;
          const sx = ax + (bx - ax) * 0.08;
          const sy = ay + (by - ay) * 0.08;
          const ex = ax + (bx - ax) * 0.92;
          const ey = ay + (by - ay) * 0.92;
          path.moveTo(cx + (sx - cx) * kb, cy + (sy - cy) * kb);
          path.lineTo(cx + (ex - cx) * kb, cy + (ey - cy) * kb);
          path.lineTo(cx + (ex - cx) * kt, cy + (ey - cy) * kt);
          path.lineTo(cx + (sx - cx) * kt, cy + (sy - cy) * kt);
          path.closePath();
        });
      }
      ctx.fillStyle = night > 0.15 ? 'rgba(20,28,45,0.7)' : 'rgba(40,62,92,0.42)';
      ctx.fill(dark);
      ctx.fillStyle = '#ffd98a';
      ctx.fill(lit);
    }

    // Roof.
    ctx.fillStyle = b.roof;
    ctx.fillRect(rx0, ry0, rx1 - rx0, ry1 - ry0);

    ctx.save();
    ctx.translate(cx * (1 - k), cy * (1 - k));
    ctx.scale(k, k);
    this.roofDetails(b, night, time);
    ctx.restore();
  }

  private roofDetails(b: Building, night: number, time: number): void {
    const ctx = this.ctx;
    const x0 = b.x;
    const y0 = b.y;
    ctx.strokeStyle = shade(b.roof, 0.22);
    ctx.lineWidth = 2;
    if (b.style !== 'house' && b.style !== 'container' && b.style !== 'truck') ctx.strokeRect(x0 + 2, y0 + 2, b.w - 4, b.h - 4);
    const hs = (n: number) => hash2(b.seed, n);
    switch (b.style) {
      case 'house': {
        const alongX = b.w >= b.h;
        ctx.fillStyle = shade(b.roof, -0.15);
        if (alongX) ctx.fillRect(x0, y0 + b.h / 2, b.w, b.h / 2);
        else ctx.fillRect(x0 + b.w / 2, y0, b.w / 2, b.h);
        ctx.strokeStyle = shade(b.roof, 0.25);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        if (alongX) {
          ctx.moveTo(x0 + 4, y0 + b.h / 2);
          ctx.lineTo(x0 + b.w - 4, y0 + b.h / 2);
        } else {
          ctx.moveTo(x0 + b.w / 2, y0 + 4);
          ctx.lineTo(x0 + b.w / 2, y0 + b.h - 4);
        }
        ctx.stroke();
        if (hs(1) < 0.4) {
          ctx.fillStyle = '#6b4f3a';
          ctx.fillRect(x0 + b.w * 0.7, y0 + b.h * 0.2, 7, 7);
        }
        break;
      }
      case 'warehouse':
      case 'hangar': {
        ctx.strokeStyle = shade(b.roof, -0.12);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        if (b.w >= b.h) for (let x = x0 + 8; x < x0 + b.w - 4; x += 10) {
            ctx.moveTo(x, y0 + 4);
            ctx.lineTo(x, y0 + b.h - 4);
          }
        else for (let y = y0 + 8; y < y0 + b.h - 4; y += 10) {
            ctx.moveTo(x0 + 4, y);
            ctx.lineTo(x0 + b.w - 4, y);
          }
        ctx.stroke();
        if (b.style === 'hangar') {
          ctx.fillStyle = 'rgba(255,255,255,0.15)';
          ctx.fillRect(x0, y0, b.w, b.h / 3);
        }
        break;
      }
      case 'container':
        ctx.strokeStyle = shade(b.roof, -0.2);
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = x0 + 4; x < x0 + b.w; x += 4) {
            ctx.moveTo(x, y0 + 1);
            ctx.lineTo(x, y0 + b.h - 1);
          }
        ctx.stroke();
        break;
      case 'tower':
      case 'office': {
        if (b.height > 150 && b.w > 50 && b.h > 50) {
          ctx.fillStyle = shade(b.roof, -0.18);
          ctx.fillRect(x0 + b.w * 0.35, y0 + b.h * 0.35, b.w * 0.3, b.h * 0.3);
        }
        ctx.fillStyle = shade(b.roof, 0.3);
        const n = 1 + Math.floor(hs(2) * 3);
        for (let i = 0; i < n; i++) ctx.fillRect(x0 + 8 + hs(10 + i) * (b.w - 26), y0 + 8 + hs(20 + i) * (b.h - 26), 10, 10);
        if (b.style === 'tower' && b.w > 110 && b.h > 110 && hs(3) < 0.35) {
          const hx = x0 + b.w * 0.3;
          const hy = y0 + b.h * 0.7;
          ctx.fillStyle = '#3f4a57';
          ctx.beginPath();
          ctx.arc(hx, hy, 20, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#f5d000';
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 18px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('H', hx, hy + 1);
        }
        if (b.height > 380 && night > 0.1 && Math.floor(time * 1.5 + b.seed) % 2 === 0) {
          ctx.fillStyle = '#ff3b30';
          ctx.beginPath();
          ctx.arc(x0 + b.w / 2, y0 + b.h / 2, 3, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
      case 'truck': {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x0 + 4, y0 + b.h - 10, b.w - 8, 6);
        ctx.fillStyle = '#e63946';
        for (let x = x0 + 4; x < x0 + b.w - 4; x += 8) ctx.fillRect(x, y0 + b.h - 10, 4, 6);
        break;
      }
      default:
        break;
    }
    if (b.sign) {
      const size = Math.max(12, Math.min(26, (b.w / Math.max(6, b.sign.length)) * 1.5));
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `${Math.round(size * 1.3)}px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
      if (b.icon) ctx.fillText(b.icon, b.x + b.w / 2, b.y + b.h / 2 - size * 0.9);
      ctx.font = `800 ${Math.round(size)}px "Anton", Impact, sans-serif`;
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0,0,0,0.55)';
      ctx.strokeText(b.sign, b.x + b.w / 2, b.y + b.h / 2 + size * 0.45, b.w - 10);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(b.sign, b.x + b.w / 2, b.y + b.h / 2 + size * 0.45, b.w - 10);
    }
  }

  private drawCoins(coins: { x: number; y: number }[], time: number, v: Rect): void {
    const ctx = this.ctx;
    for (const c of coins) {
      if (!this.visible(c.x - 20, c.y - 20, 40, 40, v)) continue;
      const w = Math.abs(Math.sin(time * 3 + c.x)) * 10 + 2;
      const bob = Math.sin(time * 4 + c.y) * 2;
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath();
      ctx.ellipse(c.x + 3, c.y + 5, 9, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f5c518';
      ctx.beginPath();
      ctx.ellipse(c.x, c.y - 8 + bob, w, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#b8860b';
      ctx.lineWidth = 2;
      ctx.stroke();
      if (w > 7) {
        ctx.fillStyle = '#7a5a00';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Aa', c.x, c.y - 8 + bob);
      }
    }
  }

  private drawParticles(fx: Fx, v: Rect): void {
    const ctx = this.ctx;
    for (const p of fx.particles) {
      if (p.x < v.x - 30 || p.x > v.x + v.w + 30 || p.y < v.y - 30 || p.y > v.y + v.h + 30) continue;
      const a = 1 - p.life / p.max;
      ctx.globalAlpha = p.kind === 'smoke' ? a * 0.45 : a;
      ctx.fillStyle = p.color;
      if (p.kind === 'confetti' || p.kind === 'debris') ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size * 0.6);
      else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  private drawPlayerChevron(r: RenderInput): void {
    const ctx = this.ctx;
    const p = r.player;
    const x = p.vehicle ? p.vehicle.x : p.x;
    const y = p.vehicle ? p.vehicle.y : p.y;
    const a = p.vehicle ? p.vehicle.angle : p.angle;
    const s = 1 / r.cam.zoom;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    ctx.scale(s, s);
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    const d = p.vehicle ? 34 : 18;
    ctx.moveTo(d + 8, 0);
    ctx.lineTo(d, -6);
    ctx.lineTo(d + 2, 0);
    ctx.lineTo(d, 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  // ── Screen space ─────────────────────────────────────────────────────

  private drawLighting(r: RenderInput, v: Rect, night: number): void {
    const ctx = this.ctx;
    const W = r.width;
    const H = r.height;
    const h = r.clock / 60;
    const warm = Math.max(0, 1 - Math.abs(h - 18.6) / 1.3) * 0.2 + Math.max(0, 1 - Math.abs(h - 6.1) / 1) * 0.12;
    if (warm > 0.01) {
      ctx.fillStyle = `rgba(255,120,40,${warm})`;
      ctx.fillRect(0, 0, W, H);
    }
    if (night <= 0.02) return;
    const scale = r.quality === 'high' ? 0.5 : 0.33;
    const lw = Math.max(1, Math.round(W * scale));
    const lh = Math.max(1, Math.round(H * scale));
    if (this.light.width !== lw || this.light.height !== lh) {
      this.light.width = lw;
      this.light.height = lh;
    }
    const l = this.lctx;
    const z = r.cam.zoom * scale;
    const toX = (x: number) => (x - r.cam.x) * z + lw / 2;
    const toY = (y: number) => (y - r.cam.y) * z + lh / 2;
    l.globalCompositeOperation = 'source-over';
    l.clearRect(0, 0, lw, lh);
    l.fillStyle = `rgba(6,12,38,${night})`;
    l.fillRect(0, 0, lw, lh);
    l.globalCompositeOperation = 'destination-out';

    const glow = (x: number, y: number, radius: number, strength: number) => {
      const sx = toX(x);
      const sy = toY(y);
      const rr = radius * z;
      if (sx < -rr || sy < -rr || sx > lw + rr || sy > lh + rr) return;
      const g = l.createRadialGradient(sx, sy, 0, sx, sy, rr);
      g.addColorStop(0, `rgba(0,0,0,${strength})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      l.fillStyle = g;
      l.fillRect(sx - rr, sy - rr, rr * 2, rr * 2);
    };
    for (const lamp of r.city.lamps) {
      if (lamp.x > v.x - 100 && lamp.x < v.x + v.w + 100 && lamp.y > v.y - 100 && lamp.y < v.y + v.h + 100) glow(lamp.x, lamp.y, 95, 0.8);
    }
    for (const car of r.vehicles) {
      if (car.driver === null || car.dead) continue;
      if (car.x < v.x - 200 || car.x > v.x + v.w + 200 || car.y < v.y - 200 || car.y > v.y + v.h + 200) continue;
      const fx = Math.cos(car.angle);
      const fy = Math.sin(car.angle);
      glow(car.x + fx * 70, car.y + fy * 70, 70, 0.85);
      glow(car.x + fx * 30, car.y + fy * 30, 40, 0.7);
    }
    const p = r.player.vehicle ?? r.player;
    glow(p.x, p.y, 70, 0.5);
    for (const m of r.markers) glow(m.x, m.y, 50, 0.7);
    l.globalCompositeOperation = 'source-over';
    ctx.drawImage(this.light, 0, 0, W, H);

    // Warm additive glow for lamps.
    ctx.globalCompositeOperation = 'lighter';
    const zz = r.cam.zoom;
    for (const lamp of r.city.lamps) {
      if (lamp.x < v.x - 60 || lamp.x > v.x + v.w + 60 || lamp.y < v.y - 60 || lamp.y > v.y + v.h + 60) continue;
      const sx = (lamp.x - r.cam.x) * zz + W / 2;
      const sy = (lamp.y - r.cam.y) * zz + H / 2;
      const rr = 40 * zz;
      const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, rr);
      g.addColorStop(0, `rgba(255,190,90,${0.35 * (night / 0.62)})`);
      g.addColorStop(1, 'rgba(255,190,90,0)');
      ctx.fillStyle = g;
      ctx.fillRect(sx - rr, sy - rr, rr * 2, rr * 2);
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  private drawScreenOverlays(r: RenderInput, v: Rect): void {
    const ctx = this.ctx;
    const z = r.cam.zoom;
    const W = r.width;
    const H = r.height;
    const toS = (x: number, y: number): [number, number] => [(x - r.cam.x) * z + W / 2, (y - r.cam.y) * z + H / 2];
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Marker icons.
    for (const m of r.markers) {
      if (!this.visible(m.x - 30, m.y - 30, 60, 60, v)) continue;
      const [sx, sy] = toS(m.x, m.y);
      const bob = Math.sin(r.time * 3 + m.x) * 3;
      const size = m.kind === 'story' ? 30 : 22;
      ctx.fillStyle = m.kind === 'story' ? '#ffcc00' : m.kind === 'romance' ? '#ec4899' : m.kind === 'job' ? '#34d399' : m.kind === 'door' ? '#fb8500' : '#0ea5e9';
      ctx.beginPath();
      ctx.arc(sx, sy - 34 + bob, size / 2 + 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.font = `${size * 0.72}px system-ui, "Segoe UI Emoji", "Apple Color Emoji", sans-serif`;
      ctx.fillStyle = '#000';
      ctx.fillText(m.icon, sx, sy - 33 + bob);
      if (m.kind === 'story') {
        ctx.fillStyle = '#ffcc00';
        ctx.beginPath();
        ctx.moveTo(sx - 7, sy - 58 + bob);
        ctx.lineTo(sx + 7, sy - 58 + bob);
        ctx.lineTo(sx, sy - 50 + bob);
        ctx.fill();
      }
    }

    // Ped icons and speech bubbles.
    ctx.font = '600 13px "Pretendard Variable", system-ui, sans-serif';
    for (const p of r.peds) {
      if (!this.visible(p.x - 20, p.y - 20, 40, 40, v)) continue;
      const [sx, sy] = toS(p.x, p.y);
      if (p.icon) {
        const bob = Math.sin(r.time * 4 + p.id) * 3;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(sx, sy - 30 + bob, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.font = '16px system-ui, "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
        ctx.fillStyle = '#000';
        ctx.fillText(p.icon, sx, sy - 29 + bob);
        ctx.font = '600 13px "Pretendard Variable", system-ui, sans-serif';
      }
      if (p.bubble) {
        const text = p.bubble.text;
        const tw = ctx.measureText(text).width + 16;
        const by = sy - (p.icon ? 62 : 34);
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        ctx.beginPath();
        ctx.roundRect(sx - tw / 2, by - 13, tw, 26, 10);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(sx - 5, by + 12);
        ctx.lineTo(sx + 5, by + 12);
        ctx.lineTo(sx, by + 19);
        ctx.fill();
        ctx.fillStyle = '#111827';
        ctx.fillText(text, sx, by + 1);
      }
    }

    // Off-screen waypoint arrow.
    if (r.waypoint) {
      const [wx, wy] = toS(r.waypoint.x, r.waypoint.y);
      const margin = 46;
      if (wx < margin || wy < margin || wx > W - margin || wy > H - margin) {
        const a = Math.atan2(wy - H / 2, wx - W / 2);
        const ex = Math.max(margin, Math.min(W - margin, W / 2 + Math.cos(a) * W));
        const ey = Math.max(margin, Math.min(H - margin, H / 2 + Math.sin(a) * H));
        ctx.save();
        ctx.translate(ex, ey);
        ctx.rotate(a);
        ctx.fillStyle = '#d946ef';
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(16, 0);
        ctx.lineTo(-10, -12);
        ctx.lineTo(-4, 0);
        ctx.lineTo(-10, 12);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    }
  }
}

