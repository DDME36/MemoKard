# ผลตรวจ MemoKard และแนวทางพัฒนาทั้งระบบ

วันที่ตรวจ: 2 สิงหาคม 2026  
ขอบเขต: frontend, state/persistence, Supabase integration, PWA, security และความพร้อม deploy

## สรุปผู้บริหาร

ตัวโปรเจกต์มีฐานผลิตภัณฑ์ที่ดี: UI ครบ, รองรับมือถือ/PWA, มี FSRS, IndexedDB และ offline queue อยู่แล้ว ปัญหาหลักไม่ใช่หน้าตา แต่เป็นความน่าเชื่อถือของเส้นทาง cloud และการไม่มี schema/backend bootstrap ใน source control

สถานะโดยรวมก่อนแก้: **มีนัยสำคัญ (ประมาณ 55/100)** เพราะมีโอกาสเขียนทับข้อมูล local ด้วยชุดว่างเมื่อ backend error และเคยมี credential อยู่ใน client source ความมั่นใจ: **สูง** จากโค้ดโดยตรง

## สิ่งที่แก้ในรอบนี้

1. เพิ่ม health check ที่ตรวจ Supabase จริง ไม่อาศัยเพียง `navigator.onLine`
2. หน้า login แจ้งเมื่อ cloud ถูกพัก/ติดต่อไม่ได้ และนำผู้ใช้เข้า local mode ได้ชัดเจน
3. ป้องกัน data loss: การอ่าน decks/cards/review logs ที่ error จะ throw และ store จะรักษา IndexedDB เดิมไว้
4. ป้องกัน sync queue ทิ้งงาน: การเขียน deck/card ที่ Supabase ตอบ error จะ throw เพื่อเข้าคิว retry
5. แก้ community import จาก table `flashcards` เป็น `cards`
6. เอา Discord webhook ออกจาก browser path และย้ายความรับผิดชอบไป Edge Function secret
7. เพิ่ม migration พร้อม RLS สำหรับสร้าง Supabase ใหม่จาก source control
8. เพิ่มคู่มือติดตั้ง, local-only, กู้ backend และ deploy

## แผนที่ความเสี่ยง

| ระดับ | ระบบ | หลักฐาน | แนวทาง |
|---|---|---|---|
| วิกฤต | Secret management | webhook เคยอยู่ใน client และ Edge Function source | revoke URL เดิม, ใช้ Supabase secret, เปิด secret scanning |
| สูง | Cloud sync | fetch error เคยคืน `[]`; mutation error เคยคืน `false/null` | throw error, รักษา local state, retry queue, เพิ่ม integration tests |
| สูง | Backend reproducibility | เดิมไม่มี migration ใน repo | ใช้ migration ที่เพิ่มและทดสอบบน project ใหม่ทุก release |
| สูง | Admin authorization | UI เช็ค admin จาก `VITE_ADMIN_USER_ID` ซึ่งเป็น client-side | บังคับสิทธิ์ด้วย RLS/app metadata role; อย่าเชื่อ UI gate |
| กลาง | Community consistency | พบทั้ง `cards` และ `flashcards` | รวม schema/type ที่ generate จาก Supabase เป็น source of truth |
| กลาง | Test coverage | ไม่มี test script/unit tests | เพิ่ม Vitest + React Testing Library + Playwright smoke tests |
| กลาง | Store coupling | `store.ts` ใหญ่และรวม domain หลายเรื่อง | แยก slices: decks, reviews, achievements, sync metadata |
| ต่ำ | Developer experience | เดิมไม่มี README และ repo copy ไม่มี `.git` metadata | เพิ่ม onboarding, CI และรักษา Git history ในแพ็กเกจส่งมอบ |

## Roadmap แนะนำ

### ระยะ 1: ทำให้ปลอดภัยและกู้ระบบได้ (ทันที)

