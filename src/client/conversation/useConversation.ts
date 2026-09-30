// Conversation state machine: turn loop with the AI, objectives, NPC mood, hints and end conditions.
import type { HintReply } from '@shared/api';
import { getNpc } from '@shared/content/npcs';
import { getScenario } from '@shared/content/scenarios';
import { contextVars, fillTemplate } from '@shared/content/template';
import { averageScore, bonusDoneCount, clamp, computeReward, computeStars, levelFromXp, MOOD_START, requiredObjectivesDone } from '@shared/rules';
import type { Outcome } from '@shared/types';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ApiError, api } from '../api/client';
import { sfx } from '../audio/sfx';
import { speakNpc, stopSpeaking } from '../audio/voice';
import { tr } from '../i18n';
import { focusIds, getSave, topWeakPoints } from '../state/game';
import type { ChatMessage, ConversationLaunch, ConversationSummary } from './types';

export type ConvStatus = 'ongoing' | Outcome;

interface ConvState {
  messages: ChatMessage[];
  completed: string[];
  justCompleted: string[];
  mood: number;
  turns: number;
  hintsUsed: number;
  /** "Say it in English" translations used (together with hints, they cancel the no-help bonus). */
  translationsUsed: number;
  status: ConvStatus;
  pending: boolean;
  error: string | null;
  failedId: number | null;
  speakingId: number | null;
  /** Id of the player message that can still be taken back ("say it again"), if any. */
  undoableId: number | null;
}

let msgId = 1;

export function errorText(err: unknown): string {
  if (err instanceof ApiError) {
    switch (err.code) {
      case 'daily_limit':
        return tr('오늘의 대화 횟수를 모두 사용했어요. 내일 다시 만나요!', "You've used today's conversations. See you tomorrow!");
      case 'rate_limited':
        return tr('요청이 너무 많아요. 잠시 후 다시 시도해 주세요.', 'Too many requests. Try again in a moment.');
      case 'network':
      case 'timeout':
        return tr('인터넷 연결을 확인해 주세요.', 'Check your internet connection.');
      case 'ai_unavailable':
        return tr('AI가 응답하지 않아요. 다시 시도해 주세요.', 'The AI did not respond. Please retry.');
      default:
        return tr('문제가 발생했어요. 다시 시도해 주세요.', 'Something went wrong. Please retry.');
    }
  }
  return tr('문제가 발생했어요. 다시 시도해 주세요.', 'Something went wrong. Please retry.');
}

