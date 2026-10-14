FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/contracts/package.json ./packages/contracts/
COPY credit-service/backend/package.json ./credit-service/backend/
RUN npm ci
COPY packages/contracts ./packages/contracts
COPY credit-service/backend ./credit-service/backend
RUN npx prisma generate --schema=credit-service/backend/prisma/schema.prisma
RUN npm run build --workspace @relay/credit-backend

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/contracts ./packages/contracts
COPY --from=build /app/credit-service/backend/package.json ./credit-service/backend/
COPY --from=build /app/credit-service/backend/dist ./credit-service/backend/dist
COPY --from=build /app/credit-service/backend/prisma ./credit-service/backend/prisma
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy --schema=credit-service/backend/prisma/schema.prisma && node credit-service/backend/dist/server.js"]
