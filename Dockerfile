FROM node:20-slim AS base
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
COPY client/package.json client/
COPY server/package.json server/
COPY shared/package.json shared/
RUN npm ci

# Copy source
COPY shared/ shared/
COPY client/ client/
COPY server/ server/

# Build client
RUN npm run build -w client

# Production image
FROM node:20-slim
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY --from=base /app/package.json /app/package-lock.json ./
COPY --from=base /app/shared/ shared/
COPY --from=base /app/server/ server/
COPY --from=base /app/client/dist/ client/dist/
COPY --from=base /app/node_modules/ node_modules/

# Create uploads directory
RUN mkdir -p uploads

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["npx", "tsx", "server/src/index.ts"]
