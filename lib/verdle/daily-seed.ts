import crypto from "crypto";
import { db } from "@/lib/drizzle/client";
import { dailyWords } from "@/lib/drizzle/schema";
import { encryptWord } from "@/lib/verdle/crypto";
import { hashWord } from "@/lib/verdle/hash";
import { MVP_DICTIONARY_WORDS } from "@/lib/verdle/dictionary";

function isIsoDate(d: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(d);
}

function addUtcDays(dateIso: string, days: number): string {
  const d = new Date(`${dateIso}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Deterministically picks a word for a given date from the fixed pool.
 * This avoids race conditions if multiple requests try to seed the same date.
 */
export function pickDailyWordForDate(dateIso: string): string {
  if (!isIsoDate(dateIso)) throw new Error("Invalid date (expected YYYY-MM-DD)");
  const pool = MVP_DICTIONARY_WORDS;
  if (pool.length < 50) {
    throw new Error("Daily word pool must contain at least 50 words");
  }

  // Use VERDLE_WORD_SECRET so different deployments don't share the same daily sequence.
  const secret = process.env.VERDLE_WORD_SECRET;
  if (!secret) throw new Error("Missing env var VERDLE_WORD_SECRET");

  const digest = crypto
    .createHash("sha256")
    .update(`${secret}:daily:${dateIso}`, "utf8")
    .digest();
  const n = digest.readUInt32BE(0);
  const idx = n % 50; // explicitly "set 50 words" as requested
  return pool[idx];
}

/**
 * Ensure daily_words rows exist for dateIso and the next (days-1) days.
 * Uses deterministic word selection, and inserts are conflict-safe.
 */
export async function ensureDailyWordsSeeded(dateIso: string, days = 50) {
  if (!isIsoDate(dateIso)) throw new Error("Invalid date (expected YYYY-MM-DD)");
  const count = Math.max(1, Math.min(365, Math.floor(days)));

  const values = Array.from({ length: count }, (_, i) => {
    const d = addUtcDays(dateIso, i);
    const word = pickDailyWordForDate(d);
    const wordHash = hashWord(word);
    const wordCiphertext = encryptWord(word.toLowerCase());
    return { date: d, wordHash, wordCiphertext };
  });

  await db.insert(dailyWords).values(values).onConflictDoNothing();
}

