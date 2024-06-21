FROM node:alpine

RUN mkdir -p /usr/src/TON-demo-be && chown -R node:node /usr/src/TON-demo-be

WORKDIR /usr/src/TON-demo-be

COPY package.json package-lock.json ./

USER node

RUN npm ci

COPY --chown=node:node . .

# Use the default port if the environment variable is not set
ARG PORT=8000
EXPOSE $PORT

CMD ["npm", "run", "start"]