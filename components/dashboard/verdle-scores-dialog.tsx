"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { getVerdleScores, type VerdleScoreRow } from "@/actions/get-verdle-scores";
import { cn } from "@/lib/utils";

function scoreBadge(won: boolean) {
  return won
    ? "bg-green-600/20 text-green-300 border-green-600/30"
    : "bg-red-600/20 text-red-300 border-red-600/30";
}

export function VerdleScoresDialog(props: { verdleId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<VerdleScoreRow[]>([]);

  async function load() {
    setLoading(true);
    try {
      const res = await getVerdleScores(props.verdleId);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      setRows(res.data);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v && rows.length === 0) void load();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="secondary">View Scores</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Scores</DialogTitle>
          <DialogDescription>
            Completed games for this Verdle (most recent first).
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="text-sm text-muted-foreground">No scores yet.</div>
        ) : (
          <div className="max-h-[50vh] overflow-auto space-y-2">
            {rows.map((r, idx) => (
              <div
                key={`${r.createdAt}-${idx}`}
                className="flex items-center justify-between gap-3 rounded-lg border p-2"
              >
                <div className="text-sm">
                  Attempts: <span className="font-semibold">{r.attemptsCount}</span>
                </div>
                <div
                  className={cn(
                    "text-xs border rounded-full px-2 py-1",
                    scoreBadge(r.won)
                  )}
                >
                  {r.won ? "Won" : "Lost"}
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

