# Habit CRUD — Frontend uchun qo'llanma

Bu hujjat "habit" (odat) resursi uchun backend API'ni frontenddan qanday ishlatishni tushuntiradi. Backend: Go + Gin, base path `/api`.

## 1. Autentifikatsiya

Habit endpointlari `protected` guruhida — barcha so'rovlarga JWT token kerak:

```
Authorization: Bearer <token>
```

Token `POST /api/auth/login` yoki `POST /api/auth/register` orqali olinadi. Token bo'lmasa yoki noto'g'ri bo'lsa — `401`.

CORS faqat `http://localhost:3000` originiga ruxsat beradi (dev muhitida frontendni shu portda ko'tarish kerak).

## 2. Umumiy javob formati

Muvaffaqiyatli javob:
```json
{ "data": { ... } }
```

Xato javob:
```json
{ "error": "xabar matni" }
```

Har doim `res.data.data` (yoki xato bo'lsa `res.data.error`) dan foydalaning.

## 3. Endpointlar

| Amal | Method | URL |
|---|---|---|
| Ro'yxat (faqat aktiv) | GET | `/api/habits` |
| Yaratish | POST | `/api/habits` |
| Yangilash | PUT | `/api/habits/:id` |
| O'chirish (archive) | DELETE | `/api/habits/:id` |

### Habit obyekti (JSON javob shakli)

**Muhim**: Go struct'da `json` teglari yo'q, shuning uchun maydon nomlari katta harf bilan qaytadi (odatiy Go serializatsiyasi):

```json
{
  "ID": 12,
  "UserID": 3,
  "Name": "Ertalabki yugurish",
  "Description": "30 daqiqa park bo'ylab",
  "ScheduledTime": "07:00",
  "IsArchived": false,
  "CreatedAt": "2026-07-20T04:00:00Z"
}
```

`Description` va `ScheduledTime` — nullable (`null` bo'lishi mumkin).

### 3.1 GET /api/habits — ro'yxat

Faqat `IsArchived = false` bo'lgan, joriy foydalanuvchiga tegishli odatlarni qaytaradi.

Javob:
```json
{ "data": [ { "ID": 1, "Name": "...", ... }, ... ] }
```

### 3.2 POST /api/habits — yaratish

So'rov body (**bu yerda maydon nomlari kichik harf va snake_case, chunki bu alohida `habitReq` struct — `json` teglari bor**):

```json
{
  "name": "Ertalabki yugurish",
  "description": "30 daqiqa park bo'ylab",
  "scheduled_time": "07:00"
}
```

- `name` — **majburiy**, 1–255 belgi.
- `description` — ixtiyoriy, `null`/bermasa ham bo'ladi.
- `scheduled_time` — ixtiyoriy, `"HH:MM"` formatida string (backend formatni validatsiya qilmaydi, faqat string sifatida saqlaydi — frontendda formatni to'g'ri yuborishga e'tibor bering).

Muvaffaqiyat: `201`, javobda yaratilgan habit obyekti (yuqoridagi katta-harfli shaklda, `ID` bilan birga).

Xatolar:
- `400` — `name` bo'sh yoki 255 dan uzun, yoki JSON noto'g'ri.
- `500` — server xatosi.

### 3.3 PUT /api/habits/:id — yangilash

Body — xuddi Create bilan bir xil (`name`, `description`, `scheduled_time`). **To'liq almashtirish** — ya'ni `description` yubormasangiz, u `null` bo'lib qoladi (patch emas, put).

Muvaffaqiyat: `200`
```json
{ "data": { "updated": true } }
```

Xatolar:
- `400` — noto'g'ri `id` yoki validatsiya xatosi (`name` bo'sh/uzun).
- `404` — bu habit topilmadi yoki boshqa foydalanuvchiga tegishli.
- `500` — server xatosi.

### 3.4 DELETE /api/habits/:id — o'chirish

**Diqqat: bu haqiqiy o'chirish emas, "archive" qilish (soft delete).** Ma'lumotlar bazasidan o'chmaydi, faqat `IsArchived = true` bo'ladi va keyin `GET /api/habits` ro'yxatida ko'rinmaydi. Bu tarixiy statistika/entries bilan bog'liqligi sababli shunday qilingan — shuni frontendda "o'chirish" tugmasi bosilganda foydalanuvchiga alohida ogohlantirish shart emas, lekin "qayta tiklash" funksiyasi hozircha yo'q (kerak bo'lsa backendga alohida endpoint qo'shish kerak bo'ladi).

Muvaffaqiyat: `200`
```json
{ "data": { "archived": true } }
```

Xatolar:
- `400` — noto'g'ri `id`.
- `404` — topilmadi.
- `500` — server xatosi.

## 4. Frontend misoli (axios + TypeScript)

```ts
// api/habits.ts
import axios from "axios";

const api = axios.create({ baseURL: "http://localhost:8080/api" });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export interface Habit {
  ID: number;
  UserID: number;
  Name: string;
  Description: string | null;
  ScheduledTime: string | null;
  IsArchived: boolean;
  CreatedAt: string;
}

export interface HabitInput {
  name: string;
  description?: string | null;
  scheduled_time?: string | null;
}

export const listHabits = async (): Promise<Habit[]> =>
  (await api.get("/habits")).data.data;

export const createHabit = async (input: HabitInput): Promise<Habit> =>
  (await api.post("/habits", input)).data.data;

export const updateHabit = async (id: number, input: HabitInput): Promise<void> => {
  await api.put(`/habits/${id}`, input);
};

export const deleteHabit = async (id: number): Promise<void> => {
  await api.delete(`/habits/${id}`);
};
```

Xatoni ushlash:
```ts
try {
  await createHabit({ name: "" });
} catch (e) {
  if (axios.isAxiosError(e)) {
    const message = e.response?.data?.error ?? "Noma'lum xatolik";
    // UI'da ko'rsatish
  }
}
```

## 5. Boshqa e'tiborga olish kerak bo'lgan narsalar

- Habit yaratish/tahrirlash formasida `scheduled_time` uchun `<input type="time">` ishlatish qulay — u avtomatik `"HH:MM"` string qaytaradi.
- Habitlar bilan bog'liq boshqa endpointlar (bevosita habit CRUD emas, lekin bog'liq):
  - `POST /api/habits/:id/done` — habitni bugun bajarilgan deb belgilash.
  - `POST /api/habits/:id/jazo` — habitni bugun "jazo" (bajarilmagan) deb belgilash.
  - `GET /api/entries?date=YYYY-MM-DD` — kunlik holatni olish uchun (aniq query parametrini `internal/handler/entry_handler.go` dan tekshiring).
- `id` — URL parametri sifatida integer (`int64`) bo'lishi shart, aks holda `400 invalid habit id`.
