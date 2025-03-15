FROM node as builder

LABEL maintainer="mail@prinako.online"
LABEL version="1.0"
LABEL org.opencontainers.image.source=https://github.com/prinako/tele_bot_node
LABEL org.opencontainers.image.description="Dockerfile for tele_bot_node"
LABEL org.opencontainers.image.licenses=MIT


WORKDIR /app

COPY src ./src
COPY package.json .
COPY package-lock.json .

RUN npm install --production 

FROM node:22-alpine3.19

WORKDIR /app

COPY --from=builder /app .

RUN mkdir -p /app/src/allowed_users

# VOLUME ['./app/src/allowed_users']

ENTRYPOINT ["node" ,"./src/server.js"]