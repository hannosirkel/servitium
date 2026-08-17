FROM node:26.7.0-bookworm-slim@sha256:cd565714d4da3e84bfd341e31448f81d47c6362198f152345297c9c1154e6341

WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html chess-clock.html mtg.html ludus.html tsconfig.json vite.config.ts vite.chess.config.ts vite.mtg.config.ts vite.ludus.config.ts ./
COPY public ./public
COPY src/dice ./src/dice
COPY src/chess-clock ./src/chess-clock
COPY src/mtg ./src/mtg
COPY src/ludus ./src/ludus
COPY src/shared ./src/shared
RUN npm run build

FROM node:26.7.0-bookworm-slim@sha256:cd565714d4da3e84bfd341e31448f81d47c6362198f152345297c9c1154e6341

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8099

WORKDIR /app
COPY --chown=10001:10001 package.json ./
COPY --chown=10001:10001 src ./src
COPY --from=0 --chown=10001:10001 /build/dist ./dist
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx

USER 10001:10001
EXPOSE 8099

CMD ["node", "src/server.js"]
