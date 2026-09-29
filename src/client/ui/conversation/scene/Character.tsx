// Half-body character for the first-person conversation scene. Drawn as an SVG <g> in a 200×260 box
// (head from the shared Avatar face), placed into the scene's SVG by the caller.
import type { Emotion, NpcLook } from '@shared/types';
import { shade } from '../../../game/math';
import { Face, HairBack } from '../../Avatar';

type Pose = 'rest' | 'open' | 'up' | 'crossed' | 'low';

/** Places the 100×100 portrait head on the body, a bit larger for a friendly cartoon look. */
const HEAD = 'translate(100 50) scale(1.4) translate(-50 -46)';

const POSE: Record<Emotion, Pose> = {
  neutral: 'rest',
  happy: 'open',
  excited: 'up',
  amused: 'open',
  confused: 'rest',
  surprised: 'up',
  worried: 'low',
  annoyed: 'crossed',
  angry: 'crossed',
  sad: 'low',
};

/** One-shot head reaction played when the emotion changes (CSS classes in styles.css). */
const REACTION: Partial<Record<Emotion, string>> = {
  happy: 'char-nod',
  excited: 'char-bounce',
  amused: 'char-nod',
  confused: 'char-tilt',
  surprised: 'char-bounce',
  annoyed: 'char-shake',
  angry: 'char-shake',
  worried: 'char-droop',
  sad: 'char-droop',
};

function Arm({ side, pose, shirt, skin }: { side: -1 | 1; pose: Pose; shirt: string; skin: string }) {
  // Pivot at the shoulder; angles in degrees, positive = away from the body.
  const angle = pose === 'up' ? 38 : pose === 'open' ? (side === 1 ? 22 : 8) : pose === 'low' ? -4 : 6;
  const sleeve = shade(shirt, -0.12);
  const x = 100 + side * 62;
  return (
    <g style={{ transform: `rotate(${side * angle}deg)`, transformBox: 'fill-box', transformOrigin: '50% 4%', transition: 'transform 0.5s cubic-bezier(0.3, 1.4, 0.5, 1)' }}>
      <path d={`M${x - 15} 118 Q${x} 104 ${x + 15} 118 L${x + 12 + side * 4} 232 Q${x + side * 2} 240 ${x - 12 + side * 4} 232 Z`} fill={sleeve} />
      <ellipse cx={x + side * 4} cy={238} rx="11" ry="12" fill={skin} />
    </g>
  );
}

export function Character({ look, emotion, mouth, blink, reactKey }: { look: NpcLook; emotion: Emotion; mouth: number; blink: boolean; reactKey: number }) {
  const pose = POSE[emotion];
  const shirt = look.shirt;
  const skin = look.skin;
  const reaction = REACTION[emotion];
  return (
    <g>
      <g className="char-breathe">
        {/* Hair that falls behind the shoulders (long, bob, ponytail…). */}
        <g transform={HEAD}>
          <HairBack look={look} />
        </g>
        {pose !== 'crossed' && (
          <>
            <Arm side={-1} pose={pose} shirt={shirt} skin={skin} />
            <Arm side={1} pose={pose} shirt={shirt} skin={skin} />
          </>
        )}
        {/* Torso with a little shading and a collar. */}
        <path d="M36 262 L40 128 Q44 94 100 88 Q156 94 160 128 L164 262 Z" fill={shirt} />
        <path d="M40 128 Q44 94 100 88 L100 262 L40 262 Z" fill={shade(shirt, 0.06)} opacity="0.5" />
        <path d="M84 90 L100 112 L116 90" fill="none" stroke={shade(shirt, -0.3)} strokeWidth="3" strokeLinejoin="round" />
        <path d="M100 112 V262" stroke={shade(shirt, -0.18)} strokeWidth="1.5" opacity="0.5" />
        {pose === 'crossed' && (
          <g>
            <path d="M38 176 Q100 150 162 176 L160 206 Q100 184 40 206 Z" fill={shade(shirt, -0.16)} />
            <ellipse cx="54" cy="190" rx="11" ry="10" fill={skin} />
            <ellipse cx="146" cy="190" rx="11" ry="10" fill={skin} />
          </g>
        )}
      </g>
      <g key={reactKey} className={`char-head ${reaction ?? ''}`}>
        <g className="char-head char-sway">
          <g transform={HEAD}>
            <Face look={look} emotion={emotion} mouth={mouth} blink={blink} />
          </g>
        </g>
      </g>
    </g>
  );
}
