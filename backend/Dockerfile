FROM node:26.13-bookworm-slim

LABEL maintainer="mail@prinako.online"
LABEL version="3.2.1"
LABEL org.opencontainers.image.source=https://github.com/prinako/tele_bot_node
LABEL org.opencontainers.image.description="Dockerfile for tele_bot_node"
LABEL org.opencontainers.image.title="tele_bot_node"
LABEL org.opencontainers.image.authors="mail@prinako.online"
LABEL org.opencontainers.image.vendor="Prinako"
LABEL org.opencontainers.image.version="3.2.1"
LABEL org.opencontainers.image.documentation="https://github.com/prinako/tele_bot_node"
LABEL org.opencontainers.image.licenses="MIT"

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
