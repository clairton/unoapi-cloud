FROM node:18-alpine

ARG NODE_ENV=production

RUN apk --update --no-cache add git

WORKDIR /app

ADD ./src ./src
ADD ./package.json ./package.json
ADD ./tsconfig.json ./tsconfig.json
ADD ./yarn.lock ./yarn.lock

RUN yarn
RUN yarn build

RUN if [ "$NODE_ENV" = "production" ]; then apk del git;fi

ENTRYPOINT yarn start
