// Director: spawns street encounters and runs the taxi / pizza jobs. It decides *when* to talk;
// the conversation itself happens in the UI and the outcome comes back through resolve().
import { getNpc } from '@shared/content/npcs';
import { INTERVIEW_TOPICS, PIZZA_MENU, PLACES, type Place } from '@shared/content/city';
import { getScenario } from '@shared/content/scenarios';
import type { JobKind, Offense, Outcome, ScenarioContext } from '@shared/types';
import type { ConversationLaunch } from '../conversation/types';
import type { City } from './city/generate';
import { describeRoute, planRoute } from './city/roads';
import { hash2, pick, rand, type Vec } from './math';
import { lookFromNpc, type Ped, type PedSystem } from './peds';
import type { TrafficSystem } from './traffic';
import type { Vehicle } from './vehicle';

export type EncounterKind = 'tourist' | 'interview' | 'scam' | 'accident' | 'passenger' | 'customer';

export interface Encounter {
  id: number;
  kind: EncounterKind;
  ped: Ped;
  scenarioId: string;
  npcId: string;
  context?: ScenarioContext;
  routePreview?: Vec[];
  expires: number;
  car?: Vehicle;
  talking: boolean;
}

export interface JobTarget {
  point: Vec;
  label: string;
  placeId?: string;
}

export interface Job {
  kind: JobKind;
  vehicle: Vehicle;
  phase: 'seek' | 'deliver' | 'door';
  passenger: Encounter | null;
  dest: JobTarget | null;
  deadline: number;
  fare: number;
  order: string[];
  earned: number;
  count: number;
  nextSpawnAt: number;
  /** Taxi: this passenger gives directions out loud instead of the GPS. */
  guide: boolean;
}

export interface DirectorHost {
  city: City;
  peds: PedSystem;
  traffic: TrafficSystem;
  readonly now: number;
  readonly player: { x: number; y: number; vehicle: Vehicle | null };
  readonly wantedLevel: number;
  districtAt(x: number, y: number): string;
  talk(launch: ConversationLaunch): void;
  toast(text: string, tone: 'info' | 'good' | 'bad' | 'cash'): void;
  setJobTarget(target: JobTarget | null): void;
  earn(amount: number, reason: string): void;
  /** Job pay multiplier from the player's rank ("promotion"). */
  payRate(): number;
  fine(amount: number, reason: string): void;
  report(offense: Offense): void;
  spawnJobVehicle(kind: JobKind): Vehicle;
  onJobEnded(job: Job): void;
  /** Taxi passenger starts giving spoken directions (the GPS goes quiet). */
  startGuide(npcId: string): void;
  /** Stops the spoken directions; returns how the ride went, or null if there was no guide. */
  finishGuide(): { wrong: number; asks: number } | null;
  tr(ko: string, en: string): string;
}

let nextId = 1;

export class Director {
  readonly encounters: Encounter[] = [];
  job: Job | null = null;
  private nextEventAt = 25;
  private accidentCooldown = 0;

  constructor(private readonly h: DirectorHost) {}

  // ── Street encounters ────────────────────────────────────────────────

  private spawnEncounter(kind: EncounterKind, scenarioId: string, at: Vec, icon: string, bubble: string, extra: Partial<Encounter> = {}): Encounter {
    const scenario = getScenario(scenarioId);
    const npcId = scenario.npcId ?? pick(scenario.npcPool!);
    const ped = this.h.peds.create(at.x, at.y, lookFromNpc(getNpc(npcId).look), true);
    ped.state = 'idle';
    ped.icon = icon;
    this.h.peds.speak(ped, bubble, 4, this.h.now);
    const e: Encounter = { id: nextId++, kind, ped, scenarioId, npcId, expires: this.h.now + 150, talking: false, ...extra };
    this.encounters.push(e);
    return e;
  }

