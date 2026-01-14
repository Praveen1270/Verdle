import { getUser } from "@/actions/get-user";
import { getProducts } from "@/actions/get-products";
import { Dashboard } from "@/components/dashboard/dashboard";
import { redirect } from "next/navigation";
import React from "react";
import { getUserSubscription } from "@/actions/get-user-subscription";
import { db } from "@/lib/drizzle/client";
import { users } from "@/lib/drizzle/schema";
import { eq } from "drizzle-orm";

export default async function BillingPage(props: {
  searchParams: Promise<{ subscription_id?: string; status?: string }>;
}) {
  const userRes = await getUser();
  const { subscription_id, status } = await props.searchParams;
  const productRes = await getProducts();
  const userSubscriptionRes = await getUserSubscription();

  if (!userRes.success) {
    redirect("/login?next=/profile");
  }

  // Local-dev fallback: on successful checkout return, immediately mark user as Pro.
  // Webhook will later populate subscription details in `subscriptions` table.
  if (status === "active" && subscription_id) {
    await db
      .update(users)
      .set({ currentSubscriptionId: subscription_id, plan: "pro" })
      .where(eq(users.supabaseUserId, userRes.data.id));
  }

  if (!productRes.success || !userSubscriptionRes.success) {
    return <div>Internal Server Error</div>;
  }

  // Back-compat: keep /billing working, but treat /profile as the canonical route.
  const qp = new URLSearchParams();
  if (subscription_id) qp.set("subscription_id", subscription_id);
  if (status) qp.set("status", status);
  const suffix = qp.toString() ? `?${qp.toString()}` : "";
  redirect(`/profile${suffix}`);
}

