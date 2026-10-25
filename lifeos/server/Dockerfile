FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY . .
ENV NODE_ENV=production
CMD ["node", "src/index.js"]
