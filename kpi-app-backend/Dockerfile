FROM node:18-alpine

# Install build dependencies for native modules (if any needed)
# python3, make, g++ are often needed for node-gyp
RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./

# Try to install dependencies. If msnodesqlv8 fails (Windows only), we ignore it 
# by using --no-optional if it was optional, but it is in 'dependencies'.
# Attempt standard install, it might skip incompatible platforms automatically.
RUN npm install

COPY . .

EXPOSE 3001

CMD ["node", "server.js"]
