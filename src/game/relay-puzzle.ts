import type { RelayId } from "./mission-state";

export const RELAY_SYMBOLS = ["◆", "▲", "●"] as const;
export type RelaySymbolIndex = 0 | 1 | 2;

const RELAY_PATTERNS: Record<RelayId, readonly RelaySymbolIndex[]> = {
  west: [2, 0, 1],
  east: [1, 2, 0],
};

export function getRelayPattern(relay: RelayId): readonly RelaySymbolIndex[] {
  return RELAY_PATTERNS[relay];
}

export function cycleRelaySelection(
  selection: readonly RelaySymbolIndex[],
  slot: number,
): RelaySymbolIndex[] {
  if (slot < 0 || slot >= 3) return [...selection];
  const next = [...selection] as RelaySymbolIndex[];
  next[slot] = ((next[slot] + 1) % RELAY_SYMBOLS.length) as RelaySymbolIndex;
  return next;
}

export function isRelayPatternMatched(
  relay: RelayId,
  selection: readonly RelaySymbolIndex[],
): boolean {
  const target = getRelayPattern(relay);
  return target.every((symbol, index) => selection[index] === symbol);
}

export function relaySymbol(index: RelaySymbolIndex): string {
  return RELAY_SYMBOLS[index];
}
