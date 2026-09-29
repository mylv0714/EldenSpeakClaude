import type { ChatLine, DebriefReply, TurnFeedback } from '@shared/api';
import type { Emotion, JobKind, Outcome, ScenarioContext } from '@shared/types';

/** Where a conversation came from, so the game can react when it ends. */
export type LaunchOrigin =
  | { kind: 'place'; placeId: string }
  | { kind: 'encounter'; encounterId: number }
  | { kind: 'job'; job: JobKind; encounterId?: number }
  | { kind: 'police' }
  | { kind: 'companion' }
  /** Phone calls: from the Call app, an incoming call, or the coach (Stats app). */
  | { kind: 'call' }
  /** Small talk with a random pedestrian. */
  | { kind: 'passerby'; pedId: number };

export interface ConversationLaunch {
  scenarioId: string;
  npcId: string;
  context?: ScenarioContext;
  origin: LaunchOrigin;
  /** Directions events: the route to explain, drawn on a mini map (client only). */
  routePreview?: { x: number; y: number }[];
}

export interface ChatMessage {
  id: number;
  role: 'npc' | 'player';
  text: string;
  /** NPC: translation. */
  native?: string;
  emotion?: Emotion;
  /** Player: grading from the judge. */
  feedback?: TurnFeedback;
  /** Player: the judge failed for this turn (the conversation still went on). */
  ungraded?: boolean;
  inputMode?: 'voice' | 'text';
}

export interface ConversationSummary {
  launch: ConversationLaunch;
  outcome: Outcome;
  stars: number;
  avgScore: number;
  completed: string[];
  hintsUsed: number;
  mood: number;
  messages: ChatMessage[];
  transcript: ChatLine[];
  reward: { cash: number; xp: number };
  debrief: DebriefReply | null;
}
