# Stage 1: Build the React Application
FROM node:20-alpine AS build

WORKDIR /app

# Copy package configuration files and install dependencies
COPY package*.json ./
RUN npm install

# Copy frontend source code and compile
COPY . .

# Force the VITE_API_URL to point to Nginx's proxy endpoint
ENV VITE_API_URL=/api

RUN npm run build

# Stage 2: Serve the compiled build output via Nginx
FROM nginx:alpine

# Copy compiled dist from build stage to Nginx default document root
COPY --from=build /app/dist /usr/share/nginx/html

# Copy the custom Nginx config for client-side routing and proxying
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
