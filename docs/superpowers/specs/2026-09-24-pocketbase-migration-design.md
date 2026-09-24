# Spec: ย้าย MemoKard ไป PocketBase ให้ครบ (โปรเจกต์ย่อย #1)

วันที่: 24 กันยายน 2026
สถานะ: รอผู้ใช้ตรวจ

## 1. เป้าหมายและบริบท

**สิ่งที่ผู้ใช้ต้องการ (พูดเอง)**
- ย้ายออกจาก Supabase + Vercel ไปใช้เซิร์ฟเวอร์ Oracle Ubuntu ของตัวเอง ไม่พึ่งบริการข้างนอก
- ข้อมูลใน Supabase เดิมเป็นแค่ของทดลอง ไม่ต้องย้าย ลบทิ้งได้
- ล็อกอินด้วยชื่อผู้ใช้ + รหัสผ่านเท่านั้น
- แอปเปิดให้คนทั่วไปใช้ได้ แต่เน้นใช้ส่วนตัวก่อน และให้คนแชร์ต่อกันเอง

**สิ่งที่ Claude ตัดสินใจแทน (ผู้ใช้มอบให้เลือก)**
- Backend คือ PocketBase ตัวเดียว (auth + ฐานข้อมูล + เก็บไฟล์ + สคริปต์ฝั่งเซิร์ฟเวอร์)
- คงแนวทาง offline-first: บันทึกลงเครื่องก่อน แล้วซิงก์ผ่านคิว
- คงโหมด "ลองใช้โดยไม่ล็อกอิน" ไว้ เมื่อสมัครแล้วข้อมูลในเครื่องจะย้ายขึ้นบัญชีให้
- ตัด Google login และ Discord webhook ทิ้ง

**เกณฑ์สำเร็จ**
1. ในโค้ดไม่มีอะไรเรียก Supabase เหลืออยู่ (`@supabase/supabase-js` ถูกถอดออกจาก package.json)
2. ขั้นตอน สมัคร → สร้างชุด → เพิ่มการ์ด (มีรูป) → ทบทวน → รีเฟรช ต้องได้ข้อมูลครบ โดยข้อมูลอยู่บน PocketBase จริง
3. ตัดเน็ตแล้วแก้/ทบทวน จากนั้นต่อเน็ต คิวต้องซิงก์ครบ ไม่ซ้ำ และไม่หาย
4. เครื่อง A แก้การ์ด แล้วเปิดเครื่อง B ต้องเห็นการแก้ ส่วนการลบในเครื่อง A ต้องหายไปในเครื่อง B ด้วย
5. เผยแพร่ชุด → ผู้ใช้อื่นค้นหา → นำเข้า → ให้ดาว → รายงาน ทำงานครบ
6. ผู้ใช้ธรรมดาเรียก API ลบชุดของคนอื่น แก้ `role` ตัวเอง หรือดูรายงานไม่ได้ (ถูกปฏิเสธที่เซิร์ฟเวอร์)
7. `npm run build`, `npm run lint` และ `npm test` ผ่าน

