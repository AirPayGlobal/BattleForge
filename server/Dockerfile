# ─── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests first for layer caching
COPY package*.json ./
COPY prisma ./prisma/

# Install all deps (including devDeps needed for tsc)
RUN npm ci

# Copy source and compile TypeScript
COPY tsconfig.json ./
COPY src ./src/
RUN npm run build

# Prune devDependencies so we only carry production modules forward
RUN npm prune --omit=dev


# ─── Stage 2: Production image ────────────────────────────────────────────────
FROM node:20-alpine AS runner

# Security: run as non-root
RUN addgroup -S battleforge && adduser -S battleforge -G battleforge

WORKDIR /app

# Copy production node_modules and built output from builder
COPY --from=builder --chown=battleforge:battleforge /app/node_modules ./node_modules
COPY --from=builder --chown=battleforge:battleforge /app/dist ./dist
COPY --from=builder --chown=battleforge:battleforge /app/prisma ./prisma
COPY --chown=battleforge:battleforge package*.json ./

USER battleforge

# Railway injects $PORT at runtime; fall back to 3001 for local Docker runs
EXPOSE 3001

# Run pending migrations then start the compiled server
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
