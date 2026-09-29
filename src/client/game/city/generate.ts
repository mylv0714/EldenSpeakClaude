// Procedural city builder. Deterministic: same seed → same city everywhere.
import { IDIOMS } from '@shared/content/idioms';
import { PLACE_BY_ID } from '@shared/content/city';
import { hash2, inset, type Rect, Rng, shade, type Vec } from '../math';
import {
  AVE_X,
  type District,
  districtAt,
  HALF_ROAD,
  LAND,
  MERGED,
  PLACE_SITES,
  SIDEWALK,
  ST_Y,
  type Side,
} from './layout';
import { RoadGraph } from './roads';

export type BuildingStyle = 'tower' | 'office' | 'house' | 'warehouse' | 'container' | 'shop' | 'landmark' | 'hangar' | 'truck';

export interface Building extends Rect {
  /** Height above the ground (the footprint is x, y, w, h). */
  height: number;
  roof: string;
  wall: string;
  style: BuildingStyle;
  seed: number;
  placeId?: string;
  sign?: string;
  icon?: string;
}

export interface Tree {
  x: number;
  y: number;
  r: number;
  h: number;
  kind: 'round' | 'palm' | 'pine';
  color: string;
}

export type GroundKind = 'fill' | 'ellipse' | 'parking' | 'runway' | 'plaza' | 'pier' | 'pool' | 'path' | 'field';

export interface Ground extends Rect {
  kind: GroundKind;
  color: string;
  /** parking: stalls run vertically. */
  vertical?: boolean;
}

export interface Block extends Rect {
  i: number;
  j: number;
  district: District;
  merged: boolean;
}

export interface PlaceSite {
  placeId: string;
  door: Vec;
  side: Side;
  building: Building;
}

export type PropKind = 'hydrant' | 'trash' | 'bench' | 'mailbox' | 'cone';

export type Collider = { kind: 'rect'; rect: Rect } | { kind: 'circle'; x: number; y: number; r: number };

export class StaticGrid {
  private readonly cells = new Map<number, Collider[]>();
  constructor(private readonly size = 256) {}

  private key(cx: number, cy: number) {
    return (cx + 1000) * 4096 + (cy + 1000);
  }

  insert(c: Collider): void {
    const b = c.kind === 'rect' ? c.rect : { x: c.x - c.r, y: c.y - c.r, w: c.r * 2, h: c.r * 2 };
    for (let cx = Math.floor(b.x / this.size); cx <= Math.floor((b.x + b.w) / this.size); cx++) {
      for (let cy = Math.floor(b.y / this.size); cy <= Math.floor((b.y + b.h) / this.size); cy++) {
        const k = this.key(cx, cy);
        const list = this.cells.get(k);
        if (list) list.push(c);
        else this.cells.set(k, [c]);
      }
    }
  }

  /** Colliders near a point; may contain duplicates for large shapes (harmless for push-out). */
  query(x: number, y: number, r: number, out: Collider[]): Collider[] {
    out.length = 0;
    for (let cx = Math.floor((x - r) / this.size); cx <= Math.floor((x + r) / this.size); cx++) {
      for (let cy = Math.floor((y - r) / this.size); cy <= Math.floor((y + r) / this.size); cy++) {
        const list = this.cells.get(this.key(cx, cy));
        if (list) for (const c of list) out.push(c);
      }
    }
    return out;
  }
}

export interface City {
  roads: RoadGraph;
  blocks: Block[];
  buildings: Building[];
  trees: Tree[];
  ground: Ground[];
  places: Map<string, PlaceSite>;
  parkedCars: { x: number; y: number; angle: number }[];
  houseDoors: Vec[];
  lamps: Vec[];
  props: { x: number; y: number; kind: PropKind }[];
  coins: { x: number; y: number; idiomId: string }[];
  boats: { x: number; y: number; angle: number; len: number; color: string }[];
  planes: { x: number; y: number; angle: number }[];
  /** Sidewalk center-line loops for pedestrians. */
  rings: { rect: Rect; block: Block }[];
  colliders: StaticGrid;
  water: Rect[];
  lake: { x: number; y: number; r: number };
  fountain: { x: number; y: number; r: number };
}

