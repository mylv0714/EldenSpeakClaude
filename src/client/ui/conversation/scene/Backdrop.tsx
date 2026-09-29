// Backdrops for the first-person conversation scene, drawn as SVG layers in a 1600×900 box:
// `Back` goes behind the character, `Front` (counter, table, car door, your hands…) in front of it.
import type { ContextKind, ScenarioKind } from '@shared/types';
import { shade } from '../../../game/math';

export type SceneStyle = 'counter' | 'table' | 'desk' | 'street' | 'beach' | 'park' | 'taxi' | 'doorstep' | 'carwindow' | 'garage' | 'studio';
type Decor = 'menu' | 'shelves' | 'plants' | 'lamps' | 'window' | 'frames' | 'screen' | 'tools' | 'clock' | 'bottles' | 'posters' | 'cups' | 'register' | 'flags';

export interface SceneSpec {
  style: SceneStyle;
  wall: string;
  accent: string;
  floor: string;
  decor: Decor[];
  /** Text on the wall sign (the place name). */
  sign?: string;
}

const PLACE_SCENES: Record<string, Omit<SceneSpec, 'sign'>> = {
  cafe: { style: 'counter', wall: '#e9d8c4', accent: '#7a4e2d', floor: '#8c6a4f', decor: ['menu', 'lamps', 'plants', 'cups', 'window'] },
  diner: { style: 'counter', wall: '#f1e3c8', accent: '#c1121f', floor: '#3d405b', decor: ['menu', 'clock', 'window', 'cups'] },
  bar: { style: 'counter', wall: '#2b2238', accent: '#5b3a29', floor: '#1d1726', decor: ['bottles', 'lamps', 'frames'] },
  restaurant: { style: 'table', wall: '#f3e2cf', accent: '#7f1d1d', floor: '#6b4226', decor: ['frames', 'lamps', 'plants', 'window'] },
  hotel: { style: 'counter', wall: '#e8dfd1', accent: '#3d2c1e', floor: '#b08968', decor: ['lamps', 'frames', 'plants', 'clock'] },
  bank: { style: 'counter', wall: '#dfe6ec', accent: '#1d3557', floor: '#8d99ae', decor: ['clock', 'frames', 'plants'] },
  police: { style: 'counter', wall: '#cfd8e3', accent: '#1e293b', floor: '#64748b', decor: ['posters', 'flags', 'clock'] },
  cityhall: { style: 'counter', wall: '#e7e2d6', accent: '#4a4e69', floor: '#9a8c73', decor: ['flags', 'frames', 'clock'] },
  hospital: { style: 'desk', wall: '#e6f2f2', accent: '#2a9d8f', floor: '#b8c4c2', decor: ['posters', 'plants', 'window'] },
  pharmacy: { style: 'counter', wall: '#eef6f3', accent: '#2d6a4f', floor: '#adb5bd', decor: ['shelves', 'posters'] },
  airport: { style: 'counter', wall: '#dde5ee', accent: '#264653', floor: '#9aa5b1', decor: ['screen', 'window', 'flags'] },
  station: { style: 'counter', wall: '#e5ddd0', accent: '#6b705c', floor: '#8d8a80', decor: ['screen', 'clock', 'posters'] },
  office: { style: 'desk', wall: '#e9edf2', accent: '#3d5a80', floor: '#8d99ae', decor: ['window', 'plants', 'frames'] },
  investor: { style: 'desk', wall: '#1f2937', accent: '#b08968', floor: '#374151', decor: ['window', 'frames', 'lamps'] },
  realty: { style: 'desk', wall: '#f2e9e1', accent: '#9c6644', floor: '#b08968', decor: ['frames', 'plants', 'window'] },
  dealer: { style: 'desk', wall: '#e5e7eb', accent: '#c1121f', floor: '#9ca3af', decor: ['posters', 'window', 'flags'] },
  studio: { style: 'studio', wall: '#14213d', accent: '#fca311', floor: '#0b132b', decor: ['lamps', 'screen'] },
  market: { style: 'counter', wall: '#f1f5e9', accent: '#2d6a4f', floor: '#b7b7a4', decor: ['shelves', 'posters', 'register'] },
  techstore: { style: 'counter', wall: '#eef2f7', accent: '#111827', floor: '#d1d5db', decor: ['screen', 'shelves', 'lamps'] },
  boutique: { style: 'counter', wall: '#f8ede3', accent: '#9d4edd', floor: '#d8c3a5', decor: ['frames', 'lamps', 'plants'] },
  gym: { style: 'counter', wall: '#2b2d42', accent: '#ef233c', floor: '#1b1b1f', decor: ['posters', 'screen'] },
  cinema: { style: 'counter', wall: '#370617', accent: '#dc2f02', floor: '#1b0a10', decor: ['posters', 'lamps'] },
  garage: { style: 'garage', wall: '#6c757d', accent: '#f4a261', floor: '#495057', decor: ['tools', 'posters'] },
  foodtruck: { style: 'park', wall: '#f4a261', accent: '#e76f51', floor: '#6a994e', decor: ['menu'] },
  beachbar: { style: 'beach', wall: '#e9c46a', accent: '#8d5b3a', floor: '#f2dcb3', decor: ['bottles'] },
  pizzeria: { style: 'counter', wall: '#fbe8d3', accent: '#b23a48', floor: '#7f5539', decor: ['menu', 'frames'] },
  cabs: { style: 'counter', wall: '#fcd34d', accent: '#1f2937', floor: '#57534e', decor: ['posters', 'clock', 'screen'] },
};

