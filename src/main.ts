import { Engine } from "@babylonjs/core/Engines/engine";
import { WebGPUEngine } from "@babylonjs/core/Engines/webgpuEngine";
import type { AbstractEngine } from "@babylonjs/core/Engines/abstractEngine";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Scene } from "@babylonjs/core/scene";
import { createFirstPersonController } from "./player/first-person-controller";
import { createMissionState, activateRelay, completeMission } from "./game/mission-state";
import { loadMissionRecord, recordMissionCompletion } from "./game/save-runtime";
import {
  cycleRelaySelection,
  getRelayPattern,
  isRelayPatternMatched,
  relaySymbol,
} from "./game/relay-puzzle";
import type { RelaySymbolIndex } from "./game/relay-puzzle";
import type { RelayId } from "./game/mission-state";
import { createMissionLevel } from "./world/facility";
import "./style.css";

function requiredElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Required game element #${id} is missing.`);
  return element as T;
}

const viewport = requiredElement<HTMLDivElement>("viewport");
const hud = requiredElement<HTMLElement>("game-hud");
const briefingOverlay = requiredElement<HTMLElement>("briefing-overlay");
const pauseOverlay = requiredElement<HTMLElement>("pause-overlay");
const completeOverlay = requiredElement<HTMLElement>("complete-overlay");
const errorOverlay = requiredElement<HTMLElement>("error-overlay");
const errorMessage = requiredElement<HTMLElement>("error-message");
const startButton = requiredElement<HTMLButtonElement>("start-mission");
const resumeButton = requiredElement<HTMLButtonElement>("resume-mission");
const restartButton = requiredElement<HTMLButtonElement>("restart-mission");
const replayButton = requiredElement<HTMLButtonElement>("replay-mission");
const reloadButton = requiredElement<HTMLButtonElement>("reload-page");
const objectiveTitle = requiredElement<HTMLElement>("objective-title");
const objectiveDescription = requiredElement<HTMLElement>("objective-description");
const objectiveDistance = requiredElement<HTMLElement>("objective-distance");
const westStatus = requiredElement<HTMLElement>("west-status");
const eastStatus = requiredElement<HTMLElement>("east-status");
const interactionPrompt = requiredElement<HTMLElement>("interaction-prompt");
const interactionLabel = requiredElement<HTMLElement>("interaction-label");
const missionNotice = requiredElement<HTMLElement>("mission-notice");
const missionTimer = requiredElement<HTMLElement>("mission-timer");
const completionTime = requiredElement<HTMLElement>("completion-time");
const bestTime = requiredElement<HTMLElement>("best-time");
const completionCount = requiredElement<HTMLElement>("completion-count");
const relayPuzzleOverlay = requiredElement<HTMLElement>("relay-puzzle-overlay");
const relayPuzzleTitle = requiredElement<HTMLElement>("relay-puzzle-title");
const relayPuzzleDescription = requiredElement<HTMLElement>("relay-puzzle-description");
const puzzleStatus = requiredElement<HTMLElement>("puzzle-status");
const syncRelayButton = requiredElement<HTMLButtonElement>("sync-relay");
const cancelRelayButton = requiredElement<HTMLButtonElement>("cancel-relay");
const targetSymbols = [0, 1, 2].map((slot) =>
  requiredElement<HTMLElement>(`relay-target-${slot}`),
);
const selectorButtons = [0, 1, 2].map((slot) =>
  requiredElement<HTMLButtonElement>(`relay-selector-${slot}`),
);

interface Runtime {
  engine: AbstractEngine;
  canvas: HTMLCanvasElement;
}

type GamePhase = "briefing" | "active" | "puzzle" | "paused" | "complete" | "error";

