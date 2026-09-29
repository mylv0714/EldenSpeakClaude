import type { NpcLook } from '@shared/types';
import { SKIN } from '@shared/content/npcs';
import type { City } from './city/generate';
import { ROAD_W, SIDEWALK } from './city/layout';
import { clamp, pick, rand, type Rect, type Vec } from './math';

export interface PedLook {
  skin: string;
  hair: string;
  shirt: string;
  pants: string;
  bald: boolean;
}

/** 'follow' peds are moved by the engine (Miseon walking with the player). */
export type PedState = 'walk' | 'cross' | 'return' | 'dodge' | 'knocked' | 'flee' | 'idle' | 'leave' | 'follow';

export interface Ped {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  look: PedLook;
  state: PedState;
  ring: number;
  t: number;
  dir: 1 | -1;
  lateral: number;
  speed: number;
  target: Vec | null;
  timer: number;
  phase: number;
  bubble: { text: string; until: number } | null;
  /** Street-event / job NPCs are managed by the director and never auto-despawn. */
  fixed: boolean;
  icon: string | null;
}

const SHIRTS = ['#e63946', '#457b9d', '#2a9d8f', '#e9c46a', '#f4a261', '#8d99ae', '#6a4c93', '#ff006e', '#3a86ff', '#fb5607', '#ffffff', '#222222', '#52b788', '#b5838d'];
const PANTS = ['#2b2d42', '#3d405b', '#1d3557', '#4a4e69', '#6b705c', '#22223b', '#5c4033'];
const HAIRS = ['#1b1b1f', '#3a2418', '#6b4226', '#8f3b1f', '#d9b36c', '#9ea3a8'];

export const SHOUTS = {
  dodge: ['Hey! Watch it!', 'Whoa! Slow down!', 'Are you crazy?!', 'Look where you’re going!', 'Easy there!', 'Seriously?!'],
  hit: ['Ouch! What’s wrong with you?', 'My back!', 'I’m calling the cops!', 'Learn how to drive!', 'Hey! That hurt!'],
  honk: ['Alright, alright!', 'What’s your problem?', 'No need to honk!', 'I’m walking here!'],
  bump: ['Excuse you!', 'Oops, sorry!', 'Careful!', 'Pardon me!'],
  greet: ['Nice day, huh?', 'Morning!', 'How’s it going?', 'Love your outfit!', 'Welcome to Elden City!', 'Have a good one!'],
};

let nextId = 1;
const MAX_PEDS = 42;
const SPAWN_MIN = 520;
const SPAWN_MAX = 1150;
const DESPAWN = 1500;

export function randomLook(): PedLook {
  return { skin: pick(SKIN), hair: pick(HAIRS), shirt: pick(SHIRTS), pants: pick(PANTS), bald: Math.random() < 0.08 };
}

export function lookFromNpc(l: NpcLook): PedLook {
  return { skin: l.skin, hair: l.hair, shirt: l.shirt, pants: pick(PANTS), bald: l.hairStyle === 'bald' };
}

/** Position on a sidewalk loop (clockwise), with travel direction. */
export function ringPoint(r: Rect, t: number): { x: number; y: number; dx: number; dy: number } {
  const P = 2 * (r.w + r.h);
  let u = ((t % P) + P) % P;
  if (u < r.w) return { x: r.x + u, y: r.y, dx: 1, dy: 0 };
  u -= r.w;
  if (u < r.h) return { x: r.x + r.w, y: r.y + u, dx: 0, dy: 1 };
  u -= r.h;
  if (u < r.w) return { x: r.x + r.w - u, y: r.y + r.h, dx: -1, dy: 0 };
  u -= r.w;
  return { x: r.x, y: r.y + r.h - u, dx: 0, dy: -1 };
}

/** Parameter of the closest point on the loop. */
export function ringParam(r: Rect, x: number, y: number): number {
  const cx = clamp(x, r.x, r.x + r.w);
  const cy = clamp(y, r.y, r.y + r.h);
  const dl = Math.abs(cx - r.x);
  const dr = Math.abs(r.x + r.w - cx);
  const dt = Math.abs(cy - r.y);
  const db = Math.abs(r.y + r.h - cy);
  const m = Math.min(dl, dr, dt, db);
  if (m === dt) return cx - r.x;
  if (m === dr) return r.w + (cy - r.y);
  if (m === db) return r.w + r.h + (r.x + r.w - cx);
  return 2 * r.w + r.h + (r.y + r.h - cy);
}

export class PedSystem {
  readonly peds: Ped[] = [];
  private cornersCache = new Map<number, number[]>();
  /** Called whenever a pedestrian says something (the engine turns it into audible speech nearby). */
  onSay: ((ped: Ped, text: string) => void) | null = null;

  constructor(private readonly city: City) {}

  private corners(ring: number): number[] {
    let c = this.cornersCache.get(ring);
    if (!c) {
      const r = this.city.rings[ring].rect;
      c = [0, r.w, r.w + r.h, 2 * r.w + r.h];
      this.cornersCache.set(ring, c);
    }
    return c;
  }

