FROM node:20-alpine

# Update OS packages and global npm
RUN apk update && apk upgrade --no-cache && npm install -g npm@latest

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files from the subfolder
COPY kpi-app-backend/package*.json ./

# Install dependencies and then remove npm/npx to eliminate bundled vulnerabilities
RUN npm install && \
    npm cache clean --force && \
    rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx

# Copy everything else from the subfolder
COPY kpi-app-backend/ ./

EXPOSE 3001

CMD ["node", "server.js"]
