"use server";

import { db } from "@/lib/drizzle/client";
import { users, verdles } from "@/lib/drizzle/schema";
import { createClient } from "@/lib/supabase/server";
import { VERDLE_WORD_LENGTH, todayUtcDate } from "@/lib/verdle/constants";
import { encryptWord } from "@/lib/verdle/crypto";
import { hashWord } from "@/lib/verdle/hash";
import { ServerActionRes } from "@/types/server-action";
import { sql } from "drizzle-orm";
import { normalizeWord } from "@/lib/verdle/dictionary";

function isValidSecret(word: unknown): word is string {
  return (
    typeof word === "string" &&
    word.length === VERDLE_WORD_LENGTH &&
    /^[a-zA-Z]+$/.test(word)
  );
}

type CreateVerdleResult = {
  verdleId: string;
  shareUrl: string;
};

export async function createVerdle(word: string): ServerActionRes<CreateVerdleResult> {
  try {
    if (!isValidSecret(word)) {
      return { success: false, error: "Secret word must be 5 letters (A-Z)" };
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const today = todayUtcDate();

    // Atomically enforce free-plan limit (1 creation/day) and reset daily count when date changes.
    const updated = await db.execute(sql`
      update ${users}
      set
        daily_create_count = case
          when ${users.lastCreateDate} is distinct from ${today}::date then 1
          else ${users.dailyCreateCount} + 1
        end,
        last_create_date = ${today}::date,
        updated_at = now()
      where ${users.supabaseUserId} = ${user.id}
        and (
          ${users.plan} = 'pro'
          or ${users.currentSubscriptionId} is not null
          or ${users.lastCreateDate} is distinct from ${today}::date
          or ${users.dailyCreateCount} < 1
        )
      returning ${users.plan} as plan
    `);

    // drizzle/postgres-js returns a RowList (array-like), not { rows: [...] }.
    const rows = (updated as any) as Array<{ plan: "free" | "pro" }>;
    if (!Array.isArray(rows) || rows.length === 0) {
      const nextReset = new Date(`${today}T00:00:00.000Z`);
      nextReset.setUTCDate(nextReset.getUTCDate() + 1);
      return {
        success: false,
        error: `Free plan limit reached. Try again at ${nextReset.toISOString().slice(11, 19)} UTC`,
      };
    }

    const normalized = normalizeWord(word);
    const wordHash = hashWord(normalized);
    const wordCiphertext = encryptWord(normalized.toLowerCase());

    const inserted = await db
      .insert(verdles)
      .values({
        creatorUserId: user.id,
        wordHash,
        wordCiphertext,
      })
      .returning({ id: verdles.id });

    const verdleId = inserted[0]?.id;
    if (!verdleId) return { success: false, error: "Failed to create verdle" };

    // We don’t rely on origin here; client can show relative link safely.
    return {
      success: true,
      data: {
        verdleId,
        shareUrl: `/play/${verdleId}`,
      },
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to create verdle",
    };
  }
}

