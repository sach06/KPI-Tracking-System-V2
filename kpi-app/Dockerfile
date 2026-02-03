# Build Stage
FROM node:20-alpine AS build

# Update OS packages to fix vulnerabilities
RUN apk update && apk upgrade --no-cache

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Build the app definition
RUN npm run build

# Serve Stage
FROM nginx:alpine

# Update OS packages to fix vulnerabilities
RUN apk update && apk upgrade --no-cache

# Copy built assets from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom Nginx config for SPA support
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
