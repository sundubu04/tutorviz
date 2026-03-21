# Build stage
FROM node:20-alpine AS build

WORKDIR /app/frontend

ARG REACT_APP_API_BASE=/api
ENV REACT_APP_API_BASE=$REACT_APP_API_BASE

# Copy package files
COPY frontend/package*.json ./

# Install dependencies (using npm install instead of npm ci for better compatibility)
RUN npm install --production=false

# Copy source code
COPY frontend/ ./

# Build the app
RUN CI=false npm run build

# Production stage
FROM nginx:alpine

# Copy built app to nginx
COPY --from=build /app/frontend/build /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
