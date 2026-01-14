import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/drizzle/client";
import { verdles, verdleAttempts } from "@/lib/drizzle/schema";
import { and, eq } from "drizzle-orm";
import { VerdleGame } from "@/components/verdle/verdle-game";
import { ANON_SESSION_COOKIE } from "@/lib/verdle/cookies";

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

  const cookieStore = await cookies();
  // Note: Server Components can read cookies but can't set them.
  // The anon session cookie is created/managed by the guess route handler on first guess.
  const sessionId = cookieStore.get(ANON_SESSION_COOKIE)?.value;

  const existing = user
    ? await db.query.verdleAttempts.findFirst({
        where: and(
          eq(verdleAttempts.verdleId, v.id),
          eq(verdleAttempts.playerUserId, user.id)
        ),
      })
    : sessionId
    ? await db.query.verdleAttempts.findFirst({
        where: and(
          eq(verdleAttempts.verdleId, v.id),
          eq(verdleAttempts.playerSessionId, sessionId)
        ),
      })
    : null;

  return (
    <VerdleGame
      title="Verdle"
      description="Guess your friend’s secret word!"
      apiUrl={`/api/game/verdle/${v.id}/guess`}
      initialCompleted={!!existing}
      initialWon={existing?.won ?? false}
      initialAttemptsCount={existing?.attemptsCount ?? undefined}
    />
  );
}

