# Development Plan

## Phase 0 — Foundation

- [x] Establish TypeScript and Vite project configuration.
- [x] Add a minimal browser renderer shell.
- [x] Add WebGPU attempt and WebGL fallback.
- [x] Add deterministic fixed-step scheduling utility.
- [x] Add unit tests for the scheduling utility.
- [ ] Verify install, build, and tests on the target Windows development machine.
- [ ] Record supported browser and GPU test matrix.

## Phase 1 — Runtime validation

- Browser startup and shutdown behavior.
- Resize and device-pixel-ratio handling.
- Renderer capability reporting.
- Memory and resource disposal checks.
- Automated browser smoke tests.

## Phase 2 — Neutral simulation primitives

- Explicit unit conventions and typed quantities.
- Deterministic state update interfaces.
- General rigid-body and environment test fixtures.
- Repeatability and numerical stability tests.

## Phase 3 — World and character foundations

- Streaming world representation.
- Character presentation and input abstraction.
- Environment state and audio presentation interfaces.
- Accessibility and control remapping.

## Phase 4 — Content pipeline

- Asset manifest format.
- Source, license, attribution, and processing metadata.
- Validation for missing or incompatible assets.
- Automated build-time content checks.

## Release gates

A phase is not complete because its code exists. It must have:
- documented scope and limitations;
- tests for expected behavior and failure cases;
- reproducible setup instructions;
- a recorded verification result.
