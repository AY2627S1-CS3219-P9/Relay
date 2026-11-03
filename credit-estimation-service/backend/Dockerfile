FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/contracts/package.json ./packages/contracts/
COPY credit-estimation-service/backend/package.json ./credit-estimation-service/backend/
RUN npm install
COPY packages/contracts ./packages/contracts
COPY credit-estimation-service/backend ./credit-estimation-service/backend
RUN npm run build --workspace @relay/credit-estimation-backend

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/contracts ./packages/contracts
COPY --from=build /app/credit-estimation-service/backend/package.json ./credit-estimation-service/backend/
COPY --from=build /app/credit-estimation-service/backend/node_modules ./credit-estimation-service/backend/node_modules
COPY --from=build /app/credit-estimation-service/backend/dist ./credit-estimation-service/backend/dist
COPY --from=build /app/credit-estimation-service/backend/src ./credit-estimation-service/backend/src
COPY --from=build /app/credit-estimation-service/backend/vitest.config.ts ./credit-estimation-service/backend/vitest.config.ts
COPY --from=build /app/credit-estimation-service/backend/tests ./credit-estimation-service/backend/tests
COPY --from=build /app/credit-estimation-service/backend/.env.test ./credit-estimation-service/backend/.env.test

EXPOSE 3005
CMD ["sh", "-c", "npx tsx credit-estimation-service/backend/dist/app.js"]
