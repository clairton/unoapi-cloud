FROM node/node:alpine

ARG NODE_ENV=production

WORKDIR /app

ADD ./src ./src
ADD ./package.json ./package.json
ADD ./yarn.lock ./yarn.lock

RUN yarn
RUN yarn build

ENTRYPOINT yarn start
