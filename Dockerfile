# ============================================================
# Multi-stage build
# Stage 1: builder — собираем всё
# Stage 2: runner  — только то что нужно для запуска
# ============================================================

FROM node:20-alpine AS builder

# Системные зависимости (ffmpeg для конвертации видео)
RUN apk add --no-cache ffmpeg python3 make g++

WORKDIR /app

# --- Root зависимости (ffmpeg-static и др.) ---
COPY package*.json ./
RUN npm install

# --- Main Bot Server ---
COPY src/package*.json ./src/
RUN cd src && npm install
COPY src/ ./src/
RUN cd src && npm run build

# --- Admin Panel Frontend ---
COPY admin-panel/package*.json ./admin-panel/
RUN cd admin-panel && npm install
COPY admin-panel/ ./admin-panel/
RUN cd admin-panel && npm run build

# --- Копируем фронтенд в Main Server ---
RUN mkdir -p src/src/admin/ui/dist && \
    cp -r admin-panel/dist/* src/src/admin/ui/dist/

# --- Admin Panel Server ---
COPY admin-panel/server/package*.json ./admin-panel/server/
RUN cd admin-panel/server && npm install
COPY admin-panel/server/ ./admin-panel/server/
RUN cd admin-panel/server && npm run build

# ============================================================
# Stage 2: runner — финальный образ (без dev-зависимостей)
# ============================================================

FROM node:20-alpine AS runner

RUN apk add --no-cache ffmpeg

WORKDIR /app

# Копируем только prod-зависимости и собранный код
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules

COPY --from=builder /app/src/dist ./src/dist
COPY --from=builder /app/src/config ./src/config
COPY --from=builder /app/src/src/admin/ui/dist ./src/src/admin/ui/dist
COPY --from=builder /app/src/package*.json ./src/
COPY --from=builder /app/src/node_modules ./src/node_modules

COPY --from=builder /app/admin-panel/server/dist ./admin-panel/server/dist
COPY --from=builder /app/admin-panel/server/package*.json ./admin-panel/server/
COPY --from=builder /app/admin-panel/server/node_modules ./admin-panel/server/node_modules

# Папки для volumes (создаём заранее)
RUN mkdir -p /app/knowledge-base /app/media /app/logs

# Expose оба порта
EXPOSE 3000 4000

# Запускаем оба сервера через простой shell-скрипт
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

CMD ["./docker-entrypoint.sh"]
