FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/contracts/package.json ./packages/contracts/
COPY user-service/packages/backend-auth-middleware/package.json ./user-service/packages/backend-auth-middleware/
COPY supplier-service/backend/package.json ./supplier-service/backend/
RUN npm ci
COPY packages/contracts ./packages/contracts
COPY user-service/packages/backend-auth-middleware ./user-service/packages/backend-auth-middleware
COPY supplier-service/backend ./supplier-service/backend
RUN npm run build --workspace=@relay/backend-auth-middleware
RUN npm run build --workspace=@relay/supplier-backend
FROM node:22-alpine
RUN apk add --no-cache wget
WORKDIR /app
COPY --from=build /app/supplier-service/backend/dist ./dist
COPY --from=build /app/supplier-service/backend/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/user-service/packages/backend-auth-middleware ./user-service/packages/backend-auth-middleware
EXPOSE 3000
CMD ["node", "dist/app.js"]
