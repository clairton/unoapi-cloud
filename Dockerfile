FROM node:24-alpine AS builder

ENV NODE_ENV=development

RUN apk --update --no-cache add git

WORKDIR /app

ADD ./package.json ./package.json
ADD ./yarn.lock ./yarn.lock
RUN yarn

ADD ./src ./src
ADD ./public ./public
ADD ./tsconfig.json ./tsconfig.json
RUN yarn build

FROM node:24-alpine

LABEL \
  maintainer="Clairton Rodrigo Heinzen <clairton.rodrigo@gmail.com>" \
  org.opencontainers.image.title="Unoapi Cloud" \
  org.opencontainers.image.description="Unoapi Cloud" \
  org.opencontainers.image.authors="Clairton Rodrigo Heinzen <clairton.rodrigo@gmail.com>" \
  org.opencontainers.image.url="https://github.com/clairton/unoapi-cloud" \
  org.opencontainers.image.vendor="https://uno.ltd" \
  org.opencontainers.image.licenses="GPLv3"

ENV NODE_ENV=production
 
RUN addgroup -S u && adduser -S u -G u
WORKDIR /home/u/app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src ./src
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/yarn.lock ./yarn.lock


RUN apk --update --no-cache add git ffmpeg
RUN yarn
RUN apk del git

ENTRYPOINT yarn start
