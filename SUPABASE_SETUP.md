# 🚀 Supabase Setup Guide

## ขั้นตอนการตั้งค่า Supabase

### 1. สร้าง Supabase Project

1. ไปที่ [supabase.com](https://supabase.com)
2. คลิก "Start your project"
3. Sign in ด้วย GitHub
4. คลิก "New Project"
5. กรอกข้อมูล:
   - **Name**: daily-memory (หรือชื่อที่ต้องการ)
   - **Database Password**: สร้างรหัสผ่านที่แข็งแรง (เก็บไว้ดีๆ)
   - **Region**: เลือก Southeast Asia (Singapore) - ใกล้ที่สุด
   - **Pricing Plan**: Free (เพียงพอสำหรับแอปนี้)
6. คลิก "Create new project"
7. รอ 1-2 นาทีให้ project สร้างเสร็จ

### 2. ดึง API Keys

1. ไปที่ **Settings** (เมนูซ้าย)
2. คลิก **API**
3. คัดลอกค่าเหล่านี้:
   - **Project URL** (ตัวอย่าง: `https://xxxxx.supabase.co`)
   - **anon public** key (ตัวอย่าง: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)

### 3. ตั้งค่า Environment Variables

1. สร้างไฟล์ `.env` ในโฟลเดอร์ `daily-memory/`:

```bash
# คัดลอกจาก .env.example
cp .env.example .env
```

2. แก้ไขไฟล์ `.env`:

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

⚠️ **สำคัญ**: ไฟล์ `.env` อยู่ใน `.gitignore` แล้ว ไม่ต้องกังวลเรื่อง commit ขึ้น Git

### 4. รัน Database Schema

1. ไปที่ **SQL Editor** ในเมนูซ้าย
2. คลิก **New query**
3. คัดลอกเนื้อหาจากไฟล์ `supabase-schema.sql` ทั้งหมด
4. วางลงใน SQL Editor
5. คลิก **Run** (หรือกด Ctrl+Enter)
6. ตรวจสอบว่าไม่มี error (ควรเห็น "Success. No rows returned")

### 5. ตั้งค่า Authentication

#### 5.1 Email Authentication (เปิดอยู่แล้วโดย default)

1. ไปที่ **Authentication** → **Providers**
2. ตรวจสอบว่า **Email** เปิดอยู่ (toggle สีเขียว)

#### 5.2 Google OAuth (Optional แต่แนะนำ)

1. ไปที่ [Google Cloud Console](https://console.cloud.google.com)
2. สร้าง Project ใหม่ (หรือเลือก project ที่มี)
3. ไปที่ **APIs & Services** → **Credentials**
4. คลิก **Create Credentials** → **OAuth client ID**
5. เลือก **Web application**
6. กรอก:
   - **Name**: Daily Memory
   - **Authorized JavaScript origins**: 
     - `http://localhost:5173` (สำหรับ dev)
     - `https://your-domain.com` (สำหรับ production)
   - **Authorized redirect URIs**:
     - `https://xxxxx.supabase.co/auth/v1/callback`
7. คัดลอก **Client ID** และ **Client Secret**
8. กลับไปที่ Supabase → **Authentication** → **Providers**
9. เปิด **Google**
10. วาง Client ID และ Client Secret
11. คลิก **Save**

### 6. ตั้งค่า Storage (สำหรับรูปภาพในการ์ด)

Storage bucket `card-images` ถูกสร้างอัตโนมัติจาก SQL schema แล้ว

ตรวจสอบ:
1. ไปที่ **Storage** ในเมนูซ้าย
2. ควรเห็น bucket ชื่อ `card-images`
3. คลิกเข้าไป → **Policies** → ควรเห็น policies 3 อัน:
   - Users can upload their own images
   - Users can view their own images
   - Users can delete their own images

### 7. ทดสอบการเชื่อมต่อ

1. รัน dev server:

```bash
npm run dev
```

2. เปิดเบราว์เซอร์ไปที่ `http://localhost:5173`
3. ควรเห็นหน้า Login/Register
4. ลองสมัครสมาชิกด้วยอีเมล
5. ตรวจสอบอีเมลเพื่อยืนยันบัญชี
6. Login เข้าสู่ระบบ

## 🎯 ตรวจสอบว่าทำงานถูกต้อง

### ใน Supabase Dashboard:

1. **Table Editor** → **decks** → ควรว่างเปล่า (ยังไม่มีข้อมูล)
2. **Table Editor** → **cards** → ควรว่างเปล่า
3. **Table Editor** → **user_stats** → ควรมี 1 row (user ที่เพิ่งสมัคร)
4. **Authentication** → **Users** → ควรเห็น user ที่เพิ่งสมัคร

### ในแอป:

1. สร้างชุดการ์ดใหม่
2. เพิ่มการ์ด
3. Refresh หน้า → ข้อมูลยังอยู่
4. เปิดแท็บใหม่ → Login ด้วย user เดียวกัน → ข้อมูลเห็นเหมือนกัน ✅

## 🔒 Security Checklist

- ✅ RLS (Row Level Security) เปิดอยู่ทุก table
- ✅ Users สามารถเห็นเฉพาะข้อมูลของตัวเองเท่านั้น
- ✅ API keys เก็บใน `.env` (ไม่ commit ขึ้น Git)
- ✅ Storage policies ป้องกันการเข้าถึงรูปของคนอื่น

## 🆓 Free Tier Limits

Supabase Free Tier มี:
- ✅ 500 MB database storage
- ✅ 1 GB file storage
- ✅ 50,000 monthly active users
- ✅ 2 GB bandwidth/month
- ✅ Realtime unlimited
- ✅ 50,000 monthly email sends

**เพียงพอสำหรับแอปนี้มากๆ!** 🎉

## 🐛 Troubleshooting

### ปัญหา: "Invalid API key"
- ตรวจสอบว่าคัดลอก API key ถูกต้อง (ไม่มีช่องว่างหน้า-หลัง)
- ตรวจสอบว่าใช้ **anon public** key (ไม่ใช่ service_role key)

### ปัญหา: "Failed to fetch"
- ตรวจสอบว่า Project URL ถูกต้อง
- ตรวจสอบว่า Supabase project ยังทำงานอยู่ (ไม่ถูก pause)

### ปัญหา: "Row Level Security policy violation"
- ตรวจสอบว่ารัน SQL schema ครบทุกบรรทัด
- ตรวจสอบว่า RLS policies ถูกสร้างแล้ว

### ปัญหา: "Email not confirmed"
- ตรวจสอบอีเมล (รวมถึง Spam folder)
- หรือไปที่ **Authentication** → **Users** → คลิก user → **Confirm email**

## 📚 เอกสารเพิ่มเติม

- [Supabase Documentation](https://supabase.com/docs)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Storage](https://supabase.com/docs/guides/storage)
- [Realtime](https://supabase.com/docs/guides/realtime)

---

**ติดปัญหา?** เปิด Issue ใน GitHub หรือถามใน Discord!
