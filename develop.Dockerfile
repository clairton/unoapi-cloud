FROM node:18

# RUN apk --update --no-cache add git

WORKDIR /app
ENV NODE_ENV development

COPY . .
RUN npm run build

ENTRYPOINT npm run dev
