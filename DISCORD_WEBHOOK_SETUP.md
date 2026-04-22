# 🔔 Discord Webhook Setup - MemoKard Report Notifications

## 📱 แอพ: MemoKard (Daily Memory)
แอพท่องจำการ์ดแบบ Spaced Repetition พร้อมระบบแชร์ชุดการ์ดสู่ชุมชน

---

## 🎯 ฟีเจอร์

เมื่อมีคนรายงานชุดการ์ด จะส่งข้อความไป Discord อัตโนมัติ พร้อมข้อมูล:

- 📚 ชื่อชุดการ์ด
- 👤 เจ้าของชุด
- 🚨 ผู้รายงาน
- 📊 จำนวนรายงานทั้งหมด
- ⚠️ เหตุผลการรายงาน (สแปม/ไม่เหมาะสม/ละเมิดลิขสิทธิ์/อื่นๆ)
- 📝 รายละเอียดเพิ่มเติม
- 🔗 ลิงก์ไปยังชุดการ์ด
- 🔒 สถานะ (ถูกซ่อนอัตโนมัติหรือไม่)

### สีของข้อความ:
- 🔵 **น้ำเงิน** (0-2 รายงาน) - ปกติ
- 🟠 **ส้ม** (3-4 รายงาน) - คำเตือน
- 🔴 **แดง** (5+ รายงาน) - ถูกซ่อนอัตโนมัติ

---

## 🚀 วิธีติดตั้ง

### ขั้นตอนที่ 1: Deploy Edge Function

```bash
# 1. ติดตั้ง Supabase CLI (ถ้ายังไม่มี)
npm install -g supabase

# 2. Login to Supabase
supabase login

# 3. Link โปรเจกต์
cd daily-memory
supabase link --project-ref YOUR_PROJECT_REF

# 4. Deploy function
supabase functions deploy discord-report-notification
```

### ขั้นตอนที่ 2: สร้าง Database Webhook

ไปที่ **Supabase Dashboard** → **Database** → **Webhooks** → **Create a new hook**

**ตั้งค่า:**
```
Name: discord-report-notification
Table: deck_reports
Events: ✅ INSERT
Type: Supabase Edge Functions
Edge Function: discord-report-notification
HTTP Headers: (ไม่ต้องใส่)
```

**หรือใช้ SQL:**

```sql
-- สร้าง webhook trigger
CREATE OR REPLACE FUNCTION notify_discord_on_report()
RETURNS TRIGGER AS $$
DECLARE
  function_url TEXT;
  payload JSON;
BEGIN
  -- URL ของ Edge Function (แทนที่ YOUR_PROJECT_REF)
  function_url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/discord-report-notification';
  
  -- สร้าง payload
  payload := json_build_object(
    'type', 'insert',
    'table', 'deck_reports',
    'record', row_to_json(NEW)
  );
  
  -- เรียก Edge Function (ใช้ pg_net extension)
  PERFORM net.http_post(
    url := function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := payload::jsonb
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- สร้าง trigger
DROP TRIGGER IF EXISTS on_deck_report_insert ON deck_reports;
CREATE TRIGGER on_deck_report_insert
  AFTER INSERT ON deck_reports
  FOR EACH ROW
  EXECUTE FUNCTION notify_discord_on_report();
```

### ขั้นตอนที่ 3: ตั้งค่า Environment Variables (ถ้าใช้ SQL trigger)

ถ้าใช้ SQL trigger ต้องตั้งค่า service role key:

```sql
-- ตั้งค่า service role key (ทำครั้งเดียว)
ALTER DATABASE postgres SET app.settings.service_role_key TO 'YOUR_SERVICE_ROLE_KEY';
```

---

## 🧪 ทดสอบ

### วิธีที่ 1: ทดสอบผ่าน Supabase Dashboard

1. ไปที่ **Edge Functions** → **discord-report-notification**
2. กด **Invoke Function**
3. ใส่ test payload:

