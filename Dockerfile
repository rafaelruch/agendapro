# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy all source files (exceto node_modules via .dockerignore)
COPY . .

# Build frontend and backend
# Vite build gera dist/public/, esbuild gera dist/index.js
RUN npm run build

# Verificar se o build funcionou
RUN ls -la dist/ && echo "✅ Build completed successfully"

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production AND dev dependencies (drizzle-kit, tsx, vite needed for runtime)
RUN npm ci

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Copy necessary runtime files
COPY drizzle.config.ts ./
COPY shared ./shared
COPY server ./server
COPY client ./client
COPY vite.config.ts ./
COPY tsconfig.json ./
COPY tailwind.config.ts ./
COPY postcss.config.js ./

# Copy public assets if they exist
COPY public ./public 2>/dev/null || true

# Copy attached assets (podem ser referenciados pelo frontend)
COPY attached_assets ./attached_assets 2>/dev/null || true

# Copy startup script
COPY start.sh ./
RUN chmod +x start.sh

# Expose port
EXPOSE 5000

# Set environment to production
ENV NODE_ENV=production

# Start application (migrations run automatically in start.sh)
CMD ["sh", "start.sh"]
