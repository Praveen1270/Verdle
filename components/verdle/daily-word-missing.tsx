"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function DailyWordMissing(props: {
  date: string;
  isAdmin: boolean;
  adminHint?: string | null;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function seed() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/daily-word", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: props.date }),
        credentials: "include",
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(
          typeof json?.error === "string"
            ? json.error
            : `Failed to seed daily word (${res.status})`
        );
        return;
      }
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to seed daily word");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-lg text-center space-y-3">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Daily Verdle</h1>
          <p className="text-muted-foreground">
            No daily word is configured for today ({props.date}). Seed a row into{" "}
            <code className="px-1 py-0.5 rounded bg-muted">daily_words</code>.
          </p>
        </div>

        {props.isAdmin ? (
          <div className="space-y-2">
            <Button onClick={seed} disabled={loading}>
              {loading ? "Seeding…" : "Seed today’s word"}
            </Button>
            <div className="text-xs text-muted-foreground">
              This uses the admin-only endpoint{" "}
              <code className="px-1 py-0.5 rounded bg-muted">
                POST /api/admin/daily-word
              </code>{" "}
              (upsert by date).
            </div>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground space-y-2">
            <div>
              An admin must seed today’s word. To enable admins, set{" "}
              <code className="px-1 py-0.5 rounded bg-muted">
                VERDLE_ADMIN_EMAILS
              </code>{" "}
              in <code className="px-1 py-0.5 rounded bg-muted">.env.local</code>{" "}
              and sign in with an allowlisted email.
            </div>
            {props.adminHint ? <div>{props.adminHint}</div> : null}
          </div>
        )}

        {error ? (
          <div className="text-sm text-destructive">{error}</div>
        ) : null}
      </div>
    </div>
  );
}

