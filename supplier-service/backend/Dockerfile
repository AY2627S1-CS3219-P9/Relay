FROM node:22-alpine AS build

WORKDIR /app
COPY . .

# Install all dependencies using root package-lock.json
RUN npm ci

# Build backend
RUN npm run build --workspace=@relay/supplier-backend

FROM node:22-alpine

RUN apk add --no-cache wget

WORKDIR /app

# Copy built backend
COPY --from=build /app/dist/backend ./dist/backend
COPY --from=build /app/supplier-service/backend/package*.json ./
COPY --from=build /app/node_modules ./node_modules

EXPOSE 3000

CMD ["node", "dist/backend/app.js"]
