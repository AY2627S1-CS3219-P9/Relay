FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/contracts/package.json ./packages/contracts/
COPY user-service/user-auth-jwt-verify/package.json ./user-service/user-auth-jwt-verify/
COPY user-service/auth/package.json ./user-service/auth/
RUN npm ci
COPY packages/contracts ./packages/contracts
COPY user-service/user-auth-jwt-verify ./user-service/user-auth-jwt-verify
COPY user-service/auth ./user-service/auth
RUN npm run build --workspace @relay/user-auth-jwt-verify
RUN npm run build --workspace @relay/user-auth-backend
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/contracts ./packages/contracts
COPY --from=build /app/user-service/user-auth-jwt-verify ./user-service/user-auth-jwt-verify
COPY --from=build /app/user-service/auth/package.json ./user-service/auth/
COPY --from=build /app/user-service/auth/dist ./user-service/auth/dist
EXPOSE 3000
CMD ["node", "user-service/auth/dist/server.js"]
