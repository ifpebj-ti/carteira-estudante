FROM node:20-alpine

WORKDIR /app

RUN apk update && apk upgrade

COPY package*.json ./

RUN npm install 

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]