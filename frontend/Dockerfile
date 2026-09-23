FROM node:20-alpine

WORKDIR /app

RUN apk update && apk upgrade

RUN npm install -g npm@latest

COPY package*.json ./

RUN npm install 

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]