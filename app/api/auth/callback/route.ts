import { createUser } from "@/actions/create-user";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") || "/";

  // Prevent open redirects: only allow relative paths
  const safeNext = next.startsWith("/") ? next : "/";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.session) {
      const userResult = await createUser();
      if (!userResult.success) {
        console.error("Failed to create user:", userResult.error);
        return NextResponse.redirect(
          `${origin}/login?error=${encodeURIComponent(userResult.error || "Failed to create user account")}`
        );
      }
      return NextResponse.redirect(`${origin}${safeNext}`);
    } else {
      return NextResponse.redirect(
        `${origin}/login?error=${error?.message || "Could not authenticate"}`
      );
    }
  }

  return NextResponse.redirect(`${origin}/login?error=Unknown error`);
}
