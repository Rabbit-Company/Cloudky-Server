FROM oven/bun:1-alpine

USER bun
WORKDIR /usr/src/app

COPY --chown=bun:bun package.json .npmrc ./
COPY --chown=bun:bun server/ ./server/

RUN mkdir -p ./data/

RUN bun i

EXPOSE 8085
EXPOSE 8086
ENTRYPOINT [ "bun", "run", "start" ]