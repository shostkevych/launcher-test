FROM node:20-alpine

WORKDIR /app

# Copy server package.json
COPY package.json ./

RUN yarn install

# Copy server files
COPY server.js ./

# Copy built client files from the client container or build context
COPY ../client/dist ./client/dist

EXPOSE 3000

CMD ["yarn", "start"]
