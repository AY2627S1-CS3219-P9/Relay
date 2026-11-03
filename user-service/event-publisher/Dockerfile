FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/contracts/package.json ./packages/contracts/
COPY packages/user-auth-backend-middleware/package.json ./packages/user-auth-backend-middleware/
COPY packages/user-prisma/package.json ./packages/user-prisma/
COPY user-service/backend/package.json ./user-service/backend/
RUN npm ci
COPY packages/contracts ./packages/contracts
COPY packages/user-prisma ./packages/user-prisma
COPY user-service/backend ./user-service/backend
COPY user-service/event-publisher ./user-service/event-publisher
RUN npx prisma generate --schema=user-service/backend/prisma/schema.prisma
CMD ["npx", "tsx", "user-service/event-publisher/main.ts"]
