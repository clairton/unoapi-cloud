FROM node:18-alpine

RUN apk --update --no-cache add git

WORKDIR /app

ADD ./package.json ./package.json
ADD ./yarn.lock ./yarn.lock
RUN yarn

ADD ./tsconfig.json ./tsconfig.json
ADD ./src ./src
RUN yarn build

ENTRYPOINT yarn dev
