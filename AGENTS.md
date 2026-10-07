# AGENTS.md

Operating instructions for AI agents (and humans) working in this repository.
Read this before making any change.

---

## 🚨 Critical rules

### 1. Every feature must have unit tests — coverage ≥ 85%

- No feature is complete without **unit tests**. A change that adds or alters
  behaviour but ships no tests is **not done** and must not be committed as
  finished.
- **Minimum 85% coverage** (lines, functions and branches) for the code you
  add or touch. Do not reduce the project's overall coverage.
- Tests live next to the code they cover or in a `test/` directory:
  - Backend → `backend/src/**/*.test.js`
  - Frontend → `frontend/src/**/*.test.jsx`
- Cover the important paths, not just the happy path: validation failures,
  auth/authorisation rejection, error branches and edge cases.
- Run the suite and confirm coverage before committing. A failing or
  coverage-short change is a blocker.

### 2. Every commit message must be detailed and list the files changed

- Commit messages follow **Conventional Commits** (`feat:`, `fix:`, `chore:`,
  `docs:`, `test:`, `refactor:`, `build:`, `perf:`).
- Each message must explain **what** changed and **why**, and end with a
  `Files changed:` section enumerating every file in the commit.
- One logical change per commit. Do not bundle unrelated work.
- Never commit secrets (`.env`, tokens). Never commit generated output
  (`node_modules`, `dist`).

**Template**

```
<type>(<scope>): <short summary>

Body: what changed, why, and any notable decisions or trade-offs.

Files changed:
- path/to/file.js        — <what changed here>
- path/to/other.test.js  — <what changed here>

<optional: verification performed, e.g. "npm test — 24 passing, 91% coverage">
```

---

## Project overview

Expense manager: **Express** API + **PostgreSQL**, **React (Vite)** client,
orchestrated with **Docker Compose**.

- Backend entry: `backend/src/server.js` (waits for DB → runs migrations → listens)
- Frontend entry: `frontend/src/main.jsx`
- Full-stack run: `docker compose up --build` → web on `:8080`, API on `:4000`
- Details: see `README.md`

## Repository layout

```
backend/src/
  app.js  server.js  config/  controllers/  db/  middleware/  models/  routes/  utils/
frontend/src/
  main.jsx  App.jsx  components/  context/  lib/  pages/
docker-compose.yml  .env.example  README.md  AGENTS.md
```

## Common commands

| Purpose                    | Command                                        |
| -------------------------- | ---------------------------------------------- |
| Start the whole stack      | `docker compose up --build`                    |
| Backend dev                | `cd backend && npm run dev`                    |
| Backend tests + coverage   | `cd backend && npm run test:coverage`          |
| Frontend dev               | `cd frontend && npm run dev`                   |
| Frontend build             | `cd frontend && npm run build`                 |
| Frontend tests + coverage  | `cd frontend && npm run test:coverage`         |
| Apply DB migrations        | `cd backend && npm run migrate`                |
| Lint + tests + coverage    | `npm run verify` (from the repo root)          |

> Testing tooling: the backend uses Node's built-in test runner
> (`node --test`) and the frontend uses Vitest. If the scripts above are not
> present yet, wire them up **before** adding the first feature under rule 1.

A Husky **pre-commit hook** enforces rule 1 automatically: it runs
`npm run verify` (ESLint + both test suites with 85% coverage thresholds) and
rejects the commit if anything fails. Activate it once per clone with
`npm install` at the repository root.

## Code conventions

- **Node**: ES modules (`import`/`export`), 2-space indent, `camelCase` for
  variables, `PascalCase` for React components.
- **SQL**: parameterised queries only; never string-interpolate user input.
- **API**: JSON errors in the shape `{ error: { message, details? } }`; validate
  all input with Zod.
- **Frontend**: keep the access token in memory only; never persist it to
  `localStorage`. Reuse the existing components and CSS classes.
- Match the style of surrounding code; keep changes minimal and focused.

## Definition of done

- [ ] Behaviour implemented, with unit tests ≥ 85% coverage for the change.
- [ ] `npm test` and `npm run build` pass.
- [ ] No secrets or generated files staged.
- [ ] Commit message follows rule 2, including the `Files changed:` list.
- [ ] Pushed to `master` using the personal account (`ghp`).
