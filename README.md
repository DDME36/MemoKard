# MemoKard - เมมโมการ์ด

Progressive Web App (PWA) สำหรับฝึกจำด้วยระบบ Active Recall และ Spaced Repetition

## ✨ Features

### 🎴 Core Features
- **Flashcard System** - ระบบการ์ดคำถาม-คำตอบ พร้อมรองรับรูปภาพ
- **SM-2 Algorithm** - อัลกอริทึม Spaced Repetition แบบ SuperMemo-2
- **Dark Mode** - ปรับตามเวลาประเทศไทยอัตโนมัติ (18:00-06:00)
- **Thai Day Colors** - สีประจำวันตามวันไทย
- **Activity Heatmap** - กราฟแสดงกิจกรรมการทบทวนรายวัน

### 🌐 Community Features (NEW!)
- **Share Decks** - แชร์ชุดการ์ดของคุณสู่ชุมชน
- **Explore Marketplace** - ค้นหาและเรียกดูชุดการ์ดจากผู้ใช้คนอื่น
- **One-Click Import** - Import ชุดการ์ดที่ชอบเข้าบัญชีของคุณ
- **Rating System** - ให้คะแนนชุดการ์ดที่ import แล้ว (1-5 ดาว)
- **Categories & Tags** - จัดหมวดหมู่และแท็กเพื่อค้นหาง่าย
- **Content Moderation** - รายงานเนื้อหาไม่เหมาะสม (auto-hide หลัง 5 reports)

### ☁️ Cloud & PWA
- **Cloud Sync** - ซิงค์ข้อมูลผ่าน Supabase
- **PWA Ready** - ติดตั้งเป็นแอปบนมือถือและคอมพิวเตอร์ได้
- **Offline Support** - ใช้งานได้แม้ไม่มีอินเทอร์เน็ต

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Environment

สร้างไฟล์ `.env` จาก `.env.example`:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Run Database Migrations

**For Community Sharing Feature:**

```bash
# See QUICK_START.md for detailed instructions
npm run migration:test
```

### 4. Start Development Server

```bash
npm run dev
```

## 📚 Documentation

- **[QUICK_START.md](./QUICK_START.md)** - Quick setup guide for community sharing
- **[SUPABASE_SETUP.md](./SUPABASE_SETUP.md)** - Supabase configuration
- **[COMMUNITY_SHARING_SETUP.md](./COMMUNITY_SHARING_SETUP.md)** - Detailed setup for community features
- **[COMMUNITY_SHARING_IMPLEMENTATION.md](./COMMUNITY_SHARING_IMPLEMENTATION.md)** - Technical implementation details

## 🛠️ Tech Stack

- **Vite** + **React** + **TypeScript**
- **Tailwind CSS** + **Framer Motion**
- **Zustand** - State management
- **Supabase** - Auth + Database + RLS
- **vite-plugin-pwa** - PWA support

## 📦 Build

```bash
npm run build
```

## 🧪 Testing

```bash
# Test database migration
npm run migration:test

# View migration guide
npm run migration:guide
```

## 📱 PWA Installation

1. Open the app in your browser
2. Click "Install" button (appears after a few seconds)
3. Or use browser menu: "Install app" / "Add to Home Screen"

## 🎯 Usage

### Creating Decks
1. Click "ชุดใหม่" to create a new deck
2. Add cards with questions and answers
3. Optionally add images to cards

### Studying
1. Click on a deck to view cards
2. Click "ทบทวนทั้งหมด" to start review session
3. Rate your recall quality (0-5)
4. Cards will be scheduled based on SM-2 algorithm

### Sharing (NEW!)
1. Create a deck with at least 1 card
2. Click "แชร์" button
3. Add description, category, and tags
4. Click "แชร์เลย"
5. Share the link with others!

### Exploring (NEW!)
1. Click "สำรวจ" in the header
2. Browse community decks
3. Use search and filters
4. Click on a deck to preview
5. Click "Import" to add to your collection

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT

## 🙏 Acknowledgments

- SM-2 Algorithm by SuperMemo
- Icons by Heroicons
- Animations by Framer Motion
