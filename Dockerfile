# ============================================================================
# SHOPMATE AI & PAYPAL AEGIS — MULTI-STAGE PRODUCTION DOCKERFILE
# Builds React frontend with Vite and Node.js Express backend with TypeScript
# ============================================================================

# Stage 1: Build Frontend Client
FROM node:20-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
COPY shared/ /app/shared/
RUN npm run build

# Stage 2: Build Backend Server
FROM node:20-alpine AS server-builder
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci
COPY server/ ./
COPY shared/ /app/shared/
RUN npm run build

# Stage 3: Production Runtime Environment
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5000

# Install production server dependencies only
COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev

# Copy compiled backend dist
COPY --from=server-builder /app/server/dist ./server/dist

# Copy compiled frontend assets for unified single-port serving
COPY --from=client-builder /app/client/dist ./client/dist

# Expose default HTTP application port
EXPOSE 5000

# Start server
CMD ["node", "server/dist/server/src/index.js"]
