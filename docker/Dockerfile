FROM node:18-alpine

WORKDIR /app

# Установить зависимости
COPY src/package*.json ./
RUN npm ci --only=production

# Скопировать код
COPY src/ ./
COPY config/ ./config/
COPY knowledge-base/ ./knowledge-base/

# Собрать TypeScript
RUN npm run build

# Порт
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Запустить
CMD ["npm", "start"]
