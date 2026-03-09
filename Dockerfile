# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install all deps (including devDependencies for build)
RUN npm ci

# Copy source
COPY . .

# Build client + server
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install production deps + drizzle-kit + tsx for migrations
RUN npm ci --omit=dev && npm install drizzle-kit tsx

# Copy build output from builder
COPY --from=builder /app/dist ./dist

# Copy client/public for psychologist images (bot sends these)
COPY --from=builder /app/client/public ./client/public

# Copy schema and config for drizzle-kit migrations
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/drizzle.config.ts ./

ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

# Run db:push before start to ensure schema is applied (optional - can be run separately)
# CMD ["sh", "-c", "npx drizzle-kit push && node dist/index.cjs"]
CMD ["node", "dist/index.cjs"]
