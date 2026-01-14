import { getUser } from "@/actions/get-user";
import GoogleSignIn from "@/components/auth/google-signin";
import TailwindBadge from "@/components/ui/tailwind-badge";
import { redirect } from "next/navigation";
import React from "react";

export default async function Page(props: {
  searchParams: Promise<{
    error?: string;
    next?: string;
  }>;
}) {
  const userRes = await getUser();
  const { error, next } = await props.searchParams;

  if (userRes.success && userRes.data) {
    redirect(next || "/");
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="w-full max-w-2xl text-center space-y-6">
        <div className="space-y-3">
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight">
            Welcome to Verdle!
          </h1>
          <p className="text-white/70 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            Create a free account to challenge friends, track streaks, and view
            other players&apos; scores.
          </p>
        </div>

        <div className="pt-2 space-y-3">
          {error && (
            <div className="flex justify-center">
              <TailwindBadge variant="red">{error}</TailwindBadge>
            </div>
          )}
          <div className="mx-auto w-full max-w-md">
            <GoogleSignIn next={next} className="h-12 sm:h-14 text-sm" />
          </div>
        </div>
      </div>
    </div>
  );
}
