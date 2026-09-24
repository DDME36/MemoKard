# คู่มือการติดตั้ง MemoKard + PocketBase บน Oracle Cloud (Ubuntu)

คู่มือฉบับนี้จัดทำขึ้นสำหรับการนำ **MemoKard** ไปรันบน **Oracle Cloud Always Free Tier (Ubuntu)** ร่วมกับโปรเจกต์อื่นได้อย่างปลอดภัย ประหยัดพลังงาน (RAM เพียง ~35MB, CPU 0%) และใช้งานร่วมกับ **Custom Domain + SSL ฟรี** ได้ทันที

---

## 🧭 แผนภาพการทำงานของระบบ

```
[ผู้ใช้ / เบราว์เซอร์]
        │
        ▼ (HTTPS พอร์ต 443)
  [Cloudflare / โดเมนของคุณ]
        │
        ▼ (A Record ชี้มาที่ IP Oracle)
  [Nginx บน Oracle Ubuntu]
   ├── เส้นทาง /        ──> เสิร์ฟไฟล์หน้าเว็บ MemoKard (/var/www/memokard/dist)
   ├── เส้นทาง /api/    ──> Proxy ไปที่ PocketBase (127.0.0.1:8090)
   └── เส้นทาง /_/      ──> PocketBase Admin Dashboard (127.0.0.1:8090/_/)
```

---

## 🛠️ ขั้นตอนที่ 1: ตั้งค่า DNS โดเมนของคุณ

1. เข้าไปยังผู้ให้บริการจดโดเมนของคุณ (เช่น Cloudflare, Namecheap, Godaddy)
2. เพิ่ม **DNS A Record**:
   - **Type**: `A`
   - **Name**: `@` (หรือ subdomain เช่น `app` หรือ `card`)
   - **IPv4 Address**: ใส่ **Public IP** ของเครื่อง Oracle Ubuntu
   - **Proxy status**: DNS Only หรือ Proxied (ถ้าใช้ Cloudflare)

---

## 🔓 ขั้นตอนที่ 2: เปิดพอร์ต 80 และ 443 ใน Oracle Cloud Console

> ⚠️ **จุดที่คนมักลืมที่สุด**: Oracle ปิดพอร์ต 80 (HTTP) และ 443 (HTTPS) ไว้ที่ระดับ Cloud Firewall

