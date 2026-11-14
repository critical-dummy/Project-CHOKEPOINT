# Project-CHOKEPOINT
A browser-based, realism-focused, single-player modern warfare FPS built around physical, environmental, and human simulation.

## Development

The current development branch contains the first playable browser foundation:

- Three.js renderer with WebGPU initialization and WebGL fallback
- A neutral, bounded test range with static geometry
- First-person mouse look and keyboard movement
- Basic jump/gravity and axis-separated obstacle checks
- A simple full-body visual placeholder attached to the first-person camera rig

### Run locally

```sh
npm install
npm run dev
```

### Controls

- `WASD`: move
- Mouse: look around (click the viewport to capture the pointer)
- `Shift`: run
- `Space`: jump
- `Esc`: release the pointer

### Current limitations

This is an initial movement/rendering slice, not a completed simulation. Collision handling is intentionally simple and will be replaced or validated against a dedicated physics layer. The body mesh is a temporary visual placeholder. No weapon operation, real-world tactical procedures, or real weapon performance models are implemented.
