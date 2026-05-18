import { Collection } from 'discord.js';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const limits = new Collection<string, RateLimitEntry>();

const MAX_ACTIONS = 10;
const WINDOW_MS = 10_000;

export function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const entry = limits.get(userId);

  if (!entry || now >= entry.resetAt) {
    limits.set(userId, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  entry.count++;
  if (entry.count > MAX_ACTIONS) {
    return true;
  }
  return false;
}
