import type { CarModelId } from '@shared/types';

export type BodyStyle = 'compact' | 'sedan' | 'suv' | 'sports' | 'van' | 'bus' | 'pickup';

export interface CarModel {
  id: CarModelId;
  name: string;
  style: BodyStyle;
  len: number;
  wid: number;
  maxSpeed: number;
  accel: number;
  brake: number;
  /** Lateral grip (higher = less sliding). */
  grip: number;
  /** Max yaw rate in rad/s. */
  steer: number;
  mass: number;
  /** Dealer price; 0 = not for sale. */
  price: number;
  colors: readonly string[];
}

const CIVIL = ['#d64541', '#2c82c9', '#f5f5f5', '#2d2d2d', '#8e9aa6', '#27ae60', '#f39c12', '#8e44ad', '#16a085', '#c0392b', '#34495e', '#bdc3c7'];

const M = (m: CarModel): CarModel => m;

export const CAR_MODELS: Record<CarModelId, CarModel> = {
  compact: M({ id: 'compact', name: 'Bolt Mini', style: 'compact', len: 40, wid: 20, maxSpeed: 330, accel: 250, brake: 520, grip: 7.5, steer: 2.9, mass: 0.9, price: 2500, colors: CIVIL }),
  sedan: M({ id: 'sedan', name: 'Vista Sedan', style: 'sedan', len: 46, wid: 21, maxSpeed: 370, accel: 270, brake: 560, grip: 7.8, steer: 2.7, mass: 1, price: 5000, colors: CIVIL }),
  suv: M({ id: 'suv', name: 'Ranger SUV', style: 'suv', len: 50, wid: 24, maxSpeed: 350, accel: 260, brake: 540, grip: 7.2, steer: 2.5, mass: 1.35, price: 8000, colors: CIVIL }),
  sports: M({ id: 'sports', name: 'Stinger GT', style: 'sports', len: 46, wid: 21, maxSpeed: 480, accel: 400, brake: 660, grip: 8.6, steer: 3.0, mass: 0.95, price: 15000, colors: ['#e31b23', '#f5c400', '#111111', '#1f8ef1'] }),
  pickup: M({ id: 'pickup', name: 'Mule Pickup', style: 'pickup', len: 52, wid: 23, maxSpeed: 330, accel: 240, brake: 520, grip: 7, steer: 2.4, mass: 1.4, price: 0, colors: CIVIL }),
  van: M({ id: 'van', name: "Tony's Delivery Van", style: 'van', len: 54, wid: 25, maxSpeed: 300, accel: 220, brake: 500, grip: 6.9, steer: 2.4, mass: 1.5, price: 0, colors: ['#f5f5f5'] }),
  taxi: M({ id: 'taxi', name: 'Elden Cab', style: 'sedan', len: 46, wid: 21, maxSpeed: 380, accel: 290, brake: 560, grip: 7.9, steer: 2.7, mass: 1, price: 0, colors: ['#f4c20d'] }),
  police: M({ id: 'police', name: 'Police Interceptor', style: 'sedan', len: 47, wid: 21, maxSpeed: 440, accel: 360, brake: 620, grip: 8.4, steer: 2.9, mass: 1.1, price: 0, colors: ['#111827'] }),
  bus: M({ id: 'bus', name: 'City Bus', style: 'bus', len: 96, wid: 28, maxSpeed: 240, accel: 140, brake: 400, grip: 6.5, steer: 1.7, mass: 4, price: 0, colors: ['#2e86c1'] }),
  comet: M({ id: 'comet', name: 'The Comet', style: 'compact', len: 40, wid: 20, maxSpeed: 340, accel: 260, brake: 520, grip: 7.6, steer: 2.9, mass: 0.9, price: 0, colors: ['#e67e22'] }),
  comet_gt: M({ id: 'comet_gt', name: 'Comet GT', style: 'sports', len: 44, wid: 21, maxSpeed: 470, accel: 400, brake: 650, grip: 8.8, steer: 3.05, mass: 0.95, price: 0, colors: ['#ff7b00'] }),
};

export const DEALER_STOCK: CarModelId[] = ['compact', 'sedan', 'suv', 'sports'];

export type VehicleRole = 'traffic' | 'parked' | 'police' | 'owned' | 'job';

export interface TrafficBrain {
  from: number;
  to: number;
  /** Upcoming points; `slow` marks turn corners. */
  waypoints: { x: number; y: number; slow?: boolean }[];
  cruise: number;
  blocked: number;
  ignoreUntil: number;
  stopped: boolean;
}

