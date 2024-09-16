FROM node as builder

WORKDIR /app

COPY . .

RUN npm install --production 

FROM node:22-alpine3.19

WORKDIR /app

COPY --from=builder /app .

RUN mkdir -p /app/src/allowed_users

# VOLUME ['./app/src/allowed_users']

CMD ["node" ,"./src/server.js"]