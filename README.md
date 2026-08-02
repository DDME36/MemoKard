# MemoKard

เว็บแอปแฟลชการ์ดภาษาไทยแบบ offline-first ใช้ Active Recall, FSRS, PWA และเลือกซิงก์ข้อมูลผ่าน Supabase ได้

## จุดเด่น

- ใช้งานแบบ local ได้แม้ไม่มี backend หรืออินเทอร์เน็ต
- เก็บข้อมูลหลักใน IndexedDB ผ่าน Zustand persistence
- ซิงก์งานที่ค้างเมื่อ Supabase กลับมาออนไลน์
- รองรับ PWA, dark mode, สถิติ, achievement และ community decks

## เริ่มใช้งาน

ต้องมี Node.js 20 ขึ้นไป

```powershell
npm.cmd ci
npm.cmd run dev
```

ถ้า npm บน Windows มีปัญหา execution policy ให้ใช้ `npm.cmd` แทน `npm` เสมอ

ตรวจคุณภาพก่อน deploy:

```powershell
npm.cmd run build
npm.cmd run lint
```

## ใช้งานโดยไม่มี backend

ไม่ต้องสร้าง `.env` หรือปล่อยค่า Supabase ว่าง หน้าแรกจะแสดงปุ่มทดลองใช้งานและข้อมูลจะอยู่ในอุปกรณ์นั้นผ่าน IndexedDB ผู้ใช้ควร export deck สำรองเป็นระยะ เพราะการล้าง site data ของ browser จะลบข้อมูล local

## สร้างหรือกู้ Supabase

1. สร้าง Supabase project ใหม่
2. ใช้ SQL Editor รัน [migration เริ่มต้น](supabase/migrations/202608020001_initial_schema.sql)
3. คัดลอก `.env.example` เป็น `.env`
4. ใส่ Project URL และ anon key (ห้ามใช้ service-role key ใน Vite)
5. ตั้ง Authentication URL/Redirect URL ให้ตรงกับโดเมน deploy
6. ถ้าใช้ Google login ให้เปิด provider และตั้ง OAuth credentials ใน Supabase
7. ทดสอบสมัคร, login, สร้าง deck/card, review, refresh และ offline/online

ตัวอย่าง `.env`:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
VITE_ADMIN_USER_ID=OPTIONAL_ADMIN_USER_ID
```

### Discord report notification

Webhook ต้องอยู่ใน Supabase secret เท่านั้น:

```powershell
supabase secrets set DISCORD_WEBHOOK_URL=YOUR_NEW_WEBHOOK_URL
supabase functions deploy discord-report-notification
```

จากนั้นสร้าง Database Webhook ให้ event `INSERT` ของ `public.deck_reports` เรียก Edge Function นี้

> สำคัญ: webhook เดิมเคยถูกฝังใน source/client bundle ให้ revoke และสร้าง URL ใหม่ก่อน deploy

## Deploy

กำหนด build command เป็น `npm run build` และ output directory เป็น `dist` ได้กับ Vercel, Netlify หรือ Cloudflare Pages ต้องตั้ง environment variables ในผู้ให้บริการ deploy ด้วย

## โครงสร้างหลัก

- `src/store/store.ts` — local source of truth, FSRS และ Zustand persistence
- `src/store/supabaseStore.ts` — mapping ระหว่าง model กับ Supabase
- `src/store/syncQueue.ts` — offline mutation queue
- `src/store/communityStore.ts` — community decks, rating และ report
- `src/contexts/AuthContext.tsx` — session, local mode และ backend health
- `supabase/migrations/` — schema และ RLS ที่สร้างซ้ำได้จาก source control

อ่านผล audit และ roadmap ต่อได้ที่ [PROJECT_AUDIT_TH.md](PROJECT_AUDIT_TH.md)
