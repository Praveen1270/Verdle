import { getVerdleDashboard } from "@/actions/get-verdle-dashboard";
import { getUser } from "@/actions/get-user";
import { redirect } from "next/navigation";
import { VerdleDashboardPage } from "@/components/verdle/verdle-dashboard-page";
import { db } from "@/lib/drizzle/client";
import { users } from "@/lib/drizzle/schema";
import { eq } from "drizzle-orm";

export default async function DashboardPage(props: {
  searchParams: Promise<{ subscription_id?: string; status?: string }>;
}) {
  const userRes = await getUser();
  if (!userRes.success) {
    redirect("/login?next=/dashboard");
  }

  // Fallback: if checkout returns here, mark user pro immediately in local dev.
  const { subscription_id, status } = await props.searchParams;
  if (status === "active" && subscription_id) {
    await db
      .update(users)
      .set({ currentSubscriptionId: subscription_id, plan: "pro" })
      .where(eq(users.supabaseUserId, userRes.data.id));
    redirect("/dashboard");
  }

  const verdleRes = await getVerdleDashboard();
  if (!verdleRes.success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-sm text-muted-foreground">
          Internal Server Error: {verdleRes.error}
        </div>
      </div>
    );
  }

  return <VerdleDashboardPage data={verdleRes.data} />;
}
