# Project: CHOKEPOINT

A browser-based, single-player first-person simulation built with Babylon.js.

## Mission 01 — Power Restoration

Restore the west and east power relays inside the North Maintenance Facility. When both relays are online, the facility returns to normal lighting and the exit gate opens. Reach the marked exit to complete the mission.

### Controls

| Input | Action |
| --- | --- |
| WASD / Arrow keys | Move |
| Mouse | Look |
| Shift | Run |
| E | Interact |
| Esc | Pause |

Click **Begin Mission** to start. The mouse is captured while playing. The objective panel shows the nearest remaining relay or the exit distance.

## Progress and records

Mission time pauses when the game is paused. On completion, the game stores the best completion time, total completions, and last completion timestamp locally using IndexedDB. A localStorage fallback is used when IndexedDB is unavailable. No account or server connection is required for these records.

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
- UniversalCamera first-person controls and world-space body animation
- Scene collision and gravity
- Ray-based relay interaction
- Mission progression, power restoration lighting, and animated exit gate
- Pause, restart, completion report, timer, and local best-time records
