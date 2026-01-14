import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/drizzle/client";
import { verdles, verdleAttempts } from "@/lib/drizzle/schema";
import { and, eq } from "drizzle-orm";
import { VerdleGame } from "@/components/verdle/verdle-game";

export default async function PlayVerdlePage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;

  const v = await db.query.verdles.findFirst({
    where: eq(verdles.id, id),
  });
  if (!v) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Require sign-in before playing shared games.
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/play/${id}`)}`);
  }

  const existing = await db.query.verdleAttempts.findFirst({
    where: and(
      eq(verdleAttempts.verdleId, v.id),
      eq(verdleAttempts.playerUserId, user.id)
    ),
  });

  return (
    <VerdleGame
      title="crackmyword"
      description="Guess your friend’s secret word!"
      apiUrl={`/api/game/verdle/${v.id}/guess`}
      initialCompleted={!!existing}
      initialWon={existing?.won ?? false}
      initialAttemptsCount={existing?.attemptsCount ?? undefined}
    />
  );
}

