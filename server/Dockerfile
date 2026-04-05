# ─── Stage 1: Build client ────────────────────────────────────────────────────
FROM node:20-alpine AS client-builder

WORKDIR /app

COPY client/package*.json ./
RUN npm ci

COPY client/ ./

# Supabase public keys are passed as build args from Railway Variables
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY

RUN npm run build


# ─── Stage 2: Build server ────────────────────────────────────────────────────
FROM node:20-alpine AS server-builder

WORKDIR /app

# Railway uses the repo root as the build context
COPY server/package*.json ./
COPY server/prisma ./prisma/
RUN npm ci

COPY server/tsconfig.json ./
COPY server/src ./src/
RUN npm run build
RUN npm prune --omit=dev


# ─── Stage 3: Production image ────────────────────────────────────────────────
FROM node:20-alpine AS runner

# Prisma requires OpenSSL on Alpine
RUN apk add --no-cache openssl

# Security: run as non-root
RUN addgroup -S battleforge && adduser -S battleforge -G battleforge

WORKDIR /app

COPY --from=server-builder --chown=battleforge:battleforge /app/node_modules ./node_modules
COPY --from=server-builder --chown=battleforge:battleforge /app/dist ./dist
COPY --from=server-builder --chown=battleforge:battleforge /app/prisma ./prisma
COPY --from=server-builder --chown=battleforge:battleforge /app/package*.json ./

# Client build output served as static files by Express
COPY --from=client-builder --chown=battleforge:battleforge /app/dist ./public

USER battleforge

EXPOSE 3001

CMD ["sh", "-c", "npx prisma db push --skip-generate --accept-data-loss & node dist/index.js"]
