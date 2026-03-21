FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# prisma generate only needs valid env placeholders (runtime uses real .env from compose)
ENV DATABASE_URL="postgresql://build:build@127.0.0.1:5432/build"
ENV DIRECT_URL="postgresql://build:build@127.0.0.1:5432/build"
RUN npx prisma generate

# Create uploads directory
RUN mkdir -p uploads

# Expose port 5001
EXPOSE 5001

# Start the application
CMD ["node", "src/server.js"]