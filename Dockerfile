# ==========================================
# STAGE 1: Build the NestJS Application
# ==========================================
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package descriptors first to leverage Docker layer caching
COPY package*.json ./

# Install all dependencies (including devDependencies required for nest build)
RUN npm install

# Copy application source code
COPY . .

# Compile TypeScript into JavaScript (creates /app/dist)
RUN npm run build

# Prune devDependencies to keep only production libraries
RUN npm prune --production

# ==========================================
# STAGE 2: Lightweight Production Runtime
# ==========================================
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Create uploads directory and ensure node user ownership
RUN mkdir -p /app/uploads && chown -R node:node /app/uploads

# Copy only production dependencies from builder stage
COPY --from=builder /app/node_modules ./node_modules

# Copy compiled JavaScript build from builder stage
COPY --from=builder /app/dist ./dist

# Copy uploads from builder stage so default category assets are always present
COPY --chown=node:node --from=builder /app/uploads ./uploads

# Copy package.json for application metadata
COPY package*.json ./

USER node

# Document port (can be overridden by PORT env variable)
EXPOSE 4022

# Start the NestJS backend
CMD ["node", "dist/main.js"]
