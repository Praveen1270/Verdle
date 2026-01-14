"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { formatDistanceStrict } from "date-fns";
import type { VerdleDashboardData } from "@/actions/get-verdle-dashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createVerdle } from "@/actions/create-verdle";
import { takePendingWord } from "./landing";

export function VerdleHomeGate(props: { data: VerdleDashboardData }) {
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

  async function doCreate(secret: string) {
    setIsCreating(true);
    try {
      const res = await createVerdle(secret);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      const url = `${window.location.origin}${res.data.shareUrl}`;
      await navigator.clipboard.writeText(url);
      toast.success("crackmyword created — link copied!");
      window.location.href = "/dashboard";
    } finally {
      setIsCreating(false);
    }
  }

  // Resume flow after login
  useEffect(() => {
    if (props.data.createLocked) return;
    const pending = takePendingWord();
    if (pending && pending.length === 5) {
      void doCreate(pending);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.data.createLocked]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-xl text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-4xl sm:text-5xl font-semibold">crackmyword</h1>
          <p className="text-muted-foreground">
            Have your friend guess your secret word!
          </p>
        </div>

        {props.data.createLocked ? (
          <div className="rounded-xl border p-4 sm:p-5 space-y-4">
            <div className="text-base sm:text-lg font-semibold">
              You can create your next crackmyword in:
            </div>
            <div className="text-3xl sm:text-4xl font-bold">{countdown ?? "…"}</div>
            <div className="text-sm text-muted-foreground">
              In the meantime, guess our word of the day! Your daily win streak is:{" "}
              <span className="font-semibold">{props.data.dailyStreak}</span>
            </div>
            <div className="flex flex-col gap-2">
              <Button asChild className="h-12">
                <Link href="/daily">Play Daily crackmyword</Link>
              </Button>
              <Button asChild variant="secondary" className="h-12">
                <Link href="/profile">Subscribe for Unlimited Verdles</Link>
              </Button>
              <Button asChild variant="outline" className="h-12">
                <Link href="/dashboard">Dashboard</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <Input
              value={word}
              onChange={(e) =>
                setWord(
                  e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 5)
                )
              }
              placeholder="5 LETTER SECRET WORD"
              className="h-14 text-center tracking-widest font-semibold"
              maxLength={5}
            />
            <Button
              className="w-full h-12"
              disabled={word.length !== 5 || isCreating}
              onClick={() => void doCreate(word)}
            >
              {isCreating ? "Creating…" : "Next"}
            </Button>
            <div className="flex justify-center gap-2">
              <Button asChild variant="secondary">
                <Link href="/daily">Daily</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/dashboard">Dashboard</Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

