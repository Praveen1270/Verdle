import { createClient } from "@/lib/supabase/server";

function parseAllowlist(env: string | undefined): Set<string> {
  if (!env) return new Set();
  return new Set(
    env
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );
}

const ADMIN_EMAILS = parseAllowlist(process.env.VERDLE_ADMIN_EMAILS);

export async function requireAdminUser(): Promise<
  | { ok: true; userId: string; email: string | null }
  | { ok: false; status: number; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, status: 401, error: "Unauthorized" };

  const email = user.email?.toLowerCase() ?? null;
  if (ADMIN_EMAILS.size === 0) {
    return {
      ok: false,
      status: 500,
      error: "Server not configured: VERDLE_ADMIN_EMAILS is empty",
    };
  }

  if (!email || !ADMIN_EMAILS.has(email)) {
    return { ok: false, status: 403, error: "Forbidden" };
  }

  return { ok: true, userId: user.id, email };
}

