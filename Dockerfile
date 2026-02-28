# Use Node.js 18 alpine for a small, secure base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install production dependencies only
# Note: we omit devDependencies like electron for the container version
RUN npm ci --only=production

# Copy source code and necessary directories
COPY services ./services
COPY server.js ./
COPY main.js ./
COPY .env.example ./.env

# Create necessary directories
RUN mkdir -p logs storage uploads

# Expose the API port
EXPOSE 3001

# Environmental defaults (can be overridden by docker-compose)
ENV NODE_ENV=production
ENV AGENT_PORT=3001
ENV STORAGE_PATH=/app/storage

# Health check to ensure the service is responsive
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/agent/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

# Start the application
CMD ["node", "server.js"]
