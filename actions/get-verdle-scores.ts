"use server";

import { db } from "@/lib/drizzle/client";
import { verdles, verdleAttempts } from "@/lib/drizzle/schema";
import { createClient } from "@/lib/supabase/server";
import { ServerActionRes } from "@/types/server-action";
import { and, desc, eq } from "drizzle-orm";

export type VerdleScoreRow = {
  attemptsCount: number;
  won: boolean;
  createdAt: string;
};

export async function getVerdleScores(verdleId: string): ServerActionRes<VerdleScoreRow[]> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const v = await db.query.verdles.findFirst({
      where: and(eq(verdles.id, verdleId), eq(verdles.creatorUserId, user.id)),
    });
    if (!v) return { success: false, error: "Not found" };

    const rows = await db
      .select({
        attemptsCount: verdleAttempts.attemptsCount,
        won: verdleAttempts.won,
        createdAt: verdleAttempts.createdAt,
      })
      .from(verdleAttempts)
      .where(eq(verdleAttempts.verdleId, verdleId))
      .orderBy(desc(verdleAttempts.createdAt))
      .limit(200);

    return {
      success: true,
      data: rows.map((r) => ({
        attemptsCount: r.attemptsCount,
        won: r.won,
        createdAt: r.createdAt,
      })),
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to load scores",
    };
  }
}

