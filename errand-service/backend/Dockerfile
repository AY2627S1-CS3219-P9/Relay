FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/contracts/package.json ./packages/contracts/
COPY errand-service/backend/package.json ./errand-service/backend/

RUN npm ci

COPY packages/contracts ./packages/contracts
COPY errand-service/backend ./errand-service/backend

RUN npx prisma generate --schema=errand-service/backend/prisma/schema.prisma
RUN npm run build --workspace @relay/errand-backend

FROM node:22-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/contracts ./packages/contracts
COPY --from=build /app/errand-service/backend/package.json ./errand-service/backend/
COPY --from=build /app/errand-service/backend/dist ./errand-service/backend/dist
COPY --from=build /app/errand-service/backend/prisma ./errand-service/backend/prisma

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy --schema=errand-service/backend/prisma/schema.prisma && node errand-service/backend/dist/server.js"]
