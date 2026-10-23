# 9router

9Router (`9router-app`): local AI routing gateway with a Next.js dashboard. One OpenAI-compatible endpoint (`/v1/*`) routes to 40+ upstream providers with format translation, combo and account fallback, OAuth/API-key management, and usage tracking. A separate CLI launcher lives in `cli/` (published to npm as `9router`).

## Product and stack

- Architecture notes (request flow, translator engine, provider registry, persistence, gotchas): `CLAUDE.md`. Full system: `docs/ARCHITECTURE.md` (the persistence section is stale, `CLAUDE.md` has the current SQLite layer). Routing engine conventions: `open-sse/AGENTS.md`; read it before editing `open-sse/`.
- Stack: plain JavaScript (ESM, no TypeScript), Next.js 16 (webpack build, standalone output), React 19, Tailwind CSS 4, Express 5, SQLite via `src/lib/db` (adapters: `bun:sqlite`, `better-sqlite3`, `node:sqlite`, `sql.js`), Vitest 4 for tests.
- Package manager: npm. No lockfile is committed (`package-lock.json` is gitignored), so installs are not reproducible; use `npm install`.
- Layout: `src/` (Next app, dashboard, `src/sse` glue), `open-sse/` (provider-agnostic engine), `cli/` (launcher package with its own `package.json` and version), `tests/` (independent Vitest package), `scripts/`, `docs/`.
- Commit style: Conventional Commits. Root and `cli/` are versioned independently; log changes in `CHANGELOG.md`.
- Publishing paths exist (`npm run cli:publish`, `.github/workflows/docker-publish.yml`). Never run or trigger them without explicit authorization.
- Security-sensitive env (`JWT_SECRET`, `INITIAL_PASSWORD`, `API_KEY_SECRET`, `MACHINE_ID_SALT`) and provider credentials stay out of files and logs. State lives in `DATA_DIR` or `~/.9router/`; point `DATA_DIR` at a temp directory when running tests.

## Canonical commands

- Install: `npm install` (root), then `cd tests && npm install` for the test package
- Develop: `npm run dev`
- Lint: `npm run lint` (`eslint .`; currently red from existing debt)
- Types: unavailable (plain JavaScript)
- Tests: `cd tests && DATA_DIR=<temp dir> npx vitest run --exclude '**/real/**'`. The suite is not all-green on a plain checkout; judge regressions with `tests/__baseline__/verify-no-regression.mjs` and `known-fails.txt`. `*.real.test.js` need `RUN_REAL=1` and live credentials: do not run them. A vitest run can rewrite files in `tests/translator/__snapshots__/`; do not commit incidental snapshot diffs.
- Build: `npm run build` (`next build --webpack`, then `postbuild` copies standalone assets)
- Verify foundation: `npm run lint && npm run build`, plus the tests above compared against the baseline.

## Working agreements

- Read relevant code and instructions before editing. State assumptions that affect behavior or scope.
- Complete the request with the smallest sufficient change. Reuse existing patterns, components, and dependencies.
- Preserve local changes, validation, error handling, security, accessibility, and explicit requirements.
- Do not create abstractions, architecture, options, dependencies, or features for unrequested needs.
- Run the canonical checks above. Test relevant logic and regressions; trivial changes do not need tests that mirror the implementation.
- Do not turn assumptions into facts or pending integrations into simulated results.
- Continue authorized work. Ask only for essential information or actions outside the authorization.
- Publishing, deploys, messaging third parties, costs, and destructive actions require explicit authorization. Installing a tool does not grant it.
- Never print, write, or commit secrets (`.env*`, tokens, API keys). Use environment variables.

## Execution continuity

- A blocker stops only the dependent tasks. Finish the independent tasks that are still safe and authorized.
- Do not repeat an identical attempt without new evidence. Respect cost, time, and retry limits.
- When resuming, check the real files, Git state, and checks before trusting a handoff.
- Without a safe alternative, report the blocker, the completed work, and what is needed to resume.

## Standards

- Preserve the existing stack, versions, and persistence. Do not migrate major versions or services without authorization.
- Validate input at trust boundaries. Keep logs free of secrets and full request bodies.
- Consult current official documentation before changing APIs or setup; record the source when it drives a change.
- Keep this file short. Put details in the project docs and link them instead of duplicating rules.

## Tools and style

- **Ponytail** (full): smallest complete change for coding tasks. `stop ponytail` disables it.
- **Caveman**: concise chat in the user's language. Code, docs, and commits use normal wording. `stop caveman` disables it.
- **Superpowers**: use relevant skills and scale the workflow to the scope.
- **Context7**: query current documentation for libraries and APIs. Never send secrets or private code.
- **RTK / Graphify**: use when installed. Use `rtk proxy <command>` for original output. Record outdated graph evidence; do not invent relationships.

## Git and collaboration

- Git is the source of truth. Check the branch and whether `HEAD` matches `origin` before acting.
- No `git add .`, `--force`, `reset --hard`, or `clean`. Stage files by path.
- Do not add push blockers, branch/worktree requirements, or pre-commit/pre-push hooks by default.
- Lint, types, tests, and builds are explicit checks run on request or before delivery.
- Delegate only when context isolation or independent parallelism justifies it. One writer per file; reviewers are read-only.

_Based on Vibe Coding Toolkit revision `790a895` (lean setup)._
