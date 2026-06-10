# Docker installation

This document describes how to run **lawless-dispensaire-sd** in Docker. You still need a **PostgreSQL** instance the container can reach (same host, another container, or a managed database).

## Environment

Build and runtime expect the same variables as a normal install — see [.env.example](.env.example) and the [main README](README.md#environment-variables). For Docker, pass them with `docker run -e`, an env file, or `docker-compose`.

At minimum: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_APP_ENV`, `TZ`.

## Example Dockerfile

Below is a minimal single-stage image. Adjust `COPY` so it matches your build context (the example uses a folder named `www` containing the app sources; if your context **is** the repository root, use `COPY . .` instead of `COPY www ./`).

```dockerfile
FROM node:lts AS build
WORKDIR /var/www/app

COPY www ./

RUN npm install
RUN npx prisma generate
RUN npx prisma migrate deploy

RUN npm run build

RUN ls -al
EXPOSE 3000

CMD npm run start
```

### Notes on this example

- **`COPY www ./`** — Your build context must include a directory `www` with the project files (`package.json`, `prisma/`, `src/`, etc.). If you build from the repo root, replace with `COPY . .`.
- **`npx prisma migrate deploy`** runs at **image build** time. That only works if `DATABASE_URL` is available during `docker build` (e.g. build-arg or network to Postgres). Many teams prefer running migrations **when the container starts** (entrypoint script: `prisma migrate deploy && npm run start`) so the image stays portable and the DB is not required at build time.
- **`RUN ls -al`** is useful for debugging; you can remove it for production images.
- For smaller images and faster deploys, consider a **multi-stage** build (build with dev dependencies, copy `.next` + `node_modules` production slice into a slim runtime image).
- Set **`NODE_ENV=production`** for `npm run build` and `npm run start` in real deployments.

## Build and run (outline)

From the directory that will be your build context (e.g. repo root, with a `Dockerfile` that uses `COPY . .`):

```bash
docker build -t lawless-dispensaire-sd .
docker run --rm -p 3000:3000 --env-file .env lawless-dispensaire-sd
```

Ensure `BETTER_AUTH_URL` and `NEXT_PUBLIC_API_URL` use the **public URL** clients use to reach the app (not `localhost` inside the browser if you access the host by IP or domain).

## docker-compose (optional)

A typical setup is two services: `postgres` and `app`, with `app` depending on `postgres` and `DATABASE_URL` pointing to the `postgres` service hostname. Run migrations on startup if you do not run `migrate deploy` at build time:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: app
      POSTGRES_DB: dispensaire
    volumes:
      - pgdata:/var/lib/postgresql/data

  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://app:app@postgres:5432/dispensaire
      # ... other vars from .env.example
    depends_on:
      - postgres

volumes:
  pgdata:
```

Adapt variable names and commands to match your final `Dockerfile` and entrypoint.

## Reverse proxy (SSE / agenda realtime)

The agenda module uses **Server-Sent Events** at `/api/d/[dispensarySlug]/agenda/stream`. Mutations publish through PostgreSQL `NOTIFY`/`LISTEN`, so the app container must reach the same PostgreSQL instance for realtime sync between users.

If nginx, Traefik, or another reverse proxy sits in front of the Node container, disable response buffering for that path or the stream will appear stuck until the buffer fills.

### nginx example

```nginx
location /api/d/ {
    proxy_pass http://app:3000;
    proxy_http_version 1.1;
    proxy_set_header Connection '';
    proxy_set_header Host $host;
    proxy_buffering off;
    proxy_cache off;
    proxy_read_timeout 86400s;
    proxy_send_timeout 86400s;
}
```

The app route already sets `X-Accel-Buffering: no` for nginx. Long `proxy_read_timeout` keeps idle SSE connections open across heartbeats (every 30 seconds).

### Traefik

For the app service, avoid buffering middleware on routes that include `/api/d/*/agenda/stream`, or use a dedicated router with `buffering: false` if your Traefik version supports it.
