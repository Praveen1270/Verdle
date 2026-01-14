"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { TileState } from "@/lib/verdle/types";
import { VERDLE_MAX_ATTEMPTS, VERDLE_WORD_LENGTH } from "@/lib/verdle/constants";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type GuessResponse =
  | {
      guess: string;
      tiles: TileState[];
      attemptNumber: number;
      completed: boolean;
      won: boolean;
      answer?: string;
      maxAttempts: number;
    }
  | { error: string; completed?: boolean; won?: boolean; answer?: string };

const KEY_ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "BACKSPACE"],
] as const;

function upgradeKeyState(prev: TileState | undefined, next: TileState): TileState {
  if (!prev) return next;
  if (prev === "correct") return "correct";
  if (prev === "present" && next === "absent") return "present";
  if (next === "correct") return "correct";
  if (next === "present" && prev === "absent") return "present";
  return prev;
}

function tileClass(state: TileState | null) {
  switch (state) {
    case "correct":
      return "bg-green-600 border-green-600 text-white";
    case "present":
      return "bg-yellow-500 border-yellow-500 text-white";
    case "absent":
      return "bg-zinc-700 border-zinc-700 text-white";
    default:
      return "bg-transparent border-slate-600 text-white";
  }
}

export function VerdleGame(props: {
  title: string;
  description?: string;
  apiUrl: string;
  initialCompleted?: boolean;
  initialWon?: boolean;
  initialAttemptsCount?: number;
}) {
  const [rows, setRows] = useState<string[]>(
    Array.from({ length: VERDLE_MAX_ATTEMPTS }, () => "")
  );
  const [evals, setEvals] = useState<(TileState[] | null)[]>(
    Array.from({ length: VERDLE_MAX_ATTEMPTS }, () => null)
  );
  const [activeRow, setActiveRow] = useState(0);
  const [current, setCurrent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completed, setCompleted] = useState(!!props.initialCompleted);
  const [won, setWon] = useState(!!props.initialWon);
  const [answer, setAnswer] = useState<string | null>(null);
  const [keyState, setKeyState] = useState<Record<string, TileState>>({});

  const canType = !completed && !isSubmitting;

  // If server says already completed, lock out immediately
  useEffect(() => {
    if (!props.initialCompleted) return;
    setCompleted(true);
    setWon(!!props.initialWon);
    if (typeof props.initialAttemptsCount === "number") {
      setActiveRow(Math.min(props.initialAttemptsCount, VERDLE_MAX_ATTEMPTS));
    }
  }, [props.initialCompleted, props.initialWon, props.initialAttemptsCount]);

  const onKey = useCallback(
    async (key: string) => {
      if (!canType) return;

      if (key === "BACKSPACE") {
        setCurrent((s) => s.slice(0, -1));
        return;
      }
      if (key === "ENTER") {
        if (current.length !== VERDLE_WORD_LENGTH) {
          toast.error("Enter a 5-letter word");
          return;
        }
        setIsSubmitting(true);
        try {
          const res = await fetch(props.apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ guess: current }),
          });
          const data = (await res.json().catch(() => null)) as GuessResponse | null;

          if (!res.ok) {
            const msg = (data as any)?.error || "Invalid guess";
            if (res.status === 409 && data && (data as any).completed) {
              setCompleted(true);
              setWon(!!(data as any).won);
              if (!(data as any).won && typeof (data as any).answer === "string") {
                setAnswer((data as any).answer);
              }
              toast.info("Already completed");
              return;
            }
            toast.error(msg);
            return;
          }

          if (!data || "error" in data) {
            toast.error((data as any)?.error || "Invalid response");
            return;
          }

          const rowIndex = data.attemptNumber - 1;
          setRows((prev) => {
            const next = [...prev];
            next[rowIndex] = data.guess;
            return next;
          });
          setEvals((prev) => {
            const next = [...prev];
            next[rowIndex] = data.tiles;
            return next;
          });
          setKeyState((prev) => {
            const next = { ...prev };
            for (let i = 0; i < data.tiles.length; i++) {
              const letter = data.guess[i];
              next[letter] = upgradeKeyState(next[letter], data.tiles[i]);
            }
            return next;
          });

          setCurrent("");
          setActiveRow((r) => Math.min(r + 1, VERDLE_MAX_ATTEMPTS));
          if (data.completed) {
            setCompleted(true);
            setWon(data.won);
            if (!data.won && typeof (data as any).answer === "string") {
              setAnswer((data as any).answer);
            }
            toast.success(data.won ? "You got it!" : "Out of attempts");
          }
        } finally {
          setIsSubmitting(false);
        }
        return;
      }

      // Letter
      if (/^[A-Z]$/.test(key)) {
        if (current.length >= VERDLE_WORD_LENGTH) return;
        setCurrent((s) => (s + key).toUpperCase());
      }
    },
    [canType, current, props.apiUrl]
  );

  // Physical keyboard support
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (!canType) return;
      const k = e.key;
      if (k === "Backspace") return void onKey("BACKSPACE");
      if (k === "Enter") return void onKey("ENTER");
      if (/^[a-zA-Z]$/.test(k)) return void onKey(k.toUpperCase());
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [canType, onKey]);

  const displayRows = useMemo(() => {
    const next = [...rows];
    if (!completed && activeRow < VERDLE_MAX_ATTEMPTS) {
      next[activeRow] = current.padEnd(VERDLE_WORD_LENGTH, " ");
    }
    return next;
  }, [rows, current, activeRow, completed]);

  return (
    <div className="min-h-screen bg-black text-white flex items-start justify-center px-4 py-10">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl sm:text-3xl font-semibold">{props.title}</h1>
          {props.description && (
            <p className="text-white/70 text-sm sm:text-base">{props.description}</p>
          )}
          {completed && (
            <p className="text-sm text-white/70">
              {won ? "Completed (win)" : "Completed (loss)"}
            </p>
          )}
          {completed && !won && answer && (
            <p className="text-sm text-white/80">
              The word was <span className="font-semibold">{answer}</span>
            </p>
          )}
        </div>

        <div className="flex justify-center">
          <div className="grid grid-rows-6 gap-2">
            {displayRows.map((word, r) => (
              <div key={r} className="grid grid-cols-5 gap-2">
                {Array.from({ length: VERDLE_WORD_LENGTH }).map((_, c) => {
                  const letter = (word[c] ?? "").trim();
                  const state = evals[r]?.[c] ?? null;
                  return (
                    <div
                      key={c}
                      className={cn(
                        "h-14 w-14 sm:h-16 sm:w-16 border flex items-center justify-center text-2xl font-bold select-none",
                        tileClass(state),
                        !state && letter ? "border-slate-400" : ""
                      )}
                    >
                      {letter}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2 pt-2">
          {KEY_ROWS.map((row, idx) => (
            <div key={idx} className="flex gap-1.5 sm:gap-2 justify-center px-1">
              {row.map((k) => {
                const isWide = k === "ENTER" || k === "BACKSPACE";
                const ks = keyState[k] ?? keyState[k.toUpperCase()];
                const btnClass =
                  ks === "correct"
                    ? "bg-green-600 hover:bg-green-600 text-white"
                    : ks === "present"
                    ? "bg-yellow-500 hover:bg-yellow-500 text-white"
                    : ks === "absent"
                    ? "bg-zinc-700 hover:bg-zinc-700 text-white"
                    : "bg-zinc-200 hover:bg-zinc-300 text-black";
                return (
                  <Button
                    key={k}
                    type="button"
                    variant="default"
                    disabled={!canType}
                    className={cn(
                      "h-11 sm:h-12 px-2 sm:px-3 rounded-md font-semibold text-sm sm:text-base",
                      isWide ? "w-16 sm:w-24" : "w-8 sm:w-10",
                      btnClass,
                      "border border-black/10"
                    )}
                    onClick={() => onKey(k)}
                  >
                    {k === "BACKSPACE" ? "⌫" : k}
                  </Button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

