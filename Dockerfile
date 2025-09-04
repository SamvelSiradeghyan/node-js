FROM node:20-alpine AS base
WORKDIR /app
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./
RUN npm ci || (echo "No lockfile, doing npm install" && npm install)
COPY tsconfig.json .eslintrc.js ./
COPY src ./src
COPY database ./database
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/dist ./dist
COPY --from=base /app/database ./database
COPY package.json ./package.json
EXPOSE 3000
CMD ["node", "dist/main.js"]
