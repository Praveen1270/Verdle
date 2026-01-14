export type TileState = "correct" | "present" | "absent";

export type GuessEval = {
  tiles: TileState[];
  guess: string;
  attemptNumber: number; // 1-based
  completed: boolean;
  won: boolean;
  maxAttempts: number;
};