  private maybeSpawnStreetEvent(): void {
    const h = this.h;
    if (h.now < this.nextEventAt || this.job || h.wantedLevel > 0) return;
    if (this.encounters.some((e) => e.kind === 'tourist' || e.kind === 'interview' || e.kind === 'scam')) return;
    const at = h.peds.sidewalkPointNear(h.player.x, h.player.y, 240, 480);
    if (!at) {
      this.nextEventAt = h.now + 3;
      return;
    }
    this.nextEventAt = h.now + rand(55, 95);
    const district = h.districtAt(at.x, at.y);
    const roll = Math.random();
    if (roll < 0.3 && (district === 'downtown' || district === 'commercial')) {
      this.spawnEncounter('interview', 'street_interview', at, '🎤', 'Hi! Got a minute for ETV News?', {
        context: { topicId: Math.floor(Math.random() * INTERVIEW_TOPICS.length) },
      });
    } else if (roll < 0.5) {
      this.spawnEncounter('scam', 'scam_artist', at, '💰', 'Psst! Hey, friend!');
    } else {
      this.spawnEncounter('tourist', 'tourist_directions', at, '❓', 'Excuse me! Can you help me?');
    }
  }

  /** Builds the runtime context (route etc.) right before a conversation starts. */
  private prepare(e: Encounter): ConversationLaunch {
    if (e.kind === 'tourist') {
      const here = { x: e.ped.x, y: e.ped.y };
      const candidates = PLACES.filter((p) => {
        const site = this.h.city.places.get(p.id);
        if (!site) return false;
        const d = Math.hypot(site.door.x - here.x, site.door.y - here.y);
        return d > 700 && d < 2400;
      });
      const place = pick(candidates.length > 0 ? candidates : PLACES);
      const site = this.h.city.places.get(place.id)!;
      const route = planRoute(this.h.city.roads, here, site.door);
      const roads = this.h.city.roads;
      e.context = { destinationId: place.id, route: describeRoute(roads, route) };
      e.routePreview = [here, ...route.nodes.map((id) => ({ x: roads.node(id).x, y: roads.node(id).y })), route.roadPoint, site.door];
    }
    return {
      scenarioId: e.scenarioId,
      npcId: e.npcId,
      context: e.context,
      routePreview: e.routePreview,
      origin: e.kind === 'passenger' || e.kind === 'customer' ? { kind: 'job', job: this.job!.kind, encounterId: e.id } : { kind: 'encounter', encounterId: e.id },
    };
  }

  talkTo(e: Encounter): void {
    e.talking = true;
    e.ped.bubble = null;
    const p = this.h.player;
    e.ped.angle = Math.atan2(p.y - e.ped.y, p.x - e.ped.x);
    this.h.talk(this.prepare(e));
  }

  /** Nearest encounter the player can talk to right now. */
  talkable(): Encounter | null {
    const p = this.h.player;
    let best: Encounter | null = null;
    let bd = Infinity;
    for (const e of this.encounters) {
      if (e.talking || e.kind === 'passenger') continue;
      const reach = p.vehicle ? (e.kind === 'accident' && p.vehicle.speed < 40 ? 130 : 0) : 62;
      const d = Math.hypot(e.ped.x - p.x, e.ped.y - p.y);
      if (d < reach && d < bd) {
        bd = d;
        best = e;
      }
    }
    return best;
  }

  /** Player car hit an AI car hard: the other driver gets out, angry. */
  onCrash(other: Vehicle, impact: number): void {
    if (this.h.now < this.accidentCooldown || this.job || this.h.wantedLevel > 0 || other.role !== 'traffic' || impact < 130) return;
    if (this.encounters.some((e) => e.kind === 'accident')) return;
    this.accidentCooldown = this.h.now + 90;
    if (other.brain) other.brain.stopped = true;
    const side = { x: other.x - Math.sin(other.angle) * 30, y: other.y + Math.cos(other.angle) * 30 };
    const e = this.spawnEncounter('accident', 'fender_bender', side, '❗', 'Hey!! What was that?!', {
      car: other,
      context: { impact: 'rear' },
    });
    e.expires = this.h.now + 60;
  }

  // ── Jobs ─────────────────────────────────────────────────────────────

  startJob(kind: JobKind): void {
    this.endJob(false);
    const vehicle = this.h.spawnJobVehicle(kind);
    this.job = { kind, vehicle, phase: 'seek', passenger: null, dest: null, deadline: 0, fare: 0, order: [], earned: 0, count: 0, nextSpawnAt: this.h.now + 2, guide: false };
    this.h.toast(kind === 'taxi' ? this.h.tr('택시 근무 시작! 🙋 손님을 태우세요.', 'Taxi shift started! Pick up passengers 🙋') : this.h.tr('배달 시작! 🍕 목적지로 가세요.', 'Delivery shift started! 🍕'), 'info');
  }

