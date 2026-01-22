FROM node:20-alpine

WORKDIR /app

# Copy server package.json
COPY package.json ./

RUN yarn install

# Copy server files
COPY server.js ./

EXPOSE 3000

CMD ["yarn", "start"]
