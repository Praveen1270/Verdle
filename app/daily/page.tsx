import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/drizzle/client";
import { dailyAttempts } from "@/lib/drizzle/schema";
import { and, eq } from "drizzle-orm";
import { todayUtcDate } from "@/lib/verdle/constants";
import { formatUtcWeekdayMonthDay } from "@/lib/verdle/date";
import { VerdleGame } from "@/components/verdle/verdle-game";

export default async function DailyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const date = todayUtcDate();

  const existing = await db.query.dailyAttempts.findFirst({
    where: and(eq(dailyAttempts.date, date), eq(dailyAttempts.userId, user.id)),
  });

  return (
    <VerdleGame
      title="Solve the Daily crackmyword!"
      description={formatUtcWeekdayMonthDay(date)}
      apiUrl="/api/game/daily/guess"
      initialCompleted={!!existing}
      initialWon={existing?.won ?? false}
      initialAttemptsCount={existing?.attemptsCount ?? undefined}
    />
  );
}

