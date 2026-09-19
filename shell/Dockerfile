FROM node:24-alpine AS build
WORKDIR /app
COPY . .
RUN npm ci
RUN npm run build --workspace=@relay/host

FROM nginx:alpine
COPY --from=build /app/shell/dist /usr/share/nginx/html
COPY shell/nginx.conf /etc/nginx/conf.d/default.conf
