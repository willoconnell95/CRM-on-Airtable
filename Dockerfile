# Stage 1: Build frontend
FROM node:20-alpine AS frontend-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# Stage 2: Build and run server
FROM node:20-alpine AS production
WORKDIR /app

# Install server dependencies
COPY server/package*.json ./server/
RUN cd server && npm install --production

# Copy server source
COPY server/ ./server/

# Copy built frontend
COPY --from=frontend-build /app/client/dist ./client/dist

# Environment
ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

WORKDIR /app/server
CMD ["node", "--loader", "tsx", "src/index.ts"]
