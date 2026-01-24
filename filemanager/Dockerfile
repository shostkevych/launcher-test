FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN yarn install --production

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
