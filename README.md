# MemoKard · เมมโมการ์ด

แอปแฟลชการ์ดภาษาไทยบนเว็บ ทบทวนด้วย Active Recall และตารางทบทวนอัจฉริยะ (FSRS) ใช้งานออฟไลน์ได้ ติดตั้งเป็นแอปบนมือถือได้ (PWA) และซิงก์ข้ามเครื่องผ่านเซิร์ฟเวอร์ของเราเอง

สร้างโดย **Zentyr**

## จุดเด่น

- **ใช้ได้แม้ไม่มีเน็ต** — ทุกอย่างบันทึกในเครื่องก่อน (IndexedDB) แล้วค่อยซิงก์ขึ้นเซิร์ฟเวอร์ผ่านคิว
- **ซิงก์ข้ามเครื่อง** — ดึงเฉพาะส่วนที่เปลี่ยน, แก้สองเครื่องใช้ฉบับล่าสุด, ประวัติการทบทวนไม่หาย
- **FSRS** — จัดตารางทบทวนตามความจำจริงของผู้ใช้
- **ชุมชน** — แชร์ชุดการ์ด ค้นหา ติดตาม (อัปเดตตามต้นทาง) ให้ดาว และรายงาน
- **ลองใช้ได้ทันทีโดยไม่ต้องสมัคร** — สมัครทีหลังแล้วนำข้อมูลในเครื่องขึ้นบัญชีได้
- **โฮสต์เองทั้งหมด** — PocketBase ตัวเดียว ไม่พึ่งบริการภายนอก

## เริ่มพัฒนา

ต้องมี Node.js 20 ขึ้นไป

```bash
npm ci
npm run pb:fetch        # ดาวน์โหลด PocketBase (ตรวจ checksum) ลง .pocketbase/
cp .env.example .env    # แล้วตั้ง VITE_POCKETBASE_URL=http://127.0.0.1:8090
```

รันเซิร์ฟเวอร์และหน้าเว็บ (สองหน้าต่าง):

```bash
.pocketbase/pocketbase serve --migrationsDir deploy/pocketbase/pb_migrations --hooksDir deploy/pocketbase/pb_hooks
npm run dev
```

> Windows PowerShell: ใช้ `npm.cmd` แทน `npm` ถ้าติด execution policy และ `.pocketbase\pocketbase.exe` แทน `.pocketbase/pocketbase`

## ทดสอบ

```bash
npm test                  # unit tests
npm run test:integration  # รัน PocketBase จริงชั่วคราว (ต้อง npm run pb:fetch ก่อน)
npm run lint
npm run build
```

ตั้ง `PB_DEBUG=1` เพื่อดู log ของเซิร์ฟเวอร์ระหว่างเทสต์ integration

## ติดตั้งบนเซิร์ฟเวอร์

ดูคู่มือ [deploy/DEPLOY_GUIDE_TH.md](deploy/DEPLOY_GUIDE_TH.md) (Oracle Cloud Ubuntu + Nginx + HTTPS)

ตั้งแอดมิน: สมัครบัญชีในแอป แล้วเปิด `/_/` → ตาราง `users` → ตั้ง `role` เป็น `admin`

## โครงสร้างหลัก

| ส่วน | หน้าที่ |
|---|---|
| `src/store/store.ts` | ข้อมูลในเครื่อง, FSRS, Zustand persistence |
| `src/store/syncQueue.ts` | คิวส่งข้อมูลขึ้นเซิร์ฟเวอร์ (ออฟไลน์ได้, ลองใหม่อัตโนมัติ) |
| `src/store/syncEngine.ts` | ดึงข้อมูลที่เปลี่ยนแล้วรวมเข้าเครื่อง, อัปเดตชุดที่ติดตาม |
| `src/store/pocketbaseStore.ts` | แปลงข้อมูลกับ PocketBase |
| `src/store/communityStore.ts` | ชุดการ์ดสาธารณะ, ดาว, รายงาน |
| `src/store/adminStore.ts` | จัดการรายงานและรีเซ็ตรหัสผ่าน |
| `deploy/pocketbase/` | migrations, hooks และเวอร์ชันเซิร์ฟเวอร์ที่ปักไว้ |

## เครดิต

ออกแบบและพัฒนาโดย **Zentyr**
