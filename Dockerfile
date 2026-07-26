FROM node:24.18.0-bookworm-slim@sha256:6f7b03f7c2c8e2e784dcf9295400527b9b1270fd37b7e9a7285cf83b6951452d

WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html chess-clock.html mtg.html tsconfig.json vite.config.ts vite.chess.config.ts vite.mtg.config.ts ./
COPY public ./public
COPY src/dice ./src/dice
COPY src/chess-clock ./src/chess-clock
COPY src/mtg ./src/mtg
COPY src/shared ./src/shared
RUN npm run build

FROM node:24.18.0-bookworm-slim@sha256:6f7b03f7c2c8e2e784dcf9295400527b9b1270fd37b7e9a7285cf83b6951452d

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8099

WORKDIR /app
COPY --chown=10001:10001 package.json ./
COPY --chown=10001:10001 src ./src
COPY --from=0 --chown=10001:10001 /build/dist ./dist

USER 10001:10001
EXPOSE 8099

CMD ["node", "src/server.js"]
