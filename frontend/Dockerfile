# --- ESTÁGIO 1: BUILDER ---
FROM node:24-alpine AS builder

WORKDIR /app

RUN apk update && apk upgrade

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build


RUN find .next/standalone -type d \( -name "tar" -o -name "ip-address" -o -name "brace-expansion" \) -prune -exec rm -rf '{}' +

# --- ESTÁGIO 2: RUNNER ---
FROM node:24-alpine AS runner

WORKDIR /app

ENV NODE_ENV production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

CMD ["node", "server.js"]