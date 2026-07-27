# Telegram Integratsiyasi — Intizom Daftari

Bu hujjat "Intizom Daftari" ilovasiga Telegram bot orqali reminder va `/my-tasks` funksiyasini qo'shish uchun backend dasturchi tomonidan bajariladigan ketma-ket tasklar ro'yxati.

## Umumiy g'oya

Foydalanuvchi Telegram akkauntini xavfsiz tarzda (bir martalik, muddatli token orqali) o'z ilova akkauntiga bog'laydi. Keyin bot orqali `/my-tasks` buyrug'i bilan bugungi tasklarini olishi, shuningdek belgilangan vaqtlarda reminder xabarlarini qabul qilishi mumkin.

**Muhim arxitektura qarori**: Telegram **username** emas, balki **`chat_id` + bir martalik token** orqali identifikatsiya qilinadi. Username o'zgaruvchan va account hijacking xavfini tug'diradi; `chat_id` esa barqaror va xavfsiz identifikator hisoblanadi.

---

## 1-bosqich: Ma'lumotlar bazasi (migration)

- [ ] **1.1** — `users` jadvaliga yangi ustunlar qo'shish:

```sql
ALTER TABLE users ADD COLUMN telegram_chat_id BIGINT UNIQUE;
ALTER TABLE users ADD COLUMN telegram_link_token UUID;
ALTER TABLE users ADD COLUMN telegram_link_expires_at TIMESTAMPTZ;
CREATE UNIQUE INDEX idx_users_telegram_link_token
    ON users(telegram_link_token) WHERE telegram_link_token IS NOT NULL;
```

> `telegram_chat_id`ga UNIQUE qo'yilishi shart — bitta Telegram akkaunt faqat bitta userga bog'lanishi kerak.

- [ ] **1.2** — Migration'ni `up`/`down` versiyasi bilan yozish (`golang-migrate` / `goose` formatiga mos).

---

## 2-bosqich: Token generatsiya endpoint

- [ ] **2.1** — `POST /api/telegram/link-token` endpoint yaratish:
  - Authenticated user'dan (JWT/session) `user_id` olinadi
  - Yangi `uuid.New()` generatsiya qilinadi
  - Bazaga yoziladi: `telegram_link_token`, `telegram_link_expires_at = now() + 10 daqiqa`
  - Response: `{ "deep_link": "https://t.me/<BOT_USERNAME>?start=<token>" }`

- [ ] **2.2** — Rate limit qo'yish (1 user — 1 daqiqada 1 marta token so'rashi mumkin).

---

## 3-bosqich: Bot infratuzilishi

- [ ] **3.1** — Bot token'ni `.env`dan o'qish (`TELEGRAM_BOT_TOKEN`), config strukturaga qo'shish.

- [ ] **3.2** — Telegram Bot API kutubxonasini ulash (`go-telegram-bot-api/telegram-bot-api` yoki `gotgbot`).

- [ ] **3.3** — Ishga tushirish rejimini tanlash:
  - **Long polling** (`GetUpdatesChan`) — tavsiya etiladi (sozlash sodda, SSL sertifikat kerak emas)
  - **Webhook** — keyinchalik load ortganda o'tish mumkin

---

## 4-bosqich: `/start` handler (bog'lash logikasi)

- [ ] **4.1** — `/start <token>` command'ni parslovchi handler yozish.

- [ ] **4.2** — Atomik bog'lash query:

```sql
UPDATE users SET telegram_chat_id = $1, telegram_link_token = NULL
WHERE telegram_link_token = $2 AND telegram_link_expires_at > now()
RETURNING id;
```

- [ ] **4.3** — 3 ta holatni qayta ishlash:
  - Token topilmadi / muddati o'tgan → xato xabari
  - Muvaffaqiyatli → tabriklash + qisqa yo'riqnoma
  - `args` bo'sh (to'g'ridan-to'g'ri botga yozilgan) → ilovaga yo'naltiruvchi xabar

- [ ] **4.4** — Unit testlar: muddati o'tgan token, noto'g'ri token, muvaffaqiyatli holat.

---

## 5-bosqich: `/my-tasks` command

- [ ] **5.1** — `chat_id` bo'yicha `users` jadvalidan `user_id` topuvchi repository funksiyasi.

- [ ] **5.2** — Agar `chat_id` bazada topilmasa — "hali bog'lanmagansiz" javobi.

- [ ] **5.3** — Mavjud `GetTodayTasks(userID)` repository metodini qayta ishlatish (dublikat kod yozmaslik).

- [ ] **5.4** — Task ro'yxatini Telegram uchun formatlovchi `formatTasks()` funksiyasi (vaqt, nom, status bilan).

---

## 6-bosqich: Xatoliklarni boshqarish va monitoring

- [ ] **6.1** — Barcha bot handler'larda `panic recovery` middleware.

- [ ] **6.2** — `slog` orqali har bir `/start` va `/my-tasks` chaqiruvini loglash.

---

## 7-bosqich: Test va deploy

- [ ] **7.1** — Integration test: token yaratish → `/start` → `/my-tasks` to'liq oqimi.

- [ ] **7.2** — Staging muhitida haqiqiy bot bilan qo'lda test.

- [ ] **7.3** — Production deploy; bot token secret manager/env orqali saqlanadi, kodga hardcode qilinmaydi.

---

## Ketma-ketlik qoidasi

Tartib qat'iy: **1 → 2 → 3 → 4 → 5 → 6 → 7**.

5-bosqich (`/my-tasks`) 4-bosqichsiz (`/start` bog'lash) test qilinmaydi — `chat_id` bazada bo'lmasa, hech narsa qaytmaydi.

---

## Kelajakdagi kengaytmalar (hozircha scope'da emas)

- Reminder dispatcher (worker pool + rate limiter) — alohida modul sifatida keyingi bosqichda
- Inline keyboard orqali "✅ Bajardim / ❌ Bajarmadim" — task holatini botdan to'g'ridan-to'g'ri belgilash
