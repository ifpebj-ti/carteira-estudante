# --- ESTÁGIO 1: BUILDER ---
FROM node:26-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

COPY . .
RUN npm run build

# --- ESTÁGIO 2: RUNNER ---
FROM node:26-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

# Permite invalidar apenas a camada de patches do SO em builds com cache (ex.: CI)
ARG CACHE_BUSTER=""

RUN apk update && apk upgrade --no-cache \
    && rm -rf /usr/local/lib/node_modules/npm \
              /usr/local/bin/npm \
              /usr/local/bin/npx

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

CMD ["node", "server.js"]
