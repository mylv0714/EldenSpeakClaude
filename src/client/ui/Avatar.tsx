import type { Emotion, NpcLook } from '@shared/types';
import { memo } from 'react';
import { shade } from '../game/math';

interface Props {
  look: NpcLook;
  emotion?: Emotion;
  size?: number;
  talking?: boolean;
  className?: string;
}

const EYE = '#1f2430';

function Eyes({ emotion, blink }: { emotion: Emotion; blink: boolean }) {
  if (blink)
    return (
      <g fill="none" stroke={EYE} strokeWidth="2" strokeLinecap="round">
        <path d="M39 47 h6" />
        <path d="M55 47 h6" />
      </g>
    );
  switch (emotion) {
    case 'happy':
    case 'excited':
    case 'amused':
      return (
        <g fill="none" stroke={EYE} strokeWidth="2.4" strokeLinecap="round">
          <path d="M38 47 q4 -5 8 0" />
          <path d="M54 47 q4 -5 8 0" />
        </g>
      );
    case 'surprised':
      return (
        <g>
          <circle cx="42" cy="46" r="3.6" fill="#fff" stroke={EYE} strokeWidth="1.2" />
          <circle cx="58" cy="46" r="3.6" fill="#fff" stroke={EYE} strokeWidth="1.2" />
          <circle cx="42" cy="46" r="1.8" fill={EYE} />
          <circle cx="58" cy="46" r="1.8" fill={EYE} />
        </g>
      );
    case 'sad':
      return (
        <g fill={EYE}>
          <ellipse cx="42" cy="47.5" rx="2.2" ry="1.8" />
          <ellipse cx="58" cy="47.5" rx="2.2" ry="1.8" />
        </g>
      );
    default:
      return (
        <g fill={EYE}>
          <ellipse cx="42" cy="46.5" rx="2.2" ry="2.6" />
          <ellipse cx="58" cy="46.5" rx="2.2" ry="2.6" />
          <circle cx="42.8" cy="45.6" r="0.7" fill="#fff" />
          <circle cx="58.8" cy="45.6" r="0.7" fill="#fff" />
        </g>
      );
  }
}

function Brows({ emotion, color }: { emotion: Emotion; color: string }) {
  const p: Record<Emotion, [string, string]> = {
    neutral: ['M37 40 q5 -2 10 0', 'M53 40 q5 -2 10 0'],
    happy: ['M37 39 q5 -3 10 0', 'M53 39 q5 -3 10 0'],
    excited: ['M37 37.5 q5 -3 10 0', 'M53 37.5 q5 -3 10 0'],
    amused: ['M37 39 q5 -3 10 0', 'M53 38 q5 -4 10 0'],
    confused: ['M37 41 q5 0 10 -1', 'M53 37 q5 -4 10 0'],
    surprised: ['M37 36 q5 -4 10 0', 'M53 36 q5 -4 10 0'],
    worried: ['M37 40 q5 -1 10 -4', 'M53 36 q5 1 10 4'],
    annoyed: ['M37 39 l10 2.5', 'M63 39 l-10 2.5'],
    angry: ['M37 38 l10 4', 'M63 38 l-10 4'],
    sad: ['M37 41 q5 -1 10 -4', 'M53 37 q5 1 10 4'],
  };
  const [l, r] = p[emotion];
  return (
    <g fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round">
      <path d={l} />
      <path d={r} />
    </g>
  );
}

/** `open` 0-1 while speaking (lip-sync); 0 shows the emotion's resting mouth. */
function Mouth({ emotion, open }: { emotion: Emotion; open: number }) {
  if (open > 0.04)
    return (
      <g>
        <ellipse cx="50" cy="59" rx={3.6 + open * 1.6} ry={0.9 + open * 3.4} fill="#6b1d1d" />
        {open > 0.45 && <path d={`M${47.2 - open} ${56.4 - open * 0.8} h${5.6 + open * 2}`} stroke="#fff" strokeWidth="1.1" strokeLinecap="round" />}
      </g>
    );
  switch (emotion) {
    case 'happy':
      return <path d="M43 57 q7 6 14 0" fill="none" stroke="#6b1d1d" strokeWidth="2.2" strokeLinecap="round" />;
    case 'excited':
    case 'amused':
      return (
        <g>
          <path d="M42 56 q8 9 16 0 z" fill="#6b1d1d" />
          <path d="M44 56.4 h12 v1.6 h-12 z" fill="#fff" />
        </g>
      );
    case 'surprised':
      return <ellipse cx="50" cy="59" rx="3" ry="3.6" fill="#6b1d1d" />;
    case 'angry':
    case 'sad':
      return <path d="M43 61 q7 -5 14 0" fill="none" stroke="#6b1d1d" strokeWidth="2.2" strokeLinecap="round" />;
    case 'annoyed':
      return <path d="M44 59.5 l12 -1.5" stroke="#6b1d1d" strokeWidth="2.2" strokeLinecap="round" />;
    case 'worried':
      return <path d="M43 60 q3.5 -2 7 0 t7 0" fill="none" stroke="#6b1d1d" strokeWidth="2" strokeLinecap="round" />;
    case 'confused':
      return <path d="M44 60 l12 -2.5" stroke="#6b1d1d" strokeWidth="2.2" strokeLinecap="round" />;
    default:
      return <path d="M44 58.5 q6 2 12 0" fill="none" stroke="#6b1d1d" strokeWidth="2.2" strokeLinecap="round" />;
  }
}