1. เข้าสู่ระบบ [Oracle Cloud Console](https://cloud.oracle.com/)
2. ไปที่เมนู **Networking** > **Virtual Cloud Networks (VCN)**
3. คลิก VCN ของคุณ > คลิก **Security Lists** > **Default Security List**
4. กดปุ่ม **Add Ingress Rules**:
   - **Source CIDR**: `0.0.0.0/0`
   - **IP Protocol**: `TCP`
   - **Destination Port Range**: `80,443`
   - กด **Add Ingress Rules**

---

## 🚀 ขั้นตอนที่ 3: รันสคริปต์ติดตั้งบน Oracle Ubuntu

1. เชื่อมต่อ SSH เข้าไปยังเครื่อง Ubuntu ของคุณ:
   ```bash
   ssh ubuntu@<YOUR_ORACLE_IP>
   ```

2. สร้างโฟลเดอร์สำหรับติดตั้งและดาวน์โหลดสคริปต์:
   ```bash
   mkdir -p ~/memokard-deploy
   cd ~/memokard-deploy
   ```

3. คัดลอกไฟล์ `deploy/setup-oracle.sh` จากโปรเจกต์นี้ไปรัน หรือสร้างไฟล์ด้วย `nano setup-oracle.sh` แล้วรัน:
   ```bash
   sudo bash setup-oracle.sh
   ```
   *สคริปต์จะทำการ:*
   - *ปลดล็อค iptables firewall ของ Ubuntu ให้อัตโนมัติ*
   - *ติดตั้ง Nginx, Certbot (SSL), Unzip*
   - *ดาวน์โหลด PocketBase และสร้าง Systemd Service ให้ทำงาน 24/7*
   - *เตรียมโฟลเดอร์ `/var/www/memokard/dist`*

---

## 💻 ขั้นตอนที่ 4: บิลด์หน้าเว็บและอัปโหลดไฟล์

1. **บนเครื่องคอมพิวเตอร์ของคุณ (Local Machine)**:
   - เปิดไฟล์ `.env` ในโฟลเดอร์โปรเจกต์ MemoKard
   - กำหนดค่า URL โดเมนจริงของคุณ:
     ```env
     VITE_POCKETBASE_URL=https://yourdomain.com
     ```
   - สั่งบิลด์โปรเจกต์:
     ```bash
     npm run build
     ```
   - จะได้โฟลเดอร์ `dist/` ออกมา

2. **อัปโหลดไฟล์ `dist/` ไปยังเซิร์ฟเวอร์ Oracle**:
   - ใช้โปรแกรม **FileZilla** / **WinSCP** (SFTP พอร์ต 22 ใช้ SSH Key เดียวกับที่ล็อกอิน)
   - หรือใช้คำสั่ง `scp` จากเครื่องของคุณ:
     ```bash
     scp -r dist/* ubuntu@<YOUR_ORACLE_IP>:/tmp/memokard-dist/
     ```
   - บนเซิร์ฟเวอร์ ย้ายไฟล์เข้าตำแหน่งจริง:
     ```bash
     sudo cp -r /tmp/memokard-dist/* /var/www/memokard/dist/
     sudo chown -R www-data:www-data /var/www/memokard
     ```

---

## 🌐 ขั้นตอนที่ 5: ตั้งค่า Nginx และขอ SSL ฟรี (HTTPS)

1. คัดลอกไฟล์คอนฟิก Nginx:
   - เปิดไฟล์:
     ```bash
     sudo nano /etc/nginx/sites-available/memokard.conf
     ```
   - นำเนื้อหาในไฟล์ [`deploy/nginx/memokard.conf`](memokard.conf) มาวาง และเปลี่ยน `YOUR_DOMAIN.COM` เป็นชื่อโดเมนจริงของคุณ

2. เปิดใช้งานคอนฟิกและทดสอบ Nginx:
   ```bash
   sudo ln -s /etc/nginx/sites-available/memokard.conf /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

3. ขอใบรับรอง SSL ฟรีด้วย **Certbot**:
   ```bash
   sudo certbot --nginx -d yourdomain.com
   ```
   *(ทำตามขั้นตอนบนหน้าจอ เลือก Redirect HTTP to HTTPS อัตโนมัติ)*

---

## 📦 ขั้นตอนที่ 6: ติดตั้งตาราง กฎ และ hooks ของ MemoKard

1. คัดลอกโฟลเดอร์ `deploy/pocketbase/pb_migrations` และ `deploy/pocketbase/pb_hooks` ไปไว้ที่ `/opt/pocketbase/`:
   ```bash
   scp -r deploy/pocketbase/pb_migrations deploy/pocketbase/pb_hooks ubuntu@<YOUR_ORACLE_IP>:/tmp/
   # บนเซิร์ฟเวอร์
   sudo cp -r /tmp/pb_migrations /tmp/pb_hooks /opt/pocketbase/
   sudo systemctl restart pocketbase
   ```
   PocketBase จะสร้างตาราง กฎความปลอดภัย และตั้งค่า rate limit ให้อัตโนมัติตอนเริ่มทำงาน
2. เปิด `https://yourdomain.com/_/` แล้วสร้างบัญชีผู้ดูแลระบบ (superuser)
3. ตั้งแอดมินในแอป: สมัครบัญชีในแอปก่อน แล้วในหน้า `/_/` เปิดตาราง `users` เลือกบัญชีของคุณ ตั้ง `role` เป็น `admin`

---

## 🛡️ การดูแลรักษาและสำรองข้อมูล (Maintenance)

- **ตรวจสอบสถานะ PocketBase**:
  ```bash
  sudo systemctl status pocketbase
  ```
- **การสำรองข้อมูล (Backup Database)**:
  ข้อมูลทั้งหมดของ PocketBase ถูกจัดเก็บอยู่ในโฟลเดอร์เดียวคือ `/opt/pocketbase/pb_data`
  คุณสามารถสำรองข้อมูลได้ง่ายๆ ด้วยคำสั่ง:
  ```bash
  sudo cp -r /opt/pocketbase/pb_data /opt/pocketbase/pb_data_backup_$(date +%F)
  ```
  *(หรือจะตั้ง Cronjob ให้บีบอัดไฟล์แล้วส่งเข้า Google Drive / Telegram ก็ทำได้ง่ายมาก)*
