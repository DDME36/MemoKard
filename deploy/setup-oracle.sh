#!/usr/bin/env bash
# ==============================================================================
# MemoKard + PocketBase + Nginx Auto Setup for Oracle Cloud (Ubuntu)
# รองรับทั้ง x86_64 (AMD) และ aarch64 (ARM Ampere)
# ==============================================================================

set -e

echo "=========================================================="
echo "  🚀 เริ่มต้นติดตั้ง MemoKard + PocketBase บน Oracle Ubuntu"
echo "=========================================================="

# 1. ตรวจสอบสิทธิ์ Root
if [ "$EUID" -ne 0 ]; then
  echo "❌ กรุณารันสคริปต์นี้ด้วยสิทธิ์ sudo:"
  echo "   sudo bash setup-oracle.sh"
  exit 1
fi

# 2. ปลดล็อค Firewall ของ Oracle Ubuntu (iptables & ufw)
echo "🔓 [1/6] ปลดล็อค Firewall สำหรับพอร์ต 80 (HTTP) และ 443 (HTTPS)..."
iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT 2>/dev/null || true
iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT 2>/dev/null || true

# บันทึก iptables ให้คงอยู่หลังรีบูต
apt-get update -y
DEBIAN_FRONTEND=noninteractive apt-get install -y iptables-persistent netfilter-persistent
netfilter-persistent save

if command -v ufw >/dev/null 2>&1; then
  ufw allow 80/tcp
  ufw allow 443/tcp
fi

# 3. ติดตั้งเครื่องมือจำเป็น (Nginx, Unzip, Curl, Certbot)
echo "📦 [2/6] ติดตั้ง Nginx และ Certbot สำหรับ SSL..."
DEBIAN_FRONTEND=noninteractive apt-get install -y nginx unzip curl certbot python3-certbot-nginx

# 4. ดาวน์โหลด PocketBase (ตรวจจับ CPU architecture อัตโนมัติ)
echo "📥 [3/6] กำลังดาวน์โหลด PocketBase..."
ARCH=$(uname -m)
PB_VERSION="0.25.9" # หรือเวอร์ชันล่าสุด

if [ "$ARCH" = "aarch64" ] || [ "$ARCH" = "arm64" ]; then
  PB_FILE="pocketbase_${PB_VERSION}_linux_arm64.zip"
else
  PB_FILE="pocketbase_${PB_VERSION}_linux_amd64.zip"
fi

mkdir -p /opt/pocketbase
cd /opt/pocketbase

if [ ! -f "/opt/pocketbase/pocketbase" ]; then
  curl -L -o "$PB_FILE" "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/${PB_FILE}"
  unzip -o "$PB_FILE"
  rm -f "$PB_FILE"
  chmod +x /opt/pocketbase/pocketbase
  echo "✅ ดาวน์โหลด PocketBase สำเร็จ ($ARCH)"
else
  echo "ℹ️  PocketBase มีการติดตั้งอยู่แล้ว ข้ามขั้นตอนนี้"
fi

# 5. สร้าง Systemd Service ให้ PocketBase รันอัตโนมัติในพื้นหลัง (Background Daemon)
echo "⚙️ [4/6] สร้าง Systemd Service สำหรับ PocketBase..."
cat << 'EOF' > /etc/systemd/system/pocketbase.service
[Unit]
Description=PocketBase Service for MemoKard
After=network.target

[Service]
Type=simple
User=root
Group=root
WorkingDirectory=/opt/pocketbase
ExecStart=/opt/pocketbase/pocketbase serve --http="127.0.0.1:8090"
Restart=always
RestartSec=5
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable pocketbase
systemctl restart pocketbase
echo "✅ PocketBase Service เริ่มทำงานแล้วที่พอร์ต 8090 (ภายใน)"

# 6. เตรียมโฟลเดอร์สำหรับ Web Frontend
echo "📁 [5/6] เตรียมไดเรกทอรี /var/www/memokard/dist..."
mkdir -p /var/www/memokard/dist
chown -R www-data:www-data /var/www/memokard

echo "=========================================================="
echo "🎉 ติดตั้งระบบพื้นฐานเรียบร้อยแล้ว!"
echo "=========================================================="
echo ""
echo "📌 ขั้นตอนต่อไปที่คุณต้องทำ:"
echo "1. อัปโหลดไฟล์โฟลเดอร์ 'dist/' มาไว้ที่: /var/www/memokard/dist"
echo "2. คัดลอก 'deploy/nginx/memokard.conf' ไปที่: /etc/nginx/sites-available/memokard.conf"
echo "   - แก้ไข 'YOUR_DOMAIN.COM' ให้เป็นชื่อโดเมนจริงของคุณ"
echo "   - สร้าง symlink: sudo ln -s /etc/nginx/sites-available/memokard.conf /etc/nginx/sites-enabled/"
echo "   - ทดสอบและรีโหลด: sudo nginx -t && sudo systemctl reload nginx"
echo "3. เปิดขอ SSL ฟรีด้วยคำสั่ง:"
echo "   sudo certbot --nginx -d YOUR_DOMAIN.COM"
echo "4. เข้าสร้างบัญชี Admin ของ PocketBase ครั้งแรกที่:"
echo "   https://YOUR_DOMAIN.COM/_/"
echo "   แล้วไปที่ Settings > Import collections และอัปโหลดไฟล์ 'pb_schema.json'"
echo "=========================================================="
