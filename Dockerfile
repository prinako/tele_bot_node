FROM node as builder

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