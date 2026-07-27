# Entry (kunlik bajarilish belgisi) — Frontend uchun qo'llanma

Bu hujjat "entry" resursi bilan ishlashni tushuntiradi. Entry — bu bitta habit'ning bitta kundagi holati ("bajarildi" yoki "bajarilmadi + jazo"). [[habit-crud-frontend]] bilan birga o'qing, chunki entry doim habit bilan bog'liq.

**Muhim farq**: Habit'dan farqli o'laroq, entry uchun klassik CRUD (create/update/delete) endpointlari yo'q. Entry faqat quyidagi 3 amal orqali boshqariladi:
- **o'qish** — kunni ko'rish (`GET /api/entries`)
- **"bajarildi" deb belgilash** — `POST /api/habits/:id/done`
- **"bajarilmadi, jazo bilan" deb belgilash** — `POST /api/habits/:id/jazo`

Ichkarida ikkalasi ham **upsert** — ya'ni bir kunga ikkinchi marta "done" yuborsangiz, yangi qator yaratilmaydi, mavjudi yangilanadi (o'sha (habit, sana) juftligi uchun bitta entry bo'ladi). Entry'ni o'chirish endpointi yo'q.

## 1. Autentifikatsiya va umumiy javob formati

Xuddi habit kabi: `Authorization: Bearer <token>`, javob shakli `{ "data": ... }` yoki `{ "error": "..." }`. Batafsili uchun [[habit-crud-frontend]] ga qarang.

## 2. Endpointlar

| Amal | Method | URL |
|---|---|---|
| Kunni o'qish (habit + entry birga) | GET | `/api/entries?date=YYYY-MM-DD` |
| Habitni "bajarildi" deb belgilash | POST | `/api/habits/:id/done` |
| Habitni "bajarilmadi, jazo" deb belgilash | POST | `/api/habits/:id/jazo` |

### 2.1 GET /api/entries?date=YYYY-MM-DD — kunni o'qish

`date` query parametri ixtiyoriy — bermasangiz, bugungi sana olinadi. Format qat'iy: `YYYY-MM-DD` (masalan `2026-07-27`). Noto'g'ri format — `400`.

Bu endpoint **shu foydalanuvchining shu sanada aktiv bo'lgan barcha habitlarini**, har birining o'sha kundagi entry holati bilan birga qaytaradi (Go tomonidagi "left join"). Agar foydalanuvchi hali o'sha habitga tegmagan bo'lsa, `Entry` maydoni `null` bo'ladi.

Javob (`data` — massiv, har bir element `DayEntry`):

```json
{
  "data": [
    {
      "Habit": {
        "ID": 12,
        "UserID": 3,
        "Name": "Ertalabki yugurish",
        "Description": "30 daqiqa park bo'ylab",
        "ScheduledTime": "07:00",
        "IsArchived": false,
        "CreatedAt": "2026-07-20T04:00:00Z"
      },
      "Entry": null
    },
    {
      "Habit": {
        "ID": 15,
        "UserID": 3,
        "Name": "Kitob o'qish",
        "Description": null,
        "ScheduledTime": null,
        "IsArchived": false,
        "CreatedAt": "2026-06-01T00:00:00Z"
      },
      "Entry": {
        "ID": 101,
        "HabitID": 15,
        "UserID": 3,
        "EntryDate": "2026-07-27T00:00:00Z",
        "Done": true,
        "Jazo": null,
        "CompletedAt": "2026-07-27T09:15:00Z",
        "CreatedAt": "2026-07-27T09:15:00Z",
        "UpdatedAt": "2026-07-27T09:15:00Z"
      }
    }
  ]
}
```

Frontendda holatni shu logika bilan aniqlang:
- `Entry === null` → "hali belgilanmagan" (kulrang/neytral holat).
- `Entry.Done === true` → "bajarildi" (yashil).
- `Entry.Done === false` → "bajarilmadi", `Entry.Jazo` matnida jazo yozilgan (qizil).

### 2.2 POST /api/habits/:id/done — "bajarildi" deb belgilash

URL'dagi `:id` — habit ID (integer).

So'rov body:
```json
{ "date": "2026-07-27" }
```

- `date` — **majburiy**, `YYYY-MM-DD` formatida.

Muvaffaqiyat: `200`
```json
{ "data": { "done": true } }
```

