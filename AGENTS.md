# Repository Guidelines

## Project Structure & Module Organization
- `apps/web`: React + Vite UI (Tailwind, Zustand, Tauri integration in `src-tauri/`).
- `packages/shared`: Shared TypeScript types/constants consumed by web and Tauri.
- `tests/e2e`: Playwright specs in `tests/e2e/specs/*.spec.ts`.
- `scripts`: Python Modbus client/test utilities (ad hoc debugging).
- `docs`: Design notes and reference material.

## Build, Test, and Development Commands
```bash
pnpm install                # Install workspace dependencies
pnpm dev                    # Run web dev server
pnpm build                  # Build shared and web packages
pnpm test                   # Run workspace unit tests
pnpm test:e2e               # Run Playwright UI tests
pnpm lint                   # ESLint across apps/packages
pnpm format                 # Prettier formatting for TS/TSX
```

## Coding Style & Naming Conventions
- TypeScript/TSX throughout; keep code in `apps/` and `packages/`.
- Formatting is enforced by Prettier: 2-space indent, single quotes, semicolons, width 100.
- ESLint is configured at the repo root; fix lint warnings before submitting.
- E2E tests use `*.spec.ts` filenames and `test.describe` blocks.

## Testing Guidelines
- Unit/integration tests use Vitest in `apps/web`.
  - Example: `pnpm --filter @wago/web test`
- End-to-end tests use Playwright in `tests/e2e`.
  - Example: `pnpm test:e2e` (starts `pnpm dev` automatically).
- Modbus validation runs via scripts in `scripts/` (see `scripts/modbus_client.py`).

## Commit & Pull Request Guidelines
- Commit history favors short, lowercase messages (e.g., "added issue tracker").
- Keep commits focused; split refactors from behavior changes.
- PRs should include a concise summary, test results, and screenshots for UI changes.
- Link related issues when applicable.

## Configuration & Ports
- Local services default to `http://localhost:5173` (web) and Modbus TCP on port `502`.
  Update docs if ports change.
