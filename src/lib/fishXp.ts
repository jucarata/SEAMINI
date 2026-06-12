export const XP_PER_LEVEL = 10;

export function xpProgress(xp: number): number {
  return Math.min(1, Math.max(0, xp / XP_PER_LEVEL));
}
