// The game engine: owns the simulation and renders the city. The React UI drives it through a small
// public API (pause, waypoints, jobs, conversation results) and listens to EngineEvents.
import { DISTRICT_NAMES, PLACE_BY_ID } from '@shared/content/city';
import { getNpc, PASSERBY_IDS } from '@shared/content/npcs';
import { OVERHEARD, type Overheard } from '@shared/content/overheard';
import { nextRomancePlace } from '@shared/content/romance';
import { STORY } from '@shared/content/story';
import { SCENARIO_BY_ID } from '@shared/content/scenarios';
import type { CarModelId, JobKind, Offense, Outcome } from '@shared/types';
import { sfx } from '../audio/sfx';
import { speakAmbient, speakNpc, speakPhrase, stopSpeaking } from '../audio/voice';
import type { ConversationLaunch } from '../conversation/types';
import { tr } from '../i18n';
import { getSave, saveWorld, useGame } from '../state/game';
import type { Hud, Toast } from '../state/ui';
import { blockAt, type City, generateCity, onRoad } from './city/generate';
import { DISTRICT_LABEL, HALF_ROAD, SIDEWALK, ST_Y } from './city/layout';
import { headingBetween, laneOf, planRoute, turnSign } from './city/roads';
import { Director, type DirectorHost, type JobTarget } from './director';
import { Fx } from './fx';
import { Input } from './input';
import { angleDiff, clamp, damp, dist, pick, rand, type Vec } from './math';
import { OUTFITS } from './outfits';
import { lookFromNpc, type Ped, type PedLook, PedSystem, randomLook } from './peds';
import { type Body, DynGrid, resolveStatic } from './physics';
import { WantedSystem } from './police';
import { PropSystem } from './props';
import { drawMinimap, type MinimapMarker, renderMapImage } from './render/minimap';
import { type Marker, WorldRenderer } from './render/world';
import { TrafficSystem } from './traffic';
import { CAR_MODELS, Vehicle } from './vehicle';

export type EngineEvent =
  | { type: 'place'; placeId: string }
  | { type: 'talk'; launch: ConversationLaunch }
  | { type: 'toast'; text: string; tone: Toast['tone'] }
  | { type: 'coin'; idiomId: string }
  | { type: 'earn'; amount: number; reason: string }
  | { type: 'fine'; amount: number; reason: string }
  | { type: 'wanted'; level: number }
  | { type: 'hud'; hud: Partial<Hud> }
  /** An overheard street conversation finished: time for the listening question. */
  | { type: 'overheard'; id: string };

export interface EngineOptions {
  canvas: HTMLCanvasElement;
  minimap?: HTMLCanvasElement | null;
  /** Title-screen mode: a camera drifting over a living city, no player. */
  attract?: boolean;
  onEvent?: (e: EngineEvent) => void;
}

interface Waypoint {
  point: Vec;
  label: string;
  placeId?: string;
}

const ACTIVE_RADIUS = 1800;
const VIEW_HEIGHT = 600;
const PX_TO_KMH = 0.4;
const MINIMAP_SCALE = 6;

/** Spoken taxi directions. `easy` lines are for A1/A2 learners. */
const GUIDE = {
  prepEasy: (dir: string) => [`Turn ${dir} at the next corner, please.`],
  prep: (dir: string, street: string) => [`Take the next ${dir} onto ${street}.`, `You'll want to turn ${dir} up ahead, onto ${street}.`, `Next ${dir}, please. Onto ${street}.`],
  nowEasy: (dir: string) => [`Turn ${dir} here.`, `${cap(dir)} here, please.`],
  now: (dir: string) => [`${cap(dir)} here!`, `Okay, ${dir} now!`, `This one. Hang a ${dir}!`],
  straight: ['Just keep going straight.', 'Stay on this road for now.', 'Straight ahead for a bit.'],
  wrong: ["Oops, you missed the turn! Let's turn around.", "Hmm, that's the wrong way. Can you make a U-turn?", 'No, no, not this way! Let’s go back.'],
  arrive: (side: string) => [`It's just up here on the ${side}.`, `We're here! It's on the ${side}.`],
  unknown: ['Sorry? Just follow my directions, okay?', "I didn't catch that. Just drive, I'll tell you where to turn."],
};
const cap = (w: string) => w.charAt(0).toUpperCase() + w.slice(1);
const BLOCK = 550;

const COMPANION_OPENERS = ['Hey, can we talk for a sec?', 'Guess what!', 'Can I ask you something?', 'Hey, look at this!'];
const COMPANION_LINES = ['I love walking around with you.', 'This city looks so pretty today.', 'Tacos later? 🌮', 'Wait for me!', 'Hehe, you walk so fast.', 'Should we go to the beach later?', 'I missed you today.'];

let cityCache: City | null = null;
let mapCache: HTMLCanvasElement | null = null;

export function getCity(): City {
  cityCache ??= generateCity();
  return cityCache;
}

export function getMapImage(): HTMLCanvasElement {
  mapCache ??= renderMapImage(getCity());
  return mapCache;
}

export class Game {
  readonly input = new Input();
  readonly city = getCity();
  private readonly ctx: CanvasRenderingContext2D;
  private readonly mctx: CanvasRenderingContext2D | null;
  private readonly renderer: WorldRenderer;
  private readonly vehicles: Vehicle[] = [];
  private readonly peds: PedSystem;
  private readonly traffic: TrafficSystem;
  private readonly wanted: WantedSystem;
  private readonly director: Director;
  private readonly props: PropSystem;
  private readonly fx = new Fx();
  private readonly dyn = new DynGrid();
  private readonly bodies: Body[] = [];
  private readonly near: Body[] = [];

  private readonly player = { x: 0, y: 0, angle: 0, vx: 0, vy: 0, phase: 0, moving: false, vehicle: null as Vehicle | null };
  private readonly cam = { x: 0, y: 0, zoom: 1 };
  private width = 1;
  private height = 1;
  private dpr = 1;
  private now = 0;
  private clock = 9 * 60;
  private paused = false;
  private running = false;
  private raf = 0;
  private lastTs = 0;
  private dirty = true;
  private timers = { populate: 0, hud: 0, route: 0, save: 0, offense: 0, district: 0 };
  private waypoint: Waypoint | null = null;
  private companion: { ped: Ped | null; nextChat: number; nextLine: number; wantsTalk: boolean } | null = null;
  /** Pedestrian the player is chatting with (small talk). */
  private chatPed: Ped | null = null;
  /** Taxi passenger giving spoken directions instead of the GPS. */
  private guide: {
    npcId: string;
    prep: string;
    now: string;
    best: number;
    wrong: number;
    asks: number;
    arrived: boolean;
    lastLine: string;
    lastAt: number;
    next: { dir: 'left' | 'right'; street: string; dist: number } | null;
    remaining: number;
    side: 'left' | 'right';
    lineId: number;
  } | null = null;
  /** 👂 Two pedestrians chatting; walk up to them to listen. */
  private overheard: { convo: Overheard; a: Ped; b: Ped; playing: boolean; done: boolean } | null = null;
  private nextOverheardAt = 40;
  private ambientBusyUntil = 0;
  private lastGpsAt = -10;
  private jobTarget: JobTarget | null = null;
  private route: Vec[] | null = null;
  private gps: Hud['gps'] = null;
  private announced = '';
  private arrivedAt = '';
  private district = '';
  private prompt: { text: string; run: () => void } | null = null;
  private hornWas = false;
  private playedSeconds = 0;
  private attract: boolean;
  private attractT = 0;
  private readonly onEvent: (e: EngineEvent) => void;
  private readonly resizeObserver: ResizeObserver;

