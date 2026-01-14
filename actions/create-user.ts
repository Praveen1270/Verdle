"use server";

import { db } from "@/lib/drizzle/client";
import { users } from "@/lib/drizzle/schema";
import { ServerActionRes } from "@/types/server-action";
import { getUser } from "./get-user";
import { createDodoCustomer } from "./create-dodo-customer";
import { eq } from "drizzle-orm";

export async function createUser(): ServerActionRes<string> {
  const userRes = await getUser();

  if (!userRes.success) {
    return { success: false, error: "User not found" };
  }

  const user = userRes.data;

  const existingUser = await db.query.users.findFirst({
    where: eq(users.supabaseUserId, user.id),
  });

  if (existingUser) {
    return { success: true, data: "User already exists" };
  }

  const dodoCustomerRes = await createDodoCustomer({
    email: user.email!,
    name: user.user_metadata.name,
  });

  if (!dodoCustomerRes.success) {
    return { success: false, error: "Failed to create customer" };
  }

  await db.insert(users).values({
    supabaseUserId: user.id,
    dodoCustomerId: dodoCustomerRes.data.customer_id,
    currentSubscriptionId: null,
    plan: "free",
    dailyCreateCount: 0,
    dailyStreak: 0,
    // store “today” so our daily-reset logic can compare dates consistently
    lastCreateDate: new Date().toISOString().slice(0, 10),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  return { success: true, data: "User created" };
}
