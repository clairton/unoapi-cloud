FROM node:21-alpine AS builder

ENV NODE_ENV=development

RUN apk --update --no-cache add git

WORKDIR /app

ADD ./package.json ./package.json
ADD ./yarn.lock ./yarn.lock
RUN yarn

ADD ./src ./src
ADD ./tsconfig.json ./tsconfig.json
RUN yarn build

FROM node:21-alpine

LABEL \
  maintainer="Clairton Rodrigo Heinzen <clairton.rodrigo@gmail.com>" \
  org.opencontainers.image.title="Unoapi Cloud" \
  org.opencontainers.image.description="Unoapi Cloud" \
  org.opencontainers.image.authors="Clairton Rodrigo Heinzen <clairton.rodrigo@gmail.com>" \
  org.opencontainers.image.url="https://github.com/clairton/unoapi-cloud" \
  org.opencontainers.image.vendor="https://clairton.eti.br" \
  org.opencontainers.image.licenses="GPLv3"

ENV NODE_ENV=production
 
RUN addgroup -S u && adduser -S u -G u
WORKDIR /home/u/app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/yarn.lock ./yarn.lock


RUN apk --update --no-cache add git ffmpeg
RUN yarn
RUN echo '{"version": [2, 2413, 1]}' >> ./node_modules/@whiskeysockets/baileys/lib/Defaults/baileys-version.json
RUN apk del git

ENTRYPOINT yarn start