export function useConversation(launch: ConversationLaunch) {
  const scenario = useMemo(() => getScenario(launch.scenarioId), [launch.scenarioId]);
  const npc = useMemo(() => getNpc(launch.npcId), [launch.npcId]);
  const save = getSave();
  const lang = save.settings.uiLang;

  const [state, setState] = useState<ConvState>(() => {
    const opening = scenario.openingPool ? scenario.openingPool[Math.floor(Math.random() * scenario.openingPool.length)] : scenario.opening;
    const en = fillTemplate(opening.en, contextVars(launch.context, 'en', save.name));
    const ko = fillTemplate(opening.ko, contextVars(launch.context, 'ko', save.name));
    return {
      messages: [{ id: msgId++, role: 'npc', text: en, native: lang === 'ko' ? ko : undefined, emotion: 'neutral' }],
      completed: [],
      justCompleted: [],
      mood: MOOD_START,
      turns: 0,
      hintsUsed: 0,
      translationsUsed: 0,
      status: 'ongoing',
      pending: false,
      error: null,
      failedId: null,
      speakingId: null,
      undoableId: null,
    };
  });
  const ref = useRef(state);
  useEffect(() => {
    ref.current = state;
  }, [state]);
  const [hint, setHint] = useState<HintReply | null>(null);
  const [hintLoading, setHintLoading] = useState(false);

  const speak = useCallback(
    async (m: ChatMessage, slow = false) => {
      setState((s) => ({ ...s, speakingId: m.id }));
      await speakNpc(m.text, npc, slow);
      setState((s) => (s.speakingId === m.id ? { ...s, speakingId: null } : s));
    },
    [npc],
  );

  // Say the opening line once.
  useEffect(() => {
    const first = ref.current.messages[0];
    const t = setTimeout(() => void speak(first), 350);
    return () => clearTimeout(t);
  }, [speak]);

  const base = useCallback(
    () => ({
      scenarioId: scenario.id,
      npcId: npc.id,
      level: getSave().level,
      nativeLang: getSave().settings.uiLang,
      playerName: getSave().name,
      playerLevel: levelFromXp(getSave().xp).level,
      context: launch.context,
    }),
    [scenario.id, npc.id, launch.context],
  );

  /** State right before the latest player message, so a misheard or regretted turn can be taken back. */
  const undoRef = useRef<{ snapshot: Pick<ConvState, 'messages' | 'completed' | 'mood' | 'turns'>; msgId: number; text: string; mode: 'voice' | 'text' } | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const send = useCallback(
    async (raw: string, mode: 'voice' | 'text', reuseId?: number) => {
      const s = ref.current;
      const text = raw.trim().slice(0, 300);
      if (!text || s.pending || s.status !== 'ongoing') return;
      const id = reuseId ?? msgId++;
      const prior = s.messages.filter((m) => m.id !== id);
      const history = prior.map((m) => ({ role: m.role, text: m.text })).slice(-30);
      const playerMsg: ChatMessage = { id, role: 'player', text, inputMode: mode };
      undoRef.current = { snapshot: { messages: prior, completed: s.completed, mood: s.mood, turns: s.turns }, msgId: id, text, mode };
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setState((cur) => ({ ...cur, messages: [...prior, playerMsg], pending: true, error: null, failedId: null, justCompleted: [], undoableId: id }));
      setHint(null);
      try {
        const judge = await api.turnStream(
          {
            ...base(),
            history,
            message: text,
            inputMode: mode,
            completed: s.completed,
            mood: s.mood,
            memory: getSave().npcMemory[npc.id],
            // The coach always works on your weak points; elsewhere it follows the setting.
            focus: scenario.id === 'call_coach' ? topWeakPoints(getSave()) : focusIds(),
          },
          (line) => {
            if (ctrl.signal.aborted) return;
            // Speak the moment the line arrives; grading keeps running in the background.
            const npcMsg: ChatMessage = { id: msgId++, role: 'npc', text: line.reply, native: line.replyNative, emotion: line.emotion };
            setState((cur) => ({ ...cur, messages: [...cur.messages, npcMsg] }));
            void speak(npcMsg);
          },
          ctrl.signal,
        );
        if (ctrl.signal.aborted) return;
        const reply = judge ?? { objectivesCompleted: [], moodDelta: 0, feedback: null };
        const completed = [...new Set([...s.completed, ...reply.objectivesCompleted])];
        const mood = clamp(s.mood + reply.moodDelta, 0, 100);
        const turns = s.turns + 1;
        const done = requiredObjectivesDone(scenario, new Set(completed));
        const status: ConvStatus = scenario.freeTalk
          ? mood <= 0
            ? 'failure'
            : turns >= scenario.maxTurns
              ? 'success'
              : 'ongoing'
          : done
            ? 'success'
            : mood <= 0 || turns >= scenario.maxTurns
              ? 'failure'
              : 'ongoing';
        setState((cur) => ({
          ...cur,
          messages: cur.messages.map((m) => (m.id === id ? (reply.feedback ? { ...m, feedback: reply.feedback } : { ...m, ungraded: true }) : m)),
          completed,
          justCompleted: reply.objectivesCompleted,
          mood,
          turns,
          status,
          pending: false,
          undoableId: status === 'ongoing' ? cur.undoableId : null,
        }));
        if (status !== 'ongoing') undoRef.current = null;
        if (reply.objectivesCompleted.length > 0) sfx.play('objective');
      } catch (err) {
        if (ctrl.signal.aborted) return;
        undoRef.current = null;
        setState((cur) => ({ ...cur, pending: false, error: errorText(err), failedId: id, undoableId: null }));
      }
    },
    [base, npc.id, scenario, speak],
  );

  /**
   * Takes back the latest player message (and the reply to it), even while the AI is still answering.
   * Returns what was said so the UI can re-record or edit it.
   */
  const undo = useCallback((): { text: string; mode: 'voice' | 'text' } | null => {
    const u = undoRef.current;
    if (!u || ref.current.status !== 'ongoing') return null;
    undoRef.current = null;
    abortRef.current?.abort();
    stopSpeaking();
    setState((cur) => ({ ...cur, ...u.snapshot, pending: false, error: null, failedId: null, justCompleted: [], speakingId: null, undoableId: null }));
    setHint(null);
    return { text: u.text, mode: u.mode };
  }, []);

  // Leaving mid-request: don't let a late reply update an unmounted conversation.
  useEffect(() => () => abortRef.current?.abort(), []);

  const retry = useCallback(() => {
    const s = ref.current;
    const failed = s.messages.find((m) => m.id === s.failedId);
    if (failed) void send(failed.text, failed.inputMode ?? 'text', failed.id);
  }, [send]);

  const requestHint = useCallback(async () => {
    const s = ref.current;
    if (hintLoading || s.status !== 'ongoing') return;
    setHintLoading(true);
    try {
      const reply = await api.hint({
        ...base(),
        history: s.messages.map((m) => ({ role: m.role, text: m.text })).slice(-30),
        completed: s.completed,
      });
      setHint(reply);
      setState((cur) => ({ ...cur, hintsUsed: cur.hintsUsed + 1 }));
    } catch (err) {
      setState((cur) => ({ ...cur, error: errorText(err) }));
    } finally {
      setHintLoading(false);
    }
  }, [base, hintLoading]);

  /** "Say it in English": turns what the learner wrote in their own language into a line they can say. */
  const translate = useCallback(
    async (text: string): Promise<string | null> => {
      const s = ref.current;
      try {
        const reply = await api.translate({ ...base(), history: s.messages.map((m) => ({ role: m.role, text: m.text })).slice(-30), text });
        if (reply.en) setState((cur) => ({ ...cur, translationsUsed: cur.translationsUsed + 1 }));
        return reply.en || null;
      } catch (err) {
        setState((cur) => ({ ...cur, error: errorText(err) }));
        return null;
      }
    },
    [base],
  );

  const abandon = useCallback(() => {
    setState((cur) => (cur.status === 'ongoing' ? { ...cur, status: 'abandoned' } : cur));
  }, []);

  /** Free talk: the learner ends the chat; it counts once they have said something. */
  const finish = useCallback(() => {
    setState((cur) => (cur.status === 'ongoing' && !cur.pending ? { ...cur, status: cur.turns > 0 ? 'success' : 'abandoned' } : cur));
  }, []);

  /** Final numbers for the results screen. */
  const summarize = useCallback((): ConversationSummary => {
    const s = ref.current;
    const outcome: Outcome = s.status === 'ongoing' ? 'abandoned' : s.status;
    const scores = s.messages.filter((m) => m.feedback).map((m) => m.feedback!.score);
    const avgScore = averageScore(scores);
    const completedSet = new Set(s.completed);
    // Free chats have no bonus goals, so a great average alone can earn three stars.
    const bonus = scenario.freeTalk ? 1 : bonusDoneCount(scenario, completedSet);
    return {
      launch,
      outcome,
      stars: computeStars(outcome, avgScore, bonus),
      avgScore,
      completed: s.completed,
      hintsUsed: s.hintsUsed,
      mood: s.mood,
      messages: s.messages,
      transcript: s.messages.map((m) => ({ role: m.role, text: m.text })),
      reward: computeReward(scenario, {
        outcome,
        avgScore,
        bonusDone: bonus,
        hintsUsed: s.hintsUsed,
        mood: s.mood,
        helpUsed: s.hintsUsed + s.translationsUsed,
        playerLevel: levelFromXp(getSave().xp).level,
      }),
      debrief: null,
    };
  }, [launch, scenario]);

  return { scenario, npc, state, hint, hintLoading, setHint, send, retry, undo, requestHint, translate, abandon, finish, speak, summarize };
}