```json
{
  "type": "insert",
  "table": "deck_reports",
  "record": {
    "id": "test-123",
    "public_deck_id": "DECK_ID_ที่มีอยู่จริง",
    "reporter_user_id": "USER_ID_ที่มีอยู่จริง",
    "reason": "spam",
    "details": "ทดสอบระบบแจ้งเตือน Discord",
    "created_at": "2026-04-21T10:00:00Z"
  }
}
```

### วิธีที่ 2: ทดสอบจริงในแอพ

1. เปิดแอพ → ไปหน้า Explore
2. เปิดชุดการ์ดใดก็ได้
3. กดปุ่ม **รายงาน**
4. เลือกเหตุผลและส่ง
5. ✅ ควรเห็นข้อความใน Discord ภายใน 1-2 วินาที

---

## 📊 ตัวอย่างข้อความใน Discord

### รายงานครั้งแรก (สีน้ำเงิน):
```
📝 รายงานชุดการ์ด

📚 ชุดการ์ด: คำศัพท์ภาษาอังกฤษ TOEIC
👤 เจ้าของชุด: john_doe
🚨 ผู้รายงาน: jane_smith
📊 จำนวนรายงาน: 1 ครั้ง
⚠️ เหตุผล: 🚫 สแปม
📝 รายละเอียด: มีโฆษณาในคำตอบ
🔗 ลิงก์: https://memokard.app/deck/abc123
```

### รายงานครั้งที่ 3 (สีส้ม + คำเตือน):
```
⚠️ รายงานชุดการ์ด

📚 ชุดการ์ด: คำศัพท์ภาษาอังกฤษ TOEIC
👤 เจ้าของชุด: john_doe
🚨 ผู้รายงาน: user_three
📊 จำนวนรายงาน: 3 ครั้ง
⚠️ เหตุผล: ⚠️ เนื้อหาไม่เหมาะสม
🔗 ลิงก์: https://memokard.app/deck/abc123
⚠️ คำเตือน: อีก 2 รายงานจะถูกซ่อนอัตโนมัติ
```

### รายงานครั้งที่ 5 (สีแดง + ซ่อนอัตโนมัติ):
```
🔒 รายงานชุดการ์ด (ถูกซ่อนอัตโนมัติ)

📚 ชุดการ์ด: คำศัพท์ภาษาอังกฤษ TOEIC
👤 เจ้าของชุด: john_doe
🚨 ผู้รายงาน: user_five
📊 จำนวนรายงาน: 5 ครั้ง
⚠️ เหตุผล: ©️ ละเมิดลิขสิทธิ์
🔗 ลิงก์: https://memokard.app/deck/abc123
🔒 สถานะ: ชุดการ์ดถูกซ่อนอัตโนมัติ (รายงาน ≥ 5 ครั้ง)
```

---

## 🔧 Troubleshooting

### ไม่มีข้อความใน Discord

1. **ตรวจสอบ Edge Function logs:**
   ```bash
   supabase functions logs discord-report-notification
   ```

2. **ตรวจสอบ Webhook URL:**
   - ลอง POST ข้อความทดสอบด้วย curl:
   ```bash
   curl -X POST "https://discord.com/api/webhooks/1456187506960633856/FH1QsdGVNMgQaUQyqVlicvjhbcwPNoFRPdUOxbh-sUI4KrjgcOaCutbHbO6N-aia7fOA" \
     -H "Content-Type: application/json" \
     -d '{"content": "ทดสอบ webhook"}'
   ```

3. **ตรวจสอบ Database Trigger:**
   ```sql
   -- ดู triggers ทั้งหมด
   SELECT * FROM pg_trigger WHERE tgname = 'on_deck_report_insert';
   
   -- ดู function
   SELECT prosrc FROM pg_proc WHERE proname = 'notify_discord_on_report';
   ```

