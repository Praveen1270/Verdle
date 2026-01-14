import crypto from "crypto";

function getHashSalt(): string {
  // Reuse the same secret used for encryption to avoid extra env vars.
  // (You can split this into a separate secret later if desired.)
  const secret = process.env.VERDLE_WORD_SECRET;
  if (!secret) throw new Error("Missing env var VERDLE_WORD_SECRET");
  return secret;
}

export function hashWord(word: string): string {
  const salt = getHashSalt();
  return crypto
    .createHash("sha256")
    .update(`${salt}:${word.toLowerCase()}`, "utf8")
    .digest("hex");
}

