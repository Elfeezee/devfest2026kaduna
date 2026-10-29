FROM node:22-alpine

WORKDIR /app

# Copy root and package files
COPY package.json ./
COPY server/package.json ./server/
COPY client/package.json ./client/

# Install dependencies
RUN npm install
RUN cd server && npm install
RUN cd client && npm install

# Copy source code
COPY server ./server
COPY client ./client

# Build client for production
RUN cd client && npm run build

# Expose port
ENV PORT=4000
EXPOSE 4000

# Start server
CMD ["node", "server/server.js"]
