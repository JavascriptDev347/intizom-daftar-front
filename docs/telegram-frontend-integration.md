# Telegram bog'lash — Frontend uchun qo'llanma

Backend tomoni tayyor (`docs/telegram-task.md`dagi barcha bosqichlar bajarilgan). Frontendda faqat **bitta yangi endpoint** bilan ishlash kerak — qolgan hamma narsa (reminder, `/my-tasks`) foydalanuvchi Telegram ilovasida, bot bilan sodir bo'ladi.

---

## 1. Endpoint: Telegram bog'lash kodi olish

```
POST /api/telegram/link-code
Authorization: Bearer <JWT>   (majburiy — login qilingan foydalanuvchi)
Body: yo'q
```

### Muvaffaqiyatli javob — `200`

```json
{
  "data": {
    "code": "a1b2c3d4e5f6",
    "instructions": "Botga /start a1b2c3d4e5f6 deb yozing",
    "deep_link": "https://t.me/IntizomDaftarBot?start=a1b2c3d4e5f6"
  }
}
```

> `deep_link` faqat backendda `TELEGRAM_BOT_USERNAME` sozlangan bo'lsa keladi. Agar u yo'q bo'lsa, javobda faqat `code` va `instructions` bo'ladi — bu holda foydalanuvchiga faqat matnli ko'rsatma ko'rsatiladi.

### Xato holatlari

| Status | Body                                                                          | Ma'no                                                |
| ------ | ----------------------------------------------------------------------------- | ---------------------------------------------------- |
| `401`  | `{"error": "missing bearer token"}` / `{"error": "invalid or expired token"}` | Foydalanuvchi login qilmagan / token eskirgan        |
| `429`  | `{"error": "yangi kod so'rashdan oldin biroz kuting"}`                        | Rate limit — 1 daqiqada faqat 1 marta so'rash mumkin |
| `500`  | `{"error": "internal error"}`                                                 | Server xatosi                                        |

Barcha javoblar bitta shablonda: muvaffaqiyat `{ "data": ... }`, xato `{ "error": "..." }`.

---

## 2. UI oqimi (tavsiya)

1. Sozlamalar / profil sahifasida **"Telegram bog'lash"** tugmasi.
2. Bosilganda `POST /api/telegram/link-code` chaqiriladi.
3. Javobga qarab:
   - Agar `deep_link` kelsa → uni yangi tabda ochish (`window.open(deep_link, "_blank")`). Mobil brauzerda bu to'g'ridan-to'g'ri Telegram ilovasini ochadi va `/start <code>` avtomatik yuboriladi.
   - Agar `deep_link` bo'lmasa → `instructions` matnini va bot username'ini ko'rsatib, foydalanuvchidan botga qo'lda yozishni so'rash.
4. `429` kelsa — "biroz kuting" xabarini ko'rsatish (masalan, 30-60 soniyalik countdown yoki tugmani vaqtincha disable qilish).
5. Kod **10 daqiqa** amal qiladi — agar foydalanuvchi shu vaqt ichida botga o'tmasa, tugmani qayta bosishi kerak bo'ladi (yangi kod so'raladi, eskisi avtomatik bekor bo'ladi).

### Muhim: hozircha "bog'langanmi?" tekshiruvchi endpoint yo'q

Foydalanuvchi Telegram akkauntini allaqachon bog'lagan-bog'lamaganini frontend hozircha **API orqali bila olmaydi** — buning uchun alohida endpoint (masalan `GET /api/telegram/status`) yozilmagan. Agar UI'da "Bog'langan ✅ / Bog'lanmagan" holatini ko'rsatish kerak bo'lsa, buni backendga alohida so'rov sifatida aytish kerak — hozirgi holatda faqat "kod so'rash" tugmasi bor, natija ko'rinmaydi.

---

## 3. Bot tomoni (frontend qatnashmaydi, faqat ma'lumot uchun)

- Foydalanuvchi botga `/start <code>` yozgach, bot avtomatik javob beradi: "Bog'landi! Endi eslatmalar shu yerga keladi."
- Shundan keyin foydalanuvchi botga istalgan vaqt `/my-tasks` yozib, bugungi vazifalar ro'yxatini olishi mumkin.
- Reminder xabarlari ham shu bog'langan `chat_id`ga avtomatik yuboriladi (scheduler orqali, frontenddan mustaqil).

---

## 4. Xulosa — frontendga kerak bo'lgan yagona integratsiya

