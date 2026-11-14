import { Engine } from "@babylonjs/core/Engines/engine";
import { WebGPUEngine } from "@babylonjs/core/Engines/webgpuEngine";
import type { AbstractEngine } from "@babylonjs/core/Engines/abstractEngine";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { Scene } from "@babylonjs/core/scene";
import { createFirstPersonController } from "./player/first-person-controller";
import { createTestRange } from "./world/test-range";
import "./style.css";

const viewport = document.querySelector<HTMLDivElement>("#viewport");
const status = document.querySelector<HTMLParagraphElement>("#runtime-status");
const help = document.querySelector<HTMLParagraphElement>("#controls-help");

if (!viewport || !status || !help) {
  throw new Error("Required application elements are missing.");
}

interface Runtime {
  engine: AbstractEngine;
  canvas: HTMLCanvasElement;
  backend: "WebGPU" | "WebGL";
}

let runtime: Runtime | undefined;
let scene: Scene | undefined;
let player: ReturnType<typeof createFirstPersonController> | undefined;
let resizeObserver: ResizeObserver | undefined;
let disposed = false;

async function createRuntime(): Promise<Runtime> {
  let webGpuSupported = false;

  try {
    webGpuSupported = await WebGPUEngine.IsSupportedAsync;
  } catch (error) {
    console.warn("WebGPU capability check failed.", error);
  }

  if (webGpuSupported) {
    const canvas = document.createElement("canvas");

    try {
      const engine = new WebGPUEngine(canvas, { antialias: true });
      await engine.initAsync();
      return { engine, canvas, backend: "WebGPU" };
    } catch (error) {
      console.warn("WebGPU initialization failed; creating a WebGL canvas.", error);
      canvas.remove();
    }
  }

  const canvas = document.createElement("canvas");
  const engine = new Engine(
    canvas,
    true,
    { preserveDrawingBuffer: false, stencil: true },
    true,
  );
  return { engine, canvas, backend: "WebGL" };
}

function createLighting(targetScene: Scene): void {
  const ambient = new HemisphericLight(
    "environment-light",
    new Vector3(0.25, 1, 0.15),
    targetScene,
  );
  ambient.intensity = 1.15;
  ambient.diffuse = Color3.FromHexString("#e6edf0");
  ambient.groundColor = Color3.FromHexString("#53584f");

  const sun = new DirectionalLight(
    "sun-light",
    new Vector3(-0.45, -1, 0.3),
    targetScene,
  );
  sun.position = new Vector3(-12, 22, 8);
  sun.intensity = 1.8;
}

async function start(): Promise<void> {
  try {
    runtime = await createRuntime();

    if (disposed) {
      runtime.engine.dispose();
      return;
    }

    viewport.replaceChildren(runtime.canvas);
    runtime.engine.setHardwareScalingLevel(
      1 / Math.min(window.devicePixelRatio || 1, 1.5),
    );

    scene = new Scene(runtime.engine);
    scene.collisionsEnabled = true;
    scene.gravity = new Vector3(0, -0.9, 0);

    createTestRange(scene);
    createLighting(scene);
    player = createFirstPersonController(runtime.canvas, scene);

    status.textContent = `Renderer: ${runtime.backend}`;
    help.textContent =
      "WASD move · Mouse look · Shift run · Click viewport to capture mouse · Esc release";

    resizeObserver = new ResizeObserver(() => runtime?.engine.resize());
    resizeObserver.observe(viewport);
    window.addEventListener("resize", onResize);

    runtime.engine.runRenderLoop(() => {
      if (!disposed) scene?.render();
    });

    window.addEventListener("pagehide", dispose, { once: true });
  } catch (error) {
    console.error("Simulation initialization failed:", error);
    status.textContent =
      "Simulation unavailable. Check browser graphics support and the developer console.";
  }
}

function onResize(): void {
  runtime?.engine.resize();
}

function dispose(): void {
  if (disposed) return;
  disposed = true;
  window.removeEventListener("resize", onResize);
  resizeObserver?.disconnect();
  player?.dispose();
  scene?.dispose();
  runtime?.engine.dispose();
}

void start();
