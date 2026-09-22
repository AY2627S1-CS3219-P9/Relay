FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/ui/package.json packages/ui/package.json
COPY host/package.json host/package.json
COPY supplier-service/frontend/package.json supplier-service/frontend/package.json
COPY user-service/frontend/package.json user-service/frontend/package.json
COPY user-service/backend/package.json user-service/backend/package.json
COPY order-service/frontend/package.json order-service/frontend/package.json
COPY credit-service/frontend/package.json credit-service/frontend/package.json

RUN npm ci

COPY packages/contracts packages/contracts
COPY user-service/backend user-service/backend

RUN npx prisma generate --schema=user-service/backend/prisma/schema.prisma
RUN npm run build --workspace @relay/user-backend

FROM node:22-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/contracts ./packages/contracts
COPY --from=build /app/user-service/backend/package.json user-service/backend/package.json
COPY --from=build /app/user-service/backend/dist user-service/backend/dist
COPY --from=build /app/user-service/backend/prisma user-service/backend/prisma

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy --schema=user-service/backend/prisma/schema.prisma && node user-service/backend/dist/server.js"]