export function HairBack({ look }: { look: NpcLook }) {
  const c = look.hair;
  switch (look.hairStyle) {
    case 'long':
      return <path d="M27 42 Q26 70 32 80 L68 80 Q74 70 73 42 Q72 22 50 20 Q28 22 27 42 Z" fill={c} />;
    case 'bob':
      return <path d="M27 44 Q26 62 31 66 L69 66 Q74 62 73 44 Q72 21 50 20 Q28 21 27 44 Z" fill={c} />;
    case 'ponytail':
      return <ellipse cx="74" cy="52" rx="6" ry="13" fill={c} />;
    case 'afro':
      return <circle cx="50" cy="36" r="27" fill={c} />;
    default:
      return null;
  }
}

function HairFront({ look }: { look: NpcLook }) {
  const c = look.hair;
  switch (look.hairStyle) {
    case 'bald':
      return <ellipse cx="44" cy="28" rx="6" ry="3" fill="#fff" opacity="0.25" />;
    case 'buzz':
      return <path d="M30 40 Q30 21 50 20 Q70 21 70 40 Q66 28 50 27 Q34 28 30 40 Z" fill={c} opacity="0.85" />;
    case 'mohawk':
      return <path d="M45 30 Q46 12 50 10 Q54 12 55 30 Z" fill={c} />;
    case 'curly':
      return (
        <g fill={c}>
          {[
            [34, 30],
            [41, 24],
            [50, 22],
            [59, 24],
            [66, 30],
            [30, 38],
            [70, 38],
          ].map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="7" />
          ))}
        </g>
      );
    case 'afro':
      return <path d="M30 40 Q32 26 50 25 Q68 26 70 40 Q64 32 50 32 Q36 32 30 40 Z" fill={c} />;
    case 'bun':
      return (
        <g fill={c}>
          <circle cx="50" cy="16" r="8" />
          <path d="M29 42 Q29 20 50 20 Q71 20 71 42 Q67 29 50 28 Q33 29 29 42 Z" />
        </g>
      );
    case 'side':
      return <path d="M29 43 Q28 19 52 19 Q72 20 71 40 Q64 26 44 30 Q36 32 29 43 Z" fill={c} />;
    case 'long':
    case 'bob':
      return <path d="M29 44 Q29 20 50 20 Q71 20 71 44 Q66 30 56 28 Q46 34 29 44 Z" fill={c} />;
    case 'ponytail':
    case 'short':
    default:
      return <path d="M29 42 Q29 19 50 19 Q71 19 71 42 Q67 28 50 27 Q33 28 29 42 Z" fill={c} />;
  }
}