const STREET: Omit<SceneSpec, 'sign'> = { style: 'street', wall: '#9aa5b1', accent: '#495057', floor: '#adb5bd', decor: [] };

export function sceneFor(opts: { placeId?: string; placeName?: string; kind: ScenarioKind; context?: ContextKind }): SceneSpec {
  if (opts.context === 'taxi') return { style: 'taxi', wall: '#1f2937', accent: '#fbbf24', floor: '#111827', decor: [] };
  if (opts.context === 'pizza') return { style: 'doorstep', wall: '#d4a373', accent: '#6b4226', floor: '#8d6e63', decor: [] };
  if (opts.context === 'police') return { style: 'carwindow', wall: '#9aa5b1', accent: '#1e293b', floor: '#6c757d', decor: [] };
  const place = opts.placeId ? PLACE_SCENES[opts.placeId] : undefined;
  if (!place) return STREET;
  return { ...place, sign: opts.placeName };
}

function isDark(hex: string): boolean {
  const n = parseInt(hex.slice(1), 16);
  return ((n >> 16) & 255) * 0.3 + ((n >> 8) & 255) * 0.59 + (n & 255) * 0.11 < 90;
}

/** Sky colors for the in-game hour. */
function sky(hour: number): { top: string; bottom: string; night: boolean } {
  if (hour >= 21 || hour < 5) return { top: '#0b1330', bottom: '#1f2a52', night: true };
  if (hour < 7) return { top: '#3a4a7a', bottom: '#f4a261', night: false };
  if (hour < 17) return { top: '#4ea8de', bottom: '#bde0fe', night: false };
  if (hour < 19) return { top: '#f8961e', bottom: '#ffd6a5', night: false };
  return { top: '#3c1f5c', bottom: '#e76f51', night: true };
}

function Skyline({ y, night, seed = 1 }: { y: number; night: boolean; seed?: number }) {
  const blocks = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => {
    const w = 90 + ((i * 37 * seed) % 70);
    const h = 90 + ((i * 53 * seed) % 150);
    return { x: i * 170 - 20 + ((i * 29) % 40), w, h };
  });
  return (
    <g>
      {blocks.map((b) => (
        <g key={b.x}>
          <rect x={b.x} y={y - b.h} width={b.w} height={b.h + 400} fill={night ? '#1b2440' : '#8aa4bf'} />
          {Array.from({ length: Math.floor(b.h / 34) }, (_, r) =>
            Array.from({ length: Math.floor(b.w / 30) }, (_, c) => (
              <rect key={`${r}-${c}`} x={b.x + 10 + c * 30} y={y - b.h + 14 + r * 34} width="14" height="18" fill={night ? ((r + c + b.x) % 3 === 0 ? '#ffd166' : '#2a3558') : '#c9d6e3'} opacity={night ? 0.9 : 0.7} />
            )),
          )}
        </g>
      ))}
    </g>
  );
}

