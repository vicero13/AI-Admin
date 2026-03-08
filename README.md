# Docker-сборка основного проекта

## Файлы которые нужно положить в корень проекта

```
твой-проект/
├── Dockerfile
├── docker-compose.yml
├── docker-entrypoint.sh
├── .dockerignore
├── .env                  ← скопировать из .env.example и заполнить
├── .env.example
├── package.json          ← уже есть (root, ffmpeg-static)
├── src/                  ← уже есть
├── admin-panel/          ← уже есть
├── knowledge-base/       ← volume (персистентные данные)
├── media/                ← volume (фото/видео)
└── logs/                 ← volume (логи)
```

---

## Локальный запуск (для теста)

```bash
# Скопировать и заполнить .env
cp .env.example .env
nano .env

# Собрать и запустить
docker compose up -d --build

# Проверить логи
docker compose logs -f app
```

---

## Деплой на Dockhost

### 1. Собрать и залить образ на Docker Hub

```bash
# Собрать под linux/amd64 (важно если у тебя Mac M1/M2/M3!)
docker buildx build --platform linux/amd64 \
  -t vicero13/telegram-bot-app:latest \
  --push .
```

### 2. Создать сетевые диски в Dockhost

| Имя диска      | Монтировать в  | Что хранит              |
|----------------|----------------|-------------------------|
| `knowledge-base` | `/app/knowledge-base` | JSON базы знаний |
| `media`        | `/app/media`   | Фото, видео, презентации |
| `logs`         | `/app/logs`    | Логи приложения          |

### 3. Создать контейнер в Dockhost

- **Образ:** `vicero13/telegram-bot-app:latest`
- **Порты:** `3000` и `4000`
- **Диски:** подключить все три (см. таблицу выше)
- **Переменные окружения:** все из `.env.example`

### 4. Обновление

```bash
# После изменений в коде:
docker buildx build --platform linux/amd64 \
  -t vicero13/telegram-bot-app:latest \
  --push .

# В Dockhost нажать кнопку перезапуска контейнера 🔄
```

---

## Загрузка knowledge-base и media на диск

Через SFTP (данные в Dockhost → диск → Удалённый доступ):

```bash
# Загрузить всю папку knowledge-base
sftp -P ПОРТ user@адрес.dockhost.net
put -r knowledge-base/ .

# Или через scp
scp -P ПОРТ -r ./knowledge-base/ user@адрес.dockhost.net:/
```
