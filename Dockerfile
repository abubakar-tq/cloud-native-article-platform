FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeuser -G nodejs -u 1001

RUN npm ci

COPY --chown=nodeuser:nodejs . .

USER nodeuser


EXPOSE 3000


HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

CMD ["node","server.js"]





