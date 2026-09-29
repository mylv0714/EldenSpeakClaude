import type { NativeLang, ScenarioContext } from '../types';
import { INTERVIEW_TOPICS, PLACE_BY_ID } from './city';

export type TemplateVars = Record<string, string>;

export function fillTemplate(text: string, vars: TemplateVars): string {
  return text.replace(/\{(\w+)\}/g, (match, key: string) => vars[key] ?? match);
}

function joinList(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/** Values for {player} {place} {topic} {order} {fare} {late} tokens in scenario text. */
export function contextVars(ctx: ScenarioContext | undefined, lang: NativeLang, playerName: string): TemplateVars {
  const place = ctx?.destinationId ? PLACE_BY_ID.get(ctx.destinationId) : undefined;
  const topic = ctx?.topicId !== undefined ? INTERVIEW_TOPICS[ctx.topicId] : undefined;
  const late = ctx?.minutesLate ?? 0;
  return {
    player: playerName,
    place: place ? (lang === 'ko' ? place.nameKo : place.name) : lang === 'ko' ? '목적지' : 'the destination',
    topic: topic ? topic[lang] : '',
    order: joinList(ctx?.order ?? []),
    fare: ctx?.fare !== undefined ? String(Math.round(ctx.fare)) : '',
    late: late > 0 ? `${Math.round(late)} minutes late` : 'right on time',
  };
}
