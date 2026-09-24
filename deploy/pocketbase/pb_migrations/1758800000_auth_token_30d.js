/// <reference path="../pb_data/types.d.ts" />

// PWA ต้องเปิดออฟไลน์ได้นาน ๆ โดยไม่หลุดล็อกอิน: ขยายอายุ token จาก 7 วันเป็น 30 วัน
// (แอปต่ออายุ token ให้อัตโนมัติทุกครั้งที่เปิดแอปตอนออนไลน์)
migrate((app) => {
  const users = app.findCollectionByNameOrId("users");
  users.authToken.duration = 2592000;
  app.save(users);

  // โรงเรียน/หอพักมักใช้ IP เดียวกันทั้งตึก: ให้สมัครได้ 20 บัญชีต่อชั่วโมงต่อ IP (เดิม 5)
  const settings = app.settings();
  settings.rateLimits.rules = settings.rateLimits.rules.map(function (rule) {
    if (rule.label === "users:create") rule.maxRequests = 20;
    return rule;
  });
  app.save(settings);
}, (app) => {
  const users = app.findCollectionByNameOrId("users");
  users.authToken.duration = 604800;
  app.save(users);
});