// ── Palettes ───────────────────────────────────────────────────────────────
const GROUND: Record<District, string> = {
  downtown: '#b7b1a6',
  commercial: '#bfb8ab',
  residential: '#7fae66',
  industrial: '#8b8a86',
  harbor: '#8f8b84',
  park: '#6fa35a',
  beach: '#e2d3a7',
  airport: '#7d8187',
};
const TOWER_ROOFS = ['#8fa3b8', '#6f8499', '#a5b4c4', '#7d8ea3', '#5e6f82', '#b8c4d0', '#90a0a8', '#6b7b8f'];
const MID_ROOFS = ['#c9b79c', '#b5a28a', '#d6c4a8', '#a89276', '#bfa98a', '#9f8b78', '#c4ad96'];
const HOUSE_ROOFS = ['#b8574a', '#a0493d', '#7d5a50', '#5c6b73', '#8a6f5a', '#c27c5e', '#6e7f5a'];
const WAREHOUSE_ROOFS = ['#8c8f94', '#9aa0a6', '#7b8087', '#a3a7ab'];
const CONTAINERS = ['#c0392b', '#2471a3', '#d68910', '#1e8449', '#7d3c98', '#b9770e', '#566573'];
const BEACH_SHOPS = ['#f6c1a5', '#a8e6cf', '#ffd3b6', '#dcedc1', '#ffaaa5', '#bde0fe'];
const TREE_GREENS = ['#3f7d3a', '#4a8a3f', '#35703a', '#5a9444', '#2f6b35'];

const SIGN_PLACES = new Set(Object.keys(PLACE_SITES));

// ── Helpers ────────────────────────────────────────────────────────────────

/** Recursively splits a rect into parcels no larger than `max`, leaving `gap` alleys. */
function bsp(r: Rect, max: number, gap: number, rng: Rng, out: Rect[] = []): Rect[] {
  if (r.w < 24 || r.h < 24) return out;
  if (r.w <= max && r.h <= max) {
    out.push(r);
    return out;
  }
  const t = rng.range(0.38, 0.62);
  if (r.w >= r.h) {
    const a = Math.round(r.w * t - gap / 2);
    bsp({ x: r.x, y: r.y, w: a, h: r.h }, max, gap, rng, out);
    bsp({ x: r.x + a + gap, y: r.y, w: r.w - a - gap, h: r.h }, max, gap, rng, out);
  } else {
    const a = Math.round(r.h * t - gap / 2);
    bsp({ x: r.x, y: r.y, w: r.w, h: a }, max, gap, rng, out);
    bsp({ x: r.x, y: r.y + a + gap, w: r.w, h: r.h - a - gap }, max, gap, rng, out);
  }
  return out;
}

function carve(lot: Rect, side: Side, along: number, w: number, d: number): Rect {
  switch (side) {
    case 'N':
      return { x: lot.x + (lot.w - w) * along, y: lot.y, w, h: d };
    case 'S':
      return { x: lot.x + (lot.w - w) * along, y: lot.y + lot.h - d, w, h: d };
    case 'W':
      return { x: lot.x, y: lot.y + (lot.h - w) * along, w: d, h: w };
    case 'E':
      return { x: lot.x + lot.w - d, y: lot.y + (lot.h - w) * along, w: d, h: w };
  }
}

/** The lot minus a carved rect on one side, as up to three rects. */
function remainder(lot: Rect, c: Rect, side: Side, gap: number): Rect[] {
  const out: Rect[] = [];
  const add = (r: Rect) => r.w > 30 && r.h > 30 && out.push(r);
  if (side === 'N' || side === 'S') {
    const bandY = c.y;
    add({ x: lot.x, y: bandY, w: c.x - lot.x - gap, h: c.h });
    add({ x: c.x + c.w + gap, y: bandY, w: lot.x + lot.w - (c.x + c.w + gap), h: c.h });
    if (side === 'N') add({ x: lot.x, y: c.y + c.h + gap, w: lot.w, h: lot.y + lot.h - (c.y + c.h + gap) });
    else add({ x: lot.x, y: lot.y, w: lot.w, h: c.y - gap - lot.y });
  } else {
    const bandX = c.x;
    add({ x: bandX, y: lot.y, w: c.w, h: c.y - lot.y - gap });
    add({ x: bandX, y: c.y + c.h + gap, w: c.w, h: lot.y + lot.h - (c.y + c.h + gap) });
    if (side === 'W') add({ x: c.x + c.w + gap, y: lot.y, w: lot.x + lot.w - (c.x + c.w + gap), h: lot.h });
    else add({ x: lot.x, y: lot.y, w: c.x - gap - lot.x, h: lot.h });
  }
  return out;
}

