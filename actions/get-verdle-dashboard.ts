"use server";

import { db } from "@/lib/drizzle/client";
import { users, verdles, verdleAttempts } from "@/lib/drizzle/schema";
import { createClient } from "@/lib/supabase/server";
import { todayUtcDate } from "@/lib/verdle/constants";
import { decryptWord } from "@/lib/verdle/crypto";
import { ServerActionRes } from "@/types/server-action";
import { desc, eq, sql } from "drizzle-orm";

export type VerdleHistoryItem = {
  id: string;
  createdAt: string;
  playersCount: number;
  word: string;
};

export type VerdleDashboardData = {
  plan: "free" | "pro";
  dailyStreak: number;
  totalVerdlesCreated: number;
  createLocked: boolean;
  nextCreateAtUtc: string | null; // ISO string
  history: VerdleHistoryItem[];
};

export async function getVerdleDashboard(): ServerActionRes<VerdleDashboardData> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const u = await db.query.users.findFirst({
      where: eq(users.supabaseUserId, user.id),
    });
    if (!u) return { success: false, error: "User record not found" };

    // Robust “pro” detection:
    // - plan column (set by webhook)
    // - OR currentSubscriptionId (useful in local dev if webhook isn't deployed)
    const effectivePlan: "free" | "pro" =
      u.plan === "pro" || !!u.currentSubscriptionId ? "pro" : "free";

    const today = todayUtcDate();
    const last = u.lastCreateDate ?? null; // date column -> string (YYYY-MM-DD) in drizzle
    const usedToday = last === today && (u.dailyCreateCount ?? 0) >= 1;
    const createLocked = effectivePlan === "free" && usedToday;

    // compute nextCreateAtUtc without double-date math confusion
    let nextIso: string | null = null;
    if (createLocked) {
      const next = new Date(`${today}T00:00:00.000Z`);
      next.setUTCDate(next.getUTCDate() + 1);
      nextIso = next.toISOString();
    }

    const totalVerdlesCreatedRes = await db
      .select({ count: sql<number>`count(*)` })
      .from(verdles)
      .where(eq(verdles.creatorUserId, user.id));
    const totalVerdlesCreated = totalVerdlesCreatedRes[0]?.count ?? 0;

    // History + players count
    const historyRows = await db
      .select({
        id: verdles.id,
        createdAt: verdles.createdAt,
        playersCount: sql<number>`count(${verdleAttempts.id})`,
        wordCiphertext: verdles.wordCiphertext,
      })
      .from(verdles)
      .leftJoin(verdleAttempts, eq(verdleAttempts.verdleId, verdles.id))
      .where(eq(verdles.creatorUserId, user.id))
      .groupBy(verdles.id)
      .orderBy(desc(verdles.createdAt))
      .limit(25);

    return {
      success: true,
      data: {
        plan: effectivePlan,
        dailyStreak: u.dailyStreak ?? 0,
        totalVerdlesCreated,
        createLocked,
        nextCreateAtUtc: nextIso,
        history: historyRows.map((r) => ({
          id: r.id,
          createdAt: r.createdAt,
          playersCount: Number(r.playersCount ?? 0),
          word: decryptWord(r.wordCiphertext).toUpperCase(),
        })),
      },
    };
  } catch (e) {
    console.error("getVerdleDashboard failed:", e);
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to load crackmyword dashboard",
    };
  }
}

