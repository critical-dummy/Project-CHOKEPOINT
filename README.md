# Project: CHOKEPOINT

A browser-based, single-player first-person simulation built with Babylon.js.

## Mission 01 — Power Restoration

Restore the west and east power relays inside the North Maintenance Facility. When both relays are online, the exit gate opens. Reach the marked exit to complete the mission.

### Controls

| Input | Action |
| --- | --- |
| WASD / Arrow keys | Move |
| Mouse | Look |
| Shift | Run |
| E | Interact |
| Esc | Pause |

Click **Begin Mission** to start. The mouse is captured while playing.

## Development

Requirements: Node.js 22.12.0 or newer.

```sh
npm install
npm run dev
```

Run validation before committing:

```sh
npm run typecheck
npm test
npm run build
```

## Deployment

Cloudflare Pages serves the static Vite build.

- Production branch: `main`
- Build command: `npm run build`
- Output directory: `dist`
- Node.js: `22.12.0`

## Runtime

- Babylon.js 9.36.0
- WebGPU with WebGL fallback
- UniversalCamera first-person controls
- Scene collision and gravity
- Ray-based console interaction
- Mission progression, gate animation, pause, restart, and completion states
