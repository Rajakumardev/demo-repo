# 💰 Expense Manager

A full-stack expense tracker. Log in, record what you spend, and see where
your money goes with per-category and monthly breakdowns.

| Layer          | Technology                                          |
| -------------- | --------------------------------------------------- |
| **Backend**    | Node.js 20 · Express 4 · JWT auth · Zod validation  |
| **Frontend**   | React 18 · Vite · React Router · Recharts · lucide  |
| **Database**   | PostgreSQL 16                                       |
| **Deployment** | Docker · Docker Compose · nginx                     |

---

## Table of contents

- [Features](#features)
- [Architecture](#architecture)
- [Project structure](#project-structure)
- [Quick start (Docker Compose)](#quick-start-docker-compose)
- [Local development](#local-development)
- [Environment variables](#environment-variables)
- [API reference](#api-reference)
- [Authentication flow](#authentication-flow)
- [Database schema](#database-schema)
- [Security notes](#security-notes)
- [npm scripts](#npm-scripts)

---

## Features

- Email/password **registration and login** with bcrypt-hashed passwords.
- **JWT authentication**: short-lived access tokens plus rotating refresh
  tokens stored in an httpOnly cookie and revocable server-side.
- **Expenses** CRUD with date range, category, free-text search, sort and
  pagination.
- **Categories** CRUD; eight sensible defaults are seeded for every new
  account. Deleting a category leaves its expenses uncategorised.
- **Dashboard** with current-month totals, a six-month trend chart and a
  per-category donut.
- Consistent JSON error envelope and request validation on every endpoint.
- Fully containerised with a single `docker compose up`.

## Architecture

```
                 ┌────────────────────────────┐
   browser ───▶  │  nginx (frontend, :8080)    │
                 │  • serves the React SPA     │
                 │  • proxies /api/ ──┐        │
                 └────────────────────┼────────┘
                                      ▼
                        ┌──────────────────────────┐
                        │  Express API (:4000)      │
                        │  • JWT auth middleware    │
                        │  • Zod validation         │
                        │  • runs SQL migrations    │
                        └────────────┬─────────────┘
                                     ▼
                        ┌──────────────────────────┐
                        │  PostgreSQL 16 (:5432)    │
                        │  named volume `pgdata`    │
                        └──────────────────────────┘
```

In development the Vite dev server takes nginx's place and proxies `/api` to
`http://localhost:4000`.

## Project structure

```
.
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── app.js                 # Express app assembly
│       ├── server.js              # bootstrap: wait → migrate → listen
│       ├── config/env.js          # validated environment
│       ├── controllers/           # auth, category, expense
│       ├── db/
│       │   ├── pool.js            # pg Pool + helpers
│       │   ├── migrate.js         # forward-only migration runner
│       │   └── migrations/*.sql
│       ├── middleware/            # auth guard, validation, error handler
│       ├── models/                # SQL data access
│       ├── routes/                # route definitions
│       └── utils/                 # tokens, passwords, cookies, errors
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx / App.jsx
│       ├── components/            # Layout, Modal, forms, ...
│       ├── context/AuthContext.jsx
│       ├── lib/                   # api client, formatters, icons
│       └── pages/                 # Login, Register, Dashboard, ...
├── docker-compose.yml
├── .env.example
└── README.md
```

## Quick start (Docker Compose)

```bash
# 1. Create your environment file and set strong JWT secrets.
cp .env.example .env
#    Tip: generate secrets with `openssl rand -hex 48`

# 2. Build and start the stack.
docker compose up --build
```

Then open:

- **Web app** → <http://localhost:8080>
- **API health** → <http://localhost:4000/api/health>

Create an account from the register screen and you are ready to go.
Database migrations run automatically the first time the backend starts.

Useful commands:

```bash
docker compose logs -f backend     # tail API logs
docker compose down                # stop everything (keeps the data volume)
docker compose down -v             # stop and delete the database volume
```

## Local development

Run Postgres however you like (the Compose `db` service is fine), then:

```bash
# --- backend ---
cd backend
npm install
cp ../.env.example .env            # point POSTGRES_HOST at localhost
npm run migrate                    # optional; also runs on start
npm run dev                        # http://localhost:4000

# --- frontend (second terminal) ---
cd frontend
npm install
npm run dev                        # http://localhost:5173
```

The Vite dev server proxies `/api` to `http://localhost:4000`, so no CORS or
cookie configuration is needed. Override the proxy target with
`VITE_PROXY_TARGET` if your API runs elsewhere.

## Environment variables

| Variable                 | Default                     | Description                                        |
| ------------------------ | --------------------------- | -------------------------------------------------- |
| `NODE_ENV`               | `development`               | Runtime mode (`production` enables Secure cookies) |
| `PORT`                   | `4000`                      | API port                                           |
| `POSTGRES_HOST`          | `db`                        | Database host (`localhost` when running locally)   |
| `POSTGRES_PORT`          | `5432`                      | Database port                                      |
| `POSTGRES_DB`            | `expense_manager`           | Database name                                      |
| `POSTGRES_USER`          | `expense`                   | Database user                                      |
| `POSTGRES_PASSWORD`      | `expense_secret`            | Database password                                  |
| `DATABASE_URL`           | –                           | Optional full connection string (overrides above)  |
| `JWT_ACCESS_SECRET`      | `dev-access-secret-change-me`  | Secret for access tokens — **change it**        |
| `JWT_REFRESH_SECRET`     | `dev-refresh-secret-change-me` | Secret for refresh tokens — **change it**       |
| `JWT_ACCESS_EXPIRES_IN`  | `15m`                       | Access token lifetime                              |
| `JWT_REFRESH_EXPIRES_IN` | `7d`                        | Refresh token lifetime                             |
| `CORS_ORIGIN`            | `http://localhost:8080`     | Comma-separated allowed browser origins            |
| `COOKIE_DOMAIN`          | –                           | Optional cookie domain for production              |
| `VITE_API_URL`           | `/api`                      | API base URL baked into the client bundle          |

## API reference

All endpoints are prefixed with `/api`. Authenticated routes expect an
`Authorization: Bearer <accessToken>` header. Errors use the shape
`{ "error": { "message": string, "details"?: object } }`.

### Auth — `/api/auth`

| Method | Path        | Auth | Description                                  |
| ------ | ----------- | ---- | -------------------------------------------- |
| POST   | `/register` | –    | Create an account, return user + access token |
| POST   | `/login`    | –    | Authenticate, return user + access token      |
| POST   | `/refresh`  | 🍪   | Rotate the refresh cookie, return a new token |
| POST   | `/logout`   | 🍪   | Revoke the refresh session                    |
| GET    | `/me`       | ✅   | Return the current user                       |

<details>
<summary>Register request / response</summary>

```http
POST /api/auth/register
Content-Type: application/json

{ "name": "Ada Lovelace", "email": "ada@example.com", "password": "supersecret" }
```

```json
HTTP/1.1 201 Created
Set-Cookie: refresh_token=...; HttpOnly; SameSite=Lax; Path=/api/auth

{
  "user": {
    "id": "0e3b463c-...",
    "email": "ada@example.com",
    "name": "Ada Lovelace",
    "currency": "USD",
    "createdAt": "2026-10-07T11:45:32.342Z",
    "updatedAt": "2026-10-07T11:45:32.342Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs..."
}
```
</details>

### Categories — `/api/categories`

| Method | Path   | Auth | Description                       |
| ------ | ------ | ---- | --------------------------------- |
| GET    | `/`    | ✅   | List the user's categories        |
| POST   | `/`    | ✅   | Create a category                 |
| PUT    | `/:id` | ✅   | Update a category                 |
| DELETE | `/:id` | ✅   | Delete a category                 |

<details>
<summary>Create category</summary>

```http
POST /api/categories
Authorization: Bearer <token>
Content-Type: application/json

{ "name": "Coffee", "color": "#8b5cf6", "icon": "coffee" }
```

Returns `201` with `{ "category": { ... } }`.
</details>

### Expenses — `/api/expenses`

| Method | Path       | Auth | Description                              |
| ------ | ---------- | ---- | ---------------------------------------- |
| GET    | `/`        | ✅   | List expenses (filters + pagination)     |
| GET    | `/summary` | ✅   | Totals, per-category and per-month data  |
| GET    | `/:id`     | ✅   | Fetch a single expense                   |
| POST   | `/`        | ✅   | Create an expense                        |
| PUT    | `/:id`     | ✅   | Update an expense                        |
| DELETE | `/:id`     | ✅   | Delete an expense                        |

<details>
<summary>List query parameters</summary>

| Parameter    | Type    | Notes                                                     |
| ------------ | ------- | --------------------------------------------------------- |
| `from`       | date    | `YYYY-MM-DD`, inclusive lower bound                       |
| `to`         | date    | `YYYY-MM-DD`, inclusive upper bound                       |
| `categoryId` | uuid    | Filter by category                                        |
| `search`     | string  | Case-insensitive match on the description                 |
| `sort`       | enum    | `date_desc` (default), `date_asc`, `amount_desc`, `amount_asc` |
| `limit`      | integer | 1–100, default `50`                                       |
| `offset`     | integer | ≥ 0, default `0`                                          |

Response: `{ "expenses": [...], "meta": { "total": n, "amount": n, "limit": n, "offset": n } }`
</details>

<details>
<summary>Summary response</summary>

```json
{
  "totals": { "total": 1242.75, "count": 2, "average": 621.375, "largest": 1200 },
  "byCategory": [
    { "id": null, "name": "Uncategorised", "color": "#94a3b8", "total": 1200, "count": 1 },
    { "id": "026c6e3d-...", "name": "Travel", "color": "#14b8a6", "total": 42.75, "count": 1 }
  ],
  "byMonth": [{ "month": "2026-10", "total": 1242.75, "count": 2 }]
}
```
</details>

### Health

| Method | Path           | Description              |
| ------ | -------------- | ------------------------ |
| GET    | `/api/health`  | Liveness probe (`200`)   |

## Authentication flow

1. **Register / login** returns a short-lived **access token** in the JSON
   body and sets a long-lived **refresh token** as an httpOnly cookie scoped
   to `/api/auth`.
2. The client keeps the access token **in memory only** (never in
   `localStorage`) and sends it as a bearer header.
3. When an access token expires the client calls `POST /api/auth/refresh`;
   the server validates the cookie, **rotates** it (revokes the old token,
   issues a new pair) and returns a fresh access token.
4. Presenting an already-revoked refresh token is treated as a possible
   replay: every session for that user is revoked and the client is signed
   out.
5. **Logout** revokes the current refresh token and clears the cookie.

## Database schema

```
users            (id, email*, password_hash, name, currency, timestamps)
categories       (id, user_id→users, name, color, icon, timestamps)   *unique per user
expenses         (id, user_id→users, category_id→categories NULL,
                  amount, description, spent_at, timestamps)
refresh_tokens   (id, user_id→users, token_hash*, expires_at,
                  revoked_at, created_at)
```

`categories` and `expenses` cascade on user deletion; deleting a category
sets `expenses.category_id` to `NULL`. Refresh tokens are stored as SHA-256
hashes. Migrations live in `backend/src/db/migrations` and are applied in
filename order.

## Security notes

- Passwords are hashed with bcrypt (cost 12).
- Refresh tokens are hashed at rest, individually revocable and rotated on
  every use with replay detection.
- The refresh cookie is `httpOnly`, `SameSite=Lax`, and `Secure` in
  production; it is only sent to the auth endpoints.
- `helmet` security headers, credentialed CORS allow-listing, JSON body size
  limits and rate limiting (global plus a stricter limit on credentials
  routes).
- All input is validated with Zod; all SQL uses parameterised queries.

> ⚠️ Always replace the default JWT secrets before deploying, and serve the
> app over HTTPS so `Secure` cookies work as intended.

## npm scripts

**backend**

| Script                 | Description                                    |
| ---------------------- | ---------------------------------------------- |
| `npm run dev`          | Start with `node --watch`                       |
| `npm start`            | Start the server                                |
| `npm run migrate`      | Apply pending migrations and exit               |
| `npm test`             | Run the unit tests (`node --test`)              |
| `npm run test:coverage`| Run tests with `c8`, enforcing an 85% threshold |

**frontend**

| Script                 | Description                              |
| ---------------------- | ---------------------------------------- |
| `npm run dev`          | Vite dev server                          |
| `npm run build`        | Production build to `dist/`              |
| `npm run preview`      | Preview the production build             |
| `npm test`             | Run the unit tests (`vitest run`)        |
| `npm run test:coverage`| Run tests with coverage (85% threshold)  |

## Git hooks & quality gates

A **pre-commit hook** (Husky) guards every commit:

1. `lint-staged` lints and auto-fixes the files staged for the commit.
2. `npm run verify` runs the repo linter and then the full backend and frontend
   test suites **with enforced 85% coverage thresholds**. Coverage is measured
   by `c8` (backend) and Vitest (frontend).

If anything fails, the commit is rejected.

### One-time setup

Install dependencies at the repo root, in the backend and in the frontend:

```bash
npm install                 # sets up Husky (via the `prepare` script)
npm --prefix backend install
npm --prefix frontend install
```

### Root scripts

Run from the repository root:

| Script                  | Description                                             |
| ----------------------- | ------------------------------------------------------- |
| `npm run lint`          | ESLint across `backend/src` and `frontend/src`          |
| `npm run lint:fix`      | ESLint with `--fix`                                     |
| `npm test`              | Unit tests for backend and frontend                     |
| `npm run coverage`      | Test suites with coverage + thresholds (both packages)  |
| `npm run verify`        | `lint` + `coverage` — exactly what the hook runs        |

> Coverage scope: the backend enforces 85% over `backend/src` (excluding the
> `server.js` entrypoint). The frontend enforces 85% over the unit-testable
> surface `frontend/src/{lib,context,components}`; page-level UI is not yet
> covered. Widen the `coverage.include` list in `frontend/vite.config.js` as
> page tests are added.
