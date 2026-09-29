import { PLACES, STREET_NAMES } from '@shared/content/city';
import { IDIOMS } from '@shared/content/idioms';
import { describe, expect, it } from 'vitest';
import { pointInRect, rectsOverlap } from '../math';
import { generateCity, onRoad } from './generate';
import { AVE_X, HALF_ROAD, LAND, ST_Y } from './layout';
import { describeRoute, planRoute } from './roads';

const city = generateCity();

// Asphalt of every real road segment (merged areas like the airport have no interior roads).
const roadRects = city.roads.segments.map((s) => {
  const a = city.roads.node(s.a);
  const b = city.roads.node(s.b);
  return s.horizontal
    ? { x: Math.min(a.x, b.x), y: a.y - HALF_ROAD, w: Math.abs(a.x - b.x), h: HALF_ROAD * 2 }
    : { x: a.x - HALF_ROAD, y: Math.min(a.y, b.y), w: HALF_ROAD * 2, h: Math.abs(a.y - b.y) };
});

describe('city generation', () => {
  it('is deterministic', () => {
    const again = generateCity();
    expect(again.buildings.length).toBe(city.buildings.length);
    expect(again.buildings[10]).toEqual(city.buildings[10]);
  });

  it('keeps building footprints on land and off the roads', () => {
    for (const b of city.buildings) {
      expect(pointInRect(b.x, b.y, LAND) && pointInRect(b.x + b.w, b.y + b.h, LAND)).toBe(true);
      for (const r of roadRects) expect(rectsOverlap(b, r), `building at ${b.x},${b.y} overlaps a road`).toBe(false);
    }
  });

  it('never overlaps two buildings', () => {
    const bs = city.buildings;
    for (let i = 0; i < bs.length; i++) {
      for (let j = i + 1; j < bs.length; j++) {
        if (rectsOverlap(bs[i], bs[j])) throw new Error(`overlap: ${JSON.stringify([bs[i], bs[j]])}`);
      }
    }
  });

  it('gives every place a reachable door on the sidewalk', () => {
    for (const place of PLACES) {
      const site = city.places.get(place.id);
      expect(site, place.id).toBeDefined();
      const door = site!.door;
      expect(onRoad(door.x, door.y), `${place.id} door is on the road`).toBe(false);
      for (const b of city.buildings) expect(pointInRect(door.x, door.y, b), `${place.id} door is inside a building`).toBe(false);
    }
  });

  it('has a connected road network', () => {
    const nodes = city.roads.liveNodes;
    const seen = new Set([nodes[0].id]);
    const queue = [nodes[0].id];
    while (queue.length) {
      for (const n of city.roads.node(queue.shift()!).links) {
        if (!seen.has(n)) {
          seen.add(n);
          queue.push(n);
        }
      }
    }
    expect(seen.size).toBe(nodes.length);
  });

  it('hides one word coin per idiom', () => {
    expect(city.coins).toHaveLength(IDIOMS.length);
    expect(new Set(city.coins.map((c) => c.idiomId)).size).toBe(IDIOMS.length);
  });
});

describe('route directions', () => {
  it('describes a route with real street names, turns and an arrival side', () => {
    const cafe = city.places.get('cafe')!.door;
    const start = city.places.get('hospital')!.door;
    const steps = describeRoute(city.roads, planRoute(city.roads, start, cafe));
    expect(steps[0].action).toBe('start');
    expect(steps[steps.length - 1].action).toBe('arrive');
    expect(['left', 'right']).toContain(steps[steps.length - 1].side);
    for (const s of steps.slice(0, -1)) {
      expect(STREET_NAMES).toContain(s.street);
      expect(s.blocks ?? 0).toBeGreaterThanOrEqual(0);
    }
  });

  it('plans shorter paths through the grid than around it', () => {
    const a = city.roads.nearestNode(AVE_X[1], ST_Y[1]);
    const b = city.roads.nearestNode(AVE_X[3], ST_Y[3]);
    const path = city.roads.path(a.id, b.id);
    expect(path[0]).toBe(a.id);
    expect(path[path.length - 1]).toBe(b.id);
    expect(path).toHaveLength(5);
  });
});