  endJob(announce = true): void {
    const job = this.job;
    if (!job) return;
    if (job.passenger) this.removeEncounter(job.passenger, true);
    this.h.finishGuide();
    this.job = null;
    this.h.setJobTarget(null);
    if (announce) this.h.toast(this.h.tr(`근무 종료 · 오늘 번 돈 $${job.earned}`, `Shift over · earned $${job.earned}`), 'info');
    this.h.onJobEnded(job);
  }

  /** Pays one finished ride or delivery, raised by the rank promotion multiplier. */
  private payJob(job: Job, base: number, reason: string): void {
    const rate = this.h.payRate();
    const pay = Math.round(base * rate);
    job.earned += pay;
    job.count++;
    this.h.earn(pay, rate > 1 ? `${reason} · ${this.h.tr(`승진 ×${rate}`, `promotion ×${rate}`)}` : reason);
  }

  private nextJobLeg(): void {
    const job = this.job!;
    const h = this.h;
    if (job.kind === 'taxi') {
      const at = h.peds.sidewalkPointNear(h.player.x, h.player.y, 450, 1000);
      if (!at) {
        job.nextSpawnAt = h.now + 1;
        return;
      }
      const e = this.spawnEncounter('passenger', 'taxi_passenger', at, '🙋', 'Taxi!');
      e.expires = Infinity;
      job.passenger = e;
      job.phase = 'seek';
      h.setJobTarget({ point: at, label: h.tr('손님 태우기', 'Pick up passenger') });
    } else {
      const doors = h.city.houseDoors.filter((d) => {
        const dist = Math.hypot(d.x - h.player.x, d.y - h.player.y);
        return dist > 800 && dist < 2600;
      });
      const door = pick(doors.length > 0 ? doors : h.city.houseDoors);
      job.order = [pick(PIZZA_MENU), ...(Math.random() < 0.6 ? [pick(PIZZA_MENU)] : [])].filter((v, i, a) => a.indexOf(v) === i);
      const route = planRoute(h.city.roads, h.player, door);
      const length = h.city.roads.pathLength(route.nodes) + 300;
      job.deadline = h.now + length / 190 + 25;
      job.dest = { point: door, label: this.address(door) };
      job.phase = 'deliver';
      h.setJobTarget(job.dest);
    }
  }

  private address(p: Vec): string {
    const road = this.h.city.roads.nearestRoadPoint(p.x, p.y);
    return `${10 + Math.floor(hash2(p.x, p.y) * 90) * 2} ${road.seg.name}`;
  }

  /** Job interaction available at the player's position (pizza doorbell). */
  jobDoorReady(): boolean {
    const job = this.job;
    if (!job || job.kind !== 'pizza' || job.phase !== 'deliver' || !job.dest || this.h.player.vehicle) return false;
    return Math.hypot(job.dest.point.x - this.h.player.x, job.dest.point.y - this.h.player.y) < 38;
  }

  ringDoorbell(): void {
    const job = this.job!;
    const late = Math.max(0, this.h.now - job.deadline);
    const e = this.spawnEncounter('customer', 'pizza_customer', job.dest!.point, '🍕', 'Coming!', {
      context: { order: job.order, minutesLate: Math.round(late / 4) },
    });
    e.expires = Infinity;
    job.phase = 'door';
    this.talkTo(e);
  }

