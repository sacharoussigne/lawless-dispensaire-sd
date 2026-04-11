# lawless-dispensaire-sd

**lawless-dispensaire-sd** is a self-hosted web application for running a dispensary-style organization: inventory and crafting, orders, banking, patient mail workflows, private practice, and optional weekly payroll reporting. It uses accounts with **role-based access** and separate areas for day-to-day staff, catalog management, and administration.

## Features

- **Stock** — Track items, chests, stock levels, and crafting recipes (permissions depend on role).
- **Orders** — Create and manage orders linked to companies and catalog data.
- **Bank** — Bank account views and operations for permitted roles.
- **Search** — Search the item catalog where enabled.
- **Mails** — Mail templates and patient-oriented mail flows for staff workflows.
- **Private practice** — Dedicated flows for private-practice roles.
- **Payroll (admin)** — Weekly payroll reports where the feature is enabled.
- **Management** — Companies, categories, items, chests, and related catalog configuration (`/management`).
- **Admin** — User and role management, app settings (including **per-feature toggles**), stock overrides, and payroll (`/admin`).
- **Authentication** — Email and password; optional **Discord** OAuth when `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET` are set.

## Prerequisites

- **Node.js** 20 or newer (LTS recommended)
- **PostgreSQL**
- **npm** (the repo ships a `package-lock.json`)

You can use **pnpm** or **yarn** instead of npm if you prefer.

## Installation

1. Clone the repository and install dependencies:

   ```bash
   git clone <repository-url>
   cd lawless-dispensaire-sd
   npm install
   ```

   For reproducible installs from the lockfile:

   ```bash
   npm ci
   ```

2. Copy the environment template and fill in the values:

   ```bash
   cp .env.example .env
   ```

   See [Environment variables](#environment-variables) for the essentials.

3. Apply database migrations:

   ```bash
   npx prisma migrate deploy
   ```

   For local development, you may use `npx prisma migrate dev` instead.

4. Generate the Prisma Client (if needed):

   ```bash
   npx prisma generate
   ```

There is no bundled database seed script; users are created through the auth UI unless you insert rows manually. On an empty database, the **first** user created (email or Discord) is automatically assigned the **`admin`** role. See [User roles](#user-roles) for optional auto-assignment of **`employee`** to later sign-ups.

## Environment variables

Copy [.env.example](.env.example) to `.env` and configure at least:

| Variable | Purpose |
| -------- | ------- |
| `DATABASE_URL` | PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | Secret for session signing (use a long random string) |
| `BETTER_AUTH_URL` | Public base URL of the app (e.g. `http://localhost:3000`) |
| `NEXT_PUBLIC_API_URL` | Same base URL as above (used by the client) |
| `NEXT_PUBLIC_APP_ENV` | `dev` or `prod` |
| `TZ` | Server timezone (e.g. `UTC`) |

Optional:

| Variable | Purpose |
| -------- | ------- |
| `DISCORD_CLIENT_ID` | Discord OAuth application ID |
| `DISCORD_CLIENT_SECRET` | Discord OAuth secret |
| `ACCESS_ON_CREATE` | Set to `true` or `1` so every **new user after the first** gets role **`employee`** (instead of staying on the default `user` role until an admin promotes them) |

## Running the app

**Development:**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

**Production:**

```bash
npm run build
npm run start
```

Deploy on any host that provides Node.js and network access to your PostgreSQL instance.

## User roles

Roles are enforced with [Better Auth](https://www.better-auth.com/) and a custom access matrix. The main **application** roles used in this codebase are:

| Role | Summary |
| ---- | ------- |
| `admin` | Full application permissions plus admin-plugin capabilities (user administration, impersonation where configured, etc.). |
| `user` | Default Better Auth “user” baseline; **no** dispensary module access until an administrator assigns another role. |
| `employee` | Day-to-day access: orders (view), bank, application, mails. |
| `inventory_manager` | Stock (full), orders, search, bank, **management** catalog tools, mails. |
| `inventory_viewer` | Stock (read-oriented), orders (view), search, bank, application. |
| `private_practitioner` | Private practice, bank, application, mails (limited vs other roles). |
| `direction` | Application access and payroll report create/view. |

**Self-hosting:** the **first** user on an empty database is promoted to **`admin`** automatically (see `databaseHooks` in [`src/lib/auth.ts`](src/lib/auth.ts)). Everyone else keeps the Better Auth default **`user`** role until an administrator assigns another role from **Admin → Users** at `/admin/users`, **unless** you set **`ACCESS_ON_CREATE`** to **`true`** or **`1`** in the environment: then each subsequent new user is assigned **`employee`** instead.

## Basic usage

1. Start the server (`npm run dev`).
2. Sign up at `/auth/signup` or sign in at `/auth/login`.
3. After sign-in, the home route sends you to the main staff area; management and admin routes appear according to your roles and enabled features.

## Tests

```bash
npm run test
```

Uses [Vitest](https://vitest.dev/).

## Tech stack

- [Next.js](https://nextjs.org/) (App Router)
- [Mantine](https://mantine.dev/) UI
- [Prisma](https://www.prisma.io/) + PostgreSQL
- [Better Auth](https://www.better-auth.com/) for authentication
