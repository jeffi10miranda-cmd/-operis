FROM node:20-alpine AS builder
WORKDIR /app

RUN apk add --no-cache openssl

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

RUN apk add --no-cache openssl

RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 operis

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist         ./dist
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma       ./prisma

RUN mkdir -p logs && chown -R operis:nodejs logs

USER operis

EXPOSE 3003

CMD ["sh", "-c", "npm run setup && node dist/server.js"]
