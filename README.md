# MemoKard - เมมโมการ์ด

Progressive Web App (PWA) สำหรับฝึกจำด้วยระบบ Active Recall และ Spaced Repetition

## Features

- **Flashcard System** - ระบบการ์ดคำถาม-คำตอบ พร้อมรองรับรูปภาพ
- **SM-2 Algorithm** - อัลกอริทึม Spaced Repetition แบบ SuperMemo-2
- **Dark Mode** - ปรับตามเวลาประเทศไทยอัตโนมัติ (18:00-06:00)
- **Thai Day Colors** - สีประจำวันตามวันไทย
- **Activity Heatmap** - กราฟแสดงกิจกรรมการทบทวนรายวัน
- **Cloud Sync** - ซิงค์ข้อมูลผ่าน Supabase
- **PWA Ready** - ติดตั้งเป็นแอปบนมือถือและคอมพิวเตอร์ได้
- **Offline Support** - ใช้งานได้แม้ไม่มีอินเทอร์เน็ต

## Tech Stack

- **Vite** + **React** + **TypeScript**
- **Tailwind CSS** + **Framer Motion**
- **Zustand** - State management
- **Supabase** - Auth + Database
- **vite-plugin-pwa** - PWA support

## Getting Started

```bash
npm install
npm run dev
```

## Environment Variables

สร้างไฟล์ `.env` จาก `.env.example`:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

ดูรายละเอียดการตั้งค่าได้ที่ [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)

## Build

```bash
npm run build
```

## License

MIT
