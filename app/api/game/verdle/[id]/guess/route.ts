import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/drizzle/client";
import { verdles, verdleAttempts } from "@/lib/drizzle/schema";
import { createClient } from "@/lib/supabase/server";
import {
  VERDLE_MAX_ATTEMPTS,
  VERDLE_WORD_LENGTH,
} from "@/lib/verdle/constants";
import { decryptWord } from "@/lib/verdle/crypto";
import { evaluateGuess } from "@/lib/verdle/evaluate";
import {
  gameStateCookieName,
  initialState,
  nextState,
  readState,
  writeState,
} from "@/lib/verdle/cookies";
import { eq, and } from "drizzle-orm";
import { normalizeWord } from "@/lib/verdle/dictionary";

function isValidGuess(guess: unknown): guess is string {
  return (
    typeof guess === "string" &&
    guess.length === VERDLE_WORD_LENGTH &&
    /^[a-zA-Z]+$/.test(guess)
  );
}

export async function POST(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params;
  const body = await req.json().catch(() => null);
  const guess = body?.guess;
  if (!isValidGuess(guess)) {
    return NextResponse.json({ error: "Invalid guess" }, { status: 400 });
  }

  const v = await db.query.verdles.findFirst({
    where: eq(verdles.id, id),
  });
  if (!v) {
    return NextResponse.json({ error: "Verdle not found" }, { status: 404 });
  }

  const cookieStore = await cookies();
  const stateName = gameStateCookieName({ mode: "verdle", id });
  const existingState = readState(cookieStore.get(stateName)?.value) ?? initialState();

  if (existingState.c) {
    return NextResponse.json(
      {
        error: "Already completed",
        completed: true,
        won: existingState.w ?? false,
        ...(existingState.w === false
          ? { answer: decryptWord(v.wordCiphertext).toUpperCase() }
          : {}),
      },
      { status: 409 }
    );
  }
  if (existingState.a >= VERDLE_MAX_ATTEMPTS) {
    return NextResponse.json({ error: "No attempts remaining" }, { status: 400 });
  }

  // Require sign-in for shared games.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // If already completed in DB, mark cookie and return
  const already = await db.query.verdleAttempts.findFirst({
    where: and(
      eq(verdleAttempts.verdleId, v.id),
      eq(verdleAttempts.playerUserId, user.id)
    ),
  });
  if (already) {
    const res = NextResponse.json(
      {
        error: "Already completed",
        completed: true,
        won: already.won,
        ...(!already.won ? { answer: decryptWord(v.wordCiphertext).toUpperCase() } : {}),
      },
      { status: 409 }
    );
    res.cookies.set(
      stateName,
      writeState(nextState(existingState, { c: true, w: already.won })),
      { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 }
    );
    return res;
  }

  const secret = decryptWord(v.wordCiphertext).toLowerCase();
  const normalizedGuess = normalizeWord(guess);
  const tiles = evaluateGuess(secret, normalizedGuess);

  const attemptNumber = existingState.a + 1;
  const won = normalizedGuess.toLowerCase() === secret;
  const completed = won || attemptNumber >= VERDLE_MAX_ATTEMPTS;

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
    ...(completed && !won ? { answer: secret.toUpperCase() } : {}),
    maxAttempts: VERDLE_MAX_ATTEMPTS,
  });

  res.cookies.set(stateName, writeState(updatedState), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  if (completed) {
    await db
      .insert(verdleAttempts)
      .values({
        verdleId: v.id,
        playerUserId: user.id,
        playerSessionId: null,
        attemptsCount: attemptNumber,
        won,
      })
      .onConflictDoNothing({
        target: [verdleAttempts.verdleId, verdleAttempts.playerUserId],
      });
  }

  return res;
}

