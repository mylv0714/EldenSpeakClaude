import type { City } from './city/generate';
import { LANE_OFFSET } from './city/layout';
import { laneOf } from './city/roads';
import { angleDiff, clamp, pick, rand, type Vec } from './math';
import type { Body } from './physics';
import { CAR_MODELS, type CarModel, Vehicle } from './vehicle';

const TARGET_CARS = 22;
const SPAWN_MIN = 800;
const SPAWN_MAX = 1500;
const DESPAWN = 1950;

function trafficModel(allowPolice: boolean): CarModel {
  const r = Math.random();
  if (allowPolice && r < 0.08) return CAR_MODELS.police;
  if (r < 0.13) return CAR_MODELS.taxi;
  if (r < 0.18) return CAR_MODELS.bus;
  if (r < 0.25) return CAR_MODELS.pickup;
  if (r < 0.38) return CAR_MODELS.suv;
  if (r < 0.43) return CAR_MODELS.sports;
  if (r < 0.7) return CAR_MODELS.sedan;
  return CAR_MODELS.compact;
}

export class TrafficSystem {
  constructor(
    private readonly city: City,
    private readonly vehicles: Vehicle[],
  ) {}

  /** Keeps a steady number of AI cars around the player. */
  populate(focus: Vec, allowPolice: boolean): void {
    for (let i = this.vehicles.length - 1; i >= 0; i--) {
      const v = this.vehicles[i];
      if ((v.role === 'traffic' || (v.role === 'police' && !v.pursuit)) && v.driver === 'ai') {
        if (Math.hypot(v.x - focus.x, v.y - focus.y) > DESPAWN) this.vehicles.splice(i, 1);
      }
    }
    const count = this.vehicles.filter((v) => (v.role === 'traffic' || v.role === 'police') && v.driver === 'ai').length;
    for (let k = 0; k < 2 && count + k < TARGET_CARS; k++) this.spawnNear(focus, SPAWN_MIN, SPAWN_MAX, trafficModel(allowPolice));
  }

  spawnNear(focus: Vec, min: number, max: number, model: CarModel): Vehicle | null {
    const g = this.city.roads;
    for (let attempt = 0; attempt < 12; attempt++) {
      const seg = pick(g.segments);
      const forward = Math.random() < 0.5;
      const a = g.node(forward ? seg.a : seg.b);
      const b = g.node(forward ? seg.b : seg.a);
      const lane = laneOf(a, b);
      const t = rand(0.1, 0.9);
      const x = lane.sx + (lane.ex - lane.sx) * t;
      const y = lane.sy + (lane.ey - lane.sy) * t;
      const d = Math.hypot(x - focus.x, y - focus.y);
      if (d < min || d > max) continue;
      if (this.vehicles.some((v) => Math.abs(v.x - x) < 90 && Math.abs(v.y - y) < 90)) continue;
      const angle = Math.atan2(lane.dy, lane.dx);
      const v = new Vehicle(model, x, y, angle, model.id === 'police' ? 'police' : 'traffic');
      const cruise = model.id === 'bus' ? 120 : rand(150, 215);
      v.brain = { from: a.id, to: b.id, waypoints: [{ x: lane.ex, y: lane.ey }], cruise, blocked: 0, ignoreUntil: 0, stopped: false };
      v.vx = Math.cos(angle) * cruise * 0.8;
      v.vy = Math.sin(angle) * cruise * 0.8;
      this.vehicles.push(v);
      return v;
    }
    return null;
  }

  /** Gives a car (e.g. a police car after a chase) a fresh route from the closest node. */
  assignBrain(v: Vehicle): void {
    const g = this.city.roads;
    const from = g.nearestNode(v.x, v.y);
    const to = g.node(pick(from.links));
    const lane = laneOf(from, to);
    v.brain = { from: from.id, to: to.id, waypoints: [{ x: lane.sx, y: lane.sy }, { x: lane.ex, y: lane.ey }], cruise: rand(150, 200), blocked: 0, ignoreUntil: 0, stopped: false };
  }

  private extend(v: Vehicle): void {
    const b = v.brain!;
    const g = this.city.roads;
    const from = g.node(b.from);
    const to = g.node(b.to);
    const options = to.links.filter((n) => n !== b.from);
    const next = options.length > 0 ? pick(options) : b.from;
    const cur = laneOf(from, to);
    const nxt = laneOf(to, g.node(next));
    const straight = cur.dx * nxt.dx + cur.dy * nxt.dy > 0.9;
    if (!straight) {
      b.waypoints.push({ x: to.x + (cur.rx + nxt.rx) * LANE_OFFSET, y: to.y + (cur.ry + nxt.ry) * LANE_OFFSET, slow: true });
    }
    b.waypoints.push({ x: nxt.sx, y: nxt.sy }, { x: nxt.ex, y: nxt.ey });
    b.from = b.to;
    b.to = next;
  }

  drive(v: Vehicle, dt: number, now: number, nearby: Body[]): void {
    const b = v.brain!;
    v.handbrake = false;
    if (b.stopped || v.dead) {
      v.steer = 0;
      v.throttle = v.forwardSpeed > 5 ? -1 : 0;
      return;
    }
    if (b.waypoints.length <= 2) this.extend(v);
    let wp = b.waypoints[0];
    if (Math.hypot(wp.x - v.x, wp.y - v.y) < 22) {
      b.waypoints.shift();
      wp = b.waypoints[0];
    }
    const desired = Math.atan2(wp.y - v.y, wp.x - v.x);
    const diff = angleDiff(desired, v.angle);
    v.steer = clamp(diff * 2.6, -1, 1);

    let target = b.cruise;
    const next = b.waypoints[1];
    if (wp.slow || (next?.slow && Math.hypot(wp.x - v.x, wp.y - v.y) < 70)) target = Math.min(target, 85);
    if (Math.abs(diff) > 0.6) target = Math.min(target, 70);

    if (now > b.ignoreUntil) {
      const fx = Math.cos(v.angle);
      const fy = Math.sin(v.angle);
      const look = 55 + v.speed * 0.9;
      let nearest = Infinity;
      for (const o of nearby) {
        if (o.ref === v) continue;
        const rx = o.x - v.x;
        const ry = o.y - v.y;
        const along = rx * fx + ry * fy;
        if (along <= 0 || along > look) continue;
        const lat = Math.abs(-rx * fy + ry * fx);
        if (lat > 18 + o.r) continue;
        nearest = Math.min(nearest, along - o.r);
      }
      if (nearest < Infinity) target = Math.min(target, Math.max(0, (nearest - v.model.len / 2 - 10) * 2.2));
    }

    if (target < 5 && v.speed < 8) {
      b.blocked += dt;
      if (b.blocked > 3.5) {
        b.ignoreUntil = now + 1.4;
        b.blocked = 0;
        v.hornUntil = now + 0.5;
      }
    } else b.blocked = 0;

    const fwd = v.forwardSpeed;
    if (fwd < target - 10) v.throttle = clamp((target - fwd) / 60, 0.2, 1);
    else if (fwd > target + 15) v.throttle = -clamp((fwd - target) / 80, 0.3, 1);
    else v.throttle = 0.05;
  }
}