  private updateJob(): void {
    const job = this.job!;
    const h = this.h;
    const p = h.player;
    if (job.vehicle.dead) {
      h.toast(h.tr('차량이 망가져 근무가 끝났어요.', 'Your vehicle is wrecked. Shift over.'), 'bad');
      this.endJob();
      return;
    }
    const inJobCar = p.vehicle === job.vehicle;
    const awayFromCar = !p.vehicle && Math.hypot(job.vehicle.x - p.x, job.vehicle.y - p.y) > 450;
    if ((p.vehicle && !inJobCar) || awayFromCar) {
      this.endJob();
      return;
    }
    if (job.phase === 'seek' && !job.passenger && job.kind === 'taxi' && h.now > job.nextSpawnAt) this.nextJobLeg();
    if (job.kind === 'pizza' && job.phase === 'seek' && h.now > job.nextSpawnAt) this.nextJobLeg();

    if (job.kind === 'taxi' && job.phase === 'seek' && job.passenger && inJobCar && !job.passenger.talking) {
      const e = job.passenger;
      if (Math.hypot(e.ped.x - p.x, e.ped.y - p.y) < 95 && job.vehicle.speed < 30) {
        const place = this.pickDestination();
        const site = h.city.places.get(place.id)!;
        const route = planRoute(h.city.roads, p, site.door);
        const length = h.city.roads.pathLength(route.nodes) + 300;
        job.fare = Math.round(8 + length * 0.011);
        job.dest = { point: site.door, label: place.name, placeId: place.id };
        job.deadline = h.now + length / 190 + 30;
        e.context = { destinationId: place.id, fare: job.fare };
        this.talkTo(e);
      }
    }
    if (job.kind === 'taxi' && job.phase === 'deliver' && inJobCar && job.dest) {
      if (Math.hypot(job.dest.point.x - p.x, job.dest.point.y - p.y) < 120 && job.vehicle.speed < 45) {
        const onTime = h.now <= job.deadline;
        const tip = onTime ? Math.round(job.fare * 0.2) : 0;
        const ride = h.finishGuide();
        // Following spoken directions without a single wrong turn earns a listening bonus.
        const bonus = ride && ride.wrong === 0 ? 15 : 0;
        job.guide = false;
        this.payJob(job, Math.round(job.fare * (onTime ? 1 : 0.6)) + tip + bonus, onTime ? h.tr(`요금 $${job.fare} + 팁 $${tip}`, `Fare $${job.fare} + tip $${tip}`) : h.tr('늦었어요… 요금 일부만 받았어요', 'Late… partial fare'));
        if (ride) {
          h.toast(
            bonus
              ? h.tr(`👂 듣기 보너스 +$${bonus} · 한 번도 안 헤맸어요!`, `👂 Listening bonus +$${bonus} · no wrong turns!`)
              : h.tr(`👂 길을 ${ride.wrong}번 놓쳤어요. 다음엔 되물어 보세요!`, `👂 Missed ${ride.wrong} turn(s). Ask again next time!`),
            bonus ? 'good' : 'info',
          );
        }
        job.dest = null;
        job.phase = 'seek';
        job.nextSpawnAt = h.now + 3;
        h.setJobTarget(null);
      }
    }
  }

  private pickDestination(): Place {
    const p = this.h.player;
    const options = PLACES.filter((pl) => {
      const s = this.h.city.places.get(pl.id);
      if (!s) return false;
      const d = Math.hypot(s.door.x - p.x, s.door.y - p.y);
      return d > 900 && d < 3000;
    });
    return pick(options.length > 0 ? options : PLACES);
  }

  /** HUD summary for the current job. */
  jobHud(): { title: string; detail: string; timeLeft: number | null } | null {
    const job = this.job;
    if (!job) return null;
    const tr = this.h.tr;
    const title = job.kind === 'taxi' ? tr(`🚕 택시 근무 · $${job.earned}`, `🚕 Taxi shift · $${job.earned}`) : tr(`🍕 피자 배달 · $${job.earned}`, `🍕 Pizza delivery · $${job.earned}`);
    let detail: string;
    if (job.phase === 'seek') detail = job.kind === 'taxi' ? tr('손님(🙋)에게 가서 멈추세요', 'Stop next to the passenger 🙋') : tr('다음 주문 준비 중…', 'Next order coming…');
    else if (job.phase === 'deliver' && job.guide) detail = tr('👂 손님의 길 안내를 듣고 운전하세요 (내비 없음)', '👂 Follow the passenger’s directions (no GPS)');
    else if (job.phase === 'deliver') detail = job.kind === 'taxi' ? tr(`${job.dest?.label}까지 모셔다 드리세요`, `Drive to ${job.dest?.label}`) : tr(`${job.dest?.label} · 내려서 초인종을 누르세요`, `${job.dest?.label} · get out and ring the bell`);
    else detail = tr('손님 응대 중', 'Talking to the customer');
    const timeLeft = job.phase === 'deliver' ? Math.round(job.deadline - this.h.now) : null;
    return { title, detail, timeLeft };
  }

  // ── Lifecycle ────────────────────────────────────────────────────────

  private removeEncounter(e: Encounter, leave: boolean, bubble?: string): void {
    const i = this.encounters.indexOf(e);
    if (i >= 0) this.encounters.splice(i, 1);
    e.ped.icon = null;
    if (bubble) this.h.peds.speak(e.ped, bubble, 3, this.h.now);
    if (leave) {
      const a = rand(0, Math.PI * 2);
      e.ped.target = { x: e.ped.x + Math.cos(a) * 500, y: e.ped.y + Math.sin(a) * 500 };
      e.ped.state = 'leave';
      e.ped.timer = 0;
      e.ped.fixed = false;
    } else this.h.peds.remove(e.ped);
  }

