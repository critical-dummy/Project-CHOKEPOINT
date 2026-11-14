# Architecture

## Current status

This repository currently contains a browser renderer shell and a deterministic fixed-step scheduling utility. It is not yet a playable game.

## Runtime boundaries

- **Application shell:** browser lifecycle, startup, resize, and error reporting.
- **Rendering:** Three.js scene presentation. WebGPU is attempted where available; WebGL is the fallback path.
- **Simulation core:** deterministic, fixed-step scheduling. Domain systems must remain independent from rendering.
- **Content:** future world and presentation assets, loaded asynchronously.
- **Audio:** future browser audio layer, isolated from simulation state.
- **Verification:** unit tests for deterministic utilities and browser smoke tests for runtime behavior.

## Engineering rules

1. Keep simulation state independent from Three.js objects.
2. Use SI units for physical quantities and include units in names or types.
3. Never use render-frame delta as the authoritative simulation step.
4. Document approximations and their validity limits.
5. Treat renderer capability as a runtime capability, not a user-agent guess.
6. Keep asset loading asynchronous and failure-tolerant.
7. Add tests with each reusable system.
8. Do not label a subsystem realistic until its behavior has measurable acceptance criteria.

## Rendering fallback

The current shell attempts WebGPU and falls back to WebGL when WebGPU is unavailable or initialization fails. The fallback must be tested on actual target browsers and GPUs. Visual parity is not assumed.

## Planned module boundaries

```text
src/
  app/          application lifecycle and composition
  core/         deterministic time and shared primitives
  rendering/    renderer setup and presentation
  environment/  world state and environmental presentation
  character/    character presentation and input abstraction
  audio/        audio asset and spatial presentation layer
  content/      manifests and asset loading
```

Only `src/core/fixed-step-clock.ts` and the initial renderer shell exist today. The directory plan is not a claim that those systems are implemented.
