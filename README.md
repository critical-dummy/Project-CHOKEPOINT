# Project-CHOKEPOINT

A browser-based, realism-focused, single-player first-person simulation built around physical, environmental, and human simulation.

## Development

The active engine direction is Babylon.js. The current development branch contains the first browser runtime slice:

- Babylon.js 9.36.0 core engine
- WebGPU initialization with a separate-canvas WebGL fallback
- A neutral, bounded test range with static environment geometry
- Babylon UniversalCamera for first-person mouse and keyboard input
- Built-in camera gravity and mesh collision checks
- Sprint input and a temporary first-person body-view proxy

### Run locally

```sh
npm install
npm run dev
```

### Controls

- `WASD`: move
- Mouse: look around
- Click the viewport: capture the mouse
- `Shift`: run
- `Esc`: release the mouse

### Current limitations

This is an initial rendering and movement slice, not a completed simulation. The current collision setup uses Babylon's built-in scene collision system; Havok Physics V2 is not integrated yet. Jumping, grounded-state handling, robust character locomotion, and the final animated full-body rig remain future work. The visible body is a temporary proxy.

The test range is neutral geometry for validating rendering, camera behavior, and general environment interactions. No real-world weapon operation, tactical procedures, or real weapon performance models are part of this implementation.
