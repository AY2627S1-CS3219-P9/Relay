FROM node:24-alpine AS build
WORKDIR /app
COPY . .
RUN npm ci
RUN npm run build --workspace=@relay/host

FROM nginx:alpine
COPY --from=build /app/host/dist /usr/share/nginx/html
COPY host/config/nginx.conf /etc/nginx/conf.d/default.conf