let runtime: Runtime | undefined;
let scene: Scene | undefined;
let player: ReturnType<typeof createFirstPersonController> | undefined;
let level: ReturnType<typeof createMissionLevel> | undefined;
let mission = createMissionState();
let phase: GamePhase = "briefing";
let resizeObserver: ResizeObserver | undefined;
let disposed = false;
let currentInteraction = "";
let lastPrompt = "";
let lastObjectiveDistance = "";
let missionElapsedMs = 0;
let runStartedAt = 0;
let lastTimerLabel = "";
let selectedRelay: RelayId | null = null;
let relaySelection: RelaySymbolIndex[] = [0, 0, 0];

async function createRuntime(): Promise<Runtime> {
  try {
    if (await WebGPUEngine.IsSupportedAsync) {
      const canvas = document.createElement("canvas");
      const engine = new WebGPUEngine(canvas, { antialias: true });

      try {
        await engine.initAsync();
        return { engine, canvas };
      } catch (error) {
        engine.dispose();
        canvas.remove();
        console.warn("WebGPU initialization failed; using WebGL.", error);
      }
    }
  } catch (error) {
    console.warn("WebGPU capability check failed; using WebGL.", error);
  }

  const canvas = document.createElement("canvas");
  const engine = new Engine(
    canvas,
    true,
    { preserveDrawingBuffer: false, stencil: true },
    true,
  );
  return { engine, canvas };
}

const MISSION_ID = "power-restoration";

