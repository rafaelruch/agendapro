# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build frontend and backend
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy built files from builder (frontend está em dist/public/ e backend em dist/)
COPY --from=builder /app/dist ./dist

# Copy necessary files
COPY drizzle.config.ts ./
COPY shared ./shared
COPY server ./server

# Copy startup script
COPY start.sh ./
RUN chmod +x start.sh

# Expose port
EXPOSE 5000

# Set environment to production
ENV NODE_ENV=production

# Start application (migrations são rodadas automaticamente)
CMD ["sh", "start.sh"]
