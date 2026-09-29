import type { Offense } from '@shared/types';
import type { City } from './city/generate';
import { angleDiff, clamp, type Vec } from './math';
import type { TrafficSystem } from './traffic';
import { CAR_MODELS, type Vehicle } from './vehicle';

const SEVERITY: Record<Offense, number> = { speeding: 1, reckless: 1, hit_and_run: 2, hit_pedestrian: 3, hit_police: 3 };

export interface Suspect {
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;
  onFoot: boolean;
}

/** GTA-style wanted level (0-3 stars) with road-aware pursuit and a "pulled over" bust. */
export class WantedSystem {
  level = 0;
  offense: Offense = 'speeding';
  private lastIncrease = -99;
  private unseen = 0;
  private bust = 0;

  constructor(
    private readonly city: City,
    private readonly vehicles: Vehicle[],
    private readonly traffic: TrafficSystem,
  ) {}

  /** Returns true if the wanted level went up. The most serious offense is what the officer brings up. */
  report(offense: Offense, now: number): boolean {
    if (now - this.lastIncrease < 4 || this.level >= 3) return false;
    if (this.level === 0 || SEVERITY[offense] >= SEVERITY[this.offense]) this.offense = offense;
    this.level++;
    this.lastIncrease = now;
    this.unseen = 0;
    return true;
  }

  clear(): void {
    this.level = 0;
    this.bust = 0;
    this.unseen = 0;
    for (const v of this.vehicles) {
      if (v.pursuit) {
        v.pursuit = null;
        v.siren = false;
        this.traffic.assignBrain(v);
      }
    }
  }

  get pursuers(): Vehicle[] {
    return this.vehicles.filter((v) => v.pursuit);
  }

  /** Returns 'busted' when the player is caught, 'lost' when they escaped a star. */
  update(dt: number, s: Suspect): 'busted' | 'lost' | null {
    if (this.level === 0) return null;
    let pursuers = this.pursuers;

    // Recruit or spawn police until there is one per star.
    while (pursuers.length < this.level) {
      const candidate = this.vehicles
        .filter((v) => v.role === 'police' && !v.pursuit && !v.dead && v.driver === 'ai')
        .sort((a, b) => Math.hypot(a.x - s.x, a.y - s.y) - Math.hypot(b.x - s.x, b.y - s.y))[0];
      const car = candidate && Math.hypot(candidate.x - s.x, candidate.y - s.y) < 1600 ? candidate : this.traffic.spawnNear(s, 700, 1200, CAR_MODELS.police);
      if (!car) break;
      car.brain = null;
      car.pursuit = { path: [], repath: 0, stuck: 0, reverse: 0 };
      car.siren = true;
      pursuers = this.pursuers;
    }

    let nearest = Infinity;
    for (const v of pursuers) {
      nearest = Math.min(nearest, Math.hypot(v.x - s.x, v.y - s.y));
      this.drive(v, dt, s);
    }

    if (nearest > 1000) {
      this.unseen += dt;
      if (this.unseen > 10) {
        this.unseen = 0;
        this.level--;
        if (this.level === 0) this.clear();
        else {
          for (const v of this.pursuers.slice(this.level)) {
            v.pursuit = null;
            v.siren = false;
            this.traffic.assignBrain(v);
          }
        }
        return 'lost';
      }
    } else this.unseen = 0;

    const caught = s.onFoot ? nearest < 70 : nearest < 95 && s.speed < 40;
    this.bust = caught ? this.bust + dt : 0;
    if (this.bust > (s.onFoot ? 0.8 : 1.3)) {
      this.bust = 0;
      return 'busted';
    }
    return null;
  }

  private drive(v: Vehicle, dt: number, s: Suspect): void {
    const p = v.pursuit!;
    const dist = Math.hypot(s.x - v.x, s.y - v.y);
    let goal: Vec;
    if (dist > 380) {
      p.repath -= dt;
      if (p.repath <= 0 || p.path.length === 0) {
        const g = this.city.roads;
        p.path = g.path(g.nearestNode(v.x, v.y).id, g.nearestNode(s.x, s.y).id).map((id) => ({ x: g.node(id).x, y: g.node(id).y }));
        p.repath = 1.2;
      }
      while (p.path.length > 0 && Math.hypot(p.path[0].x - v.x, p.path[0].y - v.y) < 70) p.path.shift();
      goal = p.path[0] ?? s;
    } else goal = { x: s.x + s.vx * 0.35, y: s.y + s.vy * 0.35 };

    const diff = angleDiff(Math.atan2(goal.y - v.y, goal.x - v.x), v.angle);
    if (p.reverse > 0) {
      p.reverse -= dt;
      v.throttle = -1;
      v.steer = -Math.sign(diff) || 1;
      v.handbrake = false;
      return;
    }
    v.steer = clamp(diff * 3, -1, 1);
    v.throttle = 1;
    v.handbrake = Math.abs(diff) > 1 && v.speed > 180;
    if (dist < 130) v.throttle = s.speed < 50 ? -0.4 : 0.7;

    if (v.speed < 25 && v.throttle > 0) {
      p.stuck += dt;
      if (p.stuck > 1.1) {
        p.reverse = 0.9;
        p.stuck = 0;
      }
    } else p.stuck = 0;
  }
}
