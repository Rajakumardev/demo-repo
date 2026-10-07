# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Dependencies
# ---------------------------------------------------------------------------
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ---------------------------------------------------------------------------
# Runtime
# ---------------------------------------------------------------------------
FROM node:20-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app

# Run as an unprivileged user.
RUN addgroup -S nodejs -g 1001 && adduser -S nodejs -u 1001

COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src

USER nodejs
EXPOSE 4000

# Migrations run on boot; the process waits for Postgres to become available.
CMD ["node", "src/server.js"]