  resolve(encounterId: number, outcome: Outcome, mood: number): void {
    const e = this.encounters.find((x) => x.id === encounterId);
    if (!e) return;
    e.talking = false;
    const h = this.h;
    const ok = outcome === 'success';
    switch (e.kind) {
      case 'tourist':
        this.removeEncounter(e, true, ok ? 'Thank you so much!' : 'Uh… I’ll ask someone else.');
        break;
      case 'interview':
        this.removeEncounter(e, true, ok ? 'Thanks! Watch us tonight!' : 'Okay… thanks anyway.');
        break;
      case 'scam':
        if (!ok) h.fine(40, h.tr('가짜 시계를 사고 말았어요… -$40', 'You bought a fake watch… -$40'));
        this.removeEncounter(e, true, ok ? 'Fine, fine! Your loss!' : 'Pleasure doing business!');
        break;
      case 'accident':
        if (e.car?.brain) e.car.brain.stopped = false;
        if (!ok) {
          h.report('reckless');
          h.toast(h.tr('상대 운전자가 경찰에 신고했어요! 🚨', 'The other driver called the police! 🚨'), 'bad');
        }
        this.removeEncounter(e, false);
        break;
      case 'passenger': {
        const job = this.job;
        if (!job) break;
        if (ok) {
          this.h.peds.remove(e.ped);
          this.encounters.splice(this.encounters.indexOf(e), 1);
          job.passenger = null;
          job.phase = 'deliver';
          h.setJobTarget(job.dest);
          // Every other ride (and never the very first one) the passenger knows the way and tells you out loud.
          job.guide = job.count > 0 && Math.random() < 0.6;
          if (job.guide) {
            h.startGuide(e.npcId);
            h.toast(h.tr('🗣️ 손님이 길을 알려 준대요! 내비 없이 귀로 듣고 운전하세요', '🗣️ The passenger will give directions — no GPS, just listen!'), 'info');
          } else h.toast(h.tr(`${job.dest?.label}(으)로 출발!`, `Heading to ${job.dest?.label}!`), 'info');
        } else {
          job.passenger = null;
          job.phase = 'seek';
          job.dest = null;
          job.nextSpawnAt = h.now + 4;
          h.setJobTarget(null);
          this.removeEncounter(e, true, 'Forget it, I’ll walk.');
        }
        break;
      }
      case 'customer': {
        const job = this.job;
        this.removeEncounter(e, false);
        if (!job) break;
        if (outcome === 'abandoned') {
          h.toast(h.tr('손님을 그냥 두고 왔어요… 배달비를 못 받았어요.', 'You walked away from the customer… no pay.'), 'bad');
        } else {
          const late = Math.max(0, h.now - job.deadline) > 0;
          const tip = ok && mood >= 75 ? (late ? 3 : 8) : 0;
          this.payJob(job, 12 + tip, tip ? h.tr(`배달비 $12 + 팁 $${tip}`, `Delivery $12 + tip $${tip}`) : h.tr('배달비 $12', 'Delivery $12'));
        }
        job.dest = null;
        job.phase = 'seek';
        job.nextSpawnAt = h.now + 2;
        h.setJobTarget(null);
        break;
      }
    }
  }

  update(): void {
    const h = this.h;
    this.maybeSpawnStreetEvent();
    for (const e of [...this.encounters]) {
      if (e.talking) continue;
      const far = Math.hypot(e.ped.x - h.player.x, e.ped.y - h.player.y) > 1400;
      if (e.kind === 'accident') {
        if (far || h.now > e.expires) {
          if (e.car?.brain) e.car.brain.stopped = false;
          this.removeEncounter(e, false);
          h.report('hit_and_run');
          h.toast(h.tr('뺑소니! 경찰이 쫓아와요 🚨', 'Hit and run! The police are after you 🚨'), 'bad');
        }
        continue;
      }
      if (e.kind === 'passenger' || e.kind === 'customer') continue;
      if (far || h.now > e.expires) this.removeEncounter(e, true);
      else if (Math.random() < 0.004 && !e.ped.bubble) h.peds.speak(e.ped, e.kind === 'scam' ? 'Hey! Over here!' : 'Excuse me!', 2.5, h.now);
    }
    if (this.job) this.updateJob();
  }
}
