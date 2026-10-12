# ----------------------------------------------------
# Stage 1: Build the frontend SPA
# ----------------------------------------------------
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency definitions
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# Copy source code and config
COPY . .

# Build Vite frontend assets into dist/
RUN npm run build

# ----------------------------------------------------
# Stage 2: Production runtime image
# ----------------------------------------------------
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy dependency manifests
COPY package*.json ./

# Install only production dependencies
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi

# Copy built frontend assets from builder stage
COPY --from=builder /app/dist ./dist

# Copy backend code, server entry, and fallback mock data
COPY backend ./backend
COPY src/api/mockData.js ./src/api/mockData.js
COPY server.ts ./server.ts

# Ensure uploads directory exists
RUN mkdir -p backend/uploads

# Expose web application port
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

# Start the full-stack server
CMD ["npm", "start"]
