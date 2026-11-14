import * as THREE from "three";
import { WebGPURenderer } from "three/webgpu";
import { createFirstPersonController } from "./player/first-person-controller";
import { createTestRange } from "./world/test-range";
import "./style.css";

const viewport = document.querySelector<HTMLDivElement>("#viewport");
const status = document.querySelector<HTMLParagraphElement>("#runtime-status");
const help = document.querySelector<HTMLParagraphElement>("#controls-help");

if (!viewport || !status || !help) {
  throw new Error("Required application elements are missing.");
}

const world = createTestRange();
const player = createFirstPersonController(world.colliders);
world.scene.add(player.object);

let renderer: THREE.WebGLRenderer | WebGPURenderer | undefined;
let animationFrame = 0;
let disposed = false;
let resizeObserver: ResizeObserver | undefined;
const clock = new THREE.Clock();

function createWebGLFallback(): THREE.WebGLRenderer {
  status.textContent = "Renderer: WebGL 2 fallback";
  return new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
}

async function initializeRenderer(): Promise<void> {
  try {
    if ("gpu" in navigator) {
      try {
        const candidate = new WebGPURenderer({ antialias: true });
        await candidate.init();
        renderer = candidate;
        status.textContent = "Renderer: WebGPU";
      } catch (error) {
        console.warn("WebGPU initialization failed; using WebGL.", error);
        renderer = createWebGLFallback();
      }
    } else {
      renderer = createWebGLFallback();
    }

    if (disposed || !renderer) {
      renderer?.dispose();
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setSize(viewport.clientWidth, viewport.clientHeight);
    viewport.appendChild(renderer.domElement);

    resizeObserver = new ResizeObserver(() => {
      if (!renderer || disposed) return;
      const width = Math.max(viewport.clientWidth, 1);
      const height = Math.max(viewport.clientHeight, 1);
      player.camera.aspect = width / height;
      player.camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    });
    resizeObserver.observe(viewport);

    help.textContent = "WASD move · Mouse look · Shift run · Space jump · Esc release mouse";
    const render = (): void => {
      if (!renderer || disposed) return;
      player.update(clock.getDelta());
      renderer.render(world.scene, player.camera);
      animationFrame = window.requestAnimationFrame(render);
    };
    render();

    window.addEventListener("pagehide", dispose, { once: true });
  } catch (error) {
    console.error("Renderer initialization failed:", error);
    status.textContent = "Renderer unavailable. Check browser graphics support and console.";
  }
}

function dispose(): void {
  if (disposed) return;
  disposed = true;
  window.cancelAnimationFrame(animationFrame);
  resizeObserver?.disconnect();
  renderer?.dispose();
  player.dispose();
  world.dispose();
}

void initializeRenderer();
