// Hand-authored city plan. Everything else (buildings, trees, parking) is generated from a fixed seed,
// so the city is identical on every device and every session.
import type { Rect } from '../math';

export const ROAD_W = 110;
export const HALF_ROAD = ROAD_W / 2;
export const LANE_OFFSET = 27;
export const SIDEWALK = 26;
/** Virtual camera height used for the pseudo-3D building projection (world units). */
export const CAM_HEIGHT = 1500;

/** X of each avenue (index matches AVENUES names), Y of each street (index matches STREETS). */
export const AVE_X = [400, 1000, 1600, 2150, 2700, 3250, 3800, 4400, 5000, 5600];
export const ST_Y = [400, 950, 1500, 2050, 2600, 3150, 3700, 4250, 4800, 5350];

export const LAND: Rect = { x: 120, y: 120, w: 5760, h: 5600 };

export type District = 'downtown' | 'commercial' | 'residential' | 'industrial' | 'harbor' | 'park' | 'beach' | 'airport';

const CODE: Record<string, District> = {
  D: 'downtown',
  C: 'commercial',
  R: 'residential',
  I: 'industrial',
  H: 'harbor',
  P: 'park',
  B: 'beach',
  A: 'airport',
};

// Rows = blocks between streets (north → south), columns = blocks between avenues (west → east).
const DISTRICT_ROWS = [
  'RRRRRCAAA',
  'RRCCCCAAA',
  'HCDDDCAAA',
  'HCDDDCCII',
  'HCDDDCCII',
  'HCCPPCRII',
  'RRCPPCRRI',
  'RRCCCCRRR',
  'BBBBBBBBB',
];

export const districtAt = (i: number, j: number): District => CODE[DISTRICT_ROWS[j][i]];

/** Multi-block areas without interior roads. */
export const MERGED = [
  { name: 'airport' as const, i0: 6, i1: 8, j0: 0, j1: 2 },
  { name: 'park' as const, i0: 3, i1: 4, j0: 5, j1: 6 },
];

export type Side = 'N' | 'E' | 'S' | 'W';

export interface PlaceSiteDef {
  /** Grid block, or a merged area name. */
  i?: number;
  j?: number;
  area?: 'airport' | 'park';
  side: Side;
  /** Position along the side (0..1), default centered. */
  along?: number;
  /** Width along the side, depth into the block, height. */
  w: number;
  d: number;
  h: number;
  roof: string;
}

export const PLACE_SITES: Record<string, PlaceSiteDef> = {
  airport: { area: 'airport', side: 'W', along: 0.42, w: 640, d: 230, h: 70, roof: '#d9dde2' },
  cafe: { i: 2, j: 4, side: 'S', w: 150, d: 120, h: 70, roof: '#7a4b35' },
  hotel: { i: 3, j: 2, side: 'N', w: 240, d: 190, h: 400, roof: '#c8a86a' },
  bank: { i: 4, j: 3, side: 'W', w: 220, d: 170, h: 180, roof: '#9aa4ad' },
  office: { i: 3, j: 3, side: 'E', w: 230, d: 200, h: 470, roof: '#5d7fa3' },
  investor: { i: 4, j: 2, side: 'E', w: 210, d: 190, h: 430, roof: '#2f3e52' },
  studio: { i: 2, j: 2, side: 'W', w: 230, d: 180, h: 150, roof: '#6d4c8f' },
  cityhall: { i: 4, j: 4, side: 'S', w: 260, d: 180, h: 120, roof: '#d8d2c2' },
  police: { i: 5, j: 3, side: 'N', w: 230, d: 170, h: 110, roof: '#34495e' },
  hospital: { i: 1, j: 3, side: 'E', w: 260, d: 220, h: 200, roof: '#eef2f5' },
  pharmacy: { i: 1, j: 4, side: 'N', w: 150, d: 120, h: 60, roof: '#3fae84' },
  restaurant: { i: 5, j: 4, side: 'E', w: 160, d: 130, h: 70, roof: '#a3432f' },
  market: { i: 6, j: 5, side: 'N', w: 260, d: 170, h: 60, roof: '#e1e6ea' },
  gym: { i: 5, j: 5, side: 'W', w: 200, d: 160, h: 80, roof: '#3b3b3b' },
  techstore: { i: 2, j: 5, side: 'N', w: 170, d: 130, h: 90, roof: '#1f7a8c' },
  boutique: { i: 4, j: 1, side: 'S', w: 150, d: 120, h: 90, roof: '#1c1c1c' },
  realty: { i: 2, j: 1, side: 'E', w: 150, d: 120, h: 80, roof: '#5b8c5a' },
  dealer: { i: 7, j: 3, side: 'W', w: 220, d: 150, h: 60, roof: '#c0392b' },
  garage: { i: 8, j: 4, side: 'S', w: 220, d: 160, h: 55, roof: '#6b5b4b' },
  station: { i: 3, j: 1, side: 'N', w: 320, d: 200, h: 90, roof: '#8e6e53' },
  diner: { i: 0, j: 3, side: 'E', w: 150, d: 110, h: 45, roof: '#d35d4a' },
  cinema: { i: 3, j: 7, side: 'N', w: 240, d: 190, h: 100, roof: '#402a5c' },
  foodtruck: { area: 'park', side: 'N', along: 0.3, w: 70, d: 34, h: 30, roof: '#f4c542' },
  beachbar: { i: 4, j: 8, side: 'S', w: 150, d: 100, h: 40, roof: '#d9a066' },
  bar: { i: 3, j: 4, side: 'N', w: 170, d: 130, h: 110, roof: '#3b1f4a' },
  pizzeria: { i: 1, j: 6, side: 'N', w: 150, d: 120, h: 55, roof: '#b8322a' },
  cabs: { i: 0, j: 5, side: 'E', w: 220, d: 170, h: 50, roof: '#f1c40f' },
};

export const DISTRICT_LABEL: Record<District, { en: string; ko: string }> = {
  downtown: { en: 'Downtown', ko: '다운타운' },
  commercial: { en: 'Midtown', ko: '미드타운' },
  residential: { en: 'Elden Heights', ko: '엘든 하이츠' },
  industrial: { en: 'East Industrial', ko: '동부 공업지대' },
  harbor: { en: 'The Docks', ko: '부두' },
  park: { en: 'Central Park', ko: '센트럴 파크' },
  beach: { en: 'Sunset Beach', ko: '선셋 비치' },
  airport: { en: 'Elden International', ko: '엘든 국제공항' },
};
