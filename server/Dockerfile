FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies using yarn
RUN yarn install --frozen-lockfile

# Copy server code
COPY server.js ./
COPY views ./views

# Expose port
EXPOSE 3000

# Start the server
CMD ["node", "server.js"]
