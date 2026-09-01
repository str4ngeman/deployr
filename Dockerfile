FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json* ./
RUN apk add --no-cache python3 make g++ \
  && npm ci
COPY . .
RUN npm run build

FROM node:20-alpine

WORKDIR /app
COPY package.json package-lock.json* ./
RUN apk add --no-cache python3 make g++ \
  && npm ci --omit=dev \
  && apk del python3 make g++
COPY --from=builder /app/dist ./dist

ENV PORT=4199
ENV FILE_ROOT=/opt
ENV DATA_DIR=/app/data
ENV NODE_ENV=production

RUN mkdir -p /app/data

EXPOSE 4199

CMD ["node", "dist/server/index.js"]
