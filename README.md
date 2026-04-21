# จำทุกวัน (Daily Memory) 🧠

Progressive Web App (PWA) สำหรับฝึกจำด้วยระบบ Active Recall และ Spaced Repetition

## ✨ Features

- 🎴 **Flashcard System** - ระบบการ์ดคำถาม-คำตอบ
- 🧠 **SM-2 Algorithm** - อัลกอริทึม Spaced Repetition แบบ SuperMemo-2
- 💾 **Offline Support** - ใช้งานได้แม้ไม่มีอินเทอร์เน็ต
- 📱 **PWA Ready** - ติดตั้งเป็นแอปบนมือถือและคอมพิวเตอร์ได้
- 🎨 **Beautiful UI** - ดีไซน์สวยงาม เรียบง่าย ใช้งานง่าย
- ⚡ **Fast & Smooth** - Animations ลื่นไหลด้วย Framer Motion

## 🛠️ Tech Stack

- **Vite** - Build tool
- **React 18** - UI Framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations
- **Zustand** - State management
- **vite-plugin-pwa** - PWA support

## 🚀 Getting Started

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### PWA Installation

1. เปิดแอปในเบราว์เซอร์
2. คลิกที่ไอคอน "ติดตั้ง" ในแถบที่อยู่
3. หรือเลือก "เพิ่มไปยังหน้าจอหลัก" ในเมนูเบราว์เซอร์

## 📖 How to Use

### เพิ่มการ์ดใหม่
1. คลิกปุ่ม "+ เพิ่มการ์ด"
2. พิมพ์คำถามและคำตอบ
3. คลิก "เพิ่มการ์ด"

### ทบทวนการ์ด
1. อ่านคำถามบนการ์ด
2. คิดคำตอบในใจ
3. แตะการ์ดเพื่อดูคำตอบ
4. เลือกระดับความจำ:
   - 😊 **นึกออกทันที** - จำได้ดีมาก
   - 🤔 **นึกออกช้า** - จำได้แต่ต้องคิดนาน
   - 😓 **จำไม่ได้** - ต้องทบทวนใหม่

## 🧮 SM-2 Algorithm

แอปใช้อัลกอริทึม SuperMemo-2 (SM-2) ในการคำนวณช่วงเวลาทบทวน:

- **Easy (นึกออกทันที)**: เพิ่มช่วงเวลาทบทวนมากขึ้น
- **Good (นึกออกช้า)**: เพิ่มช่วงเวลาทบทวนปกติ
- **Again (จำไม่ได้)**: รีเซ็ตให้ทบทวนวันนี้

## 📁 Project Structure

```
daily-memory/
├── src/
│   ├── components/
│   │   ├── ReviewCard.tsx    # การ์ดทบทวน
│   │   └── AddCard.tsx        # ฟอร์มเพิ่มการ์ด
│   ├── store/
│   │   └── store.ts           # Zustand store
│   ├── utils/
│   │   └── sm2.ts             # SM-2 algorithm
│   ├── App.tsx                # Main app component
│   ├── main.tsx               # Entry point
│   └── index.css              # Global styles
├── vite.config.ts             # Vite + PWA config
├── tailwind.config.js         # Tailwind config
└── package.json
```

## 🎨 Design System

### Colors
- **Soft Blue** (#E3F2FD) - สีฟ้าอ่อน
- **Mint Green** (#E8F5E9) - สีเขียวมิ้นท์
- **Light Lavender** (#F3E5F5) - สีม่วงอ่อน
- **Soft Pink** (#FCE4EC) - สีชมพูอ่อน
- **Soft Yellow** (#FFF9C4) - สีเหลืองอ่อน

### Typography
- ใช้ฟอนต์ระบบ (System fonts) เพื่อความเร็วและความสวยงาม
- ขนาดตัวอักษรใหญ่สำหรับการ์ด เพื่อการอ่านที่ง่าย

## 📝 TODO (Next Steps)

- [ ] เพิ่มฟีเจอร์แก้ไขการ์ด
- [ ] เพิ่มฟีเจอร์ลบการ์ด
- [ ] เพิ่มหมวดหมู่การ์ด (Tags/Categories)
- [ ] เพิ่มสถิติการเรียนรู้
- [ ] เพิ่มการ Export/Import ข้อมูล
- [ ] เพิ่ม Dark Mode
- [ ] เพิ่มการซิงค์ข้อมูลระหว่างอุปกรณ์

## 📄 License

MIT License - ใช้งานได้อย่างอิสระ

## 🙏 Credits

สร้างด้วย ❤️ เพื่อการเรียนรู้ที่ดีขึ้น
