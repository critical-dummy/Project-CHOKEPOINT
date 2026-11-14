import { Engine } from "@babylonjs/core/Engines/engine";
import { WebGPUEngine } from "@babylonjs/core/Engines/webgpuEngine";
import type { AbstractEngine } from "@babylonjs/core/Engines/abstractEngine";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Scene } from "@babylonjs/core/scene";
import { createFirstPersonController } from "./player/first-person-controller";
import { createMissionState, activateRelay, completeMission } from "./game/mission-state";
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
const westStatus = requiredElement<HTMLElement>("west-status");
const eastStatus = requiredElement<HTMLElement>("east-status");
const interactionPrompt = requiredElement<HTMLElement>("interaction-prompt");
const interactionLabel = requiredElement<HTMLElement>("interaction-label");
const missionNotice = requiredElement<HTMLElement>("mission-notice");

interface Runtime {
  engine: AbstractEngine;
  canvas: HTMLCanvasElement;
}

type GamePhase = "briefing" | "active" | "paused" | "complete" | "error";

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

function showNotice(message: string): void {
  missionNotice.textContent = message;
  missionNotice.classList.remove("notice-visible");
  // Force a CSS animation restart without scheduling another game timer.
  void missionNotice.offsetWidth;
  missionNotice.classList.add("notice-visible");
}

function showInteractionPrompt(message: string): void {
  if (message === lastPrompt) return;
  lastPrompt = message;
  interactionLabel.textContent = message;
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

function interact(): void {
  if (phase !== "active" || !currentInteraction) return;

  if (currentInteraction === "relay-west" || currentInteraction === "relay-east") {
    const relay = currentInteraction.slice(6) as RelayId;

    if (mission.relays[relay]) {
      showNotice("This relay is already online.");
      return;
    }

    mission = activateRelay(mission, relay);
    level?.setRelayActive(relay);
    updateMissionHud();

    const relayName = relay === "west" ? "West" : "East";
    showNotice(`${relayName} relay synchronized.`);

    if (mission.exitUnlocked) {
      level?.beginGateOpening();
      showNotice("Both relays online. Exit gate opening.");
    }
  }
}

function pauseMission(): void {
  if (phase !== "active") return;
  phase = "paused";
  player?.detachControls();
  showInteractionPrompt("");
  pauseOverlay.classList.remove("is-hidden");
}

async function beginOrResumeMission(): Promise<void> {
  if (!runtime || !player || (phase !== "briefing" && phase !== "paused")) return;

  phase = "active";
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

  phase = "complete";
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
  currentInteraction = "";
  lastPrompt = "";
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
  if (phase !== "active" || event.repeat) return;
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
    scene.gravity = new Vector3(0, -0.15, 0);

    level = createMissionLevel(scene);
    player = createFirstPersonController(runtime.canvas, scene);
    scene.activeCamera = player.camera;

    updateMissionHud();
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
        level.update(deltaSeconds);
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

startButton.addEventListener("click", () => void beginOrResumeMission());
resumeButton.addEventListener("click", () => void beginOrResumeMission());
restartButton.addEventListener("click", restartMission);
replayButton.addEventListener("click", restartMission);
reloadButton.addEventListener("click", () => window.location.reload());

void start();
