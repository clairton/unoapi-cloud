FROM node:18-alpine

RUN apk --update --no-cache add git

WORKDIR /app

ADD ./src ./src
ADD ./package.json ./package.json
ADD ./tsconfig.json ./tsconfig.json
ADD ./yarn.lock ./yarn.lock

RUN yarn
RUN yarn build

ENTRYPOINT yarn start
