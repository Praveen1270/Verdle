"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const PENDING_WORD_KEY = "verdle_pending_word";

export function VerdleLanding() {
  const [word, setWord] = useState("");

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-xl text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-4xl sm:text-5xl font-semibold">Verdle</h1>
          <p className="text-muted-foreground">
            Have your friend guess your secret word!
          </p>
        </div>

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
            disabled={word.length !== 5}
            onClick={() => {
              localStorage.setItem(PENDING_WORD_KEY, word);
              window.location.href = "/login?next=/";
            }}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

export function takePendingWord(): string | null {
  try {
    const w = localStorage.getItem(PENDING_WORD_KEY);
    if (!w) return null;
    localStorage.removeItem(PENDING_WORD_KEY);
    return w;
  } catch {
    return null;
  }
}