function Accessory({ look }: { look: NpcLook }) {
  switch (look.accessory) {
    case 'glasses':
      return (
        <g fill="none" stroke="#1f2937" strokeWidth="1.6">
          <circle cx="42" cy="46.5" r="5.2" fill="rgba(255,255,255,0.15)" />
          <circle cx="58" cy="46.5" r="5.2" fill="rgba(255,255,255,0.15)" />
          <path d="M47.2 46.5 h5.6" />
        </g>
      );
    case 'sunglasses':
      return (
        <g>
          <rect x="35" y="42" width="13" height="8" rx="3" fill="#111" />
          <rect x="52" y="42" width="13" height="8" rx="3" fill="#111" />
          <path d="M48 45 h4" stroke="#111" strokeWidth="1.6" />
        </g>
      );
    case 'cap':
      return (
        <g>
          <path d="M28 36 Q30 16 50 16 Q70 16 72 36 Z" fill={shade(look.shirt, -0.25)} />
          <path d="M26 36 h36 q10 0 14 4 h-50 z" fill={shade(look.shirt, -0.4)} />
        </g>
      );
    case 'police_cap':
      return (
        <g>
          <path d="M27 34 Q30 15 50 15 Q70 15 73 34 Z" fill="#1e293b" />
          <rect x="27" y="32" width="46" height="5" fill="#0f172a" />
          <path d="M30 37 h40 q-4 5 -20 5 q-16 0 -20 -5 z" fill="#111827" />
          <circle cx="50" cy="25" r="3.5" fill="#fbbf24" />
        </g>
      );
    case 'chef_hat':
      return (
        <g fill="#fff" stroke="#e5e7eb">
          <rect x="33" y="22" width="34" height="10" />
          <circle cx="38" cy="16" r="8" />
          <circle cx="50" cy="12" r="9" />
          <circle cx="62" cy="16" r="8" />
        </g>
      );
    case 'headset':
      return (
        <g fill="none" stroke="#111827" strokeWidth="3">
          <path d="M28 46 Q28 18 50 18 Q72 18 72 46" />
          <rect x="24" y="42" width="7" height="11" rx="2" fill="#111827" />
          <path d="M28 52 Q32 62 42 62" strokeWidth="1.6" />
        </g>
      );
    case 'beanie':
      return <path d="M28 38 Q29 14 50 14 Q71 14 72 38 Z" fill={shade(look.shirt, 0.1)} />;
    case 'earrings':
      return (
        <g fill="#fbbf24">
          <circle cx="30" cy="53" r="2" />
          <circle cx="70" cy="53" r="2" />
        </g>
      );
    default:
      return null;
  }
}

function FacialHair({ look }: { look: NpcLook }) {
  const c = look.hair;
  switch (look.facialHair) {
    case 'beard':
      return <path d="M31 50 Q32 70 50 72 Q68 70 69 50 Q64 62 50 63 Q36 62 31 50 Z" fill={c} />;
    case 'mustache':
      return <path d="M42 55.5 Q46 52.5 50 54.5 Q54 52.5 58 55.5 Q54 57 50 56 Q46 57 42 55.5 Z" fill={c} />;
    case 'stubble':
      return <path d="M33 52 Q35 68 50 69 Q65 68 67 52 Q62 63 50 64 Q38 63 33 52 Z" fill={c} opacity="0.25" />;
    default:
      return null;
  }
}

/**
 * Everything drawn in front of the shirt: neck, face, hair, accessories (100×100 portrait coordinates).
 * Shared by the round Avatar and the first-person conversation character.
 */
export function Face({ look, emotion, mouth, blink = false }: { look: NpcLook; emotion: Emotion; mouth: number; blink?: boolean }) {
  return (
    <g>
      <path d="M42 68 h16 v8 q-8 5 -16 0 z" fill={shade(look.skin, -0.12)} />
      <circle cx="29.5" cy="47" r="4.5" fill={shade(look.skin, -0.06)} />
      <circle cx="70.5" cy="47" r="4.5" fill={shade(look.skin, -0.06)} />
      <ellipse cx="50" cy="46" rx="20.5" ry="24" fill={look.skin} />
      <FacialHair look={look} />
      <Brows emotion={emotion} color={shade(look.hair, -0.1)} />
      <Eyes emotion={emotion} blink={blink} />
      <path d="M49 50 q-2 5 1 6" fill="none" stroke={shade(look.skin, -0.25)} strokeWidth="1.4" strokeLinecap="round" />
      {(emotion === 'happy' || emotion === 'excited' || emotion === 'amused') && (
        <g fill="#f87171" opacity="0.35">
          <ellipse cx="36" cy="55" rx="4" ry="2.5" />
          <ellipse cx="64" cy="55" rx="4" ry="2.5" />
        </g>
      )}
      <Mouth emotion={emotion} open={mouth} />
      <HairFront look={look} />
      <Accessory look={look} />
    </g>
  );
}

/** Flat-style portrait generated from an NPC look; expression follows the AI's emotion. */
export const Avatar = memo(function Avatar({ look, emotion = 'neutral', size = 64, talking = false, className }: Props) {
  const bg = shade(look.shirt, 0.55);
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} style={{ borderRadius: '50%', overflow: 'hidden' }} aria-hidden="true">
      <g>
        <rect width="100" height="100" fill={bg} />
        <HairBack look={look} />
        <path d="M12 100 Q13 76 50 73 Q87 76 88 100 Z" fill={look.shirt} />
        <Face look={look} emotion={emotion} mouth={talking ? 0.7 : 0} />
      </g>
    </svg>
  );
});
