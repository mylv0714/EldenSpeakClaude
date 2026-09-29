import { dayKey } from '@shared/rules';

export type LimitResult = { ok: true } | { ok: false; code: 'rate_limited' | 'daily_limit'; retryAfterSec: number };

/**
 * In-memory limits: a per-IP burst window and an optional per-client daily quota (CHAT_DAILY_LIMIT).
 * Fine for a single instance; move the counters to Redis when running several instances.
 */
export class RateLimiter {
  private readonly burst = new Map<string, number[]>();
  private daily = new Map<string, number>();
  private day = '';

  constructor(
    private readonly dailyLimit: number,
    private readonly perMinute = 40,
    private readonly now: () => number = Date.now,
  ) {}

  check(ip: string, clientId: string, countsTowardDaily: boolean): LimitResult {
    const now = this.now();

    const windowStart = now - 60_000;
    const hits = (this.burst.get(ip) ?? []).filter((t) => t > windowStart);
    if (hits.length >= this.perMinute) {
      this.burst.set(ip, hits);
      return { ok: false, code: 'rate_limited', retryAfterSec: Math.ceil((hits[0] + 60_000 - now) / 1000) };
    }
    hits.push(now);
    this.burst.set(ip, hits);
    if (this.burst.size > 10_000) this.pruneBurst(windowStart);

    if (countsTowardDaily && this.dailyLimit > 0) {
      const today = dayKey(now);
      if (today !== this.day) {
        this.day = today;
        this.daily = new Map();
      }
      const used = this.daily.get(clientId) ?? 0;
      if (used >= this.dailyLimit) {
        const midnight = new Date(now);
        midnight.setHours(24, 0, 0, 0);
        return { ok: false, code: 'daily_limit', retryAfterSec: Math.ceil((midnight.getTime() - now) / 1000) };
      }
      this.daily.set(clientId, used + 1);
    }
    return { ok: true };
  }

  private pruneBurst(windowStart: number): void {
    for (const [key, hits] of this.burst) {
      if (!hits.some((t) => t > windowStart)) this.burst.delete(key);
    }
  }
}
