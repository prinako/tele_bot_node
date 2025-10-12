FROM node:24-bookworm-slim AS builder


LABEL maintainer="mail@prinako.online"
LABEL version="1.0.2"
LABEL org.opencontainers.image.source=https://github.com/prinako/tele_bot_node
LABEL org.opencontainers.image.description="Dockerfile for tele_bot_node"
LABEL org.opencontainers.image.title="tele_bot_node"
LABEL org.opencontainers.image.authors="mail@prinako.online"
LABEL org.opencontainers.image.vendor="Prinako"
LABEL org.opencontainers.image.version="1.0.2"
LABEL org.opencontainers.image.documentation="https://github.com/prinako/tele_bot_node"
LABEL org.opencontainers.image.licenses="MIT"
LABEL org.opencontainers.image.value="latest"
LABEL org.opencontainers.image.ref.name="ghcr.io/prinako/tele_bot_node:latest"


WORKDIR /app

COPY src ./src
COPY package.json .
COPY package-lock.json .

ENV NODE_ENV=production
RUN npm ci --omit=dev

FROM node:24-bookworm-slim

WORKDIR /app

COPY --from=builder --chown=node:node /app .

RUN mkdir -p /app/src/allowed_users \
  && chown -R node:node /app

USER node

RUN mkdir -p /app/src/allowed_users

# VOLUME ['./app/src/allowed_users']

ENTRYPOINT ["node" ,"./src/server.js"]