function Window({ x, y, w, h, hour, frame }: { x: number; y: number; w: number; h: number; hour: number; frame: string }) {
  const s = sky(hour);
  const id = `win-${x}-${y}`;
  return (
    <g>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={s.top} />
          <stop offset="1" stopColor={s.bottom} />
        </linearGradient>
        <clipPath id={`${id}-clip`}>
          <rect x={x} y={y} width={w} height={h} />
        </clipPath>
      </defs>
      <rect x={x} y={y} width={w} height={h} fill={`url(#${id})`} />
      <g clipPath={`url(#${id}-clip)`}>
        <g transform={`translate(${x} 0) scale(${w / 1600} 1)`}>
          <Skyline y={y + h - 10} night={s.night} />
        </g>
      </g>
      <rect x={x} y={y} width={w} height={h} fill="none" stroke={frame} strokeWidth="14" />
      <path d={`M${x + w / 2} ${y} V${y + h} M${x} ${y + h / 2} H${x + w}`} stroke={frame} strokeWidth="8" />
    </g>
  );
}

function Lamp({ x, color, glow }: { x: number; color: string; glow: boolean }) {
  return (
    <g>
      <path d={`M${x} 0 V70`} stroke="#333" strokeWidth="3" />
      <path d={`M${x - 36} 110 Q${x} 50 ${x + 36} 110 Z`} fill={color} />
      {glow && <ellipse cx={x} cy={150} rx="120" ry="70" fill="#ffd166" opacity="0.13" />}
      <ellipse cx={x} cy={112} rx="16" ry="6" fill="#fff3bf" />
    </g>
  );
}

function Plant({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <path d={`M${x - 26} ${y} h52 l-8 60 h-36 z`} fill="#bc6c25" />
      {[-30, -12, 8, 26, 0].map((dx, i) => (
        <ellipse key={i} cx={x + dx} cy={y - 26 - (i % 2) * 22} rx="22" ry="34" fill={i % 2 ? '#2d6a4f' : '#40916c'} transform={`rotate(${dx} ${x + dx} ${y - 20})`} />
      ))}
    </g>
  );
}

function Shelves({ x, y, w, accent }: { x: number; y: number; w: number; accent: string }) {
  const colors = ['#e63946', '#457b9d', '#e9c46a', '#2a9d8f', '#f4a261', '#8d99ae', '#b5838d'];
  return (
    <g>
      {[0, 1, 2, 3].map((r) => (
        <g key={r}>
          <rect x={x} y={y + r * 95 + 78} width={w} height="10" fill={shade(accent, 0.1)} />
          {Array.from({ length: Math.floor(w / 34) }, (_, i) => (
            <rect key={i} x={x + 6 + i * 34} y={y + r * 95 + 30 + ((i * 7 + r * 5) % 18)} width="26" height={48 - ((i * 7 + r * 5) % 18)} rx="3" fill={colors[(i + r * 3) % colors.length]} />
          ))}
        </g>
      ))}
    </g>
  );
}

function Sign({ text, x, y, accent }: { text: string; x: number; y: number; accent: string }) {
  const w = Math.min(620, 40 + text.length * 22);
  return (
    <g>
      <rect x={x - w / 2} y={y} width={w} height="64" rx="10" fill={accent} />
      <rect x={x - w / 2 + 6} y={y + 6} width={w - 12} height="52" rx="7" fill="none" stroke="#fff" strokeOpacity="0.35" strokeWidth="2" />
      <text x={x} y={y + 43} textAnchor="middle" fontFamily="Anton, Impact, sans-serif" fontSize="34" letterSpacing="2" fill="#fff">
        {text.toUpperCase()}
      </text>
    </g>
  );
}

