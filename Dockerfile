FROM node as builder

WORKDIR /app

COPY . .

RUN npm install --production 

FROM node:22-alpine3.19

WORKDIR /app

COPY --from=builder /app .

CMD ["node","--env-file=./sr/.env" ,"./ssrc/server.js"]