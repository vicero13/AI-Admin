# Plan: Telegram Business Webhook Support

## What changes

### 1. TelegramAdapter — webhook + business_message support

**File: `src/adapters/telegram.ts`**

- Constructor gets new optional params: `webhookUrl?`, `webhookPath?`, `secretToken?`
- `initialize()` logic:
  - If `webhookUrl` is set — create bot with `{ webHook: false }` (no polling, no built-in webhook server), call `bot.setWebHook(webhookUrl, { secret_token })`, expose `processUpdate()` method for express route
  - If `webhookUrl` is NOT set — keep current polling behavior (backward compatible)
- Add listener for `'business_message'` event — same flow as `'message'`, converts to UniversalMessage
- `convertToUniversal()` — store `business_connection_id` in `metadata.custom` when present on the message
- `sendMessage()` — accept optional `business_connection_id`, pass it to `bot.sendMessage(chatId, text, { business_connection_id })` so replies go through the business channel
- Add `getExpressMiddleware()` method returning an express handler that calls `bot.processUpdate(req.body)` with secret token validation
- `shutdown()` — if webhook mode, call `bot.deleteWebHook()` instead of `stopPolling()`

### 2. Server.ts — webhook route + config

**File: `src/server.ts`**

- Read new env vars: `TELEGRAM_WEBHOOK_URL`, `TELEGRAM_WEBHOOK_PATH` (default `/webhook/telegram`), `TELEGRAM_WEBHOOK_SECRET`
- Read from config: `telegram.webhook.url`, `telegram.webhook.path`, `telegram.webhook.secret`
- Pass webhook config to TelegramAdapter constructor
- After adapter initialize: if webhook mode, mount `app.post(webhookPath, adapter.getExpressMiddleware())`
- In message handler: extract `business_connection_id` from message metadata, pass it to `sendMessage()`

### 3. Config

**File: `config/default.yaml`**

- Add `telegram:` section with `webhook:` sub-section (url, path, secret — all commented out by default)

### 4. Docker / docker-compose

- No changes needed (express server already listens on port 3000, just needs to be exposed externally with HTTPS via reverse proxy)

### 5. Tests

- Update telegram adapter tests to cover webhook init and business_message handling

## Backward compatibility

- Default behavior (no TELEGRAM_WEBHOOK_URL) = polling, exactly as before
- Setting TELEGRAM_WEBHOOK_URL switches to webhook mode
- business_message events are handled in both modes (though in practice they come via webhook)
