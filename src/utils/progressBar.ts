import { Limits } from '../config/constants';

export function createProgressBar(current: number, total: number): string {
  if (total <= 0) return '🔴 LIVE';
  const length = Limits.ProgressBarLength;
  const progress = Math.min(Math.round((current / total) * length), length);
  const filled = '▬'.repeat(progress);
  const empty = '▬'.repeat(length - progress);
  return `${filled}🔘${empty}`;
}
