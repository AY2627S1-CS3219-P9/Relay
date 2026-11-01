FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/contracts/package.json ./packages/contracts/
COPY packages/user-auth-backend-middleware/package.json ./packages/user-auth-backend-middleware/
COPY supplier-service/backend/package.json ./supplier-service/backend/
RUN npm ci
COPY packages/contracts ./packages/contracts
COPY packages/user-auth-backend-middleware ./packages/user-auth-backend-middleware
COPY supplier-service/backend ./supplier-service/backend
RUN npm run build --workspace=@relay/user-auth-backend-middleware
RUN npm run build --workspace=@relay/supplier-backend
FROM node:22-alpine
RUN apk add --no-cache wget \
    && wget -qO /etc/ssl/certs/rds-global-bundle.pem https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem
WORKDIR /app
COPY --from=build /app/supplier-service/backend/dist ./dist
COPY --from=build /app/supplier-service/backend/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/user-auth-backend-middleware ./packages/user-auth-backend-middleware
EXPOSE 3000
CMD ["node", "dist/app.js"]
