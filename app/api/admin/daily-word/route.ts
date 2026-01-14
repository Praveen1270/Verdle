import { NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/drizzle/client";
import { dailyWords } from "@/lib/drizzle/schema";
import { requireAdminUser } from "@/lib/verdle/admin";
import { encryptWord } from "@/lib/verdle/crypto";
import { hashWord } from "@/lib/verdle/hash";
import {
  isDictionaryWord,
  MVP_DICTIONARY_WORDS,
  normalizeWord,
} from "@/lib/verdle/dictionary";
import { todayUtcDate } from "@/lib/verdle/constants";
import { eq } from "drizzle-orm";

function pickRandomWord(): string {
  const idx = crypto.randomInt(0, MVP_DICTIONARY_WORDS.length);
  return MVP_DICTIONARY_WORDS[idx];
}

function isIsoDate(d: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(d);
}

export async function POST(req: Request) {
  try {
    const admin = await requireAdminUser();
    if (!admin.ok) {
      return NextResponse.json({ error: admin.error }, { status: admin.status });
    }

    const body = await req.json().catch(() => ({}));
    const date = typeof body?.date === "string" ? body.date : todayUtcDate();
    const rawWord =
      typeof body?.word === "string" ? body.word : pickRandomWord();
    const word = normalizeWord(rawWord);

    if (!isIsoDate(date)) {
      return NextResponse.json(
        { error: "Invalid date (expected YYYY-MM-DD)" },
        { status: 400 }
      );
    }
    if (!isDictionaryWord(word)) {
      return NextResponse.json(
        { error: "Word must be in dictionary" },
        { status: 400 }
      );
    }

    const wordHash = hashWord(word);
    const wordCiphertext = encryptWord(word.toLowerCase());

    // Upsert by date
    const existing = await db.query.dailyWords.findFirst({
      where: eq(dailyWords.date, date),
    });

    if (existing) {
      await db
        .update(dailyWords)
        .set({ wordHash, wordCiphertext })
        .where(eq(dailyWords.date, date));
    } else {
      await db.insert(dailyWords).values({ date, wordHash, wordCiphertext });
    }

    return NextResponse.json({
      success: true,
      date,
      word, // admin-only endpoint; safe to return to admins for verification
    });
  } catch (e) {
    console.error("POST /api/admin/daily-word failed:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to seed daily word" },
      { status: 500 }
    );
  }
}

