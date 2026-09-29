import { rand } from './math';

export type ParticleKind = 'smoke' | 'spark' | 'water' | 'dust' | 'debris' | 'confetti' | 'sparkle';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  kind: ParticleKind;
}

const MAX_PARTICLES = 500;
const MAX_SKIDS = 700;
const CONFETTI = ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93'];

export class Fx {
  readonly particles: Particle[] = [];
  /** Skid segments as flat [x1, y1, x2, y2, alpha] records. */
  readonly skids = new Float32Array(MAX_SKIDS * 5);
  skidCount = 0;
  private skidHead = 0;
  shake = 0;

  emit(kind: ParticleKind, x: number, y: number, n: number, spread = 1, color?: string): void {
    for (let i = 0; i < n && this.particles.length < MAX_PARTICLES; i++) {
      const a = rand(0, Math.PI * 2);
      const s = rand(20, 90) * spread;
      const base: Particle = { x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0, max: 0.6, size: 3, color: '#fff', kind };
      switch (kind) {
        case 'smoke':
          Object.assign(base, { max: rand(0.8, 1.6), size: rand(6, 11), color: color ?? '#9aa0a6', vx: base.vx * 0.3, vy: base.vy * 0.3 });
          break;
        case 'spark':
          Object.assign(base, { max: rand(0.2, 0.45), size: rand(1.5, 2.5), color: color ?? '#ffd166' });
          break;
        case 'water':
          Object.assign(base, { max: rand(0.5, 0.9), size: rand(2, 4), color: '#bfe6ff', vx: base.vx * 0.5, vy: base.vy * 0.5 });
          break;
        case 'dust':
          Object.assign(base, { max: rand(0.4, 0.8), size: rand(4, 7), color: color ?? '#d8cfbf', vx: base.vx * 0.4, vy: base.vy * 0.4 });
          break;
        case 'debris':
          Object.assign(base, { max: rand(0.5, 1), size: rand(2, 4), color: color ?? '#555' });
          break;
        case 'confetti':
          Object.assign(base, { max: rand(0.8, 1.4), size: rand(2.5, 4), color: CONFETTI[i % CONFETTI.length], vx: base.vx * 2, vy: base.vy * 2 });
          break;
        case 'sparkle':
          Object.assign(base, { max: rand(0.4, 0.8), size: rand(2, 3.5), color: '#ffe066' });
          break;
      }
      this.particles.push(base);
    }
  }

  addSkid(x1: number, y1: number, x2: number, y2: number, alpha: number): void {
    const o = this.skidHead * 5;
    this.skids[o] = x1;
    this.skids[o + 1] = y1;
    this.skids[o + 2] = x2;
    this.skids[o + 3] = y2;
    this.skids[o + 4] = alpha;
    this.skidHead = (this.skidHead + 1) % MAX_SKIDS;
    this.skidCount = Math.min(MAX_SKIDS, this.skidCount + 1);
  }

  update(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      if (p.life >= p.max) {
        this.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const drag = p.kind === 'smoke' ? 1.5 : 3;
      p.vx *= Math.exp(-drag * dt);
      p.vy *= Math.exp(-drag * dt);
      if (p.kind === 'smoke') p.size += dt * 10;
    }
    this.shake = Math.max(0, this.shake - dt * 30);
  }
}