function Interior({ spec, hour }: { spec: SceneSpec; hour: number }) {
  const s = sky(hour);
  const d = new Set(spec.decor);
  const dark = shade(spec.wall, -0.18);
  return (
    <g>
      <rect width="1600" height="900" fill={spec.wall} />
      <rect y="520" width="1600" height="120" fill={dark} />
      <rect y="515" width="1600" height="10" fill={shade(spec.wall, -0.3)} />
      <rect y="640" width="1600" height="260" fill={spec.floor} />
      {d.has('window') && <Window x={70} y={130} w={380} h={300} hour={hour} frame={shade(spec.wall, -0.45)} />}
      {d.has('window') && !d.has('menu') && !d.has('shelves') && <Window x={1150} y={130} w={380} h={300} hour={hour} frame={shade(spec.wall, -0.45)} />}
      {d.has('shelves') && !d.has('window') && <Shelves x={60} y={110} w={400} accent={spec.accent} />}
      {d.has('shelves') && <Shelves x={1140} y={110} w={400} accent={spec.accent} />}
      {d.has('bottles') && (
        <g>
          {[0, 1].map((r) => (
            <g key={r}>
              <rect x="60" y={250 + r * 150} width="1480" height="12" fill={shade(spec.accent, 0.2)} />
              {Array.from({ length: 34 }, (_, i) => (
                <g key={i} opacity={i > 11 && i < 23 ? 0 : 1}>
                  <rect x={80 + i * 43} y={180 + r * 150 + (i % 3) * 8} width="20" height={70 - (i % 3) * 8} rx="5" fill={['#588157', '#bc4749', '#e9c46a', '#a3b18a', '#6d597a'][i % 5]} opacity="0.85" />
                  <rect x={86 + i * 43} y={165 + r * 150 + (i % 3) * 8} width="8" height="18" fill="#333" />
                </g>
              ))}
            </g>
          ))}
        </g>
      )}
      {d.has('menu') && (
        <g>
          <rect x="1120" y="110" width="400" height="260" rx="8" fill="#1f2421" stroke={shade(spec.accent, -0.2)} strokeWidth="10" />
          <text x="1320" y="160" textAnchor="middle" fontFamily="Anton, Impact, sans-serif" fontSize="30" fill="#f1faee">
            MENU
          </text>
          {[0, 1, 2, 3, 4].map((i) => (
            <g key={i}>
              <rect x="1150" y={188 + i * 34} width={180 + ((i * 47) % 90)} height="10" rx="5" fill="#f1faee" opacity="0.75" />
              <rect x="1450" y={188 + i * 34} width="40" height="10" rx="5" fill="#ffd166" opacity="0.85" />
            </g>
          ))}
        </g>
      )}
      {d.has('frames') && (
        <g>
          {[
            [110, 150, 150, 190],
            [300, 190, 120, 120],
            [1180, 170, 140, 180],
            [1360, 150, 150, 120],
          ]
            .filter(([x]) => !(d.has('window') && (x < 460 || x > 1140)))
            .map(([x, y, w, h]) => (
              <g key={x}>
                <rect x={x} y={y} width={w} height={h} fill={shade(spec.accent, -0.2)} />
                <rect x={x + 10} y={y + 10} width={w - 20} height={h - 20} fill={['#a8dadc', '#f4a261', '#90be6d', '#cdb4db'][(x / 10) % 4 | 0]} />
                <path d={`M${x + 10} ${y + h - 10} l${(w - 20) / 2} -${(h - 20) / 2} l${(w - 20) / 2} ${(h - 20) / 2} z`} fill="#fff" opacity="0.3" />
              </g>
            ))}
        </g>
      )}
      {d.has('posters') && (
        <g>
          <rect x="120" y="150" width="170" height="230" fill={spec.accent} />
          <rect x="140" y="175" width="130" height="90" fill="#fff" opacity="0.8" />
          <rect x="140" y="285" width="120" height="12" fill="#fff" opacity="0.6" />
          <rect x="140" y="310" width="90" height="12" fill="#fff" opacity="0.6" />
          <rect x="1320" y="170" width="160" height="210" fill={shade(spec.accent, 0.3)} />
          <circle cx="1400" cy="250" r="45" fill="#fff" opacity="0.7" />
        </g>
      )}
      {d.has('screen') && (
        <g>
          <rect x="560" y="70" width="480" height="150" rx="8" fill="#0b132b" stroke="#333" strokeWidth="8" />
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <rect x="590" y={98 + i * 36} width="200" height="14" rx="3" fill="#ffd166" opacity="0.9" />
              <rect x="820" y={98 + i * 36} width="90" height="14" rx="3" fill="#8ecae6" opacity="0.8" />
              <rect x="930" y={98 + i * 36} width="80" height="14" rx="3" fill={i === 1 ? '#ef476f' : '#06d6a0'} opacity="0.85" />
            </g>
          ))}
        </g>
      )}
      {d.has('clock') && (
        <g>
          <circle cx="800" cy="110" r="46" fill="#fff" stroke="#333" strokeWidth="7" />
          <path d="M800 110 V80 M800 110 L822 122" stroke="#333" strokeWidth="5" strokeLinecap="round" />
        </g>
      )}
      {d.has('flags') && (
        <g>
          {[430, 1170].map((x) => (
            <g key={x}>
              <rect x={x} y="120" width="6" height="400" fill="#8d8d8d" />
              <path d={`M${x + 6} 130 h110 v70 h-110 z`} fill={spec.accent} />
              <circle cx={x + 60} cy="165" r="18" fill="#ffd166" />
            </g>
          ))}
        </g>
      )}
      {d.has('tools') && (
        <g>
          <rect x="90" y="140" width="420" height="260" fill="#adb5bd" stroke="#6c757d" strokeWidth="6" />
          {Array.from({ length: 8 }, (_, i) => (
            <rect key={i} x={120 + i * 48} y={170 + (i % 2) * 20} width="12" height={120 + (i % 3) * 30} rx="6" fill={i % 2 ? '#e63946' : '#343a40'} />
          ))}
          <rect x="1120" y="160" width="360" height="330" fill={shade(spec.wall, -0.25)} />
          <circle cx="1300" cy="440" r="60" fill="#212529" />
          <circle cx="1300" cy="440" r="28" fill="#6c757d" />
        </g>
      )}
      {d.has('plants') && <Plant x={d.has('window') ? 520 : 170} y={560} />}
      {d.has('plants') && <Plant x={d.has('window') ? 1080 : 1430} y={560} />}
      {spec.sign && <Sign text={spec.sign} x={800} y={d.has('screen') ? 240 : d.has('clock') ? 180 : 150} accent={spec.accent} />}
      {d.has('lamps') && [300, 800, 1300].map((x) => <Lamp key={x} x={x} color={shade(spec.accent, -0.1)} glow={s.night || isDark(spec.wall)} />)}
      {s.night && <rect width="1600" height="900" fill="#1a1440" opacity="0.18" />}
    </g>
  );
}