  create(x: number, y: number, look: PedLook, fixed: boolean): Ped {
    const ped: Ped = {
      id: nextId++,
      x,
      y,
      vx: 0,
      vy: 0,
      angle: rand(0, Math.PI * 2),
      look,
      state: 'idle',
      ring: this.nearestRing(x, y),
      t: 0,
      dir: Math.random() < 0.5 ? 1 : -1,
      lateral: rand(-6, 6),
      speed: rand(34, 56),
      target: null,
      timer: 0,
      phase: rand(0, 6),
      bubble: null,
      fixed,
      icon: null,
    };
    ped.t = ringParam(this.city.rings[ped.ring].rect, x, y);
    this.peds.push(ped);
    return ped;
  }

  remove(ped: Ped): void {
    const i = this.peds.indexOf(ped);
    if (i >= 0) this.peds.splice(i, 1);
  }

  nearestRing(x: number, y: number): number {
    let best = 0;
    let bd = Infinity;
    this.city.rings.forEach((ring, i) => {
      const r = ring.rect;
      const cx = clamp(x, r.x, r.x + r.w);
      const cy = clamp(y, r.y, r.y + r.h);
      const inside = x > r.x && x < r.x + r.w && y > r.y && y < r.y + r.h;
      const d = inside ? Math.min(x - r.x, r.x + r.w - x, y - r.y, r.y + r.h - y) : Math.hypot(x - cx, y - cy);
      if (d < bd) {
        bd = d;
        best = i;
      }
    });
    return best;
  }

  /** A random sidewalk point between min and max distance from (x, y). */
  sidewalkPointNear(x: number, y: number, min: number, max: number): Vec | null {
    const near = this.city.rings.filter(({ rect: r }) => r.x <= x + max && r.x + r.w >= x - max && r.y <= y + max && r.y + r.h >= y - max);
    if (near.length === 0) return null;
    for (let k = 0; k < 30; k++) {
      const r = pick(near).rect;
      const p = ringPoint(r, Math.random() * 2 * (r.w + r.h));
      const d = Math.hypot(p.x - x, p.y - y);
      if (d >= min && d <= max) return { x: p.x, y: p.y };
    }
    return null;
  }

  say(ped: Ped, category: keyof typeof SHOUTS, now: number): void {
    if (ped.bubble && ped.bubble.until > now) return;
    this.speak(ped, pick(SHOUTS[category]), 2.4, now);
  }

  /** Shows a speech bubble and lets listeners hear it. */
  speak(ped: Ped, text: string, seconds: number, now: number): void {
    ped.bubble = { text, until: now + seconds };
    this.onSay?.(ped, text);
  }

  /** Hands a pedestrian the engine or director was holding back to the normal sidewalk walk. */
  release(p: Ped): void {
    p.fixed = false;
    p.icon = null;
    this.backToSidewalk(p);
  }

  populate(focus: Vec, now: number): void {
    for (let i = this.peds.length - 1; i >= 0; i--) {
      const p = this.peds[i];
      if (!p.fixed && Math.hypot(p.x - focus.x, p.y - focus.y) > DESPAWN) this.peds.splice(i, 1);
    }
    let budget = 3;
    while (this.peds.filter((p) => !p.fixed).length < MAX_PEDS && budget-- > 0) {
      const pt = this.sidewalkPointNear(focus.x, focus.y, SPAWN_MIN, SPAWN_MAX);
      if (!pt) break;
      const ped = this.create(pt.x, pt.y, randomLook(), false);
      ped.state = 'walk';
      ped.phase = now;
    }
  }

