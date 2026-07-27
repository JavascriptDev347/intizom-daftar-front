# Habitni kunlar bo'yicha davom ettirish va kunga xos o'chirish — Frontend qo'llanma

Backendga ikkita yangi funksionallik **haqiqiy, bazada saqlanadigan** holatda qo'shildi (frontend qayta yozilganda yo'qolmaydi, boshqa qurilmada ham ishlaydi):

1. **Pause** — "bu odatni davom ettirasizmi?" tasdig'iga "yo'q" javobi. Habit shu kundan keyin ko'rinmay qoladi, lekin **o'tgan kunlar tarixi buzilmaydi**.
2. **Hide** — bitta kunga xos "o'chirish". Habit **faqat o'sha kunda** ko'rinmaydi, boshqa hech qanday kunga (na o'tmish, na kelajak) ta'sir qilmaydi.

Bu ikkalasi ham mavjud `DELETE /api/habits/:id` (archive — butunlay, hamma kun uchun o'chirish) dan **butunlay boshqa, alohida** amallar. Ularni almashtirmang.

[[habit-crud-frontend]] va [[entry-crud-frontend]] bilan birga o'qing — bu yerda faqat yangi qo'shilgan qism tasvirlangan.

## 1. Yangi endpointlar

| Amal | Method | URL | Body |
|---|---|---|---|
| Pause (ertadan davom ettirmaslik) | POST | `/api/habits/:id/pause` | `{ "date": "YYYY-MM-DD" }` |
| Hide (bitta kunga xos o'chirish) | POST | `/api/habits/:id/hide` | `{ "date": "YYYY-MM-DD" }` |

Ikkalasi ham `protected` guruhida — `Authorization: Bearer <token>` shart. Javob formati boshqa endpointlar bilan bir xil: `{ "data": ... }` / `{ "error": "..." }`.

### 1.1 POST /api/habits/:id/pause

**Nima uchun**: foydalanuvchi "bu odatni davom ettirasizmi?" degan savolga **"Yo'q"** desa, shu endpoint chaqiriladi.

So'rov:
```json
{ "date": "2026-07-27" }
```

`date` — tasdiqlash so'ralayotgan kun (odatda bugungi sana). Backend ichkarida `pausedFrom = date + 1 kun` deb hisoblab, `habits.paused_from` ustuniga yozadi.

**Natija**:
- `date` va undan oldingi barcha kunlarda habit **odatdagidek ko'rinaveradi** (`GET /api/entries?date=<date>` yoki undan oldingi sanalar uchun).
- `date`dan keyingi (ertangi va undan keyingi) barcha kunlar uchun `GET /api/entries` javobida bu habit **umuman chiqmaydi**.
- `GET /api/habits` (umumiy ro'yxat) ham bu habitni endi qaytarmaydi — chunki u "faol emas" deb hisoblanadi kelajak nuqtai nazaridan. **Diqqat**: hozircha `GET /api/habits` sanaga bog'liq emas, shuning uchun pause qilingan habit shu ro'yxatdan darhol tushib qoladi (archive bilan bir xil ta'sir, lekin `is_archived` o'zgarmaydi — faqat `paused_from` to'ldiriladi). Agar habitlarni boshqarish sahifasida (tahrirlash ekrani) pause qilingan habitlarni ham ko'rsatish/belgilash kerak bo'lsa, buni alohida ayting — hozircha bunday endpoint yo'q.

Muvaffaqiyat: `200`
```json
{ "data": { "paused": true } }
```

Xatolar:
- `400` — noto'g'ri habit id, `date` yo'q yoki formati noto'g'ri (`YYYY-MM-DD` bo'lishi shart).
- `404` — habit topilmadi / boshqa foydalanuvchiniki.
- `500` — server xatosi.

**Muhim**: "Ha" javobi uchun **hech qanday endpoint chaqirish shart emas** — chunki habit standart holatda cheksiz davom etadi (`paused_from = NULL`). "Ha" bosilganda frontend shunchaki modalni yopib qo'ya qoladi. Agar "Ha" bosilganidan keyin bugun shu modal qayta chiqmasligi kerak bo'lsa, buni **frontend tarafida** (masalan `sessionStorage`da "bugun ko'rsatildi" deb belgilab) hal qiling — bu server holatiga bog'liq emas.

**Qayta yoqish (unpause) hozircha yo'q**. Agar foydalanuvchi avval "Yo'q" degan bo'lsa-yu, keyin fikridan qaytib "davom ettiray" desa — buning uchun hozirda backend endpointi mavjud emas. Kerak bo'lsa, alohida ayting, `POST /api/habits/:id/resume` qo'shib beraman.

### 1.2 POST /api/habits/:id/hide

**Nima uchun**: kunlik ro'yxatdagi bitta qatorni "shu kun uchun" o'chirish tugmasi bosilganda.

So'rov:
```json
{ "date": "2026-07-27" }
```

**Natija**:
- `GET /api/entries?date=2026-07-27` chaqirilganda bu habit ro'yxatda **umuman chiqmaydi**.
- `GET /api/entries?date=<boshqa istalgan sana>` — habit **odatdagidek** ko'rinadi (hech narsa o'zgarmagan).
- Agar o'sha kun uchun avval "done" yoki "jazo" yozilgan bo'lsa ham, ular saqlanib qoladi (ma'lumot yo'qolmaydi) — faqat ro'yxatda ko'rinmay qoladi.

Muvaffaqiyat: `200`
```json
{ "data": { "hidden": true } }
```

Xatolar:
- `400` — noto'g'ri habit id, `date` yo'q/formati noto'g'ri.
- `404` — habit topilmadi.
- `500` — server xatosi.

**Qayta ko'rsatish (unhide) hozircha yo'q**. Bosilgandan keyin foydalanuvchi fikridan qaytolmaydi (endi shu kun uchun qaytadan ko'rinmaydi). Agar "bekor qilish" tugmasi kerak bo'lsa, alohida ayting — `POST /api/habits/:id/unhide` qo'shib beraman.

## 2. `GET /api/entries` javobiga ta'siri (juda muhim)

Bu ikkala funksiya ham **backendning o'zida** filtrlanadi — frontend hech qanday qo'shimcha filtr yozishi shart emas. `GET /api/entries?date=...` javobi endi avtomatik ravishda:

- pause qilingan (o'sha sanada `paused_from <= date`) habitlarni,
- va o'sha sanaga hide qilingan habitlarni

ro'yxatdan chiqarib tashlab qaytaradi. Ya'ni frontend oldingi kabi shunchaki `data` massivini render qilaveradi — qo'shimcha `if (hidden)` yoki `if (paused)` tekshiruvi kerak emas, chunki ular ro'yxatga umuman kirmaydi.

## 3. UI oqimi (tavsiya)

### 3.1 "Davom ettirasizmi?" modali

1. Kunlik sahifa ochilganda (`GET /api/entries?date=<bugun>`), har bir qaytgan habit uchun frontendda **shu kun uchun tasdiqlov ko'rsatilganmi** tekshiring (buni `sessionStorage`da saqlang — server holatiga bog'liq emas, faqat "modalni qayta ko'rsatmaslik" uchun).
2. Faqat **kechadan buyon mavjud bo'lgan** (`Habit.CreatedAt` bugundan oldin) habitlar uchun modal ko'rsating — bugun yangi yaratilgan habitga "davom ettirasizmi" deb so'rash shart emas.
3. **"Ha"** → hech qanday so'rov yubormang, faqat `sessionStorage`ga "bugun tasdiqlangan" deb belgilang.
4. **"Yo'q"** → `POST /api/habits/:id/pause` ga `{ date: <bugungi sana> }` yuboring. Muvaffaqiyatli bo'lsa, shu habitni joriy ro'yxatdan olib tashlashingiz shart emas (u ertangi kundan boshlab yo'qoladi, bugun hali ko'rinaveradi) — lekin xohlasangiz UI'da "ertadan to'xtatiladi" degan belgi qo'yishingiz mumkin.

```ts
async function handleContinueAnswer(habitId: number, date: string, continueIt: boolean) {
  markAskedToday(habitId, date); // sessionStorage, modal qayta chiqmasin
  if (!continueIt) {
    await api.post(`/habits/${habitId}/pause`, { date });
  }
}
```

### 3.2 "Bugun uchun o'chirish"

```ts
async function hideForToday(habitId: number, date: string) {
  await api.post(`/habits/${habitId}/hide`, { date });
  // qatorni joriy ro'yxatdan olib tashlang (optimistic update)
  // yoki GET /api/entries?date=... ni qayta chaqiring
}
```

UI'da bu tugmani **"Habitni butunlay o'chirish"** (archive, `DELETE /api/habits/:id`) tugmasidan aniq vizual farqlang — masalan:

| Tugma | Matn taklifi | Ta'siri |
|---|---|---|
| Hide | "Bugun uchun o'tkazib yuborish" | Faqat shu kun, qaytarib bo'lmaydi (hozircha) |
| Archive | "Habitni butunlay o'chirish" | Barcha kunlar, shu jumladan tarix ham |

## 4. To'liq TypeScript misoli

```ts
// api/habits.ts ga qo'shimcha

export const pauseHabit = async (habitId: number, date: string): Promise<void> => {
  await api.post(`/habits/${habitId}/pause`, { date });
};

// api/entries.ts ga qo'shimcha

export const hideEntryForDay = async (habitId: number, date: string): Promise<void> => {
  await api.post(`/habits/${habitId}/hide`, { date });
};
```

Xatoni ushlash — boshqa endpointlar bilan bir xil naqsh:
```ts
try {
  await pauseHabit(habitId, toDateParam(new Date()));
} catch (e) {
  if (axios.isAxiosError(e)) {
    const message = e.response?.data?.error ?? "Noma'lum xatolik";
  }
}
```
