import type { TileState } from "./types";

/**
 * Wordle-style evaluation with duplicate-letter correctness.
 * Two-pass algorithm:
 * - First mark exact matches (green)
 * - Then mark present letters (yellow) using remaining letter counts
 */
export function evaluateGuess(secret: string, guess: string): TileState[] {
  const s = secret.toLowerCase();
  const g = guess.toLowerCase();
  if (s.length !== g.length) {
    throw new Error("Secret and guess must be same length");
  }

  const n = s.length;
  const result: TileState[] = Array(n).fill("absent");
  const remaining: Record<string, number> = {};

  // First pass: exact matches, count remaining letters from secret
  for (let i = 0; i < n; i++) {
    if (g[i] === s[i]) {
      result[i] = "correct";
    } else {
      const ch = s[i];
      remaining[ch] = (remaining[ch] ?? 0) + 1;
    }
  }

  // Second pass: present matches (non-exact)
  for (let i = 0; i < n; i++) {
    if (result[i] === "correct") continue;
    const ch = g[i];
    if ((remaining[ch] ?? 0) > 0) {
      result[i] = "present";
      remaining[ch] -= 1;
    }
  }

  return result;
}

