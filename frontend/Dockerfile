# --- ESTÁGIO 1: BUILDER ---
FROM node:24-alpine AS builder

WORKDIR /app

RUN apk update && apk upgrade

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

# --- ESTÁGIO 2: RUNNER ---
FROM node:24-alpine AS runner

WORKDIR /app

ENV NODE_ENV production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

RUN rm -rf ./node_modules/tar \
           ./node_modules/ip-address \
           ./node_modules/brace-expansion

EXPOSE 3000

CMD ["node", "server.js"]