FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/contracts/package.json ./packages/contracts/
COPY user-service/packages/backend-auth-middleware/package.json ./user-service/packages/backend-auth-middleware/
COPY user-service/auth/package.json ./user-service/auth/
RUN npm ci
COPY packages/contracts ./packages/contracts
COPY user-service/packages/backend-auth-middleware ./user-service/packages/backend-auth-middleware
COPY user-service/auth ./user-service/auth
RUN npm run build --workspace @relay/backend-auth-middleware
RUN npm run build --workspace @relay/user-auth-backend
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/contracts ./packages/contracts
COPY --from=build /app/user-service/packages/backend-auth-middleware ./user-service/packages/backend-auth-middleware
COPY --from=build /app/user-service/auth/package.json ./user-service/auth/
COPY --from=build /app/user-service/auth/dist ./user-service/auth/dist
EXPOSE 3000
CMD ["node", "user-service/auth/dist/server.js"]
