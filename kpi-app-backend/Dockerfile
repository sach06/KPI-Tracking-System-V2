FROM node:20-alpine

# Update OS packages to fix vulnerabilities
RUN apk update && apk upgrade --no-cache

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3001

CMD ["node", "server.js"]
