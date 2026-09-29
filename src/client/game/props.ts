import type { City, PropKind } from './city/generate';

export interface Prop {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  spin: number;
  kind: PropKind;
  r: number;
  knocked: boolean;
  spray: number;
  homeIndex: number;
}

const RADIUS: Record<PropKind, number> = { hydrant: 5, trash: 7, bench: 9, mailbox: 6, cone: 5 };
const ACTIVE = 950;
const RELEASE = 1300;

/** Knockable street furniture. Only props near the player exist as simulated objects. */
export class PropSystem {
  readonly active: Prop[] = [];
  private readonly live = new Set<number>();

  constructor(private readonly city: City) {}

  update(dt: number, fx: number, fy: number): void {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const p = this.active[i];
      if (Math.hypot(p.x - fx, p.y - fy) > RELEASE) {
        this.active.splice(i, 1);
        this.live.delete(p.homeIndex);
        continue;
      }
      if (p.knocked) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.angle += p.spin * dt;
        p.vx *= Math.exp(-2.5 * dt);
        p.vy *= Math.exp(-2.5 * dt);
        p.spin *= Math.exp(-2 * dt);
      }
      if (p.spray > 0) p.spray -= dt;
    }
    this.city.props.forEach((s, idx) => {
      if (this.live.has(idx)) return;
      if (Math.abs(s.x - fx) > ACTIVE || Math.abs(s.y - fy) > ACTIVE) return;
      this.live.add(idx);
      this.active.push({ x: s.x, y: s.y, vx: 0, vy: 0, angle: 0, spin: 0, kind: s.kind, r: RADIUS[s.kind], knocked: false, spray: 0, homeIndex: idx });
    });
  }

  /** Called on car contact; returns true if the prop was newly knocked over. */
  hit(p: Prop, vx: number, vy: number): boolean {
    const first = !p.knocked;
    p.knocked = true;
    p.vx = vx * 1.15 + (Math.random() - 0.5) * 60;
    p.vy = vy * 1.15 + (Math.random() - 0.5) * 60;
    p.spin = (Math.random() - 0.5) * 16;
    if (first && p.kind === 'hydrant') p.spray = 9;
    return first;
  }
}
