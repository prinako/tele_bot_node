FROM node:26-bookworm-slim

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

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

CMD ["npm", "start"]