**นอกขอบเขต (ทำในโปรเจกต์ย่อยถัดไป)**
- ระบบ URL จริงและลิงก์แชร์ `/d/<id>` (โปรเจกต์ #1.5 ทำต่อทันที)
- สคริปต์ deploy, CI และ git remote ใหม่ (#2)
- แยก store ใหญ่, รื้อ UI (#3, #4) ส่วน `store.ts` จะแก้เฉพาะจุดที่เกี่ยวกับการซิงก์

## 2. ปัญหาที่พบในโค้ดปัจจุบัน

| # | ปัญหา | ที่อยู่ | ผลกระทบ |
|---|---|---|---|
| P1 | ล็อกอินผ่าน PocketBase แต่ `store.ts` เขียน/อ่านข้อมูลผ่าน `supabaseStore` | `store.ts` ~15 จุด | ข้อมูลไม่ขึ้นเซิร์ฟเวอร์ |
| P2 | ID เป็น UUID 36 ตัว แต่ PocketBase รับแค่ 15 ตัว `[a-z0-9]` | `store.ts:488`, `:631` | create ถูกปฏิเสธ แล้วคิวค้างตลอดไป |
| P3 | คิวส่งซ้ำรายการแรกตลอดแม้เป็น error ถาวร (400/403/404) | `syncQueue.ts:179` | งานหลังจากนั้นไม่ถูกส่งเลย |
| P4 | ตารางไม่มี `created`/`updated` (PB ≥0.23 ต้องประกาศเอง) | `pb_schema.json` | วันที่ผิด ดึงเฉพาะส่วนที่เปลี่ยนไม่ได้ |
| P5 | รูปการ์ด (`questionImage`/`answerImage`) ไม่ถูกซิงก์ | schema + store | เปลี่ยนเครื่องแล้วรูปหาย |
| P6 | `syncFromSupabase` แทนที่ข้อมูลในเครื่องทั้งชุด | `store.ts:374` | การแก้ที่ยังรอในคิวหายจากจอ |
| P7 | ต่อ filter ด้วย string (`user = "${userId}"`) | `pocketbaseStore.ts`, `AuthContext.tsx:198` | เสี่ยง filter injection |
| P8 | `cards.deck` เป็น text ไม่ใช่ relation | schema | ลบชุดแล้วการ์ดค้าง |
| P9 | ระบบชุมชน/แอดมิน/รายงานยังเป็น Supabase 100% | `communityStore.ts`, `AdminPage.tsx` | ใช้ไม่ได้บน Oracle |
| P10 | เช็กแอดมินฝั่งเบราว์เซอร์ (`VITE_ADMIN_USER_ID`) | `App.tsx` | ปลอมสิทธิ์ได้ |
| P11 | ไม่มีเทสต์เลย | — | แก้แล้วพังโดยไม่รู้ตัว |

## 3. สถาปัตยกรรม

```
UI → store.ts (Zustand + IndexedDB, แหล่งความจริงในเครื่อง)
        │ ทุกการเขียน
        ▼
   syncQueue.ts ──► pocketbaseStore.ts ──► PocketBase (Oracle)
        ▲                                     │
        └──── syncEngine.pull() ◄─────────────┘  (ดึงเฉพาะที่ updated > lastPulledAt)
```

### 3.1 หน่วยงานของโค้ด

| ไฟล์ | หน้าที่เดียว | พึ่งพา |
|---|---|---|
| `src/lib/pocketbase.ts` | สร้าง client, health check, `newId()` สร้าง ID 15 ตัว | `pocketbase` |
| `src/store/pocketbaseStore.ts` | แปลง record ↔ model (Deck/Flashcard/…) และเรียก API พร้อม **throw error เสมอ** ไม่คืน `false` | `lib/pocketbase` |
| `src/store/syncQueue.ts` | เก็บคิวใน IndexedDB, ส่งทีละรายการ, retry แบบ backoff, แยก error ชั่วคราว/ถาวร | `pocketbaseStore` |
| `src/store/syncEngine.ts` (ใหม่) | `pull()`: ดึงข้อมูลที่เปลี่ยน แล้วรวมกับข้อมูลในเครื่อง, `adoptGuestData()`: ย้ายข้อมูลโหมดทดลองขึ้นบัญชี | `pocketbaseStore`, `syncQueue` |
| `src/store/merge.ts` (ใหม่) | ฟังก์ชันบริสุทธิ์ `mergeRecords(local, remote, pendingIds)` ใช้เทสต์ได้ง่าย | — |
| `src/store/communityStore.ts` | ชุมชนบน PocketBase (ฟังก์ชันชื่อเดิม ข้างในใหม่) | `lib/pocketbase` |
| `deploy/pocketbase/pb_migrations/*.js` (ใหม่) | สร้างตารางและกฎ แทน `pb_schema.json` เพื่อให้ขึ้นเครื่องใหม่ได้เองอัตโนมัติ | PocketBase |
| `deploy/pocketbase/pb_hooks/*.pb.js` (ใหม่) | นับดาว/นำเข้า/รายงาน, ซ่อนชุดอัตโนมัติ, กันแก้ `role` | PocketBase |

ลบ: `src/lib/supabase.ts`, `src/store/supabaseStore.ts`, โฟลเดอร์ `supabase/`, `scripts/*migration*`, alias `supabaseStore` และแพ็กเกจ `@supabase/supabase-js`
เปลี่ยนชื่อ: `syncFromSupabase` → `syncFromServer`

### 3.2 ID

- ใช้ `newId()` สร้าง ID 15 ตัว `[a-z0-9]` ในเครื่อง (ใช้ `crypto.getRandomValues`) แทน `crypto.randomUUID()`
- ข้อมูลเก่าในเครื่องที่เป็น UUID: ตอน rehydrate ให้แปลงเป็น ID ใหม่หนึ่งครั้ง พร้อมแก้ `deckId` ของการ์ดให้ตรง (มี migration version ใน persist)

### 3.3 Schema บน PocketBase

ทุกตารางมี `created`/`updated` (autodate) และ `deleted` (bool, soft delete)

**ข้อมูลส่วนตัว** (กฎทุกข้อ: `@request.auth.id != "" && user = @request.auth.id`, create ต้อง `@request.body.user = @request.auth.id`)
- `decks`: user(rel users, cascade), name(text ≤100), color(text ≤20), linked_public_deck(rel public_decks, ว่างได้), deleted
- `cards`: user(rel), deck(rel decks, cascade), question(text ≤20000), answer(≤20000), question_image(file ≤1MB), answer_image(file ≤1MB), fsrs_state(json), next_review(date), deleted
  — ตัดฟิลด์ SM-2 (`interval/repetition/ease_factor`) เพราะ FSRS เป็นแหล่งความจริงแล้ว ส่วนใน model ฝั่งเครื่องยังคงไว้ได้ แต่ไม่ส่งขึ้นเซิร์ฟ
- `review_logs`: user, card(rel cards, cascade), rating(1–4), reviewed_at(date) — create/list เท่านั้น ห้าม update/delete
- `user_progress`: รวม `user_stats` + `user_achievements` เดิมไว้ตารางเดียว, unique(user)

**ชุมชน**
- `public_decks`: owner(rel users), source_deck(text), title, description, category, tags(json), card_count, import_count, rating_avg, rating_count, report_count, hidden(bool)
  — list/view: `hidden = false || owner = @request.auth.id || @request.auth.role = "admin"`
  — update/delete: owner หรือ admin; ฟิลด์ตัวนับแก้ได้เฉพาะ hook
- `public_deck_cards`: public_deck(rel, cascade), position, question, answer, question_image, answer_image
- `deck_ratings`: user, public_deck, stars(1–5), unique(user, public_deck)
- `deck_imports`: user, public_deck, unique(user, public_deck)
- `deck_reports`: user, public_deck, reason(select), detail(≤500), status(open/resolved/dismissed), unique(user, public_deck); list เฉพาะ admin หรือเจ้าของรายงาน

**ผู้ใช้**
- `users` (auth collection): เปิดล็อกอินด้วย username+password, ปิด OAuth; เพิ่ม `role` (select: user/admin, ค่าเริ่ม user); hook บังคับว่าเฉพาะ superuser แก้ `role` ได้
- admin คนแรก: ตั้งผ่านหน้า PocketBase dashboard (`/_/`)

### 3.4 การซิงก์

**ส่งขึ้น (คิว)**
- ทุก action ใน `store.ts` บันทึกลงเครื่องแล้ว `syncQueue.enqueue()` เท่านั้น ไม่เรียก server ตรงอีกต่อไป
- action ใช้ `upsert` (create ถ้าไม่มี, update ถ้ามี, ด้วย ID ที่รู้ล่วงหน้า) จึงส่งซ้ำได้ปลอดภัย
- รวม action ซ้ำ: UPDATE_CARD/REVIEW_CARD ใบเดียวกันเหลืออันล่าสุด; DELETE ตามหลัง CREATE ที่ยังไม่ส่ง ตัดทั้งคู่ทิ้ง
- error ชั่วคราว (เน็ต, 5xx, 429): หยุดคิว ลองใหม่แบบ backoff 2s → 4s → … สูงสุด 5 นาที
- error 401: หยุดคิว แล้วแจ้ง UI ให้ล็อกอินใหม่
- error ถาวร (400/403/404): ย้ายไป **dead-letter** แล้วทำรายการถัดไปต่อ UI แสดงจำนวนรายการที่ส่งไม่ได้ พร้อมปุ่ม "ลองใหม่"/"ทิ้ง"
- รูป: เก็บในเครื่องเป็น Blob ใน IndexedDB แล้วส่งเป็น multipart ไปยังฟิลด์ file

**ดึงลง**
- `pull()` ทำงานเมื่อ: ล็อกอิน, เปิดแอป, กลับมาออนไลน์ และทุก 5 นาทีขณะเปิดแอป
- ดึงแต่ละตาราง `filter: updated > {:since}` แล้วเก็บ `lastPulledAt` ต่อผู้ใช้
- รวม (`mergeRecords`):
  - record ที่ยังมี action ค้างในคิว → เก็บของในเครื่อง
  - นอกนั้นเทียบ `updated` แล้วใหม่กว่าชนะ; `deleted=true` → ลบในเครื่อง
  - review_logs → รวมแบบ union ตาม ID (ไม่มีทับกัน) แล้วคำนวณ streak/heatmap ใหม่จาก logs
- ลบถาวร: hook ลบ record ที่ `deleted=true` เกิน 30 วัน (เครื่องที่ไม่ได้เปิดเกิน 30 วันจะ pull แบบเต็มแทน)

**โหมดทดลอง → บัญชี**
- ผู้ใช้โหมดทดลองสมัคร/ล็อกอินแล้วถ้ามีข้อมูลในเครื่อง ให้ถามว่า "นำข้อมูลในเครื่องขึ้นบัญชีไหม?" ถ้าตกลง enqueue CREATE ทุกชุด/การ์ด/log

### 3.5 ความปลอดภัยและกันสแปม

- ทุก filter ใช้ `pb.filter('user = {:uid}', { uid })`
- เปิด rate limit ของ PocketBase: สมัคร 5 ครั้ง/ชม./IP, ล็อกอิน 10 ครั้ง/นาที, สร้าง public_deck 10 ครั้ง/วัน, รายงาน 20 ครั้ง/วัน
- ขนาดข้อความและไฟล์จำกัดใน schema ตามข้อ 3.3
- สิทธิ์แอดมินใช้ `@request.auth.role = "admin"` ในกฎ; UI ซ่อนเมนูตาม `role` ได้ แต่ไม่ถือเป็นการป้องกัน
- ลบ `VITE_ADMIN_USER_ID`

### 3.6 Hooks ฝั่งเซิร์ฟเวอร์ (`pb_hooks`)

- หลังสร้าง/แก้/ลบ `deck_ratings` → คำนวณ `rating_avg`, `rating_count` ใหม่
- หลังสร้าง `deck_imports` → `import_count += 1`
- หลังสร้าง `deck_reports` → `report_count += 1`; ถ้ามีรายงานสถานะ open ≥ 3 → `hidden = true`
- ก่อนแก้ `users` → ถ้า `role` เปลี่ยนและไม่ใช่ superuser → ปฏิเสธ
- cron รายวัน → ลบ soft-deleted เกิน 30 วัน

### 3.7 หน้าแอดมิน

- `AdminPage.tsx` เปลี่ยนมาใช้ PocketBase: ดูรายงาน (open ก่อน), ซ่อน/เลิกซ่อน/ลบชุด, เปลี่ยนสถานะรายงาน, รีเซ็ตรหัสผ่านผู้ใช้ (ตั้งรหัสชั่วคราว) ผ่าน custom route `POST /api/memokard/admin/reset-password` ใน `pb_hooks` ที่ตรวจ `role = "admin"` ก่อน เพราะกฎปกติของ `users` ไม่เปิดให้แก้บัญชีคนอื่น
- ตัวเลขรายงานค้างแสดงบนเมนูแอดมิน

## 4. การจัดการ error ใน UI

- `SyncStatusBadge`: ซิงก์แล้ว (เวลา) / กำลังซิงก์ (จำนวนค้าง) / ออฟไลน์ / มีรายการส่งไม่ได้ (กดดูได้) / ต้องล็อกอินใหม่
- เซิร์ฟล่ม: แอปยังใช้ได้ตามปกติ งานเข้าคิว (พฤติกรรมเดิมใน `AuthContext` health check คงไว้)
- หน้า Explore/ชุมชน: ถ้าเซิร์ฟล่มแสดง "ติดต่อเซิร์ฟเวอร์ไม่ได้" + ปุ่มลองใหม่ ไม่ใช่รายการว่าง

## 5. การทดสอบ

**Unit (Vitest)**
- `merge.ts`: ของในเครื่องที่ค้างในคิวต้องชนะ, remote ใหม่กว่าต้องชนะ, `deleted` ต้องลบ, logs ต้อง union
- `syncQueue`: error ชั่วคราวต้องคงรายการ, error ถาวรต้องไป dead-letter และคิวต้องเดินต่อ, success ต้องลบครั้งเดียว, รวม action ซ้ำถูกต้อง
- `newId()`: ยาว 15 ตัวและอยู่ใน `[a-z0-9]`; migration UUID→ID ใหม่ต้องแก้ `deckId` ของการ์ดครบ

**Integration (Vitest + PocketBase จริงบนเครื่อง)**
- รัน PocketBase binary ชั่วคราวพร้อม `pb_migrations` + `pb_hooks` บนพอร์ตสุ่ม
- ทดสอบกฎ: user B อ่าน/แก้ของ user A ไม่ได้, user แก้ role ตัวเองไม่ได้, ไม่ใช่แอดมินอ่าน reports ไม่ได้
- ทดสอบ hooks: ให้ดาวแล้ว avg ถูก, รายงาน 3 ครั้งแล้ว hidden

**Manual (เบราว์เซอร์)** ตามเกณฑ์สำเร็จข้อ 2–5

## 6. ความเสี่ยง

- ขนาด IndexedDB: รูปทำให้ข้อมูลในเครื่องใหญ่ขึ้น ใช้ `compressImage` ที่มีอยู่ (≤1MB) และแสดงพื้นที่ที่ใช้ในหน้า Settings ภายหลัง
- เวอร์ชัน PocketBase: API ยังเป็น 0.x เปลี่ยนได้ ให้ปักเวอร์ชันเดียวกันทั้ง server (setup script), SDK และเทสต์
- นาฬิกาเครื่องผู้ใช้เพี้ยน: ใช้ `updated` จากเซิร์ฟเวอร์ในการเทียบ ไม่ใช้เวลาในเครื่อง