Xatolar:
- `400` — noto'g'ri habit id, `date` yo'q/formati noto'g'ri.
- `404` — bu habit topilmadi (o'chirilgan/boshqa foydalanuvchiniki).
- `500` — server xatosi.

Eslatma: `CompletedAt` backendda avtomatik hozirgi vaqt (`time.Now()`) bilan to'ldiriladi — frontend buni yubormaydi, faqat server tomonidan qaytariladi.

### 2.3 POST /api/habits/:id/jazo — "bajarilmadi, jazo" deb belgilash

So'rov body:
```json
{ "date": "2026-07-27", "jazo": "20 marta o'tirib-turish" }
```

- `date` — majburiy.
- `jazo` — majburiy, bo'sh bo'lishi mumkin emas (backend ham handlerda `binding:"required"`, ham service qatlamida qayta tekshiradi — bo'sh string yuborilsa aniq xato qaytadi).

Muvaffaqiyat: `200`
```json
{ "data": { "jazo_saved": true } }
```

Xatolar:
- `400` — noto'g'ri habit id / `date` formati noto'g'ri / `jazo` bo'sh (`"jazo text is required"`).
- `404` — habit topilmadi.
- `500` — server xatosi.

## 3. UI oqimi (tavsiya)

Kunlik ro'yxat ekrani odatda shunday ishlaydi:

1. Sahifa ochilganda `GET /api/entries?date=<tanlangan sana>` chaqiriladi.
2. Har bir habit qatorida ikkita tugma: **"Bajardim"** va **"Bajarmadim"**.
3. **"Bajardim"** bosilsa → `POST /api/habits/:id/done` (body: `{date}`) → muvaffaqiyatli bo'lsa, o'sha qatorni local state'da "done" holatiga o'tkazing (yoki qayta `GET /api/entries` chaqiring).
4. **"Bajarmadim"** bosilsa → modal/input ochib jazo matnini so'rang → `POST /api/habits/:id/jazo` (body: `{date, jazo}`).
5. Ikkala amal ham **upsert** bo'lgani uchun, foydalanuvchi fikrini o'zgartirib qayta bossa (masalan avval "bajarmadim" deb jazo yozgan, keyin "bajardim" desa), xatosiz qayta yozib qo'yaveradi — frontendda "avval o'chirish kerakmi" degan qo'shimcha logika shart emas.

## 4. Frontend misoli (axios + TypeScript)

```ts
// api/entries.ts
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

export interface Entry {
  ID: number;
  HabitID: number;
  UserID: number;
  EntryDate: string;
  Done: boolean;
  Jazo: string | null;
  CompletedAt: string | null;
  CreatedAt: string;
  UpdatedAt: string;
}

export interface DayEntry {
  Habit: Habit;
  Entry: Entry | null;
}

// date: "YYYY-MM-DD" formatida
export const getDay = async (date?: string): Promise<DayEntry[]> =>
  (await api.get("/entries", { params: date ? { date } : {} })).data.data;

export const markDone = async (habitId: number, date: string): Promise<void> => {
  await api.post(`/habits/${habitId}/done`, { date });
};

export const markJazo = async (habitId: number, date: string, jazo: string): Promise<void> => {
  await api.post(`/habits/${habitId}/jazo`, { date, jazo });
};
```

Sana formatlash uchun:
```ts
const toDateParam = (d: Date) => d.toISOString().slice(0, 10); // "YYYY-MM-DD"
```

## 5. Xatoni ushlash

```ts
try {
  await markJazo(habitId, toDateParam(new Date()), "");
} catch (e) {
  if (axios.isAxiosError(e)) {
    const message = e.response?.data?.error ?? "Noma'lum xatolik";
    // masalan: "jazo text is required"
  }
}
```

## 6. Bog'liq: kalendar/statistika endpointlari

Entry ma'lumotlari asosida quyidagi endpointlar ham mavjud (alohida hujjat kerak bo'lsa, `internal/handler` papkasidagi `stats_handler`ni tekshiring):

- `GET /api/dashboard` — umumiy statistika.
- `GET /api/calendar` — kun bo'yicha jami/bajarilgan/jazo sonlari (`CalendarDay`: `Date`, `Total`, `Done`, `Missed`, `WithJazo`).
- `GET /api/analytics` — analitika.
