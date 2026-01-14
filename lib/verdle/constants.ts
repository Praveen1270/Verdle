export const VERDLE_WORD_LENGTH = 5;
export const VERDLE_MAX_ATTEMPTS = 6;

export function todayUtcDate(): string {
  return new Date().toISOString().slice(0, 10);
}

