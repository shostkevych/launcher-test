FROM node:20-alpine

WORKDIR /app

COPY package.json ./

RUN yarn install

COPY . .

RUN yarn build

# The dist folder will contain the built static files
