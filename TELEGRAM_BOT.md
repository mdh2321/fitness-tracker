# Arc Nutrition — Telegram Bot Setup

Log meals from your phone by messaging a private Telegram bot. Send a text
description ("chicken wrap and a flat white") or a photo of your plate; the bot
replies with estimated calories/macros and your running day totals vs targets.

Commands: `/today` (day summary), `/undo` (remove last meal), `/help`.

## 1. Create the bot

1. Message [@BotFather](https://t.me/BotFather) on Telegram → `/newbot`.
2. Pick a name (e.g. "Arc Nutrition") and a unique username (e.g. `arc_nutrition_xyz_bot`).
3. Copy the bot token BotFather gives you.

## 2. Find your chat id

Message [@userinfobot](https://t.me/userinfobot) (or just message your new bot
once after step 4 — it replies with your chat id if you're not allowlisted yet).

## 3. Set environment variables

Add to `.env.local` (and to Vercel → Project → Settings → Environment Variables):

```
TELEGRAM_BOT_TOKEN=123456789:AA...            # from BotFather
TELEGRAM_WEBHOOK_SECRET=<random string>       # e.g. `openssl rand -hex 24`
TELEGRAM_ALLOWED_CHAT_IDS=123456789           # comma-separated chat ids
APP_TIMEZONE=Europe/London                    # IANA tz used to decide "today" (Vercel runs in UTC)
```

## 4. Register the webhook

The webhook must be publicly reachable (i.e. the deployed app, not localhost):

```sh
curl -s "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -d "url=https://<your-app-domain>/api/telegram/webhook" \
  -d "secret_token=$TELEGRAM_WEBHOOK_SECRET"
```

Verify with:

```sh
curl -s "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getWebhookInfo"
```

## Notes

- Requests without the correct `X-Telegram-Bot-Api-Secret-Token` header are rejected (401).
- Chats not in `TELEGRAM_ALLOWED_CHAT_IDS` get a reply with their chat id and nothing is logged.
- Meals logged via Telegram show a small send icon in the app's meal list.
- Photo captions are treated as authoritative hints for the estimate ("half of this", "no dressing").