function Outdoor({ spec, hour }: { spec: SceneSpec; hour: number }) {
  const s = sky(hour);
  return (
    <g>
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={s.top} />
          <stop offset="1" stopColor={s.bottom} />
        </linearGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#sky)" />
      {spec.style === 'beach' ? (
        <g>
          <rect y="470" width="1600" height="120" fill={s.night ? '#14213d' : '#219ebc'} />
          <path d="M0 500 Q200 480 400 500 T800 500 T1200 500 T1600 500" stroke="#fff" strokeOpacity="0.5" strokeWidth="4" fill="none" />
          <circle cx="1250" cy={s.night ? 150 : 380} r="60" fill={s.night ? '#f1faee' : '#ffb703'} opacity="0.9" />
          <rect y="590" width="1600" height="310" fill={spec.floor} />
          {[160, 1450].map((x) => (
            <g key={x}>
              <path d={`M${x} 620 Q${x + 20} 400 ${x - 10} 260`} stroke="#8d5b3a" strokeWidth="18" fill="none" />
              {[-60, -20, 20, 60].map((a) => (
                <ellipse key={a} cx={x - 10} cy="262" rx="90" ry="20" fill="#2d6a4f" transform={`rotate(${a} ${x - 10} 262)`} />
              ))}
            </g>
          ))}
        </g>
      ) : spec.style === 'park' ? (
        <g>
          <Skyline y={520} night={s.night} seed={3} />
          <rect y="520" width="1600" height="380" fill={spec.floor} />
          {[120, 420, 1250, 1500].map((x) => (
            <g key={x}>
              <rect x={x - 10} y="400" width="20" height="160" fill="#6b4226" />
              <circle cx={x} cy="380" r="90" fill="#40916c" />
              <circle cx={x - 40} cy="410" r="60" fill="#52b788" />
            </g>
          ))}
          <rect x="420" y="170" width="760" height="560" rx="30" fill={spec.wall} />
          <rect x="490" y="250" width="620" height="330" rx="10" fill={shade(spec.wall, -0.55)} />
          <path d="M420 170 h760 v60 H420 z" fill={spec.accent} />
          <text x="800" y="215" textAnchor="middle" fontFamily="Anton, Impact, sans-serif" fontSize="40" fill="#fff">
            {spec.sign?.toUpperCase() ?? 'TACOS'}
          </text>
        </g>
      ) : (
        <g>
          <Skyline y={560} night={s.night} seed={2} />
          {[
            [-40, 260, 420, '#b56576'],
            [360, 200, 300, '#6d6875'],
            [1180, 240, 470, '#588157'],
          ].map(([x, y, w, c]) => (
            <g key={x}>
              <rect x={x} y={y} width={w} height={700} fill={c as string} />
              {Array.from({ length: 5 }, (_, r) =>
                Array.from({ length: Math.floor((w as number) / 90) }, (_, k) => (
                  <rect key={`${r}-${k}`} x={(x as number) + 30 + k * 90} y={(y as number) + 40 + r * 80} width="46" height="54" fill={s.night ? ((r + k) % 2 ? '#ffd166' : '#243b55') : '#dbe9f4'} />
                )),
              )}
            </g>
          ))}
          <rect y="640" width="1600" height="260" fill={spec.floor} />
          <rect y="640" width="1600" height="16" fill={shade(spec.floor, -0.2)} />
          {[250, 1350].map((x) => (
            <g key={x}>
              <rect x={x} y="300" width="10" height="350" fill="#343a40" />
              <rect x={x - 30} y="290" width="70" height="16" rx="6" fill="#343a40" />
              {s.night && <ellipse cx={x + 5} cy="330" rx="90" ry="50" fill="#ffd166" opacity="0.2" />}
            </g>
          ))}
        </g>
      )}
    </g>
  );
}

