import type { Collider, StaticGrid } from './city/generate';
import { circleVsRect } from './math';

export interface Body {
  x: number;
  y: number;
  r: number;
  kind: 'car' | 'ped' | 'player' | 'prop';
  ref: unknown;
}

/** Uniform grid for moving things, rebuilt every frame. */
export class DynGrid {
  private readonly cells = new Map<number, Body[]>();
  private readonly pool: Body[][] = [];
  constructor(private readonly size = 128) {}

  private key(cx: number, cy: number) {
    return (cx + 1000) * 4096 + (cy + 1000);
  }

  clear(): void {
    for (const list of this.cells.values()) {
      list.length = 0;
      this.pool.push(list);
    }
    this.cells.clear();
  }

  insert(b: Body): void {
    const k = this.key(Math.floor(b.x / this.size), Math.floor(b.y / this.size));
    let list = this.cells.get(k);
    if (!list) {
      list = this.pool.pop() ?? [];
      this.cells.set(k, list);
    }
    list.push(b);
  }

  query(x: number, y: number, r: number, out: Body[]): Body[] {
    out.length = 0;
    const x0 = Math.floor((x - r) / this.size);
    const x1 = Math.floor((x + r) / this.size);
    const y0 = Math.floor((y - r) / this.size);
    const y1 = Math.floor((y + r) / this.size);
    for (let cx = x0; cx <= x1; cx++) {
      for (let cy = y0; cy <= y1; cy++) {
        const list = this.cells.get(this.key(cx, cy));
        if (list) for (const b of list) out.push(b);
      }
    }
    return out;
  }
}

const tmp: Collider[] = [];

/**
 * Pushes a circle out of static geometry. Returns the strongest contact normal (or null).
 */
export function resolveStatic(grid: StaticGrid, c: { x: number; y: number; r: number }): { nx: number; ny: number; depth: number } | null {
  let worst: { nx: number; ny: number; depth: number } | null = null;
  for (const col of grid.query(c.x, c.y, c.r + 2, tmp)) {
    let hit: { nx: number; ny: number; depth: number } | null = null;
    if (col.kind === 'rect') hit = circleVsRect(c.x, c.y, c.r, col.rect);
    else {
      const dx = c.x - col.x;
      const dy = c.y - col.y;
      const d = Math.hypot(dx, dy);
      const min = c.r + col.r;
      if (d < min && d > 1e-6) hit = { nx: dx / d, ny: dy / d, depth: min - d };
    }
    if (hit) {
      c.x += hit.nx * hit.depth;
      c.y += hit.ny * hit.depth;
      if (!worst || hit.depth > worst.depth) worst = hit;
    }
  }
  return worst;
}
