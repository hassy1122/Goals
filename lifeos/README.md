# LifeOS

Plan your life in one place: **Vision → Life Areas → Goals → Milestones → Tasks → Daily/Weekly Plan → Review** — with habits, finances, business tools, and an AI assistant. Everything connects, so finishing a task rolls progress up its milestone, goal, and life area.

**Status: Phase 1 of 7 complete** — scaffold, auth (JWT httpOnly cookies + rotating refresh), notifications, dashboard shell with reorderable widgets, dark mode, command palette (Ctrl+K), seed data, API tests.

## Stack

| Layer      | Choice |
| ---------- | ------ |
| Frontend   | React 18 (Vite), React Router 6, Tailwind CSS 3, Redux Toolkit + RTK Query, React Hook Form + Zod |
| Backend    | Node 20, Express 4, MongoDB 7 + Mongoose 8, JWT access + rotating refresh (httpOnly cookies), bcryptjs |
| Tooling    | Docker Compose, ESLint + Prettier, Jest + Supertest, OpenAPI (Swagger UI at `/api/docs`) |

## Quick start (Docker, recommended)

```bash
# 1) configure the API
cd server
cp .env.example .env
#    then fill JWT_ACCESS_SECRET and JWT_REFRESH_SECRET:
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

# 2) from the repo root
cd ..
docker compose up --build
```

- Frontend: http://localhost:5173 (requests proxy to the API)
- API: http://localhost:4000/api/v1/health
- Swagger UI: http://localhost:4000/api/docs
- Seed: set `OWNER_EMAIL` / `OWNER_NAME` / `OWNER_PASSWORD` in `server/.env`, then `docker compose exec api npm run seed` — provisions the single owner account (sign-up is disabled)

## Quick start — double-click (recommended on Windows)

Open the **`Start LifeOS`** shortcut in the project folder (`Goals\Start LifeOS.lnk`, or double-click `lifeos\Start LifeOS.bat`). It:

1. starts **MongoDB** with data stored permanently in `server\.data\db` (your changes survive restarts and closing the browser — they are saved to disk);
2. provisions your single owner account on first run (email/password from `server\.env` — sign-up is disabled, so this is the only login that ever works);
3. starts the API (`:4000`, Swagger at `/api/docs`) and the web app;
4. opens your browser at the app automatically.

Keep the console window open while you use the app; close it (or press Ctrl+C) to stop everything. Features updates from Phase development will appear after a rebuild (`cd lifeos\client && npm run build` is only needed for the production preview — the launcher serves live source).

## Quick start (no Docker, manual)

Prereqs: Node ≥ 20 (MongoDB is bundled via the launcher — no install needed).

```bash
# API
cd server
cp .env.example .env            # set secrets (command above); MONGODB_URI=127.0.0.1
npm install
npm run start:all               # MongoDB (persistent) + seed-once + API + web app + browser

# Or component-by-component:
npm run dev:mongo               # in-memory Mongo (resets on exit) — for quick tests only
npm run seed                    # demo user + 10 life areas
npm run dev                     # http://localhost:4000

# Frontend (second terminal)
cd ../client
npm install
npm run dev                     # http://localhost:5173
```

## Environment variables (server)

| Variable | Purpose |
| -------- | ------- |
| `NODE_ENV` | development / test / production |
| `PORT` | API port (default 4000) |
| `MONGODB_URI` | Mongo connection string |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | secrets for token signing (generate long random hex) |
| `JWT_ACCESS_TTL` | access token lifetime (e.g. `15m`) |
| `REFRESH_TOKEN_TTL_DAYS` | refresh session lifetime (default 7) |
| `COOKIE_SAMESITE` / `COOKIE_SECURE` | cookie hardening; use `none` + `true` for production cross-domain |
| `CLIENT_URL` | frontend origin (CORS + email links) |
| `SMTP_*` | email sending; empty → emails print to the console (dev) |
| `INITIAL_ADMIN_EMAIL` / `INITIAL_ADMIN_PASSWORD` | optional admin bootstrapped by seed |
| `RATE_LIMIT_*` | request throttling |
| `OWNER_EMAIL` / `OWNER_NAME` / `OWNER_PASSWORD` | single-account mode: the one login that works; sign-up is disabled and the seed provisions this account (keep this out of git — real values go in `.env`) |

Client env: `VITE_API_URL` (empty in dev — the Vite dev proxy handles `/api`).

## Tests

```bash
cd server
npm test          # Jest + Supertest against an in-memory MongoDB
npm run lint
```

## Deployment (Phase 7 will finalize)

- **Frontend** → Vercel/Netlify: build with `VITE_API_URL=https://<your-api>` per deploy.
- **API** → Render/Railway: Docker deploy, set all `.env` vars (production commitments are enforced at boot, e.g. HTTPS cookies).
- **Database** → MongoDB Atlas.

## Project layout

```
lifeos/
├─ server/   Express API (routes → controllers → services → models)
└─ client/   React SPA (features/* per module, RTK Query data layer)
```

## Roadmap

1. ✅ Auth + dashboard shell
2. ✅ Life areas + goals (+ priority scoring & progress, wheel, vision/roadmap, decision journal, goal templates, dependencies, burn-up)
3. Tasks + planner + habits (+ inbox, focus list)
4. Business suite
5. Finance + learning + health + journal
6. Reviews + analytics + AI assistant
7. Polish, sharing, PWA, deployment
