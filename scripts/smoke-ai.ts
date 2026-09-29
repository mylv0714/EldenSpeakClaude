// Manual smoke test against the real AI provider: `npx tsx scripts/smoke-ai.ts`
// Runs one turn, one hint and one debrief through the real app routes (no server process needed).
import { createApp } from '../src/server/app';
import { loadEnvFiles, readConfig } from '../src/server/config';
import { createLlm } from '../src/server/llm';
import { RateLimiter } from '../src/server/rateLimit';

loadEnvFiles();
const config = readConfig();
const app = createApp({ config, llm: createLlm(config), limiter: new RateLimiter(0) });

async function post(path: string, body: unknown) {
  const t = Date.now();
  const res = await app.request(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Client-Id': 'smoke' },
    body: JSON.stringify(body),
  });
  console.log(`\n### ${path} → ${res.status} in ${Date.now() - t}ms`);
  console.log(JSON.stringify(await res.json(), null, 2));
}

const history = [{ role: 'npc' as const, text: 'Hi! Welcome to Bean There. What can I get started for you?' }];
const base = { scenarioId: 'cafe_order', npcId: 'mia', level: 'A2' as const, nativeLang: 'ko' as const, playerName: 'Alex' };

await post('/api/conversation/turn', {
  ...base,
  history,
  message: 'I want a ice latte, big size please',
  inputMode: 'text',
  completed: [],
  mood: 70,
});
await post('/api/conversation/hint', { ...base, history, completed: [] });
await post('/api/conversation/debrief', {
  ...base,
  history: [
    ...history,
    { role: 'player', text: 'I want a ice latte, big size please' },
    { role: 'npc', text: 'Sure! A large iced latte. What kind of milk would you like?' },
    { role: 'player', text: 'almond milk. and I pay card' },
    { role: 'npc', text: 'Great, that is $6.50. Tap your card here. Have a nice day!' },
  ],
  outcome: 'success',
  completed: ['o1', 'o2', 'o3'],
});