function formatMissionTime(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function updateMissionTimer(): void {
  const currentRunMs = phase === "active" && runStartedAt > 0
    ? performance.now() - runStartedAt
    : 0;
  const label = formatMissionTime(missionElapsedMs + currentRunMs);

  if (label !== lastTimerLabel) {
    lastTimerLabel = label;
    missionTimer.textContent = label;
  }
}

function updateMissionHud(): void {
  westStatus.textContent = mission.relays.west ? "ONLINE" : "OFFLINE";
  eastStatus.textContent = mission.relays.east ? "ONLINE" : "OFFLINE";
  westStatus.classList.toggle("is-online", mission.relays.west);
  eastStatus.classList.toggle("is-online", mission.relays.east);

  if (mission.exitUnlocked) {
    objectiveTitle.textContent = "Reach the exit";
    objectiveDescription.textContent =
      "Both relays are online. The gate is opening — move to the marked exit.";
  } else {
    objectiveTitle.textContent = "Restore auxiliary power";
    objectiveDescription.textContent =
      "Find and activate both wall-mounted power relays.";
  }
}

function updateObjectiveDistance(): void {
  if (!player || !level) return;

  let label = "";

  if (mission.exitUnlocked) {
    const distance = Vector3.Distance(player.camera.position, level.exitPosition);
    label = `EXIT · ${Math.round(distance)} M`;
  } else {

    const targets = (["west", "east"] as const).filter((relay) => !mission.relays[relay]);
    const nearest = targets.sort(
      (a, b) =>
        Vector3.Distance(player.camera.position, level.relayPositions[a]) -
        Vector3.Distance(player.camera.position, level.relayPositions[b]),
    )[0];

    if (nearest) {
      const distance = Vector3.Distance(
        player.camera.position,
        level.relayPositions[nearest],
      );
      label = `${nearest.toUpperCase()} RELAY · ${Math.round(distance)} M`;
    }
  }

  if (label && label !== lastObjectiveDistance) {
    lastObjectiveDistance = label;
    objectiveDistance.textContent = label;
  }
}

function showNotice(message: string): void {
  missionNotice.textContent = message;
  missionNotice.classList.remove("notice-visible");
  // Force a CSS animation restart without scheduling another game timer.
  void missionNotice.offsetWidth;
  missionNotice.classList.add("notice-visible");
}

function showInteractionPrompt(message: string): void {
  if (message !== lastPrompt) {
    lastPrompt = message;
    interactionLabel.textContent = message;
  }
  interactionPrompt.classList.toggle("is-hidden", message.length === 0);
}

function updateInteractionTarget(): void {
  if (!scene || !player || phase !== "active") {
    currentInteraction = "";
    showInteractionPrompt("");
    return;
  }

  const ray = player.camera.getForwardRay(3.4);
  const hit = scene.pickWithRay(
    ray,
    (mesh) => typeof mesh.metadata?.interactionId === "string",
  );
  const id = hit?.hit ? hit.pickedMesh?.metadata?.interactionId as string | undefined : undefined;

  if (!id) {
    currentInteraction = "";
    showInteractionPrompt("");
    return;
  }

  if (id === "relay-west" || id === "relay-east") {
    const relay = id.slice(6) as RelayId;
    currentInteraction = id;
    showInteractionPrompt(
      mission.relays[relay] ? "Relay already stabilized" : "Activate power relay",
    );
    return;
  }

  currentInteraction = "";
  showInteractionPrompt("");
}

function renderRelayPuzzle(): void {
  if (!selectedRelay) return;

  const target = getRelayPattern(selectedRelay);
  target.forEach((symbol, index) => {
    targetSymbols[index].textContent = relaySymbol(symbol);
  });

  relaySelection.forEach((symbol, index) => {
    selectorButtons[index].textContent = relaySymbol(symbol);
    selectorButtons[index].setAttribute(
      "aria-label",
      `Selector ${index + 1}: ${relaySymbol(symbol)}. Activate to cycle symbol.`,
    );
  });

  const matched = isRelayPatternMatched(selectedRelay, relaySelection);
  syncRelayButton.disabled = !matched;
  puzzleStatus.textContent = matched
    ? "Pattern matched. Synchronization is ready."
    : "Cycle each selector until it matches the reference.";
  puzzleStatus.classList.toggle("is-matched", matched);
}

function resumeFromRelayPuzzle(): void {
  if (phase !== "puzzle") return;

  selectedRelay = null;
  relayPuzzleOverlay.classList.add("is-hidden");
  phase = "active";
  runStartedAt = performance.now();
  player?.attachControls();
  updateMissionTimer();

  if (runtime && player && document.pointerLockElement !== runtime.canvas) {
    void player.requestPointerLock().catch(() => {
      showNotice("Click the simulation view to capture the mouse.");
    });
  }
}

function openRelayPuzzle(relay: RelayId): void {
  if (phase !== "active" || mission.relays[relay]) return;

  if (runStartedAt > 0) {
    missionElapsedMs += performance.now() - runStartedAt;
    runStartedAt = 0;
  }
  updateMissionTimer();

  selectedRelay = relay;
  relaySelection = [0, 0, 0];
  phase = "puzzle";
  player?.detachControls();
  showInteractionPrompt("");

  if (document.pointerLockElement) document.exitPointerLock();

  relayPuzzleTitle.textContent =
    `${relay === "west" ? "WEST" : "EAST"} RELAY SYNCHRONIZATION`;
  relayPuzzleDescription.textContent =
    "Match the three-symbol reference pattern, then synchronize the relay.";
  renderRelayPuzzle();
  relayPuzzleOverlay.classList.remove("is-hidden");
}

function completeRelayPuzzle(): void {
  if (
    phase !== "puzzle" ||
    !selectedRelay ||
    !isRelayPatternMatched(selectedRelay, relaySelection)
  ) {
    return;
  }

  const relay = selectedRelay;
  mission = activateRelay(mission, relay);
  level?.setRelayActive(relay);
  updateMissionHud();
  updateObjectiveDistance();

  const relayName = relay === "west" ? "West" : "East";
  showNotice(`${relayName} relay synchronized.`);

  if (mission.exitUnlocked) {
    level?.restorePower();
    level?.beginGateOpening();
    showNotice("Power restored. Exit gate opening.");
  }

  resumeFromRelayPuzzle();
}

function interact(): void {
  if (phase !== "active" || !currentInteraction) return;

  if (currentInteraction === "relay-west" || currentInteraction === "relay-east") {
    const relay = currentInteraction.slice(6) as RelayId;

    if (mission.relays[relay]) {
      showNotice("This relay is already online.");
      return;
    }

    openRelayPuzzle(relay);
  }
}

function pauseMission(): void {
  if (phase !== "active") return;
  phase = "paused";
  if (runStartedAt > 0) {
    missionElapsedMs += performance.now() - runStartedAt;
    runStartedAt = 0;
  }
  updateMissionTimer();
  player?.detachControls();
  showInteractionPrompt("");
  pauseOverlay.classList.remove("is-hidden");
}

async function beginOrResumeMission(): Promise<void> {
  if (!runtime || !player || (phase !== "briefing" && phase !== "paused")) return;

  const startingFresh = phase === "briefing";
  if (startingFresh) missionElapsedMs = 0;
  runStartedAt = performance.now();
  phase = "active";
  updateMissionTimer();
  briefingOverlay.classList.add("is-hidden");
  pauseOverlay.classList.add("is-hidden");
  completeOverlay.classList.add("is-hidden");
  hud.classList.remove("is-hidden");
  player.attachControls();
  runtime.canvas.focus({ preventScroll: true });

  try {
    await player.requestPointerLock();
  } catch {
    showNotice("Click the simulation view to capture the mouse.");
  }
}

function finishMission(): void {
  if (phase !== "active") return;
  mission = completeMission(mission);
  if (!mission.complete) return;

  if (runStartedAt > 0) {
    missionElapsedMs += performance.now() - runStartedAt;
    runStartedAt = 0;
  }
  phase = "complete";
  updateMissionTimer();
  completionTime.textContent = formatMissionTime(missionElapsedMs);
  bestTime.textContent = "SAVING";
  completionCount.textContent = "…";
  void recordMissionCompletion(MISSION_ID, missionElapsedMs).then((record) => {
    bestTime.textContent = formatMissionTime(record.bestTimeMs);
    completionCount.textContent = String(record.completions);
  }).catch((error) => {
    console.warn("Mission record could not be saved.", error);
    bestTime.textContent = "--:--";
    completionCount.textContent = "UNAVAILABLE";
  });
  player?.detachControls();
  if (document.pointerLockElement) document.exitPointerLock();
  showInteractionPrompt("");
  hud.classList.add("is-hidden");
  completeOverlay.classList.remove("is-hidden");
}

function restartMission(): void {
  if (!player || !level) return;

  if (document.pointerLockElement) document.exitPointerLock();
  player.detachControls();
  player.reset();
  level.reset();
  mission = createMissionState();
  phase = "briefing";
  missionElapsedMs = 0;
  runStartedAt = 0;
  lastTimerLabel = "";
  updateMissionTimer();
  currentInteraction = "";
  lastPrompt = "";
  lastObjectiveDistance = "";
  missionNotice.textContent = "";
  showInteractionPrompt("");
  updateMissionHud();

  hud.classList.add("is-hidden");
  pauseOverlay.classList.add("is-hidden");
  completeOverlay.classList.add("is-hidden");
  briefingOverlay.classList.remove("is-hidden");
}

function onPointerLockChange(): void {
  if (phase === "active" && runtime && document.pointerLockElement !== runtime.canvas) {
    pauseMission();
  }
}

function onCanvasClick(): void {
  if (phase !== "active" || !player || !runtime) return;
  if (document.pointerLockElement !== runtime.canvas) {
    runtime.canvas.focus({ preventScroll: true });
    void player.requestPointerLock().catch(() => {
      showNotice("Mouse capture is unavailable in this browser context.");
    });
  }
}

function onKeyDown(event: KeyboardEvent): void {
  if (event.repeat) return;

  if (phase === "puzzle") {
    if (event.code === "Escape") {
      event.preventDefault();
      resumeFromRelayPuzzle();
    } else if (event.code === "Enter") {
      event.preventDefault();
      completeRelayPuzzle();
    }
    return;
  }

  if (phase !== "active") return;

  if (event.code === "Escape") {
    event.preventDefault();
    pauseMission();
    return;
  }

  if (event.code === "KeyE") {
    event.preventDefault();
    interact();
  }
}

function onResize(): void {
  runtime?.engine.resize();
}

function dispose(): void {
  if (disposed) return;
  disposed = true;
  document.removeEventListener("pointerlockchange", onPointerLockChange);
  window.removeEventListener("keydown", onKeyDown);
  window.removeEventListener("resize", onResize);
  runtime?.canvas.removeEventListener("click", onCanvasClick);
  resizeObserver?.disconnect();
  player?.dispose();
  scene?.dispose();
  runtime?.engine.dispose();
}

async function start(): Promise<void> {
  try {
    runtime = await createRuntime();
    if (disposed) {
      runtime.engine.dispose();
      return;
    }

    runtime.canvas.tabIndex = 0;
    runtime.canvas.setAttribute("aria-label", "Project CHOKEPOINT first-person simulation");
    viewport.prepend(runtime.canvas);
    runtime.engine.setHardwareScalingLevel(
      1 / Math.min(window.devicePixelRatio || 1, 1.5),
    );

    scene = new Scene(runtime.engine);
    scene.collisionsEnabled = true;
    scene.gravity = new Vector3(0, -0.9, 0);

    level = createMissionLevel(scene);
    player = createFirstPersonController(runtime.canvas, scene);
    scene.activeCamera = player.camera;

    updateMissionHud();
    updateObjectiveDistance();
    void loadMissionRecord(MISSION_ID).then((record) => {
      if (!record) return;
      bestTime.textContent = formatMissionTime(record.bestTimeMs);
      completionCount.textContent = String(record.completions);
    }).catch(() => {
      // The mission remains playable when browser storage is unavailable.
    });
    scene.onBeforeCameraRenderObservable.add(() => player?.updateBody());
    startButton.disabled = false;
    startButton.textContent = "BEGIN MISSION";

    resizeObserver = new ResizeObserver(() => runtime?.engine.resize());
    resizeObserver.observe(viewport);
    window.addEventListener("resize", onResize);
    document.addEventListener("pointerlockchange", onPointerLockChange);
    window.addEventListener("keydown", onKeyDown);
    runtime.canvas.addEventListener("click", onCanvasClick);

    runtime.engine.runRenderLoop(() => {
      if (disposed || !scene || !level || !player) return;

      const deltaSeconds = Math.min(runtime?.engine.getDeltaTime() ?? 0, 50) / 1000;

      if (phase === "active") {
        updateMissionTimer();
        level.update(deltaSeconds);
        updateObjectiveDistance();
        updateInteractionTarget();

        if (mission.exitUnlocked && level.isInsideExit(player.camera.position)) {
          finishMission();
        }
      }

      scene.render();
    });

    window.addEventListener("pagehide", dispose, { once: true });
  } catch (error) {
    console.error("Project CHOKEPOINT failed to initialize:", error);
    phase = "error";
    briefingOverlay.classList.add("is-hidden");
    errorMessage.textContent =
      error instanceof Error ? error.message : "Unknown graphics initialization error.";
    errorOverlay.classList.remove("is-hidden");
  }
}

selectorButtons.forEach((button, index) => {
  button.addEventListener("click", () => {
    if (phase !== "puzzle") return;
    relaySelection = cycleRelaySelection(relaySelection, index);
    renderRelayPuzzle();
  });
});

syncRelayButton.addEventListener("click", completeRelayPuzzle);
cancelRelayButton.addEventListener("click", resumeFromRelayPuzzle);
startButton.addEventListener("click", () => void beginOrResumeMission());
resumeButton.addEventListener("click", () => void beginOrResumeMission());
restartButton.addEventListener("click", restartMission);
replayButton.addEventListener("click", restartMission);
reloadButton.addEventListener("click", () => window.location.reload());

void start();
