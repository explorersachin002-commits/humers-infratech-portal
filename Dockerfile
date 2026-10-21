# Production Multi-Stage Dockerfile for Humers Infratech Portal
FROM node:22-alpine AS base

# Install curl for healthcheck
RUN apk add --no-cache curl

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000

# Copy package manifests
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev && npm cache clean --force

# Copy application source
COPY server.js database.js ./
COPY public/ ./public/
COPY data/ ./data/
COPY uploads/ ./uploads/

# Ensure directories have proper permissions
RUN mkdir -p /app/data /app/uploads && \
    chown -R node:node /app

# Run container as unprivileged user for security
USER node

# Declare persistent data & uploads volumes
VOLUME ["/app/data", "/app/uploads"]

EXPOSE 3000

# Container healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]
