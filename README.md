# Hari-Test-Application

# Hari Test Platform

Online test/exam platform — Next.js (App Router) + MongoDB, deployed on Vercel.

**Portfolio:** [livinstudio2026-debug.github.io/Portfolio-Livin-Studio](https://livinstudio2026-debug.github.io/Portfolio-Livin-Studio/)

## Credentials (private reference — keep this repo private)

| Item | Value |
|---|---|
| Admin login email | `<fill in>` |
| Admin login password | `<fill in>` |
| MongoDB URI | `<fill in>` |
| Brevo API key | `<fill in>` |
| Vercel project URL | `<fill in>` |

> ⚠️ This section is for your own reference only. Never push these values to a **public** repo. If you ever make this repo public, delete this section first.

## Tech Stack
- Next.js 16 (App Router, TypeScript)
- MongoDB / Mongoose
- Tailwind CSS + shadcn/ui
- Brevo (email)
- JWT auth (jose)

## Environment Variables

Create `.env.local` (never commit this file) with:

| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB connection string |
| `AUTH_SECRET` | Secret for signing admin auth JWTs |
| `BREVO_API_KEY` | Brevo (email) API key |
| `BREVO_SENDER_EMAIL` | Sender email for result notifications |
| `BREVO_SENDER_NAME` | Sender display name (e.g. `HariTestPlatform`) |
| `ADMIN_EMAIL` | Admin login email |
| `CRON_SECRET` | Secret to authorize the cron job that finalizes tests |
| `NEXT_PUBLIC_APP_URL` | Public app URL (`http://localhost:3000` in dev) |

Add the same keys/values in **Vercel → Project → Settings → Environment Variables** before deploying.

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Seed Admin User

```bash
npx tsx scripts/seedAdmin.ts
```

## Deployment

Deployed on [Vercel](https://vercel.com). Push to `main` to trigger a deploy, or import the repo directly in the Vercel dashboard. Make sure all environment variables above are set in Vercel first, and that `vercel.json` cron config is respected for the test-finalization job.

## Project Structure

```
app/            → routes (admin, exam, api)
components/     → UI components
lib/            → auth, db, email, rate limiting, validation
models/         → Mongoose schemas
services/       → business logic layer
scripts/        → one-off scripts (seed admin, test DB connection)
```
