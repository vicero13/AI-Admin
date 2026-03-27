#!/bin/sh
# ============================================================
# Docker Entrypoint: seed defaults + запуск обоих серверов
# ============================================================

# --- Seed knowledge-base from defaults if volume is empty ---
KB_DIR="/app/knowledge-base"
KB_DEFAULTS="/app/knowledge-base-defaults"

if [ -d "$KB_DEFAULTS" ]; then
  # Копируем каждый файл из defaults, если его нет в volume
  for src_file in $(find "$KB_DEFAULTS" -type f); do
    rel_path="${src_file#$KB_DEFAULTS/}"
    dest_file="$KB_DIR/$rel_path"
    if [ ! -f "$dest_file" ]; then
      dest_dir=$(dirname "$dest_file")
      mkdir -p "$dest_dir"
      cp "$src_file" "$dest_file"
      echo "[SEED] Copied default: $rel_path"
    fi
  done
  echo "[SEED] Knowledge base seeding complete."
fi

# --- Запускаем оба сервера параллельно ---
echo "[START] Запуск Admin Panel Server на порту 4000..."
node admin-panel/server/dist/index.js &
ADMIN_PID=$!

echo "[START] Запуск Main Bot Server на порту 3000..."
node src/dist/server.js &
MAIN_PID=$!

echo "[INFO] Main PID: $MAIN_PID, Admin PID: $ADMIN_PID"

# Если один из процессов упал — останавливаем контейнер целиком
wait -n
EXIT_CODE=$?
echo "[ERROR] Один из серверов упал (exit code: $EXIT_CODE), останавливаем контейнер..."
kill $MAIN_PID $ADMIN_PID 2>/dev/null
exit $EXIT_CODE
