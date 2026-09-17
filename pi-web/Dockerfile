FROM node:22-bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ ca-certificates curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN npm install @agegr/pi-web@latest \
    && chown -R node:node /app

USER node

ENV PATH=/app/node_modules/.bin:/usr/local/bin:/usr/bin:/bin
ENV NODE_ENV=production

COPY --chown=node:node entrypoint.sh /app/entrypoint.sh

EXPOSE 30141 9876

ENTRYPOINT ["/app/entrypoint.sh"]
CMD []