  constructor(private readonly opts: EngineOptions) {
    this.ctx = opts.canvas.getContext('2d', { alpha: false })!;
    this.mctx = opts.minimap?.getContext('2d') ?? null;
    this.renderer = new WorldRenderer(this.ctx);
    this.attract = !!opts.attract;
    this.onEvent = opts.onEvent ?? (() => {});
    this.peds = new PedSystem(this.city);
    this.traffic = new TrafficSystem(this.city, this.vehicles);
    this.wanted = new WantedSystem(this.city, this.vehicles, this.traffic);
    this.props = new PropSystem(this.city);
    this.director = new Director(this.host());
    if (!this.attract) this.peds.onSay = (ped, text) => this.ambientSay(ped, text);

    for (const p of this.city.parkedCars) {
      const model = CAR_MODELS[Math.random() < 0.2 ? 'suv' : Math.random() < 0.5 ? 'sedan' : 'compact'];
      const v = new Vehicle(model, p.x, p.y, p.angle, 'parked');
      this.vehicles.push(v);
    }

    if (this.attract) {
      this.clock = 17 * 60 + 50;
      this.cam.x = this.player.x = 1000;
      this.cam.y = this.player.y = ST_Y[4];
    } else {
      const save = getSave();
      this.clock = save.world?.time ?? 9 * 60;
      const start = save.world ?? this.airportSpawn();
      this.player.x = start.x;
      this.player.y = start.y;
      this.cam.x = start.x;
      this.cam.y = start.y;
      this.input.attach();
      if (save.romance.following) this.setCompanion(true);
    }

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(opts.canvas);
    this.resize();
  }

  private airportSpawn(): Vec {
    const door = this.city.places.get('airport')!.door;
    return { x: door.x, y: door.y + 70 };
  }

  // ── Public API ────────────────────────────────────────────────────────

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTs = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  destroy(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.input.detach();
    this.resizeObserver.disconnect();
    if (!this.attract) sfx.stopLoops();
  }

  setPaused(paused: boolean): void {
    if (this.paused === paused) return;
    this.paused = paused;
    this.input.reset();
    if (paused) {
      sfx.stopLoops();
      this.flushWorldSave();
      if (this.overheard?.playing) {
        this.overheard.playing = false;
        stopSpeaking();
      }
    }
    this.dirty = true;
  }

  get isPaused(): boolean {
    return this.paused;
  }

  get mapImage(): HTMLCanvasElement {
    return getMapImage();
  }

  get position(): Vec {
    const v = this.player.vehicle;
    return v ? { x: v.x, y: v.y } : { x: this.player.x, y: this.player.y };
  }

  placeDoor(placeId: string): Vec | null {
    return this.city.places.get(placeId)?.door ?? null;
  }

  setWaypointToPlace(placeId: string | null): void {
    if (!placeId) {
      this.waypoint = null;
    } else {
      const door = this.placeDoor(placeId);
      const place = PLACE_BY_ID.get(placeId);
      if (door && place) this.waypoint = { point: door, label: place.name, placeId };
    }
    this.timers.route = 0;
    this.announced = '';
  }

  get waypointPlaceId(): string | null {
    return this.waypoint?.placeId ?? null;
  }

  startJob(kind: JobKind): void {
    this.director.startJob(kind);
  }

  /** Miseon walks with the player (after the confession) or goes home. */
  setCompanion(on: boolean): void {
    if (on && !this.companion) {
      this.companion = { ped: null, nextChat: this.now + rand(60, 100), nextLine: this.now + rand(8, 15), wantsTalk: false };
    } else if (!on && this.companion) {
      if (this.companion.ped) this.peds.remove(this.companion.ped);
      this.companion = null;
    }
  }

  get hasCompanion(): boolean {
    return !!this.companion;
  }

  /** Starts a free chat with Miseon while walking (T key / HUD button). */
  talkToCompanion(): void {
    const c = this.companion;
    if (!c?.ped || this.player.vehicle) return;
    c.wantsTalk = false;
    c.ped.icon = null;
    c.ped.bubble = null;
    c.nextChat = this.now + rand(150, 240);
    c.ped.angle = Math.atan2(this.player.y - c.ped.y, this.player.x - c.ped.x);
    this.onEvent({
      type: 'talk',
      launch: { scenarioId: 'romance_chat', npcId: 'miseon', context: this.whereAndWhen(), origin: { kind: 'companion' } },
    });
  }

  /** District (one of DISTRICT_NAMES) and in-game hour, for scenes that happen "right here, right now". */
  private whereAndWhen(): { district?: (typeof DISTRICT_NAMES)[number]; hour: number } {
    const b = blockAt(this.city, this.player.x, this.player.y);
    const label = b ? DISTRICT_LABEL[b.district].en : undefined;
    const district = (DISTRICT_NAMES as readonly string[]).includes(label ?? '') ? (label as (typeof DISTRICT_NAMES)[number]) : undefined;
    return { district, hour: Math.floor(this.clock / 60) % 24 };
  }

  /** Small talk with any pedestrian: they become one of the passerby characters. */
  private chatWithPed(ped: Ped): void {
    const npcId = pick(PASSERBY_IDS);
    ped.fixed = true;
    ped.state = 'idle';
    ped.bubble = null;
    ped.look = lookFromNpc(getNpc(npcId).look);
    ped.angle = Math.atan2(this.player.y - ped.y, this.player.x - ped.x);
    this.chatPed = ped;
    this.onEvent({ type: 'talk', launch: { scenarioId: 'street_chat', npcId, context: this.whereAndWhen(), origin: { kind: 'passerby', pedId: ped.id } } });
  }

  private chattyPedNear(): Ped | null {
    const p = this.player;
    let best: Ped | null = null;
    let bd = 40;
    for (const ped of this.peds.peds) {
      if (ped.fixed || ped.icon || (ped.state !== 'walk' && ped.state !== 'idle')) continue;
      const d = dist(ped.x, ped.y, p.x, p.y);
      if (d < bd) {
        bd = d;
        best = ped;
      }
    }
    return best;
  }

  // ── Voice-guided taxi rides ───────────────────────────────────────────

  /** The learner asked the passenger something (speech-recognized); answers are matched locally, instantly. */
  askGuide(heard: string): void {
    const g = this.guide;
    if (!g) return;
    g.asks++;
    const q = heard.toLowerCase();
    const n = g.next;
    const blocks = n ? Math.max(1, Math.round(n.dist / BLOCK)) : 0;
    const left = Math.max(1, Math.round(g.remaining / BLOCK));
    let answer: string;
    let slow = false;
    if (/\b(again|repeat|sorry|pardon|what did you say|come again|say that|slow|slowly)\b/.test(q)) {
      answer = g.lastLine || pick(GUIDE.straight);
      slow = true;
    } else if (/\b(left|right|which way|direction|turn)\b/.test(q)) {
      answer = n ? (n.dist < 230 ? `${cap(n.dir)}, right here!` : `Turn ${n.dir} in about ${blocks} block${blocks > 1 ? 's' : ''}.`) : 'No turns for now. Just go straight.';
    } else if (/\b(how far|how long|further|farther|are we there|almost there|close|minutes?)\b/.test(q)) {
      answer = g.remaining < 450 ? "We're almost there!" : `About ${left} more block${left > 1 ? 's' : ''}.`;
    } else if (/\b(street|road|avenue|where|name)\b/.test(q)) {
      answer = n ? `We turn onto ${n.street}.` : `It's on this road, on the ${g.side}.`;
    } else {
      answer = pick(GUIDE.unknown);
    }
    this.guideSay(answer, slow, false);
  }

  replayGuide(slow = false): void {
    if (this.guide?.lastLine) this.guideSay(this.guide.lastLine, slow, false);
  }

  private guideSay(text: string, slow = false, remember = true): void {
    const g = this.guide;
    if (!g) return;
    if (remember) g.lastLine = text;
    g.lastAt = this.now;
    g.lineId++;
    void speakNpc(text, getNpc(g.npcId), slow);
    this.onEvent({ type: 'hud', hud: { guide: { npcId: g.npcId, text, id: g.lineId } } });
  }

