import crypto from "crypto";

export type SignedGameState = {
  // attempts used so far
  a: number;
  // completed flag
  c: boolean;
  // won flag (only meaningful if completed)
  w?: boolean;
  // updated timestamp (ms)
  t: number;
};

function getStateKey(): Buffer {
  const secret = process.env.VERDLE_STATE_SECRET;
  if (!secret) {
    throw new Error("Missing env var VERDLE_STATE_SECRET");
  }
  return crypto.createHash("sha256").update(secret, "utf8").digest();
}

function hmac(data: string): string {
  return crypto.createHmac("sha256", getStateKey()).update(data).digest("base64url");
}

export function encodeState(state: SignedGameState): string {
  const payload = Buffer.from(JSON.stringify(state), "utf8").toString("base64url");
  const sig = hmac(payload);
  return `${payload}.${sig}`;
}

export function decodeState(token: string | undefined | null): SignedGameState | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = hmac(payload);
  try {
    const ok = crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
    if (!ok) return null;
  } catch {
    return null;
  }
  try {
    const json = Buffer.from(payload, "base64url").toString("utf8");
    const parsed = JSON.parse(json) as SignedGameState;
    if (
      typeof parsed?.a !== "number" ||
      typeof parsed?.c !== "boolean" ||
      typeof parsed?.t !== "number"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

