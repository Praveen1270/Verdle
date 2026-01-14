"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { formatDistanceStrict } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createVerdle } from "@/actions/create-verdle";
import type { VerdleDashboardData } from "@/actions/get-verdle-dashboard";
import { VerdleScoresDialog } from "./verdle-scores-dialog";

function formatUtc(iso: string) {
  const d = new Date(iso);
  // Deterministic across server/client to avoid hydration mismatches (no locale/timezone involved).
  return `${d.toISOString().slice(0, 19).replace("T", " ")} UTC`;
}

export function VerdleDashboard(props: {
  className?: string;
  data: VerdleDashboardData;
  onUpgradeClick: () => void;
}) {
  const [word, setWord] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const nextCreateAt = useMemo(() => {
    return props.data.nextCreateAtUtc ? new Date(props.data.nextCreateAtUtc) : null;
  }, [props.data.nextCreateAtUtc]);

  const countdown = useMemo(() => {
    if (!nextCreateAt) return null;
    if (nextCreateAt <= now) return "0s";
    return formatDistanceStrict(nextCreateAt, now);
  }, [nextCreateAt, now]);

  async function onCreate() {
    if (props.data.createLocked) return;
    setIsCreating(true);
    try {
      const res = await createVerdle(word.trim().toUpperCase());
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success("Verdle created!");
      setWord("");
      const url = `${window.location.origin}${res.data.shareUrl}`;
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
      window.location.reload();
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className={cn("text-left w-full", props.className)}>
      <div className="grid gap-4">
        <Card className="shadow-lg">
          <CardHeader className="px-4 sm:px-6">
            <CardTitle className="text-lg sm:text-xl">Verdle</CardTitle>
            <CardDescription className="text-sm sm:text-base">
              Create a 5-letter secret word and share the link with friends.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 px-4 sm:px-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Card className="p-4">
                <div className="text-sm text-muted-foreground">Daily Win Streak</div>
                <div className="text-3xl font-semibold mt-1">
                  {props.data.dailyStreak}
                </div>
              </Card>
              <Card className="p-4">
                <div className="text-sm text-muted-foreground">Verdles Created</div>
                <div className="text-3xl font-semibold mt-1">
                  {props.data.totalVerdlesCreated}
                </div>
              </Card>
              <Card className="p-4">
                <div className="text-sm text-muted-foreground">Plan</div>
                <div className="text-3xl font-semibold mt-1">
                  {props.data.plan === "pro" ? "Pro" : "Free"}
                </div>
              </Card>
            </div>

            {props.data.createLocked ? (
              <div className="rounded-xl border p-4 bg-muted/20">
                <div className="font-medium">Creation limit reached</div>
                <div className="text-sm text-muted-foreground mt-1">
                  Free plan allows 1 Verdle per day. Next creation available in{" "}
                  <span className="font-semibold">{countdown ?? "…"}</span>.
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Button asChild variant="secondary">
                    <Link href="/daily">Play Daily Verdle</Link>
                  </Button>
                  <Button onClick={props.onUpgradeClick}>Upgrade for Unlimited</Button>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border p-4">
                <div className="flex flex-col sm:flex-row gap-3 items-stretch">
                  <Input
                    value={word}
                    onChange={(e) =>
                      setWord(
                        e.target.value
                          .toUpperCase()
                          .replace(/[^A-Z]/g, "")
                          .slice(0, 5)
                      )
                    }
                    placeholder="5 LETTER SECRET WORD"
                    className="h-12 text-center tracking-widest font-semibold"
                    maxLength={5}
                  />
                  <Button
                    className="h-12"
                    onClick={onCreate}
                    disabled={isCreating || word.length !== 5}
                  >
                    {isCreating ? "Creating…" : "Create Verdle"}
                  </Button>
                  <Button asChild className="h-12" variant="secondary">
                    <Link href="/daily">Daily Verdle</Link>
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  Tip: the secret word is encrypted in the database; your friends only see
                  the puzzle.
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader className="px-4 sm:px-6">
            <CardTitle className="text-lg sm:text-xl">Verdle History</CardTitle>
            <CardDescription className="text-sm sm:text-base">
              Your created Verdles and how many friends played.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 space-y-3">
            {props.data.history.length === 0 ? (
              <div className="text-sm text-muted-foreground">No Verdles yet.</div>
            ) : (
              props.data.history.map((v) => (
                <div
                  key={v.id}
                  className="rounded-xl border p-3 flex flex-col sm:flex-row sm:items-center gap-3 justify-between"
                >
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{v.word}</div>
                    <div className="text-xs text-muted-foreground">
                      Players: {v.playersCount} • Created:{" "}
                      {formatUtc(v.createdAt)}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap justify-end">
                    <VerdleScoresDialog verdleId={v.id} />
                    <Button
                      variant="secondary"
                      onClick={async () => {
                        const url = `${window.location.origin}/play/${v.id}`;
                        await navigator.clipboard.writeText(url);
                        toast.success("Link copied");
                      }}
                    >
                      Copy Link
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

