FROM node:18-alpine

RUN apk --update --no-cache add git
RUN wget -O /bin/wait-for https://raw.githubusercontent.com/eficode/wait-for/v2.2.3/wait-for
RUN chmod +x /bin/wait-for

WORKDIR /app

ADD ./src ./src
ADD ./package.json ./package.json
ADD ./tsconfig.json ./tsconfig.json
ADD ./yarn.lock ./yarn.lock

RUN yarn
