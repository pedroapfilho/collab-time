# Collabtime

Find the hour everyone is awake.

[Try Collabtime](https://www.collabtime.io) · [MIT license](LICENSE)

## What it does

- See everyone's working hours on one timeline in your timezone.
- Compare people and groups to find shared overlap.
- Organize members into groups and drag to reorder.
- Invite teammates or share public links; protect private workspaces with a password.
- Import a team from CSV with a preview before saving.
- See who is working now and who becomes available next.

Team changes sync every 20 seconds. Public workspaces are readable without an account; creating and managing workspaces requires one.

## Quick start

Use Node.js 24 or newer, pnpm 11.13.1, and Docker. Install portless once per machine:

```bash
npm install -g portless
sudo portless proxy start --https
```

Clone this repository, then install and configure it:

```bash
pnpm install
cp apps/web/.env.example apps/web/.env
```

Generate `BETTER_AUTH_SECRET` with `openssl rand -base64 32`. The example database and Redis URLs point at the local Docker stack. Create `packages/db/.env` with the same `DATABASE_URL` and `REDIS_URL` for Prisma and the seed.

```bash
docker compose up -d
pnpm db:generate
pnpm db:push
pnpm db:seed
pnpm dev
```

Postgres listens on port 5433 and Redis on 6379. Open <https://collabtime.web.localhost>; worktrees prefix the hostname automatically. Run `portless get collabtime.web` to find this checkout's URL.

The optional seed creates `test@collabtime.dev` / `TestPassword123!` and a sample workspace at `/00000000-0000-4000-8000-000000000001`. It only accepts localhost database and Redis URLs and can be run repeatedly.

## Environment

Only `DATABASE_URL` and `BETTER_AUTH_SECRET` (32+ characters) are required by startup validation. See [the environment example](apps/web/.env.example).

| Variable                              | Purpose                                                                                             |
| ------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `REDIS_URL`                           | Optional at startup; required for creating and updating teams. Supports `redis://` and `rediss://`. |
| `WEB_APP_URL`                         | Absolute app URL for email and metadata; set your public URL in production.                         |
| `AUTH_ALLOWED_HOSTS`                  | Additional hostnames accepted by Better Auth.                                                       |
| `CORS_ORIGINS`, `TRUSTED_ORIGINS`     | Browser origins accepted for authentication.                                                        |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | Transactional email; without configuration, email verification is disabled.                         |
| `SPACE_ACCESS_SECRET`                 | Dedicated 32+ character access-token secret; defaults to the auth secret.                           |
| `SENTRY_AUTH_TOKEN`                   | Optional source-map uploads during builds.                                                          |
| `NEXT_PUBLIC_DISABLE_SENTRY`          | Set to `true` to disable Sentry reporting.                                                          |
| `DIRECT_DATABASE_URL`                 | Direct Postgres connection required by Vercel production `db:deploy`.                               |

## Deploying

The app runs on Vercel with Postgres and Redis hosted anywhere accessible to it. Configure the variables above, use the web app's `vercel-build` script, and set `WEB_APP_URL` and auth host/origin settings to your domain.

Production `db:deploy` runs **`prisma db push`**, using `DIRECT_DATABASE_URL`, when `VERCEL_ENV=production`. It does not apply a migration history. Preview and local invocations skip that deployment step; provision their schemas separately.

Forkers must replace the Sentry DSNs in the client/server/edge configs or set `NEXT_PUBLIC_DISABLE_SENTRY=true` when building and running. Error replays remain enabled in production; routine session recording is disabled.

## Stack and packages

Next.js 16, React 19, strict TypeScript, Tailwind CSS v4, Base UI, TanStack Query/Form, Better Auth, Prisma 7/Postgres, Redis, and optional Resend. The only app is `@repo/web` in `apps/web`.

| Package                   | Purpose                               |
| ------------------------- | ------------------------------------- |
| `@repo/ui`                | Shared React components and theme     |
| `@repo/db`                | Prisma client, schema, and local seed |
| `@repo/auth`              | Better Auth server and client         |
| `@repo/observability`     | Structured logging                    |
| `@repo/transactional`     | Email templates and delivery          |
| `@repo/portless-env`      | Worktree-aware development URLs       |
| `@repo/typescript-config` | TypeScript configurations             |
| `@repo/config-vitest`     | Vitest configurations                 |

## Scripts

| Command                                            | Purpose                                     |
| -------------------------------------------------- | ------------------------------------------- |
| `pnpm dev`                                         | Start development through portless          |
| `pnpm build`                                       | Build app and packages                      |
| `pnpm typecheck`                                   | Check TypeScript                            |
| `pnpm lint`                                        | Run oxlint                                  |
| `pnpm format`, `pnpm format:check`                 | Format or check with oxfmt                  |
| `pnpm test`                                        | Run Vitest                                  |
| `pnpm test:e2e`, `pnpm test:e2e:ui`                | Run Playwright or its interactive UI        |
| `pnpm db:generate`, `pnpm db:push`, `pnpm db:seed` | Generate client, apply schema, seed locally |
| `pnpm fallow:dead`                                 | Find dead code and unused exports           |
| `pnpm fallow:dupes`, `pnpm fallow:health`          | Inspect duplication and code health         |
| `pnpm fallow:audit`                                | Audit changes against main                  |
| `pnpm clean`                                       | Remove build output and dependencies        |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) and [project conventions](docs/CONVENTIONS.md). Report vulnerabilities through [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE), copyright © 2026 Pedro Filho.
