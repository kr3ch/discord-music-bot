import { Collection } from 'discord.js';
import { env } from '../config/env';

const cooldowns = new Collection<string, Collection<string, number>>();

export function checkCooldown(commandName: string, userId: string, ms?: number): number {
  const cooldownMs = ms ?? env.DEFAULT_COOLDOWN_MS;
  if (cooldownMs <= 0) return 0;

  if (!cooldowns.has(commandName)) {
    cooldowns.set(commandName, new Collection());
  }

  const timestamps = cooldowns.get(commandName)!;
  const now = Date.now();

  if (timestamps.has(userId)) {
    const expiresAt = timestamps.get(userId)! + cooldownMs;
    if (now < expiresAt) {
      return expiresAt - now;
    }
  }

  timestamps.set(userId, now);
  setTimeout(() => timestamps.delete(userId), cooldownMs);
  return 0;
}
