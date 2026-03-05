# ---------------------------------------
# Stage 1: Build Stage
# ---------------------------------------
FROM node:22-alpine AS builder

# Set the working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies (including devDependencies needed for build)
RUN npm install

# Copy the rest of the application code
COPY . .

# Generate Prisma client and build TypeScript
RUN npm run build

# ---------------------------------------
# Stage 2: Production Stage
# ---------------------------------------
FROM node:22-alpine

# Set the working directory
WORKDIR /app

# Set Node environment to production
ENV NODE_ENV=production

# Copy package files and prisma schema
COPY package*.json ./
COPY prisma ./prisma/

# Install only production dependencies
RUN npm install --omit=dev

# Copy generated Prisma client from builder stage
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy the built application from builder stage
COPY --from=builder /app/dist ./dist

# Expose the API port (defaulting to 8000, but can be overridden)
EXPOSE 8000

# Start server
CMD ["npm", "start"]
