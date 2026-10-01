# Hotel website (hotel-lnd)

Website + booking system for a small 9-room hotel.

## Structure

- pnpm monorepo
- apps/web — Next.js (App Router, TypeScript, Tailwind). Frontend only:
  it never connects to the database directly, it gets data from apps/api.
- apps/api — Express + TypeScript. All backend logic and all database access.
- packages/ — shared code (Zod schemas, types), added later

## Planned stack

- API: Express, PostgreSQL (Neon), Drizzle ORM, Zod
- Auth: hand-written session auth (httpOnly cookies, sessions table, argon2). No auth libraries.
- Email: Resend

## How to work

- Don't explain code or concepts unless I ask. Keep responses short.
- Work in small steps. Don't do several big steps at once.
- If something is a security issue, flag it in one line.
- Keep code, file names, comments, and commit messages in English.

## Commands

- `pnpm dev` (root) — runs web (3000) and api (4000)
