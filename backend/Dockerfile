# ─── Stage 1: Dependencies ────────────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@11.5.2 --activate

# Copy workspace manifests for layer caching
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY backend/package.json ./backend/
COPY database/package.json ./database/

RUN pnpm install --frozen-lockfile --ignore-scripts

# ─── Stage 2: Runtime ─────────────────────────────────────────────────────────
FROM node:22-alpine
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@11.5.2 --activate

# Copy installed node_modules (workspace symlinks intact)
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/backend/node_modules ./backend/node_modules

# Copy workspace manifests
COPY pnpm-workspace.yaml package.json ./

# Copy source code (database package is TypeScript-only, no build step)
COPY database/src ./database/src
COPY database/package.json ./database/

# Copy backend source
COPY backend/src ./backend/src
COPY backend/package.json ./backend/

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

WORKDIR /app/backend
CMD ["node_modules/.bin/tsx", "src/index.ts"]