function TaxiInterior({ hour }: { hour: number }) {
  return (
    <g>
      <rect width="1600" height="900" fill="#1f2530" />
      <Window x={330} y={60} w={940} h={300} hour={hour} frame="#111827" />
      <rect x="200" y="380" width="1200" height="520" rx="60" fill="#3a3f4b" />
      <rect x="230" y="410" width="1140" height="200" rx="40" fill="#454b59" />
      <rect x="0" y="0" width="180" height="900" fill="#141922" />
      <rect x="1420" y="0" width="180" height="900" fill="#141922" />
    </g>
  );
}

function Doorstep({ hour }: { hour: number }) {
  const s = sky(hour);
  return (
    <g>
      <rect width="1600" height="900" fill="#d4a373" />
      {Array.from({ length: 22 }, (_, i) => (
        <rect key={i} y={i * 42} width="1600" height="4" fill="#b08968" opacity="0.6" />
      ))}
      <rect x="440" y="90" width="720" height="810" fill="#f1e3c8" />
      <rect x="480" y="130" width="640" height="770" fill="#3b2a20" />
      <rect x="1060" y="130" width="60" height="770" fill="#6b4226" />
      <circle cx="1030" cy="520" r="10" fill="#e9c46a" />
      <rect x="1250" y="300" width="60" height="90" rx="10" fill="#343a40" />
      <circle cx="1280" cy="345" r="22" fill={s.night ? '#ffd166' : '#fff3bf'} />
      {s.night && <ellipse cx="1280" cy="360" rx="200" ry="150" fill="#ffd166" opacity="0.15" />}
      <rect y="860" width="1600" height="40" fill="#8d6e63" />
    </g>
  );
}

