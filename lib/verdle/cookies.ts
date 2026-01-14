import { VERDLE_MAX_ATTEMPTS } from "./constants";
import { decodeState, encodeState, SignedGameState } from "./signed-state";

export const ANON_SESSION_COOKIE = "verdle_player_session";

export function gameStateCookieName(props: { mode: "daily"; date: string } | { mode: "verdle"; id: string }) {
  if (props.mode === "daily") return `verdle_daily_state_${props.date}`;
  return `verdle_state_${props.id}`;
}

export function initialState(): SignedGameState {
  return { a: 0, c: false, t: Date.now() };
}

export function nextState(prev: SignedGameState, update: Partial<SignedGameState>): SignedGameState {
  const merged: SignedGameState = { ...prev, ...update, t: Date.now() };
  // clamp attempts defensively
  merged.a = Math.max(0, Math.min(VERDLE_MAX_ATTEMPTS, merged.a));
  return merged;
}

export function readState(cookieValue: string | undefined | null): SignedGameState | null {
  return decodeState(cookieValue);
}

export function writeState(state: SignedGameState): string {
  return encodeState(state);
}

