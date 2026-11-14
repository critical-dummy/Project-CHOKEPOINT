# Contributing

## Workflow

1. Create a focused branch from `main`.
2. Keep changes small and explain their purpose in the commit message.
3. Add or update tests with reusable code.
4. Run `npm run typecheck`, `npm test`, and `npm run build`.
5. Open a pull request describing behavior, limitations, and verification.

## Quality requirements

- No unverified realism claims.
- No silent approximation: document the model and its limits.
- No simulation logic tied directly to render-frame timing.
- No untracked third-party assets.
- Every asset must include its source and license metadata.
- Avoid adding dependencies without a clear need.

## Commit style

Use concise imperative messages, for example:
- `chore: establish browser runtime`
- `feat: add environment state interface`
- `test: cover fixed-step clock edge cases`
- `docs: record renderer fallback behavior`