- Revoke Discord webhook เดิมและสร้างใหม่
- สร้าง Supabase project ใหม่ด้วย migration
- ตั้ง RLS และกำหนด admin ผ่าน `app_metadata.role = admin`
- ทดสอบ restore ด้วยบัญชีใหม่และข้อมูลตัวอย่าง
- เพิ่ม backup/export reminder สำหรับผู้ใช้ local-only

เกณฑ์ผ่าน: backend หายแล้วแอปยังเปิดได้, ข้อมูล local ไม่ลดลง, งานค้างยังอยู่ใน queue และซิงก์ได้หลัง backend กลับมา

### ระยะ 2: ทำ sync ให้เชื่อถือได้ (1–2 สัปดาห์)

- เพิ่ม sync status ใน store: idle/syncing/synced/error พร้อม `lastSyncedAt`
- ทำ exponential backoff และจำแนก error: network, auth, schema, conflict
- เพิ่ม idempotency key และ dead-letter queue สำหรับรายการที่ retry หลายครั้ง
- ใช้ `Promise.allSettled` สำหรับข้อมูลเสริม โดยให้ decks/cards เป็น transaction หลัก
- เพิ่ม merge policy ต่อ user/device แทน server-wins แบบทั้งชุด

เกณฑ์ผ่าน: ปิด backend ระหว่าง create/edit/review แล้วไม่มี action หาย และเปิดกลับมาซิงก์ครบหนึ่งครั้งโดยไม่ duplicate

### ระยะ 3: คุณภาพและ UX (2–4 สัปดาห์)

- เพิ่ม onboarding สั้น ๆ: สร้าง deck → เพิ่ม card → review ใบแรก
- เพิ่มหน้า Settings: storage mode, cloud status, queued actions, export/import และล้างข้อมูล
- ใช้ route จริง (React Router) เพื่อ refresh/deep link หน้า deck/community ได้
- เพิ่ม empty/error/retry state ให้ Explore/Admin แทนการ log เงียบ
- ตรวจ accessibility: focus order, labels, contrast และ reduced motion

### ระยะ 4: การดูแลระยะยาว

- CI: typecheck, lint, unit, production build, migration lint และ Playwright smoke
- Generate TypeScript database types ด้วย Supabase CLI เพื่อลด schema drift
- เพิ่ม Sentry หรือระบบ error telemetry โดยไม่ส่งเนื้อหาการ์ดส่วนตัว
- เพิ่ม uptime monitor สำหรับ Auth/REST และแจ้งก่อน project ถูกพัก
- กำหนด retention/backup policy และทดสอบ disaster recovery รายไตรมาส

## ชุดทดสอบขั้นต่ำที่ควรเพิ่ม

- Store: add/edit/delete/undo และ rehydrate Date/FSRS
- Data-loss regression: fetch Supabase error แล้ว local decks/cards ต้องไม่เปลี่ยน
- Queue: error ต้องคง action, success ต้องลบครั้งเดียว
- Auth: unconfigured, paused, timeout, valid session และ local mode
- Migration: สร้างฐานเปล่า, สมัคร user, RLS ข้าม user ต้องถูกปฏิเสธ
- E2E: create deck → add card → review → reload → offline edit → online sync

## ข้อสังเกตที่ไม่ชัดจากหน้าจอ

- การมี offline queue ไม่ได้แปลว่า offline-safe หาก adapter กลืน error; นี่เป็นสาเหตุหลักของความเสี่ยงข้อมูลหาย ความมั่นใจ: **สูง**
- `navigator.onLine` วัดการเชื่อมต่อเครือข่าย ไม่ได้วัดว่า Supabase project ยังอยู่ จึงต้องมี service health ความมั่นใจ: **สูง**
- UI admin gate เป็นเพียง UX ไม่ใช่ security boundary; สิทธิ์จริงต้องอยู่ใน RLS ความมั่นใจ: **สูง**
- PWA cache ช่วยเปิด shell แบบ offline แต่ข้อมูลผู้ใช้ยังต้องมี export/backup เพราะ browser storage ถูกล้างได้ ความมั่นใจ: **สูง**