  /** Called from updateRoute with the fresh plan while a guide rides along. */
  private updateGuide(nextTurn: { dir: 'left' | 'right'; street: string; dist: number; key: string } | null, remaining: number, side: 'left' | 'right'): void {
    const g = this.guide!;
    const easy = getSave().level === 'A1' || getSave().level === 'A2';
    g.next = nextTurn;
    g.remaining = remaining;
    g.side = side;
    if (remaining > g.best + 260 && this.now - g.lastAt > 4) {
      g.wrong++;
      g.best = remaining;
      g.prep = g.now = '';
      this.guideSay(pick(GUIDE.wrong));
      return;
    }
    g.best = Math.min(g.best, remaining);
    if (!g.arrived && remaining < 420) {
      g.arrived = true;
      this.guideSay(pick(GUIDE.arrive(side)));
      return;
    }
    if (nextTurn && !g.arrived) {
      if (nextTurn.dist < 230 && g.now !== nextTurn.key) {
        g.now = g.prep = nextTurn.key;
        this.guideSay(pick(easy ? GUIDE.nowEasy(nextTurn.dir) : GUIDE.now(nextTurn.dir)));
        return;
      }
      if (nextTurn.dist < 600 && g.prep !== nextTurn.key && g.now !== nextTurn.key) {
        g.prep = nextTurn.key;
        this.guideSay(pick(easy ? GUIDE.prepEasy(nextTurn.dir) : GUIDE.prep(nextTurn.dir, nextTurn.street)));
        return;
      }
    }
    if (!g.arrived && this.now - g.lastAt > 22 && (!nextTurn || nextTurn.dist > 700)) this.guideSay(pick(GUIDE.straight));
  }

  // ── Audible streets: pedestrians' shouts and overheard conversations ──

  private ambientSay(ped: Ped, text: string): void {
    if (this.paused || this.overheard?.playing) return;
    const save = getSave();
    if (!save.settings.ambientVoices || this.now < this.ambientBusyUntil || this.now - this.lastGpsAt < 4 || this.guide) return;
    const p = this.position;
    if (dist(ped.x, ped.y, p.x, p.y) > (this.player.vehicle ? 260 : 320)) return;
    this.ambientBusyUntil = this.now + 2.5;
    const encounter = this.director.encounters.find((e) => e.ped === ped);
    const npcId = encounter?.npcId ?? (this.companion?.ped === ped ? 'miseon' : null);
    if (npcId) void speakNpc(text, getNpc(npcId));
    else void speakAmbient(text, { gender: ped.id % 2 ? 'female' : 'male', key: `ped${ped.id % 7}`, volume: 0.75, pitch: 0.9 + (ped.id % 5) * 0.05 });
  }

  private updateOverheard(): void {
    const o = this.overheard;
    const p = this.player;
    if (!o) {
      if (this.now < this.nextOverheardAt || p.vehicle || this.director.job || this.wanted.level > 0) return;
      const at = this.peds.sidewalkPointNear(p.x, p.y, 260, 520);
      if (!at) return;
      const heard = getSave().overheard;
      const fresh = OVERHEARD.filter((c) => !heard.includes(c.id));
      const convo = pick(fresh.length > 0 ? fresh : OVERHEARD);
      const a = this.peds.create(at.x - 11, at.y, randomLook(), true);
      const b = this.peds.create(at.x + 11, at.y, randomLook(), true);
      a.state = b.state = 'idle';
      a.angle = 0;
      b.angle = Math.PI;
      a.icon = '👂';
      this.overheard = { convo, a, b, playing: false, done: false };
      this.nextOverheardAt = this.now + rand(80, 140);
      return;
    }
    const d = Math.min(dist(o.a.x, o.a.y, p.x, p.y), dist(o.b.x, o.b.y, p.x, p.y));
    if (o.done || d > 1300) {
      this.peds.release(o.a);
      this.peds.release(o.b);
      this.overheard = null;
      return;
    }
    if (!o.playing && !p.vehicle && d < 120 && !this.paused) void this.playOverheard(o);
  }

  private async playOverheard(o: NonNullable<Game['overheard']>): Promise<void> {
    o.playing = true;
    o.a.icon = null;
    this.onEvent({ type: 'hud', hud: { overhearing: true } });
    const listen = getSave().settings.subtitles === 'listen';
    for (const line of o.convo.lines) {
      const ped = line.who === 0 ? o.a : o.b;
      ped.bubble = { text: listen ? '💬 …' : line.en, until: this.now + 30 };
      await speakAmbient(line.en, { gender: o.convo.speakers[line.who], key: `oh${line.who}-${o.convo.id}`, pitch: line.who ? 0.95 : 1.05 });
      ped.bubble = null;
      const p = this.player;
      const tooFar = Math.min(dist(o.a.x, o.a.y, p.x, p.y), dist(o.b.x, o.b.y, p.x, p.y)) > 240;
      if (this.overheard !== o || !o.playing || tooFar) {
        // Walked away (or paused): they keep chatting; come back to hear it from the start.
        o.playing = false;
        o.a.icon = '👂';
        o.a.bubble = o.b.bubble = null;
        if (tooFar) stopSpeaking();
        this.onEvent({ type: 'hud', hud: { overhearing: false } });
        return;
      }
      await new Promise((r) => setTimeout(r, 250));
    }
    o.done = true;
    o.playing = false;
    this.peds.speak(o.a, 'Anyway, see you later!', 2.5, this.now);
    this.onEvent({ type: 'hud', hud: { overhearing: false } });
    this.onEvent({ type: 'overheard', id: o.convo.id });
  }

  /** Jump the in-game clock (e.g. to the next morning after a night at the hotel). */
  setClock(minutes: number): void {
    this.clock = ((minutes % 1440) + 1440) % 1440;
    this.dirty = true;
  }

  endJob(): void {
    this.director.endJob();
  }

  get hasJob(): boolean {
    return !!this.director.job;
  }

  /** Called by the UI when a conversation that the engine started (or a place visit) ends. */
  conversationEnded(launch: ConversationLaunch, outcome: Outcome, mood: number): void {
    const o = launch.origin;
    if (o.kind === 'passerby') {
      const ped = this.chatPed;
      this.chatPed = null;
      if (ped && this.peds.peds.includes(ped)) {
        this.peds.release(ped);
        this.peds.speak(ped, outcome === 'success' ? 'Nice talking to you!' : 'Okay… bye!', 2.5, this.now);
      }
    } else if (o.kind === 'encounter' || (o.kind === 'job' && o.encounterId !== undefined)) {
      this.director.resolve(o.kind === 'encounter' ? o.encounterId : o.encounterId!, outcome, mood);
    } else if (o.kind === 'police') {
      const stars = Math.max(1, this.wanted.level);
      this.wanted.clear();
      if (outcome === 'success') this.emitToast(tr('경고로 끝났어요. 안전 운전하세요! 🚓', 'Just a warning this time. Drive safe! 🚓'), 'good');
      else this.onEvent({ type: 'fine', amount: 150 * stars, reason: tr(`벌금 $${150 * stars}`, `Fine: $${150 * stars}`) });
      this.onEvent({ type: 'wanted', level: 0 });
    }
  }

  /** Delivers an owned car next to the player (garage app, story rewards). */
  spawnOwnedCar(model: CarModelId): void {
    this.removeOwnedCar(model);
    const p = this.position;
    const road = this.city.roads.nearestRoadPoint(p.x, p.y);
    const a = this.city.roads.node(road.seg.a);
    const b = this.city.roads.node(road.seg.b);
    const lane = laneOf(a, b);
    const x = road.x + lane.rx * (HALF_ROAD - 16);
    const y = road.y + lane.ry * (HALF_ROAD - 16);
    const v = new Vehicle(CAR_MODELS[model], x, y, Math.atan2(lane.dy, lane.dx), 'owned');
    v.owned = model;
    this.vehicles.push(v);
    this.fx.emit('sparkle', x, y, 20, 1.5);
  }

  removeOwnedCar(model: CarModelId): void {
    const i = this.vehicles.findIndex((v) => v.owned === model);
    if (i < 0) return;
    if (this.player.vehicle === this.vehicles[i]) this.exitVehicle(true);
    this.vehicles.splice(i, 1);
  }

  /** Test hook (dev builds expose the engine as window.__game): runs the simulation without rAF. */
  debugAdvance(seconds: number): void {
    for (let t = 0; t < seconds; t += 1 / 60) if (!this.paused) this.step(1 / 60);
    this.draw();
  }

  debugTeleport(x: number, y: number): void {
    if (this.player.vehicle) this.exitVehicle(true);
    this.player.x = this.cam.x = x;
    this.player.y = this.cam.y = y;
    this.dirty = true;
  }

  // ── Loop ──────────────────────────────────────────────────────────────

