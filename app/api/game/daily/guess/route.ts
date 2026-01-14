import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/drizzle/client";
import { dailyAttempts, dailyWords, users } from "@/lib/drizzle/schema";
import { createClient } from "@/lib/supabase/server";
import { VERDLE_MAX_ATTEMPTS, VERDLE_WORD_LENGTH, todayUtcDate } from "@/lib/verdle/constants";
import { decryptWord } from "@/lib/verdle/crypto";
import { evaluateGuess } from "@/lib/verdle/evaluate";
import { gameStateCookieName, initialState, nextState, readState, writeState } from "@/lib/verdle/cookies";
import { and, eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { normalizeWord } from "@/lib/verdle/dictionary";
import { ensureDailyWordsSeeded } from "@/lib/verdle/daily-seed";

function isValidGuess(guess: unknown): guess is string {
  return (
    typeof guess === "string" &&
    guess.length === VERDLE_WORD_LENGTH &&
    /^[a-zA-Z]+$/.test(guess)
  );
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const guess = body?.guess;
    if (!isValidGuess(guess)) {
      return NextResponse.json({ error: "Invalid guess" }, { status: 400 });
    }

    const date = todayUtcDate();
    const cookieStore = await cookies();
    const stateName = gameStateCookieName({ mode: "daily", date });
    const existingState =
      readState(cookieStore.get(stateName)?.value) ?? initialState();

    // Hard stop if already completed in this browser.
    if (existingState.c) {
      return NextResponse.json(
        { error: "Already completed", completed: true, won: existingState.w ?? false },
        { status: 409 }
      );
    }
    if (existingState.a >= VERDLE_MAX_ATTEMPTS) {
      return NextResponse.json({ error: "No attempts remaining" }, { status: 400 });
    }

    // Prevent multiple plays across devices by checking DB.
    const already = await db.query.dailyAttempts.findFirst({
      where: and(eq(dailyAttempts.date, date), eq(dailyAttempts.userId, user.id)),
    });
    if (already) {
      // Mark completed in cookie as well to keep UI consistent.
      const res = NextResponse.json(
        { error: "Already completed today", completed: true, won: already.won },
        { status: 409 }
      );
      res.cookies.set(
        stateName,
        writeState(nextState(existingState, { c: true, w: already.won })),
        {
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          maxAge: 60 * 60 * 24 * 7,
        }
      );
      return res;
    }

    let daily = await db.query.dailyWords.findFirst({
      where: eq(dailyWords.date, date),
    });

    if (!daily) {
      // No admin seeding required: auto-seed today + upcoming days from a fixed pool.
      await ensureDailyWordsSeeded(date, 50);
      daily = await db.query.dailyWords.findFirst({
        where: eq(dailyWords.date, date),
      });
    }

    if (!daily) {
      return NextResponse.json(
        { error: "Daily word not configured (auto-seed failed)" },
        { status: 500 }
      );
    }

    const secret = decryptWord(daily.wordCiphertext).toLowerCase();
    const normalizedGuess = normalizeWord(guess);
    const tiles = evaluateGuess(secret, normalizedGuess);

    const attemptNumber = existingState.a + 1;
    const won = normalizedGuess.toLowerCase() === secret;
    const completed = won || attemptNumber >= VERDLE_MAX_ATTEMPTS;

    // Update cookie state
    const updatedState = nextState(existingState, {
      a: attemptNumber,
      c: completed,
      w: completed ? won : undefined,
    });

    const res = NextResponse.json({
      guess: normalizedGuess,
      tiles,
      attemptNumber,
      completed,
      won,
      maxAttempts: VERDLE_MAX_ATTEMPTS,
    });
    res.cookies.set(stateName, writeState(updatedState), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    if (completed) {
      await db
        .insert(dailyAttempts)
        .values({
          date,
          userId: user.id,
          attemptsCount: attemptNumber,
          won,
        })
        .onConflictDoNothing();

      // Update daily streak on users
      if (won) {
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10);
        const y = await db.query.dailyAttempts.findFirst({
          where: and(
            eq(dailyAttempts.date, yesterday),
            eq(dailyAttempts.userId, user.id),
            eq(dailyAttempts.won, true)
          ),
        });
        await db
          .update(users)
          .set({ dailyStreak: y ? sql<number>`${users.dailyStreak} + 1` : 1 })
          .where(eq(users.supabaseUserId, user.id));
      } else {
        await db
          .update(users)
          .set({ dailyStreak: 0 })
          .where(eq(users.supabaseUserId, user.id));
      }
    }

    return res;
  } catch (e) {
    console.error("POST /api/game/daily/guess failed:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to submit guess" },
      { status: 500 }
    );
  }
}

