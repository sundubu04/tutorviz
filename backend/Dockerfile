FROM node:20-alpine

WORKDIR /app

# Tectonic for POST /api/latex/compile (official musl builds: amd64 + arm64)
ARG TECTONIC_VERSION=0.15.0
RUN apk add --no-cache ca-certificates curl \
  && ARCH="$(uname -m)" \
  && case "$ARCH" in \
       x86_64) TECTONIC_TARGET=x86_64-unknown-linux-musl ;; \
       aarch64) TECTONIC_TARGET=aarch64-unknown-linux-musl ;; \
       *) echo "unsupported arch: $ARCH"; exit 1 ;; \
     esac \
  && curl -fsSL -o /tmp/tectonic.tar.gz \
       "https://github.com/tectonic-typesetting/tectonic/releases/download/tectonic@${TECTONIC_VERSION}/tectonic-${TECTONIC_VERSION}-${TECTONIC_TARGET}.tar.gz" \
  && tar -xzf /tmp/tectonic.tar.gz -C /usr/local/bin \
  && chmod +x /usr/local/bin/tectonic \
  && rm /tmp/tectonic.tar.gz \
  && tectonic --version

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