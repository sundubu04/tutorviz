FROM node:20-bullseye AS deps
RUN apt-get update && apt-get install -y curl ca-certificates gnupg && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
ENV NODE_ENV=production
RUN npm run build || true

EXPOSE 5001
CMD ["node", "src/server.js"]