export function SceneBack({ spec, hour }: { spec: SceneSpec; hour: number }) {
  switch (spec.style) {
    case 'street':
    case 'carwindow':
    case 'beach':
    case 'park':
      return <Outdoor spec={spec} hour={hour} />;
    case 'taxi':
      return <TaxiInterior hour={hour} />;
    case 'doorstep':
      return <Doorstep hour={hour} />;
    case 'studio':
      return (
        <g>
          <rect width="1600" height="900" fill={spec.wall} />
          {Array.from({ length: 9 }, (_, i) => (
            <circle key={i} cx={100 + i * 175} cy="80" r="26" fill="#fca311" opacity={0.25 + (i % 3) * 0.25} />
          ))}
          <rect x="300" y="170" width="1000" height="360" rx="16" fill="#1d3557" stroke="#fca311" strokeWidth="6" />
          <text x="800" y="380" textAnchor="middle" fontFamily="Anton, Impact, sans-serif" fontSize="110" fill="#fca311" opacity="0.9">
            ELDEN TONIGHT
          </text>
          <rect y="640" width="1600" height="260" fill={spec.floor} />
        </g>
      );
    default:
      return <Interior spec={spec} hour={hour} />;
  }
}

/** Foreground layer, drawn over the character (counters, tables, the car door, your own hands…). */
export function SceneFront({ spec }: { spec: SceneSpec }) {
  switch (spec.style) {
    case 'counter':
    case 'garage':
    case 'beach':
    case 'park': {
      const top = shade(spec.accent, 0.18);
      const d = new Set(spec.decor);
      return (
        <g>
          <rect x="-20" y="650" width="1640" height="30" rx="8" fill={top} />
          <rect x="0" y="676" width="1600" height="224" fill={spec.accent} />
          <rect x="0" y="676" width="1600" height="14" fill={shade(spec.accent, -0.25)} />
          {Array.from({ length: 8 }, (_, i) => (
            <rect key={i} x={i * 200 + 20} y="700" width="160" height="180" rx="6" fill={shade(spec.accent, 0.06)} opacity="0.5" />
          ))}
          {d.has('cups') && (
            <g>
              {[1180, 1250].map((x) => (
                <g key={x}>
                  <path d={`M${x} 600 h46 l-6 54 h-34 z`} fill="#fff" />
                  <rect x={x - 2} y="596" width="50" height="10" rx="4" fill="#6f4518" />
                </g>
              ))}
            </g>
          )}
          {d.has('register') && (
            <g>
              <path d="M1150 560 h170 l20 94 h-210 z" fill="#343a40" />
              <rect x="1180" y="580" width="110" height="36" rx="4" fill="#06d6a0" opacity="0.8" />
            </g>
          )}
        </g>
      );
    }
    case 'table':
      return (
        <g>
          <ellipse cx="800" cy="840" rx="760" ry="200" fill="#f8f9fa" />
          <ellipse cx="800" cy="830" rx="760" ry="190" fill="#fff" />
          <ellipse cx="800" cy="780" rx="150" ry="46" fill="#e9ecef" stroke="#dee2e6" strokeWidth="6" />
          <ellipse cx="800" cy="776" rx="80" ry="22" fill={spec.accent} opacity="0.6" />
          <path d="M1090 700 q20 -80 40 0 v40 h-40 z" fill="#fff3bf" opacity="0.9" />
          <rect x="1100" y="705" width="20" height="60" fill="#fefae0" />
          <ellipse cx="1110" cy="690" rx="8" ry="14" fill="#ffb703" />
          <path d="M470 660 l30 0 l-6 70 a14 14 0 0 1 -18 0 z" fill="#adb5bd" opacity="0.6" />
        </g>
      );
    case 'desk':
    case 'studio':
      return (
        <g>
          <rect x="-20" y="660" width="1640" height="26" fill={shade(spec.accent, 0.25)} />
          <rect x="0" y="686" width="1600" height="214" fill={shade(spec.accent, -0.05)} />
          {spec.style === 'desk' && (
            <g>
              <rect x="1120" y="470" width="260" height="170" rx="10" fill="#212529" />
              <rect x="1134" y="484" width="232" height="142" rx="4" fill="#48cae4" opacity="0.5" />
              <rect x="1230" y="640" width="40" height="24" fill="#343a40" />
              <rect x="300" y="628" width="200" height="32" rx="3" fill="#fff" transform="rotate(-4 400 644)" />
              <rect x="320" y="620" width="200" height="32" rx="3" fill="#f8f9fa" transform="rotate(3 420 636)" />
            </g>
          )}
        </g>
      );
    case 'taxi':
      return (
        <g>
          <path d="M-40 900 L-40 470 Q-40 380 60 380 L420 380 Q520 380 520 470 L520 900 Z" fill="#2b303b" />
          <rect x="80" y="310" width="300" height="120" rx="50" fill="#2b303b" />
          <path d="M1080 900 L1080 470 Q1080 380 1180 380 L1540 380 Q1640 380 1640 470 L1640 900 Z" fill="#2b303b" />
          <rect x="1220" y="310" width="300" height="120" rx="50" fill="#2b303b" />
          <rect x="560" y="820" width="480" height="80" rx="20" fill="#20242d" />
          <rect x="700" y="760" width="200" height="70" rx="10" fill="#fbbf24" />
          <text x="800" y="806" textAnchor="middle" fontFamily="Anton, Impact, sans-serif" fontSize="34" fill="#1f2937">
            TAXI
          </text>
        </g>
      );
    case 'doorstep':
      // First person: your own hands holding the pizza box.
      return (
        <g>
          <path d="M470 900 L560 700 H1040 L1130 900 Z" fill="#e9d8a6" stroke="#bc8a5f" strokeWidth="6" />
          <path d="M560 700 H1040 L1060 740 H540 Z" fill="#d4a373" />
          <circle cx="800" cy="810" r="54" fill="#b23a48" />
          <text x="800" y="822" textAnchor="middle" fontFamily="Anton, Impact, sans-serif" fontSize="30" fill="#fff">
            TONY'S
          </text>
          <ellipse cx="520" cy="880" rx="70" ry="50" fill="#e0ac69" />
          <ellipse cx="1080" cy="880" rx="70" ry="50" fill="#e0ac69" />
        </g>
      );
    case 'carwindow':
      return (
        <g>
          <path d="M0 0 H1600 V900 H0 Z M160 90 Q160 60 200 60 L1400 60 Q1440 60 1440 90 L1480 640 Q1480 690 1430 690 L170 690 Q120 690 120 640 Z" fill="#1c1f26" fillRule="evenodd" />
          <path d="M0 690 H1600 V900 H0 Z" fill="#262a33" />
          <rect x="80" y="700" width="1440" height="20" rx="8" fill="#343a46" />
          <path d="M60 520 q-50 10 -40 90 l120 10 q20 -60 -10 -100 z" fill="#343a46" />
          <path d="M1250 900 a300 300 0 0 1 400 -200" stroke="#111" strokeWidth="46" fill="none" />
        </g>
      );
    default:
      return null;
  }
}

/** Where the character stands in the 1600×900 scene (translate + scale of its 200×260 box). */
export function characterTransform(style: SceneStyle): string {
  switch (style) {
    case 'taxi':
      return 'translate(575 330) scale(2.25)';
    case 'doorstep':
      return 'translate(515 200) scale(2.85)';
    case 'carwindow':
      return 'translate(530 150) scale(2.7)';
    case 'table':
      return 'translate(560 250) scale(2.4)';
    default:
      return 'translate(540 225) scale(2.6)';
  }
}
