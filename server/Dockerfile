# ─── Stage 1: build the Vite client ───────────────────────────────────────────
FROM node:20-alpine AS client-builder

WORKDIR /app
COPY client/package*.json ./
RUN npm ci

COPY client/ ./
RUN npm run build


# ─── Stage 2: install static host deps ────────────────────────────────────────
FROM node:20-alpine AS host-builder

WORKDIR /app
COPY server/package.json ./
RUN npm install --omit=dev --no-audit --no-fund


# ─── Stage 3: minimal runtime image ───────────────────────────────────────────
FROM node:20-alpine AS runner

RUN addgroup -S battleforge && adduser -S battleforge -G battleforge

WORKDIR /app

COPY --from=host-builder   --chown=battleforge:battleforge /app/node_modules ./node_modules
COPY --from=client-builder --chown=battleforge:battleforge /app/dist          ./public
COPY --chown=battleforge:battleforge server/package.json ./
COPY --chown=battleforge:battleforge server/index.mjs    ./

USER battleforge

ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "index.mjs"]
