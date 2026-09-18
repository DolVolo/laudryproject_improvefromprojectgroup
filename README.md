# Laundry Shop

Monorepo for the laundry shop platform. Previously two separate repositories,
now merged here with the full commit history of both preserved.

```
backend/    NestJS 11 + MongoDB (Mongoose) + Socket.IO  -> deploy to Render
frontend/   Next.js 16 + React 19 + Tailwind 4          -> deploy to Vercel
render.yaml Blueprint for the backend web service
```

## Where each part is hosted, and why

| Part | Host | Reason |
| --- | --- | --- |
| `frontend/` | **Vercel** | Vercel builds Next.js natively — App Router, server components, image optimization and caching all work with no configuration. |
| `backend/` | **Render** | The API needs a process that stays alive: it runs a Socket.IO gateway (`src/realtime/order.gateway.ts`), holds a Mongoose connection pool, and serves `/uploads` from disk. Render runs it as an ordinary long-lived Node server. |

Why not the other two for the API:

- **Vercel** runs the API as serverless functions. Each request gets a fresh,
  short-lived instance, so a Socket.IO server cannot hold connections, and the
  filesystem is read-only apart from a temporary `/tmp` that is discarded.
- **Cloudflare Workers** is not a Node server at all. NestJS + Express, the
  Mongoose TCP driver, `multer` disk storage and a Socket.IO server all need
  Node APIs that Workers does not provide.

Cloudflare *Pages* could host the frontend instead of Vercel, but Vercel stays
the smoother path for Next.js 16.

## Local development

Run each side in its own terminal — the backend must be on port 3000 and the
frontend on 3001, because the backend's CORS allowlist expects those.

```bash
# terminal 1 — API on http://localhost:3000
cd backend
cp .env.example .env     # then fill in MONGO_URI and the JWT secrets
npm install
npm run start:dev

# terminal 2 — web on http://localhost:3001
cd frontend
cp .env.example .env.local
npm install
npm run dev -- -p 3001
```

## Deploying the backend to Render

1. Go to <https://dashboard.render.com/blueprints> → **New Blueprint Instance**
   and select this repository. Render reads `render.yaml` and creates the
   `laundry-shop-api` web service (root directory `backend/`, build
   `npm ci && npm run build`, start `npm run start:prod`).
2. Set the secrets marked `sync: false` in the dashboard:
   `MONGO_URI`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `MAIL_FROM`, and
   `FRONTEND_URL`. The two JWT secrets are generated for you.
3. In **MongoDB Atlas → Network Access**, allow Render's outbound IPs, or
   `0.0.0.0/0` for a class project.
4. Deploy, then confirm `https://<your-service>.onrender.com/api` responds.
5. Put that base URL (no `/api` suffix) into the frontend's
   `NEXT_PUBLIC_API_URL`, and put the Vercel URL into `FRONTEND_URL` here.

`PORT` is injected by Render and read by `src/main.ts` — don't set it yourself.

## Deploying the frontend to Vercel

1. **Add New → Project**, import this repository.
2. Set **Root Directory** to `frontend`. This is the one setting that matters
   in a monorepo; the framework preset, build command and output directory are
   all detected automatically.
3. Add the environment variable `NEXT_PUBLIC_API_URL` =
   `https://<your-service>.onrender.com` for Production, Preview and
   Development.
4. Deploy. Because `NEXT_PUBLIC_*` values are baked in at build time, changing
   this variable later requires a **redeploy**, not just a restart.

CORS needs no extra work for preview URLs: `src/main.ts` already allows any
`*.vercel.app` origin alongside whatever `FRONTEND_URL` lists.

## Two things to know before you rely on this in production

**Uploaded images do not survive on Render's free plan.** Order photos, shop
photos and rider documents are written to `backend/uploads` on local disk
(`src/users/customer/customers.controller.ts`, `src/map/map.service.ts`,
`src/users/rider/rider.controller.ts`). Render's free instances get a fresh
disk on every deploy and restart, so those files disappear while the database
rows still point at them. Two ways out: attach a persistent disk (the
commented `disk:` block in `render.yaml`, requires a paid instance), or move
uploads to object storage such as Cloudflare R2 or S3.

**The free instance sleeps.** After 15 minutes without traffic Render spins the
service down, and the next request pays roughly 50 seconds of cold start. For a
live demo, upgrade to the Starter plan or hit the health endpoint beforehand.

## Environment variables

**backend/.env** — see `backend/.env.example`

| Variable | Notes |
| --- | --- |
| `MONGO_URI` | Atlas connection string, database name included |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Long random strings |
| `JWT_ACCESS_EXPIRATION` / `JWT_REFRESH_EXPIRATION` | Seconds — 900 / 604800 |
| `FRONTEND_URL` | Comma-separated CORS allowlist |
| `GMAIL_USER` / `GMAIL_APP_PASSWORD` / `MAIL_FROM` | Forgot-password email |
| `PORT` | Local only; Render sets it |

**frontend/.env.local** — see `frontend/.env.example`

| Variable | Notes |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | API base URL, no trailing slash and no `/api` — `lib/api.ts` appends it. Also used to derive the Socket.IO URL. |
