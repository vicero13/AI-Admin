#!/bin/sh
# Запускаем оба сервера параллельно

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
