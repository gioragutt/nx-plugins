# TODO:
# When docker-compose will support mounting secrets, replace yarn calls to:
# RUN --mount=type=secret,mode=0644,id=npmrc,target=/usr/src/app/.npmrc yarn

# --------------> The bundle image
FROM node:lts AS bundle

ARG APP_NAME

WORKDIR /usr/src/app
COPY ./ /usr/src/app/
RUN yarn --frozen-lockfile
RUN yarn nx build ${APP_NAME} --configuration=production

# --------------> The build image
FROM node:lts AS build

ARG APP_NAME

WORKDIR /usr/src/app
COPY yarn.lock .npmrc /usr/src/app
COPY --from=bundle /usr/src/app/dist/apps/${APP_NAME} /usr/src/app/
RUN yarn --frozen-lockfile

# --------------> The production image
FROM node:lts-alpine

RUN apk add dumb-init
ENV NODE_ENV production
USER node
WORKDIR /usr/src/app
COPY --chown=node:node --from=build /usr/src/app /usr/src/app
CMD ["dumb-init", "node", "."]
