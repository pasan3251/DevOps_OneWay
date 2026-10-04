FROM node:20-alpine AS builder

WORKDIR /app
COPY apps/web/package.json apps/web/package-lock.json ./apps/web/
RUN npm --prefix apps/web ci
COPY apps/web ./apps/web
ARG NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
RUN npm --prefix apps/web run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY apps/web/package.json apps/web/package-lock.json ./apps/web/
RUN npm --prefix apps/web ci --omit=dev
COPY --from=builder /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/apps/web/next.config.ts ./apps/web/next.config.ts
EXPOSE 3000
CMD ["npm", "--prefix", "apps/web", "run", "start", "--", "-H", "0.0.0.0"]