  /** Try to cross the road at a corner towards the neighboring block. */
  private startCrossing(p: Ped, corner: Vec): boolean {
    const options: Vec[] = [];
    const gap = ROAD_W + SIDEWALK;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const tx = corner.x + dx * gap;
      const ty = corner.y + dy * gap;
      const ring = this.city.rings.findIndex(({ rect: r }) => {
        const onX = Math.abs(tx - r.x) < 3 || Math.abs(tx - (r.x + r.w)) < 3;
        const onY = Math.abs(ty - r.y) < 3 || Math.abs(ty - (r.y + r.h)) < 3;
        const inX = tx >= r.x - 3 && tx <= r.x + r.w + 3;
        const inY = ty >= r.y - 3 && ty <= r.y + r.h + 3;
        return (onX && inY) || (onY && inX);
      });
      if (ring >= 0 && ring !== p.ring) options.push({ x: tx, y: ty });
    }
    if (options.length === 0) return false;
    p.target = pick(options);
    p.state = 'cross';
    return true;
  }

  update(dt: number, now: number, threats: { x: number; y: number; vx: number; vy: number; speed: number }[]): void {
    for (const p of this.peds) {
      if (p.bubble && p.bubble.until < now) p.bubble = null;

      if (p.state === 'walk' || p.state === 'cross' || p.state === 'return') {
        for (const c of threats) {
          if (c.speed < 110) continue;
          const dx = p.x - c.x;
          const dy = p.y - c.y;
          const d = Math.hypot(dx, dy);
          if (d > 95 || d < 1) continue;
          const fx = c.vx / c.speed;
          const fy = c.vy / c.speed;
          const ahead = dx * fx + dy * fy;
          const side = dx * -fy + dy * fx;
          if (ahead > 0 && Math.abs(side) < 34) {
            const s = side >= 0 ? 1 : -1;
            p.vx = -fy * s * 230;
            p.vy = fx * s * 230;
            p.state = 'dodge';
            p.timer = 0.38;
            if (Math.random() < 0.6) this.say(p, 'dodge', now);
            break;
          }
        }
      }

      switch (p.state) {
        case 'walk': {
          const ring = this.city.rings[p.ring].rect;
          const before = p.t;
          p.t += p.dir * p.speed * dt;
          const P = 2 * (ring.w + ring.h);
          for (const c of this.corners(p.ring)) {
            const crossed = p.dir > 0 ? before < c && p.t >= c : before > c && p.t <= c;
            const wrapped = p.dir > 0 ? before < P && p.t >= P && c === 0 : before > 0 && p.t <= 0 && c === 0;
            if ((crossed || wrapped) && Math.random() < 0.22) {
              const cp = ringPoint(ring, c);
              if (this.startCrossing(p, cp)) break;
            }
          }
          if (p.state !== 'walk') break;
          p.t = ((p.t % P) + P) % P;
          const pt = ringPoint(ring, p.t);
          const nx = pt.dy;
          const ny = -pt.dx;
          p.x = pt.x + nx * p.lateral;
          p.y = pt.y + ny * p.lateral;
          p.angle = Math.atan2(pt.dy * p.dir, pt.dx * p.dir);
          p.phase += dt * p.speed * 0.22;
          break;
        }
        case 'cross':
        case 'return':
        case 'leave': {
          const tgt = p.target!;
          const dx = tgt.x - p.x;
          const dy = tgt.y - p.y;
          const d = Math.hypot(dx, dy);
          const sp = p.state === 'leave' ? p.speed * 1.2 : p.speed * (p.state === 'cross' ? 1.25 : 1);
          if (d < 4) {
            if (p.state === 'leave') {
              p.timer = -1;
              break;
            }
            p.ring = this.nearestRing(p.x, p.y);
            p.t = ringParam(this.city.rings[p.ring].rect, p.x, p.y);
            p.state = 'walk';
            p.target = null;
            break;
          }
          p.x += (dx / d) * sp * dt;
          p.y += (dy / d) * sp * dt;
          p.angle = Math.atan2(dy, dx);
          p.phase += dt * sp * 0.22;
          break;
        }
        case 'dodge':
        case 'flee': {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.angle = Math.atan2(p.vy, p.vx);
          p.phase += dt * 14;
          p.timer -= dt;
          if (p.state === 'dodge') {
            p.vx *= Math.exp(-3 * dt);
            p.vy *= Math.exp(-3 * dt);
          }
          if (p.timer <= 0) this.backToSidewalk(p);
          break;
        }
        case 'knocked': {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.vx *= Math.exp(-4 * dt);
          p.vy *= Math.exp(-4 * dt);
          p.timer -= dt;
          if (p.timer <= 0) {
            this.say(p, 'hit', now);
            const away = Math.atan2(p.vy, p.vx) + rand(-0.5, 0.5);
            p.vx = Math.cos(away) * 160;
            p.vy = Math.sin(away) * 160;
            p.state = 'flee';
            p.timer = 2.2;
          }
          break;
        }
        case 'idle':
        case 'follow':
          break;
      }
    }
    // Remove peds that finished leaving.
    for (let i = this.peds.length - 1; i >= 0; i--) if (this.peds[i].timer === -1 && this.peds[i].state === 'leave') this.peds.splice(i, 1);
  }

  private backToSidewalk(p: Ped): void {
    const ring = this.nearestRing(p.x, p.y);
    const r = this.city.rings[ring].rect;
    const t = ringParam(r, p.x, p.y);
    const pt = ringPoint(r, t);
    p.ring = ring;
    p.t = t;
    p.target = { x: pt.x + pt.dy * p.lateral, y: pt.y - pt.dx * p.lateral };
    p.state = 'return';
  }

  knock(p: Ped, vx: number, vy: number): void {
    if (p.state === 'knocked') return;
    p.state = 'knocked';
    p.vx = vx;
    p.vy = vy;
    p.timer = 2.2;
    p.bubble = null;
  }

  scare(x: number, y: number, radius: number, now: number): void {
    for (const p of this.peds) {
      if (p.fixed || p.state === 'knocked') continue;
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < radius && d > 1) {
        if (Math.random() < 0.5) this.say(p, 'honk', now);
        p.vx = ((p.x - x) / d) * 150;
        p.vy = ((p.y - y) / d) * 150;
        p.state = 'dodge';
        p.timer = 0.3;
      }
    }
  }
}
