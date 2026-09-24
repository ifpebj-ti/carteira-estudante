# --- ESTÁGIO 1: BUILDER ---
FROM node:24-alpine AS builder

WORKDIR /app

RUN apk update && apk upgrade

COPY package*.json ./

RUN npm pkg set overrides.tar="7.5.21" \
 && npm pkg set overrides.ip-address="10.3.1" \
 && npm pkg set overrides.brace-expansion="5.0.8"

RUN npm install

COPY . .

RUN npm run build

# --- ESTÁGIO 2: RUNNER ---
FROM node:24-alpine AS runner

WORKDIR /app

ENV NODE_ENV production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

CMD ["node", "server.js"]