- [ ] "Telegram bog'lash" tugmasi + `POST /api/telegram/link-code` chaqiruvi
- [ ] `deep_link` bo'lsa — yangi tabda ochish; bo'lmasa — kod va yo'riqnomani ko'rsatish
- [ ] `429` uchun foydalanuvchiga tushunarli xabar
- [ ] (Ixtiyoriy, hozircha backendda yo'q) "bog'langan holat" ko'rsatish — kerak bo'lsa backendchidan so'rash kerak


## 5. YANGI: Telegram orqali login (login sahifasida)

Bu — email+parolga **muqobil** kirish usuli, lekin faqat **avval bog'langan** akkauntlar uchun ishlaydi. Ya'ni ro'yxatdan o'tish (register) o'rnini bosmaydi — foydalanuvchi kamida bir marta email+parol bilan ro'yxatdan o'tib, 3-bosqichdagi "Telegram bog'lash"ni bosgan bo'lishi shart. Bu endpointlar **auth talab qilmaydi** (login sahifasida, hali JWT yo'q paytda ishlatiladi).

### 5.1 — Login urinishini boshlash

```
POST /api/auth/telegram/login-request
Authorization: kerak emas
Body: yo'q
```

Javob — `200`:
```json
{
  "data": {
    "token": "9f3a...64-belgili-hex",
    "instructions": "Botga /start login_9f3a... deb yozing",
    "deep_link": "https://t.me/IntizomDaftarBot?start=login_9f3a...",
    "expires_in": 300
  }
}
```

> `deep_link` faqat bot username sozlangan bo'lsa keladi (bog'lash oqimidagi bilan bir xil qoida). `token` — bu sessiya identifikatori, `link-code`dagi kod bilan aralashtirmang, bu boshqa narsa.

### 5.2 — Statusni poll qilish

```
GET /api/auth/telegram/login-status/:token
Authorization: kerak emas
```

Har **2 soniyada** shu endpointni chaqiring (`token` — 5.1dan olingan `token`). Javoblar:

| `status` | Body | Frontend nima qilishi kerak |
|---|---|---|
| `pending` | `{"data": {"status": "pending"}}` | Poll qilishni davom ettirish, "Botda Start bosishni kuting" |
| `confirmed` | `{"data": {"status": "confirmed", "token": "<JWT>"}}` | Poll'ni to'xtatish, `token`ni saqlash (login qilingandagi kabi), asosiy sahifaga o'tish |
| `not_linked` | `{"data": {"status": "not_linked"}}` | Poll'ni to'xtatish, xato ko'rsatish: **"Bu Telegram akkaunt hech qanday hisobga ulanmagan. Avval email va parol orqali kiring, so'ng sozlamalardan Telegram'ni ulang."** |
| — | `404 {"error": "session topilmadi yoki muddati o'tgan"}` | Poll'ni to'xtatish, "Havola eskirdi, qaytadan urinib ko'ring" — 5.1ni qaytadan chaqirish kerak |

Sessiya **5 daqiqa** amal qiladi (`expires_in`). Shu vaqt ichida bot javob bermasa, poll'ni to'xtatib "muddati tugadi" holatini ko'rsating.

### 5.3 — UI oqimi (tavsiya)

1. Login sahifasida email+parol formasi yonida **"Telegram orqali kirish"** tugmasi.
2. Bosilganda `POST /api/auth/telegram/login-request` chaqiriladi.
3. `deep_link` yangi tabda ochiladi (yoki QR/kod ko'rsatiladi — foydalanuvchi telefonda bo'lsa deep_link avtomatik Telegram ilovasini ochadi).
4. Shu bilan bir vaqtda `setInterval` bilan har 2 soniyada `login-status/:token` poll qilinadi.
5. `confirmed` kelganda — interval to'xtatiladi, `token` (JWT) frontendning odatiy login-token saqlash joyiga (localStorage/cookie) yoziladi, foydalanuvchi asosiy sahifaga yo'naltiriladi.
6. `not_linked` yoki `404` kelganda — interval to'xtatiladi, tegishli xato xabari ko'rsatiladi va foydalanuvchiga email+parol formasiga qaytish taklif qilinadi.
7. Sahifa tark etilsa yoki komponent unmount bo'lsa — `setInterval`ni tozalashni unutmang (memory leak bo'lmasligi uchun).

### 5.4 — Muhim eslatmalar

- Bu real-time push emas, **polling** — websocket yo'q. 2 soniyalik interval yetarli (server tomoni juda yengil, DB so'rovsiz, faqat xotiradagi map).
- Har bir "Telegram orqali kirish" bosilganda **yangi** `token` olinadi — eski token bilan qayta poll qilib bo'lmaydi.
- Bitta `token` faqat bitta marta `confirmed`ga o'tadi va shu holatda qoladi (bot ikkinchi marta bosilsa ham natija o'zgarmaydi) — sessiya 5 daqiqadan keyin baribir yo'qoladi.
