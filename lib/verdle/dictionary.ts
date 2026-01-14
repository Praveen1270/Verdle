import { VERDLE_WORD_LENGTH } from "./constants";

// MVP dictionary for validation (uppercase).
export const MVP_DICTIONARY_WORDS = [
  "APPLE",
  "BRAIN",
  "CACHE",
  "CHAIR",
  "CLOUD",
  "DEBUG",
  "EARTH",
  "FAITH",
  "GRACE",
  "HOUSE",
  "INDEX",
  "JUICE",
  "KNIFE",
  "LIGHT",
  "MAGIC",
  "NERVE",
  "OCEAN",
  "PRIDE",
  "QUERY",
  "ROBOT",
  "SCALE",
  "SHARE",
  "TABLE",
  "UNITY",
  "VALUE",
  "WATER",
  "WORLD",
  "YOUTH",
  "ZEBRA",
  "ALERT",
  "BRAVE",
  "CRANE",
  "DRIVE",
  "ENJOY",
  "FRAME",
  "GLASS",
  "HEART",
  "INPUT",
  "LEVEL",
  "MONEY",
  "NORTH",
  "POWER",
  "QUICK",
  "RANGE",
  "SMART",
  "TRUST",
  "VOICE",
  "WRITE",
  "XENON",
  "ZONAL",
] as const;

const WORD_SET = new Set<string>(MVP_DICTIONARY_WORDS);

export function normalizeWord(word: string): string {
  return word.trim().toUpperCase();
}

export function isDictionaryWord(word: string): boolean {
  const w = normalizeWord(word);
  if (w.length !== VERDLE_WORD_LENGTH) return false;
  return WORD_SET.has(w);
}

