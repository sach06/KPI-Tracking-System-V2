FROM node:20-alpine

# Update OS packages and global npm to fix vulnerabilities
RUN apk update && apk upgrade --no-cache && npm install -g npm@latest

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files from the subfolder
COPY kpi-app-backend/package*.json ./

RUN npm install

# Copy everything else from the subfolder
COPY kpi-app-backend/ ./

EXPOSE 3001

CMD ["node", "server.js"]
