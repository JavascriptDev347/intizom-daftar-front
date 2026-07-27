## Intizom Daftari — Backend API Reference (frontend uchun)

Bu fayl backend'dagi har bir endpointni, uning maqsadini, kutilayotgan request DTOsini va qaytaradigan response DTOsini to'liq tasvirlaydi. Frontend (Vue 3) shu hujjat asosida API client yozishi mumkin.

- Base URL: http://localhost:8080 (yoki deploy qilingan domen)

- Content-Type: barcha request/response — application/json

- Auth: himoyalangan endpointlar uchun header: Authorization: Bearer <token>

- Sana formati: har doim YYYY-MM-DD (masalan 2026-07-26 )

- Vaqt formati: HH:MM , 24-soatlik (masalan 07:30 , 21:00 )

## Umumiy javob shakli

Muvaffaqiyatli javob:

```
json
{"data":{ ... yoki [...] }}
```

## Xatolik:

```
json
{"error":"tushunarli xabar"}
```


| HTTP kod Ma'nosi |   |
| --- | --- |
| 200 | OK |
| 201 | Yaratildi |
| 400 | Validatsiya xatosi (majburiy maydon yo'q, noto'g'ri format) |
| 401 | Token yo'q / noto'g'ri / login xato |
| 404 | Topilmadi (masalan, boshqa userning habit ID'si) |
| 409 | Konflikt (masalan, email band) |
| 500 | Server xatosi |

## 1. Auth

```
POST /api/auth/register
```

Maqsad: yangi foydalanuvchi ro'yxatdan o'tkazish, darhol token qaytaradi (frontend ro'yxatdan o'tgach avtomatik login bo'ladi). Auth: kerak emas

## Request:

```
json
{
"username":"rustambek",
"email":"rustambek@example.com",
"password":"kamida8belgidan"
}
```


| Maydon | Turi Majburiymi | Qoida |
| --- | --- | --- |
| username | string ha | 3–50 belgi |
| email | string ha | to'g'ri email formati |
| password | string ha | kamida 8 belgi |

Response 201 :

```
json
{"data":{"token":"eyJhbGciOi..."}}
```

Xatoliklar: 400 (validatsiya), 409 (email band).

```
POST /api/auth/login
```

Maqsad: mavjud foydalanuvchini kirg'izish, token qaytaradi. Auth: kerak emas

Request:

```
json
{"email":"rustambek@example.com","password":"kamida8belgidan"}
```

## Response 200 :

```
json
{"data":{"token":"eyJhbGciOi..."}}
```

Xatoliklar: 400 (validatsiya), 401 (email/parol xato).


Frontend: tokenni localStorage /Pinia store ga saqlab, har bir keyingi so'rovda Authorization: Bearer <token> bilan yuborish kerak.

```
POST /api/telegram/link-code
```

Maqsad: foydalanuvchiga bir martalik kod beradi — u botga /start <kod> deb yozib, o'z Telegram akkauntini shu profilga bog'laydi. Frontend "Telegram ulash" tugmasi bosilganda chaqiriladi. Auth: kerak

Request body: yo'q

```
Response 200 :
json
{
"data":{
"code":"a1b2c3d4e5f6",
"instructions":"Botga /start a1b2c3d4e5f6 deb yozing"
}
}
```

Frontend: code ni ko'rsatish shart emas — instructions matnini yoki bot username'iga

link (https://t.me/<bot_username>?start=<code> ) qilib ko'rsatish qulayroq.

## 2. Habits (mashg'ulotlar)

Barcha habit endpointlari Authorization talab qiladi.

```
GET /api/habits
```

Maqsad: foydalanuvchining barcha faol (arxivlanmagan) mashg'ulotlari ro'yxati — sozlamalar/ro'yxat sahifasi uchun.

```
Response 200 :
```


```
json
{
"data":[
{
"id":1,
"user_id":7,
"name":"6:00 da uyg'onish",
"description":null,
"scheduled_time":"06:00",
"is_archived":false,
"created_at":"2026-07-01T08:00:00Z"
}
]
}
```

description va scheduled_time — ixtiyoriy maydonlar, yozilmagan bo'lsa null keladi.

## POST /api/habits

Maqsad: yangi mashg'ulot qo'shish.

## Request:

```
json
{
"name":"6:00 da uyg'onish",
"description":"Ish kunlari uchun",
"scheduled_time":"06:00"
}
```


| Maydon | Turi Majburiymi |   | Izoh |
| --- | --- | --- | --- |
| name | string | ha | 1–255 belgi |
| description | string|null yo'q |   | ixtiyoriy, spec bo'yicha |
| scheduled_time | string|null yo'q |   | ixtiyoriy, "HH:MM" |

Response 201 : yaratilgan habit obyekti (yuqoridagi shakl bilan bir xil).

```
PUT /api/habits/:id
```

Maqsad: mavjud mashg'ulotni tahrirlash (nomi/tavsifi/vaqti). Request tanasi — xuddi POST /api/habits bilan bir xil (barchasi qayta yoziladi, qisman update emas — frontend joriy qiymatlarni oldindan to'ldirib yuborishi kerak).

```
Response 200 :
json
{"data":{"updated":true}}
```

404 — agar :id boshqa foydalanuvchiga tegishli bo'lsa yoki mavjud bo'lmasa.

```
DELETE /api/habits/:id
```

Maqsad: mashg'ulotni o'chirish — aslida arxivlaydi (is_archived = true ), tarixi (entries) saqlanib qoladi, faqat yangi kunlarda ko'rinmay qoladi.

```
Response 200 :
json
{"data":{"archived":true}}
```


## 3. Entries (kunlik bajarilishi / jazo)

```
GET /api/entries?date=YYYY-MM-DD
```

Maqsad: berilgan kun uchun barcha faol mashg'ulotlarni, har birining o'sha kungi holati bilan qaytaradi. Bu — asosiy "bugungi ro'yxat" ekrani uchun endpoint. date berilmasa — bugungi kun.

Har bir element uchta holatdan birida bo'ladi (frontend aynan shu uchta holatni render qilishi kerak):

- 1. entry: null — hali belgilanmagan (checkbox bo'sh, jazo maydoni yashirin)

- 2. entry.done: true — bajarilgan (yashil check)

- 3. entry.done: false, entry.jazo: "..." — bajarilmagan va jazo yozilgan (qizil belgi)

Response 200 :

json


```
{
"data":[
{
"habit":{
"id":1,
"user_id":7,
"name":"6:00 da uyg'onish",
"description":null,
"scheduled_time":"06:00",
"is_archived":false,
"created_at":"2026-07-01T08:00:00Z"
},
"entry":{
"id":55,
"habit_id":1,
"user_id":7,
"entry_date":"2026-07-26T00:00:00Z",
"done":false,
"jazo":"30 marta o'tirib turish",
"completed_at":null,
"created_at":"2026-07-26T09:00:00Z",
"updated_at":"2026-07-26T09:00:00Z"
}
},
{
"habit":{"id":2,"name":"Kitob o'qish","...":"..."},
"entry":null
}
]
}
```


```
POST /api/habits/:id/done
```

Maqsad: mashg'ulotni berilgan sana uchun bajarildi deb belgilash. Checkbox bosilganda chaqiriladi.

## Request:

```
json
{"date":"2026-07-26"}
```

## Response 200 :

```
json
{"data":{"done":true}}
```

404 — habit boshqa userga tegishli yoki mavjud emas.

Eslatma: agar shu kun uchun oldin jazo yozilgan bo'lsa-yu, keyin "bajarildi" bosilsa — jazo matni backend tomonidan tozalanadi (done=true bo'lsa jazo doim null ).

```
POST /api/habits/:id/jazo
```

Maqsad: mashg'ulot bajarilmagan holatda, unga jazo matnini yozib saqlash. Checkbox belgilanmagan holatda ochiladigan input + "Saqlash" tugmasi shu endpointga bog'lanadi.

## Request:

```
json
{"date":"2026-07-26","jazo":"30 marta o'tirib turish"}
```


| Maydon Turi Majburiymi |   | Izoh |   |
| --- | --- | --- | --- |
| date | string ha | YYYY-MM-DD |   |
| jazo | string ha | bo'sh bo'lishi mumkin emas (400 | qaytadi) |

Response 200 :

```
json
{"data":{"jazo_saved":true}}
```

Xatoliklar: 400 (jazo bo'sh), 404 (habit topilmadi).

## 4. Dashboard / Calendar / Analytics

Uchalasi ham from /to query parametrlarini oladi (YYYY-MM-DD ). Ikkalasi ham berilmasa — oxirgi 30 kun.

```
GET /api/dashboard?from=&to=
```

Maqsad: bosh sahifadagi umumiy statistika — jami bajarilgan/o'tkazib yuborilgan, va har bir habit uchun joriy streak.

Response 200 :

json


```
{
"data":{
"range_from":"2026-06-26T00:00:00Z",
"range_to":"2026-07-26T00:00:00Z",
"total_done":42,
"total_missed":8,
"per_habit":[
{
"habit":{"id":1,"name":"6:00 da uyg'onish","...":"..."},
"done_count":20,
"missed_count":3,
"current_streak":5
}
]
}
}
```

## GET /api/calendar?from=&to=

Maqsad: kalendar ko'rinishi uchun — har bir kunda nechta mashg'ulot bo'lgani, nechtasi bajarilgani, nechtasi jazo bilan tugagani. Oy ko'rinishi uchun frontend from=2026-07-

01&to=2026-07-31 yuboradi.

```
Response 200 :
json
```


```
{
"data":[
{"date":"2026-07-20T00:00:00Z","total":5,"done":4,"missed":1,"wi
{"date":"2026-07-21T00:00:00Z","total":5,"done":5,"missed":0,"wi
]
}
```

Kunlar orasida entry yozilmagan sanalar bu ro'yxatda umuman ko'rinmaydi (aggregatsiya faqat mavjud entries ustida) — frontend taqvimda "ma'lumot yo'q" kunlarni oddiy bo'sh katak sifatida chizishi kerak.

```
GET /api/analytics?from=&to=
```

Maqsad: haftalik/oylik/erkin sana oralig'idagi umumiy tahlil. Hozircha /dashboard bilan bir xil hisoblashni qaytaradi (bir xil javob shakli) — frontend buni faqat boshqa from /to qiymatlari bilan chaqiradi:

- Haftalik: oxirgi 7 kun

- Oylik: joriy oyning 1-sanasidan bugungacha

- Erkin: foydalanuvchi tanlagan ikki sana

## 5. Schedules (Telegram eslatmalari)

```
GET /api/schedules
```

Maqsad: foydalanuvchining barcha eslatma vaqtlari ro'yxati (sozlamalar sahifasi uchun).

```
Response 200 :
json
```


```
{
"data":[
{
"id":3,
"user_id":7,
"send_time":"08:00",
"days_of_week":[1,2,3,4,5],
"target_chat_id":null,
"is_active":true,
"created_at":"2026-07-10T06:00:00Z"
}
]
}
```

## POST /api/schedules

Maqsad: yangi eslatma vaqti qo'shish — "bir nechta vaqt belgilash" shu endpoint orqali, har bir vaqt uchun alohida chaqiriladi.

## Request:

```
json
{
"send_time":"08:00",
"days_of_week":[1,2,3,4,5],
"target_chat_id":null
}
```


| Maydon Turi Majburiymi Izoh |   |   |
| --- | --- | --- |
| send_time string ha |   | "HH:MM" |
| days_of_week int[] | ha | 0 =Yakshanba ... 6 =Shanba |
| target_chat_id number|null yo'q |   | bo'sh qoldirilsa — shaxsiy Telegram chatga; |
|   |   | kanalga yuborish uchun kanal ID (manfiy son) |

Response 201 : yaratilgan schedule obyekti (yuqoridagi shakl bilan bir xil). Xatolik 400 : send_time formati noto'g'ri yoki days_of_week ichida 0–6 oralig'idan tashqari son bor.

DELETE /api/schedules/:id

Maqsad: eslatmani o'chirish.

Response 200 :

```
json
{"data":{"deleted":true}}
```

## Frontend uchun eslatmalar

- 1. Uch holatli checkbox mantig'i — GET /api/entries javobidagi entry: null / bo'limga qarang). Bu backend'ning eng muhim invarianti. entry.done: true / entry.done: false + jazo uchta holatni to'g'ri render qiling (2-

- 2. scheduled_time va description — ikkalasi ham null bo'lishi mumkin, UI'da ixtiyoriy maydon sifatida ko'rsating (masalan, vaqt bo'lmasa — vaqt belgisini butunlay yashiring, "00:00" qilib ko'rsatmang).

- 3. Sana bilan ishlashda backend har doim date-only (YYYY-MM-DD ) kutadi, lekin javoblarda entry_date /created_at /range_from kabi maydonlar to'liq ISO


- timestamp (2026-07-26T00:00:00Z ) shaklida keladi — frontend buni parse qilib, faqat sana qismini ko'rsatishi kerak.

- 4. 401 kelsa — token muddati tugagan yoki noto'g'ri; frontend foydalanuvchini login sahifasiga qaytarishi va saqlangan tokenni tozalashi kerak.

- 5. Telegram ulash holati — hozircha backend "ulanganmi yo'qmi" degan alohida endpoint bermaydi; buni bilish uchun frontend GET /api/schedules chaqirib ko'rishi yoki keyingi versiyada GET /api/me (user profili, telegram_chat_id bilan) qo'shilishini so'rashi mumkin — hozircha MVP'da yo'q.
