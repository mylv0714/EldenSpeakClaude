import { AVENUES, STREETS } from '@shared/content/city';
import type { Heading, RouteStep } from '@shared/types';
import { clamp, type Vec } from '../math';
import { AVE_X, HALF_ROAD, LANE_OFFSET, MERGED, ST_Y } from './layout';

export interface RoadNode {
  id: number;
  i: number;
  j: number;
  x: number;
  y: number;
  links: number[];
}

export interface RoadSegment {
  a: number;
  b: number;
  horizontal: boolean;
  name: string;
}

const N = 10;
const idOf = (i: number, j: number) => i * N + j;
const segKey = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`);

export const HEADING_VEC: Record<Heading, Vec> = {
  north: { x: 0, y: -1 },
  south: { x: 0, y: 1 },
  east: { x: 1, y: 0 },
  west: { x: -1, y: 0 },
};

export class RoadGraph {
  readonly nodes: (RoadNode | null)[] = [];
  readonly segments: RoadSegment[] = [];

  constructor() {
    const removed = new Set<string>();
    for (const m of MERGED) {
      for (let a = m.i0 + 1; a <= m.i1; a++) for (let j = m.j0; j <= m.j1; j++) removed.add(segKey(idOf(a, j), idOf(a, j + 1)));
      for (let s = m.j0 + 1; s <= m.j1; s++) for (let i = m.i0; i <= m.i1; i++) removed.add(segKey(idOf(i, s), idOf(i + 1, s)));
    }
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) this.nodes[idOf(i, j)] = { id: idOf(i, j), i, j, x: AVE_X[i], y: ST_Y[j], links: [] };

    const link = (a: number, b: number, horizontal: boolean, name: string) => {
      if (removed.has(segKey(a, b))) return;
      this.nodes[a]!.links.push(b);
      this.nodes[b]!.links.push(a);
      this.segments.push({ a, b, horizontal, name });
    };
    for (let j = 0; j < N; j++) for (let i = 0; i < N - 1; i++) link(idOf(i, j), idOf(i + 1, j), true, STREETS[j]);
    for (let i = 0; i < N; i++) for (let j = 0; j < N - 1; j++) link(idOf(i, j), idOf(i, j + 1), false, AVENUES[i]);
    for (let k = 0; k < this.nodes.length; k++) if (this.nodes[k]!.links.length === 0) this.nodes[k] = null;
  }

  node(id: number): RoadNode {
    return this.nodes[id]!;
  }

  get liveNodes(): RoadNode[] {
    return this.nodes.filter((n): n is RoadNode => !!n);
  }

  nearestNode(x: number, y: number): RoadNode {
    let best: RoadNode | null = null;
    let bd = Infinity;
    for (const n of this.nodes) {
      if (!n) continue;
      const d = (n.x - x) ** 2 + (n.y - y) ** 2;
      if (d < bd) {
        bd = d;
        best = n;
      }
    }
    return best!;
  }

  /** Closest point on any road centerline. */
  nearestRoadPoint(x: number, y: number): { seg: RoadSegment; x: number; y: number; dist: number } {
    let best = { seg: this.segments[0], x: 0, y: 0, dist: Infinity };
    for (const seg of this.segments) {
      const a = this.node(seg.a);
      const b = this.node(seg.b);
      const px = seg.horizontal ? clamp(x, Math.min(a.x, b.x), Math.max(a.x, b.x)) : a.x;
      const py = seg.horizontal ? a.y : clamp(y, Math.min(a.y, b.y), Math.max(a.y, b.y));
      const d = Math.hypot(px - x, py - y);
      if (d < best.dist) best = { seg, x: px, y: py, dist: d };
    }
    return best;
  }

  streetBetween(a: number, b: number): string {
    const na = this.node(a);
    const nb = this.node(b);
    return na.j === nb.j ? STREETS[na.j] : AVENUES[na.i];
  }

  /** A* shortest path between nodes (inclusive). */
  path(from: number, to: number): number[] {
    if (from === to) return [from];
    const goal = this.node(to);
    const g = new Map<number, number>([[from, 0]]);
    const came = new Map<number, number>();
    const open = new Set<number>([from]);
    const h = (id: number) => Math.abs(this.node(id).x - goal.x) + Math.abs(this.node(id).y - goal.y);
    while (open.size > 0) {
      let cur = -1;
      let bestF = Infinity;
      for (const id of open) {
        const f = g.get(id)! + h(id);
        if (f < bestF) {
          bestF = f;
          cur = id;
        }
      }
      if (cur === to) break;
      open.delete(cur);
      const cn = this.node(cur);
      for (const nb of cn.links) {
        const nn = this.node(nb);
        const cost = g.get(cur)! + Math.abs(nn.x - cn.x) + Math.abs(nn.y - cn.y);
        if (cost < (g.get(nb) ?? Infinity)) {
          g.set(nb, cost);
          came.set(nb, cur);
          open.add(nb);
        }
      }
    }
    if (!came.has(to)) return [from];
    const out = [to];
    while (out[0] !== from) out.unshift(came.get(out[0])!);
    return out;
  }

  pathLength(ids: number[]): number {
    let len = 0;
    for (let k = 1; k < ids.length; k++) {
      const a = this.node(ids[k - 1]);
      const b = this.node(ids[k]);
      len += Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    }
    return len;
  }
}

export function headingBetween(a: Vec, b: Vec): Heading {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'east' : 'west';
  return dy > 0 ? 'south' : 'north';
}

/** +1 when `next` is a right turn from `prev` (screen y points down), -1 for left, 0 straight/U. */
export function turnSign(prev: Heading, next: Heading): number {
  const p = HEADING_VEC[prev];
  const n = HEADING_VEC[next];
  return Math.sign(p.x * n.y - p.y * n.x);
}

/** Right-hand-traffic lane from node a to node b, trimmed to the intersection edges. */
export function laneOf(a: Vec, b: Vec) {
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const dx = (b.x - a.x) / len;
  const dy = (b.y - a.y) / len;
  const rx = -dy;
  const ry = dx;
  return {
    sx: a.x + dx * HALF_ROAD + rx * LANE_OFFSET,
    sy: a.y + dy * HALF_ROAD + ry * LANE_OFFSET,
    ex: b.x - dx * HALF_ROAD + rx * LANE_OFFSET,
    ey: b.y - dy * HALF_ROAD + ry * LANE_OFFSET,
    dx,
    dy,
    rx,
    ry,
  };
}

export interface PlannedRoute {
  /** Node ids from the start node to the destination segment's entry node. */
  nodes: number[];
  /** Point on the destination road in front of the door. */
  roadPoint: Vec;
  /** The other end of the destination segment (direction of the final approach). */
  exitNode: number;
  door: Vec;
}

export function planRoute(graph: RoadGraph, from: Vec, door: Vec): PlannedRoute {
  const start = graph.nearestNode(from.x, from.y);
  const dest = graph.nearestRoadPoint(door.x, door.y);
  const options = [
    { entry: dest.seg.a, exit: dest.seg.b },
    { entry: dest.seg.b, exit: dest.seg.a },
  ].map((o) => {
    const nodes = graph.path(start.id, o.entry);
    const e = graph.node(o.entry);
    return { ...o, nodes, cost: graph.pathLength(nodes) + Math.abs(e.x - dest.x) + Math.abs(e.y - dest.y) };
  });
  const best = options[0].cost <= options[1].cost ? options[0] : options[1];
  return { nodes: best.nodes, roadPoint: { x: dest.x, y: dest.y }, exitNode: best.exit, door };
}

interface Leg {
  street: string;
  heading: Heading;
  blocks: number;
}

/** Turn-by-turn directions in structured form (the server turns them into English for the AI). */
export function describeRoute(graph: RoadGraph, route: PlannedRoute): RouteStep[] {
  const legs: Leg[] = [];
  const push = (street: string, heading: Heading, blocks: number) => {
    const last = legs[legs.length - 1];
    if (last && last.street === street && last.heading === heading) last.blocks += blocks;
    else legs.push({ street, heading, blocks });
  };
  for (let k = 1; k < route.nodes.length; k++) {
    const a = graph.node(route.nodes[k - 1]);
    const b = graph.node(route.nodes[k]);
    push(graph.streetBetween(a.id, b.id), headingBetween(a, b), 1);
  }
  const entry = graph.node(route.nodes[route.nodes.length - 1]);
  const exit = graph.node(route.exitNode);
  const finalHeading = headingBetween(entry, exit);
  push(graph.streetBetween(entry.id, exit.id), finalHeading, 1);

  const steps: RouteStep[] = [];
  legs.forEach((leg, idx) => {
    if (idx === 0) steps.push({ action: 'start', street: leg.street, heading: leg.heading, blocks: leg.blocks });
    else {
      const sign = turnSign(legs[idx - 1].heading, leg.heading);
      steps.push({ action: sign > 0 ? 'right' : sign < 0 ? 'left' : 'straight', street: leg.street, blocks: leg.blocks });
    }
  });
  const f = HEADING_VEC[finalHeading];
  const cross = f.x * (route.door.y - route.roadPoint.y) - f.y * (route.door.x - route.roadPoint.x);
  steps.push({ action: 'arrive', street: '', side: cross > 0 ? 'right' : 'left' });
  return steps;
}
