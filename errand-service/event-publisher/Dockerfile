FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/contracts/package.json ./packages/contracts/
COPY packages/user-auth-backend-middleware/package.json ./packages/user-auth-backend-middleware/
COPY packages/errand-prisma/package.json ./packages/errand-prisma/
COPY errand-service/backend/package.json ./errand-service/backend/
RUN npm ci
COPY packages/contracts ./packages/contracts
COPY packages/errand-prisma ./packages/errand-prisma
COPY errand-service/backend ./errand-service/backend
COPY errand-service/event-publisher ./errand-service/event-publisher
RUN npx prisma generate --schema=errand-service/backend/prisma/schema.prisma
CMD ["npx", "tsx", "errand-service/event-publisher/main.ts"]
