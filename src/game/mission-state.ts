export type RelayId = "west" | "east";

export interface MissionState {
  relays: Record<RelayId, boolean>;
  exitUnlocked: boolean;
  complete: boolean;
}

export function createMissionState(): MissionState {
  return {
    relays: { west: false, east: false },
    exitUnlocked: false,
    complete: false,
  };
}

export function activateRelay(
  state: MissionState,
  relay: RelayId,
): MissionState {
  if (state.complete || state.relays[relay]) return state;

  const relays = { ...state.relays, [relay]: true };
  return {
    ...state,
    relays,
    exitUnlocked: relays.west && relays.east,
  };
}

export function completeMission(state: MissionState): MissionState {
  if (!state.exitUnlocked || state.complete) return state;
  return { ...state, complete: true };
}

export function getRelayCount(state: MissionState): number {
  return Number(state.relays.west) + Number(state.relays.east);
}