function doorFor(lot: Rect, r: Rect, side: Side): Vec {
  switch (side) {
    case 'N':
      return { x: r.x + r.w / 2, y: lot.y - SIDEWALK / 2 };
    case 'S':
      return { x: r.x + r.w / 2, y: lot.y + lot.h + SIDEWALK / 2 };
    case 'W':
      return { x: lot.x - SIDEWALK / 2, y: r.y + r.h / 2 };
    case 'E':
      return { x: lot.x + lot.w + SIDEWALK / 2, y: r.y + r.h / 2 };
  }
}

/** Which lot edge a parcel touches (for house doors), if any. */
function touchingSide(lot: Rect, p: Rect): Side | null {
  if (Math.abs(p.y - lot.y) < 2) return 'N';
  if (Math.abs(p.y + p.h - (lot.y + lot.h)) < 2) return 'S';
  if (Math.abs(p.x - lot.x) < 2) return 'W';
  if (Math.abs(p.x + p.w - (lot.x + lot.w)) < 2) return 'E';
  return null;
}

// ── Builder ────────────────────────────────────────────────────────────────

export function generateCity(): City {
  const rng = new Rng(20260926);
  const roads = new RoadGraph();
  const city: City = {
    roads,
    blocks: [],
    buildings: [],
    trees: [],
    ground: [],
    places: new Map(),
    parkedCars: [],
    houseDoors: [],
    lamps: [],
    props: [],
    coins: [],
    boats: [],
    planes: [],
    rings: [],
    colliders: new StaticGrid(),
    water: [],
    lake: { x: 0, y: 0, r: 0 },
    fountain: { x: 0, y: 0, r: 0 },
  };
  let seed = 1;

  const building = (r: Rect, h: number, roof: string, style: BuildingStyle, extra: Partial<Building> = {}): Building => {
    const b: Building = { ...r, height: h, roof, wall: shade(roof, -0.28), style, seed: seed++, ...extra };
    city.buildings.push(b);
    return b;
  };
  const tree = (x: number, y: number, r: number, kind: Tree['kind'] = 'round') =>
    city.trees.push({ x, y, r, h: kind === 'palm' ? 62 : kind === 'pine' ? 50 : 34 + r, kind, color: rng.pick(TREE_GREENS) });
  const ground = (r: Rect, kind: GroundKind, color: string, vertical?: boolean) => city.ground.push({ ...r, kind, color, vertical });

  function parking(p: Rect) {
    ground(p, 'parking', '#4a4d52', p.h > p.w);
    const vertical = p.h > p.w;
    const along = vertical ? p.h : p.w;
    const across = vertical ? p.w : p.h;
    const rows = across >= 110 ? 2 : 1;
    const slots = Math.floor((along - 10) / 30);
    for (let s = 0; s < slots; s++) {
      for (let row = 0; row < rows; row++) {
        if (!rng.chance(0.42)) continue;
        const a = (vertical ? p.y : p.x) + 20 + s * 30;
        const b = rows === 1 ? (vertical ? p.x + p.w / 2 : p.y + p.h / 2) : (vertical ? p.x : p.y) + (row === 0 ? 28 : across - 28);
        city.parkedCars.push(
          vertical
            ? { x: b, y: a, angle: row === 0 ? 0 : Math.PI }
            : { x: a, y: b, angle: row === 0 ? Math.PI / 2 : -Math.PI / 2 },
        );
      }
    }
  }

  function fillDistrict(region: Rect, district: District, lot: Rect) {
    switch (district) {
      case 'downtown':
        for (const p of bsp(region, 230, 14, rng)) {
          const roll = rng.next();
          if (roll < 0.1 && p.w > 110 && p.h > 90) {
            ground(p, 'plaza', '#cfc8bb');
            tree(p.x + p.w * 0.3, p.y + p.h * 0.5, 16);
            tree(p.x + p.w * 0.7, p.y + p.h * 0.5, 16);
          } else if (roll < 0.18 && p.w > 100 && p.h > 90) parking(p);
          else building(inset(p, 3), rng.range(170, 470), rng.pick(TOWER_ROOFS), 'tower');
        }
        break;
      case 'commercial':
        for (const p of bsp(region, 170, 10, rng)) {
          const roll = rng.next();
          if (roll < 0.2 && p.w > 90 && p.h > 90) parking(p);
          else building(inset(p, 3), rng.range(55, 170), rng.pick(MID_ROOFS), 'office');
        }
        break;
      case 'residential':
        for (const p of bsp(region, 128, 0, rng)) {
          const m = rng.range(14, 22);
          const house = inset(p, m);
          if (house.w < 30 || house.h < 30) continue;
          building(house, rng.range(30, 55), rng.pick(HOUSE_ROOFS), 'house');
          const side = touchingSide(lot, p);
          if (side) city.houseDoors.push(doorFor(lot, house, side));
          if (rng.chance(0.22) && p.w > 100) ground({ x: p.x + 6, y: p.y + p.h - 26, w: 34, h: 20 }, 'pool', '#4fb3d9');
          if (rng.chance(0.7)) tree(p.x + rng.range(10, 18), p.y + rng.range(10, 18), rng.range(12, 18));
        }
        break;
      case 'industrial':
      case 'harbor':
        for (const p of bsp(region, 250, 18, rng)) {
          const roll = rng.next();
          const containerChance = district === 'harbor' ? 0.5 : 0.25;
          if (roll < containerChance) {
            ground(p, 'fill', '#7c7a75');
            for (let y = p.y + 8; y + 26 < p.y + p.h; y += 34) {
              for (let x = p.x + 8; x + 60 < p.x + p.w; x += 68) {
                if (rng.chance(0.75)) building({ x, y, w: 60, h: 26 }, rng.range(22, 44), rng.pick(CONTAINERS), 'container');
              }
            }
          } else if (roll < containerChance + 0.15 && p.w > 100 && p.h > 90) parking(p);
          else building(inset(p, 8), rng.range(45, 85), rng.pick(WAREHOUSE_ROOFS), 'warehouse');
        }
        break;
      case 'beach':
        for (const p of bsp(region, 150, 22, rng)) {
          if (rng.chance(0.35)) {
            tree(p.x + p.w * 0.3, p.y + p.h * 0.4, 18, 'palm');
            tree(p.x + p.w * 0.7, p.y + p.h * 0.6, 18, 'palm');
          } else building(inset(p, 10), rng.range(26, 46), rng.pick(BEACH_SHOPS), 'shop');
        }
        break;
      default:
        break;
    }
  }

  // Land and water.
  const land = LAND;
  ground(land, 'fill', '#c8c2b5');
  city.water.push(
    { x: -3000, y: -3000, w: 12000, h: 3000 + land.y },
    { x: -3000, y: land.y + land.h, w: 12000, h: 3000 },
    { x: -3000, y: land.y, w: 3000 + land.x, h: land.h },
    { x: land.x + land.w, y: land.y, w: 3000, h: land.h },
  );

  // Edge zones outside the outer ring road.
  const top = ST_Y[0] - HALF_ROAD;
  const bottom = ST_Y[9] + HALF_ROAD;
  const left = AVE_X[0] - HALF_ROAD;
  const right = AVE_X[9] + HALF_ROAD;
  ground({ x: land.x, y: land.y, w: land.w, h: top - land.y }, 'fill', '#6d9e57');
  ground({ x: right, y: land.y, w: land.x + land.w - right, h: bottom - land.y }, 'fill', '#6d9e57');
  ground({ x: land.x, y: top, w: left - land.x, h: bottom - top }, 'fill', '#8a847a');
  ground({ x: land.x, y: bottom, w: land.w, h: land.y + land.h - bottom }, 'fill', '#ead9a6');
  // Sidewalks along the outside of the ring road.
  ground({ x: left - SIDEWALK, y: top - SIDEWALK, w: right - left + SIDEWALK * 2, h: SIDEWALK }, 'fill', '#c9c6bf');
  ground({ x: left - SIDEWALK, y: bottom, w: right - left + SIDEWALK * 2, h: SIDEWALK }, 'fill', '#c9c6bf');
  ground({ x: left - SIDEWALK, y: top, w: SIDEWALK, h: bottom - top }, 'fill', '#c9c6bf');
  ground({ x: right, y: top, w: SIDEWALK, h: bottom - top }, 'fill', '#c9c6bf');
  for (let x = land.x + 40; x < land.x + land.w - 40; x += rng.range(55, 90)) {
    tree(x, rng.range(land.y + 30, top - SIDEWALK - 26), rng.range(16, 24), 'pine');
    if (rng.chance(0.5)) tree(x + 20, rng.range(land.y + 30, top - SIDEWALK - 26), rng.range(14, 20), 'pine');
  }
  for (let y = top + 40; y < bottom - 40; y += rng.range(60, 100)) tree(rng.range(right + SIDEWALK + 24, land.x + land.w - 30), y, rng.range(16, 22), 'round');
  for (let x = land.x + 60; x < land.x + land.w - 60; x += rng.range(120, 220)) tree(x, rng.range(bottom + SIDEWALK + 40, land.y + land.h - 60), 20, 'palm');
  // Docks: piers and boats on the west side.
  for (const py of [1600, 2250, 2900, 3550]) {
    ground({ x: land.x - 170, y: py, w: 190, h: 44 }, 'pier', '#9b7653');
    city.boats.push({ x: land.x - 110, y: py + 70, angle: 0, len: rng.range(60, 90), color: rng.pick(['#ffffff', '#e74c3c', '#2e86c1', '#f4d03f']) });
  }
  for (let k = 0; k < 6; k++) city.boats.push({ x: rng.range(land.x + 200, land.x + land.w - 200), y: land.y + land.h + rng.range(90, 400), angle: rng.range(-0.4, 0.4), len: rng.range(40, 70), color: rng.pick(['#ffffff', '#e74c3c', '#f4d03f']) });

  // Blocks.
  const mergedAt = (i: number, j: number) => MERGED.find((m) => i >= m.i0 && i <= m.i1 && j >= m.j0 && j <= m.j1);
  for (let j = 0; j < 9; j++) {
    for (let i = 0; i < 9; i++) {
      const m = mergedAt(i, j);
      if (m && (i !== m.i0 || j !== m.j0)) continue;
      const i1 = m ? m.i1 : i;
      const j1 = m ? m.j1 : j;
      const x0 = AVE_X[i] + HALF_ROAD;
      const y0 = ST_Y[j] + HALF_ROAD;
      const block: Block = {
        x: x0,
        y: y0,
        w: AVE_X[i1 + 1] - HALF_ROAD - x0,
        h: ST_Y[j1 + 1] - HALF_ROAD - y0,
        i,
        j,
        district: m ? m.name : districtAt(i, j),
        merged: !!m,
      };
      city.blocks.push(block);
      city.rings.push({ rect: inset(block, SIDEWALK / 2), block });
    }
  }

  for (const block of city.blocks) {
    const lot = inset(block, SIDEWALK);
    ground(block, 'fill', '#c9c6bf');
    ground(lot, 'fill', GROUND[block.district]);

    // Landmark (place) buildings carve their spot first.
    let regions: Rect[] = [lot];
    for (const [placeId, site] of Object.entries(PLACE_SITES)) {
      const here = site.area ? block.merged && block.district === site.area : !block.merged && site.i === block.i && site.j === block.j;
      if (!here) continue;
      const r = carve(lot, site.side, site.along ?? 0.5, site.w, site.d);
      const place = PLACE_BY_ID.get(placeId)!;
      const b = building(r, site.h, site.roof, placeId === 'foodtruck' ? 'truck' : 'landmark', {
        placeId,
        sign: SIGN_PLACES.has(placeId) ? place.name : undefined,
        icon: place.icon,
        wall: shade(site.roof, -0.35),
      });
      city.places.set(placeId, { placeId, door: doorFor(lot, r, site.side), side: site.side, building: b });
      if (!block.merged) regions = regions.flatMap((reg) => remainder(reg, r, site.side, 12));
    }

    if (block.district === 'park') buildPark(lot);
    else if (block.district === 'airport') buildAirport(lot);
    else for (const reg of regions) fillDistrict(reg, block.district, lot);

    // Street furniture along the sidewalks.
    const sides: [number, number, number, number][] = [
      [block.x, block.y + 5, block.w, 0],
      [block.x, block.y + block.h - 5, block.w, 0],
      [block.x + 5, block.y, block.h, 1],
      [block.x + block.w - 5, block.y, block.h, 1],
    ];
    for (const [sx, sy, len, vertical] of sides) {
      for (let t = 90; t < len - 60; t += rng.range(170, 230)) city.lamps.push(vertical ? { x: sx, y: sy + t } : { x: sx + t, y: sy });
      const n = rng.int(0, 2);
      for (let k = 0; k < n; k++) {
        const t = rng.range(60, len - 60);
        const kind = rng.pick<PropKind>(['hydrant', 'trash', 'trash', 'bench', 'mailbox']);
        const off = vertical ? (sx < block.x + block.w / 2 ? 4 : -4) : sy < block.y + block.h / 2 ? 4 : -4;
        city.props.push(vertical ? { x: sx + off, y: sy + t, kind } : { x: sx + t, y: sy + off, kind });
      }
      if (block.district === 'downtown' || block.district === 'commercial') {
        for (let t = 70; t < len - 50; t += rng.range(120, 170)) {
          const inward = 13;
          if (vertical) tree(sx + (sx < block.x + block.w / 2 ? inward - 5 : -inward + 5), sy + t, rng.range(13, 17));
          else tree(sx + t, sy + (sy < block.y + block.h / 2 ? inward - 5 : -inward + 5), rng.range(13, 17));
        }
      }
    }
  }

  function buildPark(lot: Rect) {
    const cx = lot.x + lot.w / 2;
    const cy = lot.y + lot.h / 2;
    ground({ x: lot.x, y: cy - 14, w: lot.w, h: 28 }, 'path', '#d9cfb8');
    ground({ x: cx - 14, y: lot.y, w: 28, h: lot.h }, 'path', '#d9cfb8');
    ground({ x: lot.x + 40, y: lot.y + 40, w: lot.w * 0.36, h: lot.h * 0.3 }, 'field', '#5f9a4c');
    city.lake = { x: lot.x + lot.w * 0.7, y: lot.y + lot.h * 0.7, r: 150 };
    ground({ x: city.lake.x - 160, y: city.lake.y - 135, w: 320, h: 270 }, 'ellipse', '#3f8fc0');
    city.fountain = { x: cx, y: cy, r: 34 };
    city.colliders.insert({ kind: 'circle', x: city.lake.x, y: city.lake.y, r: city.lake.r - 12 });
    city.colliders.insert({ kind: 'circle', ...city.fountain });
    for (let k = 0; k < 110; k++) {
      const x = rng.range(lot.x + 20, lot.x + lot.w - 20);
      const y = rng.range(lot.y + 20, lot.y + lot.h - 20);
      if (Math.abs(x - cx) < 40 || Math.abs(y - cy) < 40) continue;
      if (Math.hypot(x - city.lake.x, (y - city.lake.y) * 1.15) < 190) continue;
      if (x < lot.x + 40 + lot.w * 0.36 + 20 && y < lot.y + 40 + lot.h * 0.3 + 20 && x > lot.x + 20 && y > lot.y + 20) continue;
      if (y < lot.y + 70 && Math.abs(x - (lot.x + (lot.w - 70) * 0.3 + 35)) < 90) continue;
      tree(x, y, rng.range(16, 26));
    }
    for (let t = lot.x + 60; t < lot.x + lot.w - 60; t += 140) city.props.push({ x: t, y: cy - 24, kind: 'bench' });
  }

  function buildAirport(lot: Rect) {
    const terminal = city.places.get('airport')!.building;
    const runway = { x: lot.x + lot.w - 230, y: lot.y + 50, w: 110, h: lot.h - 100 };
    ground(runway, 'runway', '#43464b');
    ground({ x: terminal.x + terminal.w + 20, y: terminal.y + terminal.h / 2 + 60, w: runway.x - terminal.x - terminal.w - 20, h: 60 }, 'runway', '#55585d');
    building({ x: lot.x + 330, y: lot.y + 90, w: 170, h: 120 }, 70, '#b7bcc2', 'hangar');
    building({ x: lot.x + 330, y: lot.y + lot.h - 230, w: 170, h: 120 }, 70, '#b7bcc2', 'hangar');
    building({ x: terminal.x + terminal.w + 20, y: terminal.y + terminal.h / 2 - 40, w: 44, h: 44 }, 230, '#dfe6ec', 'tower');
    for (const [dx, dy, a] of [
      [420, 0.38, -Math.PI / 2],
      [420, 0.6, -Math.PI / 2],
      [620, 0.3, Math.PI],
      [980, 0.72, 0],
    ] as const) {
      const p = { x: lot.x + dx, y: lot.y + lot.h * dy, angle: a };
      city.planes.push(p);
      city.colliders.insert({ kind: 'circle', x: p.x, y: p.y, r: 46 });
    }
    parking({ x: lot.x + 10, y: lot.y + 20, w: 200, h: terminal.y - lot.y - 50 });
    parking({ x: lot.x + 10, y: terminal.y + terminal.h + 30, w: 200, h: lot.y + lot.h - (terminal.y + terminal.h) - 50 });
  }

  // Colliders.
  for (const b of city.buildings) city.colliders.insert({ kind: 'rect', rect: b });
  for (const w of city.water) city.colliders.insert({ kind: 'rect', rect: w });
  for (const t of city.trees) city.colliders.insert({ kind: 'circle', x: t.x, y: t.y, r: t.kind === 'palm' ? 5 : 6 });

  // Word coins: spread over sidewalks, parks and the beach, spaced apart.
  const spots: Vec[] = [];
  const tryAdd = (p: Vec) => {
    if (spots.length >= IDIOMS.length) return;
    if (spots.some((s) => Math.hypot(s.x - p.x, s.y - p.y) < 420)) return;
    spots.push(p);
  };
  for (let k = 0; k < 4000 && spots.length < IDIOMS.length; k++) {
    const ring = rng.pick(city.rings);
    const r = ring.rect;
    const t = rng.next();
    const edge = rng.int(0, 3);
    tryAdd(
      edge === 0 ? { x: r.x + r.w * t, y: r.y } : edge === 1 ? { x: r.x + r.w, y: r.y + r.h * t } : edge === 2 ? { x: r.x + r.w * t, y: r.y + r.h } : { x: r.x, y: r.y + r.h * t },
    );
  }
  spots.forEach((p, idx) => city.coins.push({ x: p.x, y: p.y, idiomId: IDIOMS[idx].id }));

  // Stable order for window-light hashing.
  city.buildings.forEach((b) => (b.seed = Math.floor(hash2(b.x, b.y) * 1e9)));
  return city;
}

/** Road surface test (centerline half-width), for speed and traffic logic. */
export function onRoad(x: number, y: number): boolean {
  const top = ST_Y[0] - HALF_ROAD;
  const bottom = ST_Y[9] + HALF_ROAD;
  const left = AVE_X[0] - HALF_ROAD;
  const right = AVE_X[9] + HALF_ROAD;
  if (x < left || x > right || y < top || y > bottom) return false;
  // Merged areas (airport, park) have no interior roads.
  for (const m of MERGED) {
    if (x > AVE_X[m.i0] + HALF_ROAD && x < AVE_X[m.i1 + 1] - HALF_ROAD && y > ST_Y[m.j0] + HALF_ROAD && y < ST_Y[m.j1 + 1] - HALF_ROAD) return false;
  }
  return AVE_X.some((ax) => Math.abs(x - ax) <= HALF_ROAD) || ST_Y.some((sy) => Math.abs(y - sy) <= HALF_ROAD);
}

/** Block containing a point (sidewalk included), if any. */
export function blockAt(city: City, x: number, y: number): Block | undefined {
  return city.blocks.find((b) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h);
}
