FROM node:24-alpine

WORKDIR /app

RUN apk update && apk upgrade

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

RUN npm prune --omit=dev

EXPOSE 3000

CMD ["npm", "start"]