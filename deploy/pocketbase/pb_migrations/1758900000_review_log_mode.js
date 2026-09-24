/// <reference path="../pb_data/types.d.ts" />

// บันทึกว่าแต่ละครั้งทบทวนในโหมดไหน: normal = ตาม FSRS, cram = ติวเร่ง/สอบ (ไม่กระทบตาราง),
// import = log ที่สร้างแทนประวัติเก่าตอนย้ายข้อมูลโหมดทดลอง — ตัวปรับจูน FSRS ในอนาคตใช้เฉพาะ normal
migrate((app) => {
  const logs = app.findCollectionByNameOrId("review_logs");
  logs.fields.add(new SelectField({ name: "mode", maxSelect: 1, values: ["normal", "cram", "import"] }));
  app.save(logs);
}, (app) => {
  const logs = app.findCollectionByNameOrId("review_logs");
  logs.fields.removeByName("mode");
  app.save(logs);
});
