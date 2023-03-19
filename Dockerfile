FROM node:19-bullseye-slim

RUN apt-get update && apt-get install -y --no-install-recommends dumb-init

ENV NODE_ENV production

ENV PROD_DB_HOST host.docker.internal

WORKDIR /usr/hrportal

COPY --chown=node:node package.json .

RUN npm i --omit=dev

COPY . .

USER node

CMD ["dumb-init", "node", "bin/www"]