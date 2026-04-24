FROM node:20-alpine

RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app

# Copy workspace manifests first for layer caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/server/package.json ./packages/server/
COPY packages/client/package.json ./packages/client/

RUN pnpm install --frozen-lockfile

# Copy source and level data
COPY packages/shared/src ./packages/shared/src
COPY packages/shared/tsconfig.json ./packages/shared/
COPY packages/server/src ./packages/server/src
COPY packages/server/tsconfig.json ./packages/server/
COPY packages/client/src ./packages/client/src
COPY packages/client/index.html ./packages/client/
COPY packages/client/tsconfig.json ./packages/client/
COPY packages/client/vite.config.ts ./packages/client/
COPY levels ./levels
COPY tsconfig.json ./

# Build shared -> server -> client
RUN pnpm run build

EXPOSE 2567
CMD ["node", "packages/server/dist/index.js"]
