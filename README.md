# Project: CHOKEPOINT

A browser-based, realism-focused, single-player first-person simulation focused on physical, environmental, and human systems.

## Current runtime

The project uses Babylon.js 9.36.0.

- WebGPU is attempted first, with a WebGL fallback.
- The player view uses Babylon.js `UniversalCamera`.
- Camera collision is registered through Babylon.js' collision coordinator.
- The test range is built from static ground and obstacle geometry.
- The current player body is a temporary first-person visual proxy.

## Cloudflare Pages deployment

This repository is configured for a static Vite build.

| Setting | Value |
| --- | --- |
| Production branch | `main` |
| Root directory | `/` |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Node.js | `22.12.0` |

The root `.node-version` file pins the build runtime used by Cloudflare Pages.

Connect `critical-dummy/Project-CHOKEPOINT` in Cloudflare Pages, apply the settings above, and deploy. No Pages Functions or server-side runtime are required by the current game foundation.

## Local development

Requirements: Node.js 22.12.0 or newer.

```sh
npm install
npm run dev
```

## Controls

- `WASD` or arrow keys: move
- Mouse: look around
- Click the viewport: capture the mouse
- `Shift`: run
- `Esc`: release the mouse

## Validation

```sh
npm run typecheck
npm test
npm run build
```

GitHub Actions runs the same validation steps for pushes to `main` and pull requests targeting `main`.

The test suite currently verifies test-range geometry, collision flags, and environment fog configuration using Babylon.js' `NullEngine`.

## Current scope and limitations

This is the first runtime foundation, not a completed game. The current camera movement is a prototype. It does not yet include a dedicated character controller, jumping, an animated full-body rig, save data, mission flow, or the complete environmental simulation.

The camera gravity setting is a temporary per-frame movement approximation; it is not a fixed-step physical simulation. A dedicated physics layer will replace this when its requirements are implemented and measured.

The environment is a neutral test space for validating rendering and general movement. No real-world weapon operation, tactical procedures, or real weapon performance models are implemented.
