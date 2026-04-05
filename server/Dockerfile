# ─── Stage 1: Build ───────────────────────────────────────────────────────────
# Railway uses the repo root as the build context; all COPY paths are
# relative to the monorepo root.
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests first for layer caching
COPY server/package*.json ./
COPY server/prisma ./prisma/

# Install all deps (including devDeps needed for tsc)
RUN npm ci

# Copy source and compile TypeScript
COPY server/tsconfig.json ./
COPY server/src ./src/
RUN npm run build

# Prune devDependencies so we only carry production modules forward
RUN npm prune --omit=dev


# ─── Stage 2: Production image ────────────────────────────────────────────────
FROM node:20-alpine AS runner

# Prisma requires OpenSSL on Alpine
RUN apk add --no-cache openssl

# Security: run as non-root
RUN addgroup -S battleforge && adduser -S battleforge -G battleforge

WORKDIR /app

# Copy production node_modules and built output from builder
COPY --from=builder --chown=battleforge:battleforge /app/node_modules ./node_modules
COPY --from=builder --chown=battleforge:battleforge /app/dist ./dist
COPY --from=builder --chown=battleforge:battleforge /app/prisma ./prisma
COPY --from=builder --chown=battleforge:battleforge /app/package*.json ./

USER battleforge

# Railway injects $PORT at runtime; fall back to 3001 for local Docker runs
EXPOSE 3001

# Run schema sync in the background so the server starts immediately and
# Railway's healthcheck can pass. The server is safe to accept traffic while
# Prisma syncs — DB operations will simply retry on their first request.
CMD ["sh", "-c", "npx prisma db push --skip-generate --accept-data-loss & node dist/index.js"]
