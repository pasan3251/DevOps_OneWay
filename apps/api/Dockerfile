# Multi-stage Dockerfile for Waypoint Logistics API
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root workspace and api package definitions
COPY package.json ./
COPY apps/api/package.json ./apps/api/

# Install dependencies
RUN npm --prefix apps/api install

# Copy source and config
COPY apps/api ./apps/api

# Build NestJS application and database migrations
RUN npm --prefix apps/api run build

# Production runner image
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
ENV HOST=0.0.0.0

COPY package.json ./
COPY apps/api/package.json ./apps/api/

RUN npm --prefix apps/api install --omit=dev

COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/src/database/migrations ./apps/api/dist/database/migrations

EXPOSE 3001

CMD ["node", "apps/api/dist/main.js"]
