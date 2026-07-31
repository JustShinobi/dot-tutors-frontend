# syntax=docker/dockerfile:1

# Next.js standalone output: the final image carries a self-contained server plus the static
# assets, and none of `node_modules`. See `next.config.ts` for the `output: "standalone"` that
# makes this possible.

FROM node:22-slim AS deps

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile


FROM node:22-slim AS builder

WORKDIR /app

RUN corepack enable

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# `NEXT_PUBLIC_*` values are inlined into the client bundle at build time, so the deployed API
# URL has to be known here — it cannot be injected at container start like a server variable.
ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
ARG NEXT_PUBLIC_APP_BASE_URL=http://localhost:3000
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL \
    NEXT_PUBLIC_APP_BASE_URL=$NEXT_PUBLIC_APP_BASE_URL \
    NEXT_TELEMETRY_DISABLED=1

RUN pnpm build


FROM node:22-slim AS runtime

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000

WORKDIR /app

RUN useradd --create-home --uid 1000 nextjs

COPY --from=builder --chown=nextjs:nextjs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nextjs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nextjs /app/public ./public

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
