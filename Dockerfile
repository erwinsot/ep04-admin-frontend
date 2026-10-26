FROM node:20-alpine AS base

WORKDIR /app

FROM base AS deps
COPY package*.json ./
RUN npm ci

FROM deps AS build
ARG VITE_API_BASE=
ARG VITE_ADMIN_ROLE=admin
ARG VITE_ACTOR=admin-ui
ENV VITE_API_BASE=$VITE_API_BASE
ENV VITE_ADMIN_ROLE=$VITE_ADMIN_ROLE
ENV VITE_ACTOR=$VITE_ACTOR
COPY . .
RUN npm run build

FROM deps AS dev
COPY . .
EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]

FROM nginx:1.27-alpine AS production
ENV API_UPSTREAM=http://backend:8080
ENV COGNITO_DOMAIN="" \
    COGNITO_CLIENT_ID="" \
    COGNITO_REDIRECT_URI="" \
    COGNITO_LOGOUT_URI="" \
    COGNITO_SCOPES="openid email profile" \
    LOCAL_LOGIN="false"
COPY docker/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1
CMD ["nginx", "-g", "daemon off;"]