  private frame = (ts: number) => {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this.frame);
    const dt = Math.min(0.05, Math.max(0, (ts - this.lastTs) / 1000));
    this.lastTs = ts;
    if (!this.paused) {
      const steps = dt > 0.025 ? 2 : 1;
      for (let i = 0; i < steps; i++) this.step(dt / steps);
      this.dirty = true;
    }
    if (this.dirty) {
      this.draw();
      this.dirty = false;
    }
  };

  private resize(): void {
    const c = this.opts.canvas;
    const quality = this.attract ? 'high' : useGame.getState().save?.settings.graphics ?? 'high';
    this.dpr = Math.min(window.devicePixelRatio || 1, quality === 'high' ? 2 : 1);
    this.width = Math.max(1, c.clientWidth);
    this.height = Math.max(1, c.clientHeight);
    c.width = Math.round(this.width * this.dpr);
    c.height = Math.round(this.height * this.dpr);
    const m = this.opts.minimap;
    if (m) {
      m.width = Math.round(m.clientWidth * this.dpr);
      m.height = Math.round(m.clientHeight * this.dpr);
    }
    this.dirty = true;
  }

  private step(dt: number): void {
    this.now += dt;
    this.clock = (this.clock + dt) % 1440;
    this.playedSeconds += dt;
    const focus = this.attract ? this.cam : this.position;

    this.timers.populate -= dt;
    if (this.timers.populate <= 0) {
      this.timers.populate = 0.4;
      this.traffic.populate(focus, true);
      this.peds.populate(focus, this.now);
    }

    if (this.attract) this.updateAttractCamera(dt);
    else {
      this.updatePlayer(dt);
      this.updateCompanion(dt);
    }

    // AI driving.
    this.rebuildDynGrid(focus);
    for (const v of this.vehicles) {
      if (v.driver !== 'ai' || v.pursuit) continue;
      if (Math.abs(v.x - focus.x) > ACTIVE_RADIUS || Math.abs(v.y - focus.y) > ACTIVE_RADIUS) continue;
      if (v.brain) this.traffic.drive(v, dt, this.now, this.dyn.query(v.x, v.y, 160, this.near));
    }

    if (!this.attract) {
      const pv = this.player.vehicle;
      const result = this.wanted.update(dt, {
        x: this.position.x,
        y: this.position.y,
        vx: pv ? pv.vx : this.player.vx,
        vy: pv ? pv.vy : this.player.vy,
        speed: pv ? pv.speed : Math.hypot(this.player.vx, this.player.vy),
        onFoot: !pv,
      });
      if (result === 'busted') this.onBusted();
      if (result === 'lost') {
        this.onEvent({ type: 'wanted', level: this.wanted.level });
        if (this.wanted.level === 0) this.emitToast(tr('경찰을 따돌렸어요!', 'You lost the cops!'), 'good');
      }
    }

    // Physics.
    for (const v of this.vehicles) {
      if (Math.abs(v.x - focus.x) > ACTIVE_RADIUS || Math.abs(v.y - focus.y) > ACTIVE_RADIUS) continue;
      if (!v.driver && v.speed < 1 && Math.abs(v.angVel) < 0.01) continue;
      if (!v.driver) {
        v.throttle = 0;
        v.handbrake = true;
      }
      v.update(dt, this.surfaceAt(v.x, v.y));
    }
    this.collide(focus);

    const threats = this.vehicles.filter((v) => v.speed > 100 && Math.abs(v.x - focus.x) < 1000 && Math.abs(v.y - focus.y) < 1000);
    this.peds.update(dt, this.now, threats);
    for (const p of this.peds.peds) {
      if (p.state === 'walk' || p.state === 'idle') continue;
      const c = { x: p.x, y: p.y, r: 7 };
      if (resolveStatic(this.city.colliders, c)) {
        p.x = c.x;
        p.y = c.y;
      }
    }
    this.props.update(dt, focus.x, focus.y);
    if (!this.attract) {
      this.director.update();
      this.updateOverheard();
    }
    this.updateEffects(dt);
    this.fx.update(dt);

    if (!this.attract) {
      this.updateCamera(dt);
      this.updatePrompt();
      if (this.input.consume('action')) this.prompt?.run();
      if (this.input.consume('talk')) this.talkToCompanion();
      this.collectCoins();
      this.checkSpeeding(dt);
      this.updateRoute(dt);
      this.updateAudio();
      this.emitHud(dt);
      this.timers.save -= dt;
      if (this.timers.save <= 0) {
        this.timers.save = 15;
        this.flushWorldSave();
      }
    }
  }

  private flushWorldSave(): void {
    if (this.attract || !useGame.getState().save) return;
    const p = this.position;
    saveWorld(p.x, p.y, this.clock, this.playedSeconds);
    this.playedSeconds = 0;
  }

  // ── Player ────────────────────────────────────────────────────────────

  private playerLook(): PedLook {
    const save = getSave();
    const outfit = OUTFITS.find((o) => o.id === save.outfit) ?? OUTFITS[0];
    return { skin: save.look.skin, hair: save.look.hair, shirt: outfit.shirt, pants: outfit.pants, bald: save.look.hairStyle === 'bald' };
  }

  private updatePlayer(dt: number): void {
    const p = this.player;
    const inp = this.input;
    const car = p.vehicle;
    if (car) {
      if (inp.touchMode) {
        const mag = Math.min(1, Math.hypot(inp.joyX, inp.joyY));
        if (mag < 0.18) {
          car.throttle = 0;
          car.steer = 0;
        } else {
          const desired = Math.atan2(inp.joyY, inp.joyX);
          const diff = angleDiff(desired, car.angle);
          if (Math.abs(diff) < 2.1) {
            car.throttle = mag;
            car.steer = clamp(diff * 2.2, -1, 1);
          } else if (car.forwardSpeed > 40) {
            car.throttle = -1;
            car.steer = 0;
          } else {
            car.throttle = -mag * 0.8;
            car.steer = -clamp(angleDiff(desired, car.angle + Math.PI) * 2, -1, 1);
          }
        }
      } else {
        car.throttle = -inp.keyY;
        car.steer = inp.keyX;
      }
      car.handbrake = inp.handbrake;
      p.x = car.x;
      p.y = car.y;
      return;
    }

    let mx = inp.keyX;
    let my = inp.keyY;
    let mag = Math.hypot(mx, my);
    if (inp.touchMode || (mag === 0 && (inp.joyX || inp.joyY))) {
      mx = inp.joyX;
      my = inp.joyY;
      mag = Math.min(1, Math.hypot(mx, my));
    }
    const running = inp.sprint || mag > 0.92;
    const speed = mag > 0.12 ? (running ? 185 : 105) * Math.min(1, mag * 1.2) : 0;
    const tx = mag > 0 ? (mx / (Math.hypot(mx, my) || 1)) * speed : 0;
    const ty = mag > 0 ? (my / (Math.hypot(mx, my) || 1)) * speed : 0;
    p.vx += (tx - p.vx) * damp(14, dt);
    p.vy += (ty - p.vy) * damp(14, dt);
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    const sp = Math.hypot(p.vx, p.vy);
    p.moving = sp > 12;
    if (p.moving) {
      p.angle = Math.atan2(p.vy, p.vx);
      p.phase += dt * sp * 0.2;
    }
    const c = { x: p.x, y: p.y, r: 8 };
    resolveStatic(this.city.colliders, c);
    p.x = c.x;
    p.y = c.y;
  }

  private updateCompanion(dt: number): void {
    const c = this.companion;
    if (!c) return;
    const pl = this.player;
    if (pl.vehicle) {
      // She rides along; reappears next to you when you get out.
      if (c.ped) {
        this.peds.remove(c.ped);
        c.ped = null;
      }
      return;
    }
    const behindX = pl.x - Math.cos(pl.angle) * 24 - Math.sin(pl.angle) * 12;
    const behindY = pl.y - Math.sin(pl.angle) * 24 + Math.cos(pl.angle) * 12;
    if (!c.ped) {
      c.ped = this.peds.create(behindX, behindY, lookFromNpc(getNpc('miseon').look), true);
      c.ped.state = 'follow';
      c.ped.angle = pl.angle;
    }
    const p = c.ped;
    const dx = behindX - p.x;
    const dy = behindY - p.y;
    const d = Math.hypot(dx, dy);
    if (d > 500) {
      p.x = behindX;
      p.y = behindY;
    } else if (d > 4) {
      const speed = Math.min(215, d * 4);
      p.vx = (dx / d) * speed;
      p.vy = (dy / d) * speed;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.angle = Math.atan2(dy, dx);
      p.phase += dt * speed * 0.2;
    } else {
      p.vx = p.vy = 0;
    }
    if (!c.wantsTalk && this.now > c.nextChat) {
      c.wantsTalk = true;
      p.icon = '💬';
      this.peds.speak(p, pick(COMPANION_OPENERS), 3.5, this.now);
      sfx.play('pop');
    } else if (!c.wantsTalk && this.now > c.nextLine && !p.bubble) {
      this.peds.speak(p, pick(COMPANION_LINES), 3, this.now);
      c.nextLine = this.now + rand(25, 45);
    }
  }

  private enterVehicle(v: Vehicle): void {
    const p = this.player;
    p.vehicle = v;
    v.driver = 'player';
    v.handbrake = false;
    v.brain = null;
    p.vx = p.vy = 0;
    sfx.play('door');
    if (this.director.job && v !== this.director.job.vehicle) this.director.endJob();
  }

  private exitVehicle(force = false): void {
    const p = this.player;
    const v = p.vehicle;
    if (!v) return;
    if (!force && v.speed > 70) return;
    const c = Math.cos(v.angle);
    const s = Math.sin(v.angle);
    const spots = [
      { x: v.x + s * (v.model.wid / 2 + 12), y: v.y - c * (v.model.wid / 2 + 12) },
      { x: v.x - s * (v.model.wid / 2 + 12), y: v.y + c * (v.model.wid / 2 + 12) },
      { x: v.x - c * (v.model.len / 2 + 12), y: v.y - s * (v.model.len / 2 + 12) },
      { x: v.x + c * (v.model.len / 2 + 12), y: v.y + s * (v.model.len / 2 + 12) },
    ];
    const spot = spots.find((pt) => {
      const probe = { ...pt, r: 8 };
      return !resolveStatic(this.city.colliders, probe);
    }) ?? spots[0];
    p.x = spot.x;
    p.y = spot.y;
    p.angle = v.angle;
    p.vehicle = null;
    v.driver = null;
    v.throttle = 0;
    v.steer = 0;
    v.handbrake = true;
    sfx.play('door');
    sfx.setEngine(false);
    sfx.setSkid(0);
  }

  private updatePrompt(): void {
    const p = this.player;
    const d = this.director;
    this.prompt = null;
    if (p.vehicle) {
      const e = d.talkable();
      if (e) {
        this.prompt = { text: tr('상대 운전자와 대화하기', 'Talk to the other driver'), run: () => d.talkTo(e) };
        return;
      }
      if (p.vehicle.speed < 70) this.prompt = { text: tr('차에서 내리기', 'Get out'), run: () => this.exitVehicle() };
      return;
    }
    if (d.jobDoorReady()) {
      this.prompt = { text: tr('초인종 누르기 🔔', 'Ring the doorbell 🔔'), run: () => d.ringDoorbell() };
      return;
    }
    const e = d.talkable();
    if (e) {
      this.prompt = { text: tr('말 걸기 💬', 'Talk 💬'), run: () => d.talkTo(e) };
      return;
    }
    for (const site of this.city.places.values()) {
      if (Math.abs(site.door.x - p.x) < 34 && Math.abs(site.door.y - p.y) < 34) {
        const place = PLACE_BY_ID.get(site.placeId)!;
        this.prompt = {
          text: tr(`${place.nameKo} 들어가기`, `Enter ${place.name}`),
          run: () => {
            sfx.play('whoosh');
            this.onEvent({ type: 'place', placeId: site.placeId });
          },
        };
        return;
      }
    }
    let best: Vehicle | null = null;
    let bd = 60;
    let blocked: Vehicle | null = null;
    for (const v of this.vehicles) {
      const dd = dist(v.x, v.y, p.x, p.y);
      if (dd > 60) continue;
      if (v.drivable && !v.dead && !v.driver && dd < bd) {
        bd = dd;
        best = v;
      } else if (!v.drivable && dd < 48) blocked = v;
    }
    if (best) {
      const car = best;
      this.prompt = { text: tr(`타기 · ${car.owned ? car.model.name : `City Share ${car.model.name}`}`, `Get in · ${car.owned ? car.model.name : `City Share ${car.model.name}`}`), run: () => this.enterVehicle(car) };
      return;
    } else if (blocked) {
      this.prompt = { text: tr('남의 차예요. 초록 배지(City Share) 차를 찾으세요', "Not your car. Look for a green City Share badge"), run: () => {} };
      return;
    }
    const ped = this.chattyPedNear();
    if (ped) this.prompt = { text: tr('행인에게 말 걸기 💬', 'Chat with passerby 💬'), run: () => this.chatWithPed(ped) };
  }

  // ── Collisions ────────────────────────────────────────────────────────

  private rebuildDynGrid(focus: Vec): void {
    this.dyn.clear();
    let n = 0;
    const body = (x: number, y: number, r: number, kind: Body['kind'], ref: unknown) => {
      const b = this.bodies[n] ?? (this.bodies[n] = { x: 0, y: 0, r: 0, kind: 'car', ref: null });
      b.x = x;
      b.y = y;
      b.r = r;
      b.kind = kind;
      b.ref = ref;
      n++;
      this.dyn.insert(b);
    };
    for (const v of this.vehicles) {
      if (Math.abs(v.x - focus.x) > ACTIVE_RADIUS || Math.abs(v.y - focus.y) > ACTIVE_RADIUS) continue;
      body(v.x, v.y, v.model.len / 2, 'car', v);
    }
    for (const p of this.peds.peds) {
      if (Math.abs(p.x - focus.x) > 1200 || Math.abs(p.y - focus.y) > 1200) continue;
      if (onRoad(p.x, p.y) || p.state === 'cross') body(p.x, p.y, 8, 'ped', p);
    }
    if (!this.attract && !this.player.vehicle) body(this.player.x, this.player.y, 9, 'player', null);
  }

  private collide(focus: Vec): void {
    const active = this.vehicles.filter((v) => Math.abs(v.x - focus.x) < ACTIVE_RADIUS && Math.abs(v.y - focus.y) < ACTIVE_RADIUS);
    const playerCar = this.player.vehicle;

    // Cars vs buildings/water/trees.
    for (const v of active) {
      if (!v.driver && v.speed < 1) continue;
      for (const c of v.circles()) {
        const probe = { x: c.x, y: c.y, r: c.r };
        const hit = resolveStatic(this.city.colliders, probe);
        if (!hit) continue;
        v.x += probe.x - c.x;
        v.y += probe.y - c.y;
        const vn = v.vx * hit.nx + v.vy * hit.ny;
        if (vn < 0) {
          v.vx -= 1.3 * vn * hit.nx;
          v.vy -= 1.3 * vn * hit.ny;
          v.vx *= 0.92;
          v.vy *= 0.92;
          const rx = c.x - v.x;
          const ry = c.y - v.y;
          v.angVel += (rx * -vn * hit.ny - ry * -vn * hit.nx) * 0.0006;
          const impact = -vn;
          if (impact > 90) this.onImpact(v, impact, c.x - hit.nx * c.r, c.y - hit.ny * c.r);
        }
        v.circles();
      }
    }

    // Car vs car.
    for (let i = 0; i < active.length; i++) {
      const a = active[i];
      for (let j = i + 1; j < active.length; j++) {
        const b = active[j];
        const reach = (a.model.len + b.model.len) / 2 + 4;
        if (Math.abs(a.x - b.x) > reach || Math.abs(a.y - b.y) > reach) continue;
        if (!a.driver && !b.driver && a.speed < 1 && b.speed < 1) continue;
        const ca = a.circles().map((c) => ({ ...c }));
        const cb = b.circles();
        let hitDone = false;
        for (const p of ca) {
          for (const q of cb) {
            const dx = p.x - q.x;
            const dy = p.y - q.y;
            const d = Math.hypot(dx, dy);
            const min = p.r + q.r;
            if (d >= min || d < 1e-4 || hitDone) continue;
            const nx = dx / d;
            const ny = dy / d;
            const ma = a.model.mass * (a.driver ? 1 : 1.6);
            const mb = b.model.mass * (b.driver ? 1 : 1.6);
            const depth = min - d;
            a.x += nx * depth * (mb / (ma + mb));
            a.y += ny * depth * (mb / (ma + mb));
            b.x -= nx * depth * (ma / (ma + mb));
            b.y -= ny * depth * (ma / (ma + mb));
            const vrel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
            if (vrel < 0) {
              const jimp = (-(1.25) * vrel) / (1 / ma + 1 / mb);
              a.vx += (jimp * nx) / ma;
              a.vy += (jimp * ny) / ma;
              b.vx -= (jimp * nx) / mb;
              b.vy -= (jimp * ny) / mb;
              a.angVel += (Math.random() - 0.5) * -vrel * 0.004;
              b.angVel += (Math.random() - 0.5) * -vrel * 0.004;
              this.onCarCar(a, b, -vrel, (p.x + q.x) / 2, (p.y + q.y) / 2);
            }
            hitDone = true;
          }
        }
      }
    }

    // Cars vs pedestrians and the player on foot.
    for (const v of active) {
      if (v.speed < 5) continue;
      for (const c of v.circles()) {
        for (const ped of this.peds.peds) {
          if (ped.state === 'knocked') continue;
          const dx = ped.x - c.x;
          const dy = ped.y - c.y;
          const d = Math.hypot(dx, dy);
          if (d >= c.r + 7 || d < 1e-4) continue;
          const nx = dx / d;
          const ny = dy / d;
          if (v.speed > 70 && !ped.fixed) {
            this.peds.knock(ped, v.vx * 0.7 + nx * 90, v.vy * 0.7 + ny * 90);
            v.vx *= 0.9;
            v.vy *= 0.9;
            if (v === playerCar) {
              sfx.play('thud');
              this.fx.shake = Math.max(this.fx.shake, 4);
              if (v.speed > 100) this.reportOffense('hit_pedestrian');
            }
          } else {
            ped.x = c.x + nx * (c.r + 7);
            ped.y = c.y + ny * (c.r + 7);
          }
        }
        if (!this.attract && !playerCar) {
          const p = this.player;
          const dx = p.x - c.x;
          const dy = p.y - c.y;
          const d = Math.hypot(dx, dy);
          if (d < c.r + 8 && d > 1e-4) {
            p.x = c.x + (dx / d) * (c.r + 8);
            p.y = c.y + (dy / d) * (c.r + 8);
          }
        }
      }
    }

    // Parked/idle cars block the player on foot.
    if (!this.attract && !playerCar) {
      const p = this.player;
      for (const v of active) {
        if (Math.abs(v.x - p.x) > 60 || Math.abs(v.y - p.y) > 60) continue;
        for (const c of v.circles()) {
          const dx = p.x - c.x;
          const dy = p.y - c.y;
          const d = Math.hypot(dx, dy);
          if (d < c.r + 8 && d > 1e-4) {
            p.x = c.x + (dx / d) * (c.r + 8);
            p.y = c.y + (dy / d) * (c.r + 8);
          }
        }
      }
    }

    // Props.
    for (const prop of this.props.active) {
      for (const v of active) {
        if (Math.abs(v.x - prop.x) > 40 || Math.abs(v.y - prop.y) > 40 || v.speed < 20) continue;
        for (const c of v.circles()) {
          if (Math.hypot(prop.x - c.x, prop.y - c.y) < c.r + prop.r) {
            if (this.props.hit(prop, v.vx, v.vy)) {
              this.fx.emit('debris', prop.x, prop.y, 6, 1.2, prop.kind === 'hydrant' ? '#d62828' : '#2d6a4f');
              if (v === playerCar) sfx.play('thud');
            }
            v.vx *= 0.96;
            v.vy *= 0.96;
          }
        }
      }
      if (!this.attract && !playerCar && !prop.knocked) {
        const p = this.player;
        const dx = p.x - prop.x;
        const dy = p.y - prop.y;
        const d = Math.hypot(dx, dy);
        if (d < prop.r + 8 && d > 1e-4) {
          p.x = prop.x + (dx / d) * (prop.r + 8);
          p.y = prop.y + (dy / d) * (prop.r + 8);
        }
      }
    }
  }

  private onImpact(v: Vehicle, impact: number, x: number, y: number): void {
    v.health = Math.max(0, v.health - impact * 0.05);
    this.fx.emit('spark', x, y, Math.min(14, Math.floor(impact / 25)), 1.4);
    if (v === this.player.vehicle) {
      this.fx.shake = Math.max(this.fx.shake, Math.min(12, impact / 30));
      sfx.play(impact > 180 ? 'crash' : 'thud');
      if (v.dead) this.emitToast(tr('차가 망가졌어요! 내려서 다른 차를 찾으세요.', 'Your car is wrecked! Get out and find another.'), 'bad');
    }
  }

  private onCarCar(a: Vehicle, b: Vehicle, impact: number, x: number, y: number): void {
    if (impact < 40) return;
    a.health = Math.max(0, a.health - impact * 0.04);
    b.health = Math.max(0, b.health - impact * 0.04);
    this.fx.emit('spark', x, y, Math.min(12, Math.floor(impact / 25)), 1.2);
    const pc = this.player.vehicle;
    if (a !== pc && b !== pc) return;
    const other = a === pc ? b : a;
    this.fx.shake = Math.max(this.fx.shake, Math.min(12, impact / 30));
    sfx.play(impact > 150 ? 'crash' : 'thud');
    if (other.model.id === 'police' && impact > 60) this.reportOffense('hit_police');
    else this.director.onCrash(other, impact);
  }

  private reportOffense(offense: Offense): void {
    if (this.wanted.report(offense, this.now)) {
      sfx.play('wanted');
      this.onEvent({ type: 'wanted', level: this.wanted.level });
    }
  }

  private checkSpeeding(dt: number): void {
    this.timers.offense -= dt;
    if (this.timers.offense > 0) return;
    this.timers.offense = 0.5;
    const v = this.player.vehicle;
    if (!v || v.speed < 330 || this.wanted.level > 0) return;
    const cop = this.vehicles.find((c) => c.model.id === 'police' && c.driver === 'ai' && !c.pursuit && dist(c.x, c.y, v.x, v.y) < 340);
    if (cop) {
      this.reportOffense('speeding');
      this.emitToast(tr('과속! 경찰에게 걸렸어요 🚨', 'Speeding! The police spotted you 🚨'), 'bad');
    }
  }

  private onBusted(): void {
    const v = this.player.vehicle;
    if (v) {
      v.vx = v.vy = 0;
      v.throttle = 0;
    }
    this.onEvent({
      type: 'talk',
      launch: {
        scenarioId: 'police_stop',
        npcId: 'brody',
        context: { offense: this.wanted.offense, stars: Math.max(1, this.wanted.level) },
        origin: { kind: 'police' },
      },
    });
  }

  private surfaceAt(x: number, y: number): number {
    if (onRoad(x, y)) return 1;
    if (y > ST_Y[9] + HALF_ROAD + SIDEWALK) return 0.68;
    const b = blockAt(this.city, x, y);
    if (!b) return 0.85;
    const inLot = x > b.x + SIDEWALK && x < b.x + b.w - SIDEWALK && y > b.y + SIDEWALK && y < b.y + b.h - SIDEWALK;
    if (!inLot) return 1;
    return b.district === 'park' || b.district === 'residential' ? 0.78 : 0.95;
  }

  // ── Effects, coins, audio ─────────────────────────────────────────────

  private updateEffects(dt: number): void {
    for (const v of this.vehicles) {
      if (Math.abs(v.x - this.cam.x) > 1100 || Math.abs(v.y - this.cam.y) > 1100) continue;
      if (v.slip > 55 && v.speed > 80) {
        const c = Math.cos(v.angle);
        const s = Math.sin(v.angle);
        const back = v.model.len / 2 - 6;
        const side = v.model.wid / 2 - 3;
        for (const sgn of [-1, 1]) {
          const x = v.x - c * back - s * side * sgn;
          const y = v.y - s * back + c * side * sgn;
          this.fx.addSkid(x, y, x - v.vx * dt, y - v.vy * dt, 1);
        }
        if (Math.random() < 0.35) this.fx.emit('smoke', v.x - c * back, v.y - s * back, 1, 0.4, '#d6d6d6');
      }
      if (v.health < 35 && Math.random() < (v.dead ? 0.5 : 0.15)) this.fx.emit('smoke', v.x + Math.cos(v.angle) * v.model.len * 0.3, v.y + Math.sin(v.angle) * v.model.len * 0.3, 1, 0.3, v.dead ? '#333' : '#888');
      if (v.hornUntil > this.now && v !== this.player.vehicle && dist(v.x, v.y, this.cam.x, this.cam.y) < 500 && Math.random() < 0.02) sfx.play('pop');
    }
    for (const prop of this.props.active) if (prop.spray > 0 && Math.random() < 0.7) this.fx.emit('water', prop.x, prop.y, 2, 1.2);
  }

  private collectCoins(): void {
    const p = this.position;
    const collected = getSave().collected;
    for (const c of this.city.coins) {
      if (Math.abs(c.x - p.x) > 45 || Math.abs(c.y - p.y) > 45) continue;
      if (collected.includes(c.idiomId)) continue;
      if (dist(c.x, c.y, p.x, p.y) < (this.player.vehicle ? 42 : 28)) {
        this.fx.emit('sparkle', c.x, c.y - 8, 24, 1.6);
        sfx.play('coin');
        this.onEvent({ type: 'coin', idiomId: c.idiomId });
        return;
      }
    }
  }

  private updateAudio(): void {
    const v = this.player.vehicle;
    if (v) {
      sfx.setEngine(true, v.speed / v.model.maxSpeed, v.throttle);
      sfx.setSkid(v.slip > 55 && v.speed > 80 ? Math.min(1, v.slip / 200) : 0);
    }
    const horn = this.input.horn && !!v;
    sfx.setHorn(horn);
    if (horn && !this.hornWas && v) this.peds.scare(v.x + Math.cos(v.angle) * 80, v.y + Math.sin(v.angle) * 80, 150, this.now);
    this.hornWas = horn;
    if (this.wanted.level > 0) {
      const d = Math.min(...this.wanted.pursuers.map((c) => dist(c.x, c.y, this.position.x, this.position.y)), 2000);
      sfx.setSiren(d < 1400, 1 - d / 1600);
    } else sfx.setSiren(false);
  }

  // ── Camera & navigation ───────────────────────────────────────────────

  private baseZoom(): number {
    return Math.min(this.width, this.height) / VIEW_HEIGHT;
  }

  private updateCamera(dt: number): void {
    const v = this.player.vehicle;
    const pos = this.position;
    const vx = v ? v.vx : this.player.vx;
    const vy = v ? v.vy : this.player.vy;
    const lead = v ? 0.45 : 0.25;
    let tx = pos.x + clamp(vx * lead, -240, 240);
    let ty = pos.y + clamp(vy * lead, -240, 240);
    tx = clamp(tx, -400, 6400);
    ty = clamp(ty, -400, 6300);
    this.cam.x += (tx - this.cam.x) * damp(5, dt);
    this.cam.y += (ty - this.cam.y) * damp(5, dt);
    const speed01 = v ? Math.min(1, v.speed / 420) : 0;
    const target = this.baseZoom() * (1 - 0.3 * speed01);
    this.cam.zoom += (target - this.cam.zoom) * damp(2, dt);
  }

  private updateAttractCamera(dt: number): void {
    this.attractT += dt;
    const t = this.attractT * 0.025;
    this.cam.x = 3000 + Math.cos(t) * 1900;
    this.cam.y = 2900 + Math.sin(t * 1.3) * 1600;
    this.cam.zoom = this.baseZoom() * 0.72;
  }

  /** Current navigation target: job > manual waypoint > story mission. */
  private target(): Waypoint | null {
    if (this.jobTarget) return this.jobTarget;
    if (this.waypoint) return this.waypoint;
    const placeId = this.storyPlaceId();
    if (!placeId) return null;
    const door = this.placeDoor(placeId);
    return door ? { point: door, label: PLACE_BY_ID.get(placeId)!.name, placeId } : null;
  }

  private romancePlaceId(): string | null {
    const s = getSave();
    return nextRomancePlace(s.romance.stage, s.storyStep);
  }

  private storyPlaceId(): string | null {
    const step = STORY[getSave().storyStep];
    return step ? SCENARIO_BY_ID.get(step.scenarioId)?.placeId ?? null : null;
  }

  private updateRoute(dt: number): void {
    this.timers.route -= dt;
    if (this.timers.route > 0) return;
    this.timers.route = 0.7;
    const t = this.target();
    const pos = this.position;
    if (!t) {
      this.route = null;
      this.gps = null;
      return;
    }
    const key = `${Math.round(t.point.x)},${Math.round(t.point.y)}`;
    const remaining = dist(pos.x, pos.y, t.point.x, t.point.y);
    if (remaining < (this.player.vehicle ? 110 : 60)) {
      if (this.arrivedAt !== key) {
        this.arrivedAt = key;
        this.gps = { text: tr('목적지 도착', 'You have arrived'), icon: 'arrive', distance: 0 };
        this.gpsSay('You have arrived at your destination.');
        if (this.waypoint && this.waypoint.point === t.point) this.waypoint = null;
      }
      this.route = null;
      return;
    }
    if (remaining > 200) this.arrivedAt = '';
    const roads = this.city.roads;
    const plan = planRoute(roads, pos, t.point);
    const pts: Vec[] = [pos, ...plan.nodes.map((id) => roads.node(id)), plan.roadPoint, t.point];
    // With a guide riding along there is no GPS: no route line, no arrows, just their voice.
    const guided = !!this.guide && t === this.jobTarget;
    this.route = guided ? null : pts;

    // Next instruction: first heading change along the node path.
    const nodes = plan.nodes.map((id) => roads.node(id));
    const seq: Vec[] = [...nodes, plan.roadPoint];
    let instruction: Hud['gps'] = null;
    let nextTurn: { dir: 'left' | 'right'; street: string; dist: number; key: string } | null = null;
    for (let i = 1; i < seq.length - 1; i++) {
      const h1 = headingBetween(seq[i - 1], seq[i]);
      const h2 = headingBetween(seq[i], seq[i + 1]);
      if (h1 === h2) continue;
      const sign = turnSign(h1, h2);
      const street = i < nodes.length - 1 ? roads.streetBetween(nodes[i].id, nodes[i + 1].id) : roads.nearestRoadPoint(plan.roadPoint.x, plan.roadPoint.y).seg.name;
      const d = dist(pos.x, pos.y, seq[i].x, seq[i].y);
      const dir = sign > 0 ? 'right' : 'left';
      instruction = {
        text: tr(`${street}에서 ${dir === 'right' ? '우회전' : '좌회전'}`, `Turn ${dir} onto ${street}`),
        icon: dir,
        distance: Math.round(d * 0.3),
      };
      const nodeKey = `${seq[i].x},${seq[i].y}`;
      nextTurn = { dir, street, dist: d, key: nodeKey };
      if (guided) break;
      if (d < (this.player.vehicle ? 230 : 90) && this.announced !== nodeKey) {
        this.announced = nodeKey;
        this.gpsSay(`Turn ${dir} onto ${street}.`);
      }
      break;
    }
    if (guided) {
      const last = nodes[nodes.length - 1] ?? pos;
      const fx = plan.roadPoint.x - last.x;
      const fy = plan.roadPoint.y - last.y;
      const side = fx * (t.point.y - plan.roadPoint.y) - fy * (t.point.x - plan.roadPoint.x) > 0 ? 'right' : 'left';
      const along = roads.pathLength(plan.nodes) + (nodes[0] ? dist(pos.x, pos.y, nodes[0].x, nodes[0].y) : 0) + dist(last.x, last.y, plan.roadPoint.x, plan.roadPoint.y);
      this.gps = null;
      this.updateGuide(nextTurn, along, side);
      return;
    }
    if (!instruction) {
      instruction = { text: tr(`${t.label} 방향으로 직진`, `Continue to ${t.label}`), icon: 'straight', distance: Math.round(remaining * 0.3) };
    }
    this.gps = instruction;
  }

  private gpsSay(text: string): void {
    const save = useGame.getState().save;
    if (!save?.settings.gpsVoice || !this.player.vehicle || this.guide) return;
    this.lastGpsAt = this.now;
    void speakPhrase(text);
  }

  // ── Director host & events ────────────────────────────────────────────

  private host(): DirectorHost {
    // eslint-disable-next-line @typescript-eslint/no-this-alias -- object-literal getters need the engine reference
    const self = this;
    return {
      city: this.city,
      peds: this.peds,
      traffic: this.traffic,
      get now() {
        return self.now;
      },
      get player() {
        return { x: self.position.x, y: self.position.y, vehicle: self.player.vehicle };
      },
      get wantedLevel() {
        return self.wanted.level;
      },
      districtAt: (x, y) => blockAt(this.city, x, y)?.district ?? '',
      talk: (launch) => {
        const v = this.player.vehicle;
        if (v) {
          v.vx *= 0.2;
          v.vy *= 0.2;
        }
        this.onEvent({ type: 'talk', launch });
      },
      toast: (text, tone) => this.emitToast(text, tone),
      setJobTarget: (target) => {
        this.jobTarget = target;
        this.timers.route = 0;
      },
      earn: (amount, reason) => this.onEvent({ type: 'earn', amount, reason }),
      fine: (amount, reason) => this.onEvent({ type: 'fine', amount, reason }),
      report: (offense) => this.reportOffense(offense),
      spawnJobVehicle: (kind) => this.spawnJobVehicle(kind),
      onJobEnded: () => {
        this.jobTarget = null;
      },
      startGuide: (npcId) => {
        this.guide = { npcId, prep: '', now: '', best: Infinity, wrong: 0, asks: 0, arrived: false, lastLine: '', lastAt: this.now, next: null, remaining: Infinity, side: 'right', lineId: 0 };
        this.timers.route = 1.5;
        this.guideSay(pick(["Don't worry, I know a shortcut. I'll tell you where to go!", "I'll give you directions, okay? Just listen!", 'No GPS needed. I know the way!']));
      },
      finishGuide: () => {
        const g = this.guide;
        this.guide = null;
        if (g) this.onEvent({ type: 'hud', hud: { guide: null } });
        return g ? { wrong: g.wrong, asks: g.asks } : null;
      },
      tr,
    };
  }

  private spawnJobVehicle(kind: JobKind): Vehicle {
    const placeId = kind === 'taxi' ? 'cabs' : 'pizzeria';
    const door = this.placeDoor(placeId)!;
    const road = this.city.roads.nearestRoadPoint(door.x, door.y);
    const a = this.city.roads.node(road.seg.a);
    const b = this.city.roads.node(road.seg.b);
    const lane = laneOf(a, b);
    const x = road.x + lane.rx * (HALF_ROAD - 18);
    const y = road.y + lane.ry * (HALF_ROAD - 18);
    if (this.player.vehicle) this.exitVehicle(true);
    const v = new Vehicle(CAR_MODELS[kind === 'taxi' ? 'taxi' : 'van'], x, y, Math.atan2(lane.dy, lane.dx), 'job');
    this.vehicles.push(v);
    this.player.x = x;
    this.player.y = y;
    this.enterVehicle(v);
    this.cam.x = x;
    this.cam.y = y;
    return v;
  }

  private emitToast(text: string, tone: Toast['tone']): void {
    this.onEvent({ type: 'toast', text, tone });
  }

  private emitHud(dt: number): void {
    this.timers.hud -= dt;
    if (this.timers.hud > 0) return;
    this.timers.hud = 0.2;
    this.timers.district -= 0.2;
    if (this.timers.district <= 0) {
      this.timers.district = 1;
      const b = blockAt(this.city, this.position.x, this.position.y);
      const label = b ? DISTRICT_LABEL[b.district] : null;
      this.district = label ? tr(label.ko, label.en) : 'Elden City';
    }
    const v = this.player.vehicle;
    this.onEvent({
      type: 'hud',
      hud: {
        speed: v ? Math.round(v.speed * PX_TO_KMH) : 0,
        inVehicle: !!v,
        vehicleName: v ? v.model.name : '',
        vehicleHealth: v ? Math.round(v.health) : 100,
        clock: this.clock,
        wanted: this.wanted.level,
        prompt: this.prompt ? { key: 'E', text: this.prompt.text } : null,
        gps: this.gps,
        job: this.director.jobHud(),
        companion: this.companion ? (this.companion.wantsTalk ? 'wants' : 'here') : 'none',
        district: this.district,
      },
    });
  }

  // ── Drawing ───────────────────────────────────────────────────────────

  private markers(): Marker[] {
    const out: Marker[] = [];
    if (this.attract) return out;
    const storyPlace = this.storyPlaceId();
    const romancePlace = this.romancePlaceId();
    const p = this.position;
    for (const site of this.city.places.values()) {
      if (Math.abs(site.door.x - p.x) > 1400 || Math.abs(site.door.y - p.y) > 1400) continue;
      const kind = site.placeId === storyPlace ? 'story' : site.placeId === romancePlace ? 'romance' : 'place';
      out.push({ x: site.door.x, y: site.door.y, kind, icon: kind === 'romance' ? '💕' : PLACE_BY_ID.get(site.placeId)!.icon });
    }
    const job = this.director.job;
    const hidden = !!this.guide && !!job?.dest && dist(job.dest.point.x, job.dest.point.y, p.x, p.y) > 450;
    if (job?.dest && job.phase === 'deliver' && !hidden) out.push({ x: job.dest.point.x, y: job.dest.point.y, kind: job.kind === 'pizza' ? 'door' : 'job', icon: job.kind === 'pizza' ? '🍕' : '🏁' });
    return out;
  }

  private draw(): void {
    const save = useGame.getState().save;
    const quality = this.attract ? 'high' : save?.settings.graphics ?? 'high';
    const collected = save?.collected ?? [];
    const p = this.player;
    const target = this.attract ? null : this.target();
    const guidedFar = !!this.guide && !!target && dist(target.point.x, target.point.y, this.position.x, this.position.y) > 450;
    this.renderer.render(
      {
        cam: this.cam,
        width: this.width,
        height: this.height,
        time: this.now,
        clock: this.clock,
        quality,
        city: this.city,
        vehicles: this.vehicles,
        peds: this.peds.peds,
        props: this.props.active,
        fx: this.fx,
        player: {
          x: p.x,
          y: p.y,
          angle: p.angle,
          phase: p.phase,
          moving: p.moving,
          look: this.attract ? { skin: '#eec39a', hair: '#1b1b1f', shirt: '#e4572e', pants: '#2b3a55', bald: false } : this.playerLook(),
          vehicle: this.attract ? null : p.vehicle,
        },
        markers: this.markers(),
        coins: this.attract ? [] : this.city.coins.filter((c) => !collected.includes(c.idiomId) && Math.abs(c.x - this.cam.x) < 1400 && Math.abs(c.y - this.cam.y) < 1400),
        waypoint: guidedFar ? null : (target?.point ?? null),
      },
      this.dpr,
    );
    if (this.attract || !this.mctx || !this.opts.minimap) return;

    const size = this.opts.minimap.clientWidth;
    const markers: MinimapMarker[] = [];
    const storyPlace = this.storyPlaceId();
    for (const site of this.city.places.values()) {
      const story = site.placeId === storyPlace;
      const romance = !story && site.placeId === this.romancePlaceId();
      markers.push({ x: site.door.x, y: site.door.y, icon: romance ? '💕' : PLACE_BY_ID.get(site.placeId)!.icon, color: story ? '#ffcc00' : romance ? '#ec4899' : '#0ea5e9', pinned: story });
    }
    for (const e of this.director.encounters) markers.push({ x: e.ped.x, y: e.ped.y, icon: e.ped.icon ?? '❗', color: '#f59e0b', pinned: false });
    if (target && !guidedFar) markers.push({ x: target.point.x, y: target.point.y, icon: '📍', color: '#d946ef', pinned: true });
    const heading = p.vehicle ? p.vehicle.angle : p.angle;
    drawMinimap(this.mctx, size, this.dpr, getMapImage(), this.position, heading, MINIMAP_SCALE * (p.vehicle ? 1.3 : 1), markers, this.route, this.wanted.pursuers.map((c) => ({ x: c.x, y: c.y })), this.now);
  }
}