export interface PursuitBrain {
  path: { x: number; y: number }[];
  repath: number;
  stuck: number;
  reverse: number;
}

export interface Circle {
  x: number;
  y: number;
  r: number;
}

let nextId = 1;

export class Vehicle {
  readonly id = nextId++;
  vx = 0;
  vy = 0;
  angVel = 0;
  throttle = 0;
  steer = 0;
  handbrake = false;
  braking = false;
  slip = 0;
  health = 100;
  /** City Share cars (and the player's own) can be driven. */
  drivable: boolean;
  driver: 'player' | 'ai' | null;
  brain: TrafficBrain | null = null;
  pursuit: PursuitBrain | null = null;
  siren = false;
  hornUntil = 0;
  /** Seconds this car has been untouched (used to despawn cleanly). */
  idle = 0;
  owned?: CarModelId;
  readonly circleCache: Circle[] = [
    { x: 0, y: 0, r: 0 },
    { x: 0, y: 0, r: 0 },
    { x: 0, y: 0, r: 0 },
  ];

  constructor(
    public model: CarModel,
    public x: number,
    public y: number,
    public angle: number,
    public role: VehicleRole,
    public color: string = model.colors[Math.floor(Math.random() * model.colors.length)],
  ) {
    this.drivable = role === 'parked' || role === 'owned' || role === 'job';
    this.driver = role === 'traffic' || role === 'police' ? 'ai' : null;
  }

  get speed(): number {
    return Math.hypot(this.vx, this.vy);
  }

  get forwardSpeed(): number {
    return this.vx * Math.cos(this.angle) + this.vy * Math.sin(this.angle);
  }

  get dead(): boolean {
    return this.health <= 0;
  }

  /** Three circles along the body approximate the car for collisions. */
  circles(): Circle[] {
    const r = this.model.wid / 2;
    const off = this.model.len / 2 - r;
    const c = Math.cos(this.angle);
    const s = Math.sin(this.angle);
    const cc = this.circleCache;
    cc[0].x = this.x + c * off;
    cc[0].y = this.y + s * off;
    cc[1].x = this.x;
    cc[1].y = this.y;
    cc[2].x = this.x - c * off;
    cc[2].y = this.y - s * off;
    cc[0].r = cc[1].r = cc[2].r = r;
    return cc;
  }

  /** Arcade car model: forward/lateral velocity split, grip decay and a handbrake for drifts. */
  update(dt: number, surface: number): void {
    const m = this.model;
    const c = Math.cos(this.angle);
    const s = Math.sin(this.angle);
    let vF = this.vx * c + this.vy * s;
    let vR = -this.vx * s + this.vy * c;
    const alive = this.health > 0;
    const max = m.maxSpeed * surface;
    const t = alive ? this.throttle : 0;

    this.braking = false;
    if (t > 0) {
      if (vF < -10) {
        vF += m.brake * t * dt;
        this.braking = true;
      } else if (vF < max) vF += m.accel * t * dt * (1 - Math.max(0, vF) / (max * 1.12));
    } else if (t < 0) {
      if (vF > 10) {
        vF -= m.brake * -t * dt;
        this.braking = true;
      } else if (vF > -max * 0.35) vF += m.accel * 0.7 * t * dt;
    }
    vF -= vF * (t === 0 ? 0.85 : 0.22) * dt;
    if (vF > max * 1.05) vF -= (vF - max) * 3 * dt;
    if (this.handbrake) vF -= vF * 1.5 * dt;
    if (t === 0 && Math.abs(vF) < 3) vF = 0;

    const speedFactor = Math.min(1, Math.abs(vF) / 110) * (1 - Math.min(0.4, Math.max(0, Math.abs(vF) - 250) / 600));
    const yaw = this.steer * m.steer * speedFactor * (vF < 0 ? -1 : 1) * (this.handbrake ? 1.5 : 1);
    this.angVel += (yaw - this.angVel) * Math.min(1, dt * 10);
    this.angle += this.angVel * dt;

    const grip = this.handbrake ? 1.3 : m.grip * (surface < 0.9 ? 0.7 : 1);
    vR *= Math.exp(-grip * dt);
    this.slip = Math.abs(vR);

    const c2 = Math.cos(this.angle);
    const s2 = Math.sin(this.angle);
    this.vx = c2 * vF - s2 * vR;
    this.vy = s2 * vF + c2 * vR;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }
}