4. **ตรวจสอบ Supabase Dashboard:**
   - Database → Webhooks → ดูว่า webhook active หรือไม่
   - Edge Functions → ดู logs

### ข้อความส่งช้า

- Edge Functions อาจใช้เวลา 1-2 วินาที (cold start)
- ถ้าส่งช้ามาก (>10 วินาที) ให้ตรวจสอบ logs

### ข้อความซ้ำ

- ตรวจสอบว่าไม่มี trigger ซ้ำ:
  ```sql
  SELECT * FROM pg_trigger WHERE tgrelid = 'deck_reports'::regclass;
  ```

---

## 🔐 Security Notes

### Discord Webhook URL
- ⚠️ **อย่าเผยแพร่ URL นี้ในที่สาธารณะ**
- ✅ เก็บไว้ใน Edge Function code (ไม่ได้ expose ออกมา)
- ✅ ถ้าต้องการความปลอดภัยสูงสุด ให้เก็บใน Supabase Secrets:

```bash
# ตั้งค่า secret
supabase secrets set DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/..."

# แก้ไข code ให้ใช้ secret
const DISCORD_WEBHOOK_URL = Deno.env.get('DISCORD_WEBHOOK_URL')!;
```

### Service Role Key
- ⚠️ **อย่าเผยแพร่ key นี้**
- ✅ ใช้เฉพาะใน server-side (Edge Functions, Database)
- ✅ ไม่ควรใส่ใน frontend code

---

## 📈 การปรับแต่ง

### เปลี่ยนข้อความ

แก้ไขไฟล์ `supabase/functions/discord-report-notification/index.ts`:

```typescript
// เปลี่ยน username
username: 'MemoKard Reports',

// เปลี่ยน avatar
avatar_url: 'https://memokard.app/pwa-512x512.png',

// เปลี่ยนสี
color: 0x5865f2, // Discord Blurple
```

### เพิ่ม Mention (@everyone, @role)

```typescript
body: JSON.stringify({
  content: '@everyone มีรายงานใหม่!', // เพิ่มบรรทัดนี้
  username: 'MemoKard Reports',
  embeds: [embed],
}),
```

### เพิ่มปุ่ม (Discord Components)

```typescript
components: [
  {
    type: 1, // Action Row
    components: [
      {
        type: 2, // Button
        style: 5, // Link
        label: 'ดูชุดการ์ด',
        url: deckUrl,
      },
    ],
  },
],
```

---

## 📊 ข้อมูลเพิ่มเติม

### Discord Webhook Limits
- **Rate Limit:** 30 requests/minute
- **Message Size:** 2000 characters
- **Embed Fields:** 25 fields max
- **Field Value:** 1024 characters max

### Supabase Edge Functions
- **Timeout:** 150 seconds
- **Memory:** 512 MB
- **Cold Start:** ~1-2 seconds
- **Pricing:** Free tier: 500K invocations/month

---

## ✅ Checklist

- [ ] Deploy Edge Function
- [ ] สร้าง Database Webhook/Trigger
- [ ] ทดสอบส่งข้อความ
- [ ] ตรวจสอบข้อความใน Discord
- [ ] ทดสอบกรณีต่างๆ (1, 3, 5 reports)
- [ ] ตรวจสอบ logs
- [ ] เก็บ webhook URL ให้ปลอดภัย

---

## 🎉 เสร็จแล้ว!

ตอนนี้ทุกครั้งที่มีคนรายงานชุดการ์ด คุณจะได้รับการแจ้งเตือนใน Discord ทันที! 🚀

**Discord Webhook URL ของคุณ:**
```
https://discord.com/api/webhooks/1456187506960633856/FH1QsdGVNMgQaUQyqVlicvjhbcwPNoFRPdUOxbh-sUI4KrjgcOaCutbHbO6N-aia7fOA
```

---

**Created By:** Kiro AI Assistant  
**Date:** 2026-04-21  
**App:** MemoKard (Daily Memory)  
**Version:** 2.2.0
