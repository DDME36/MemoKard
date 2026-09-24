/// <reference path="../pb_data/types.d.ts" />

// ── owner_name มาจากผู้ใช้ที่ล็อกอินเสมอ ──
onRecordCreateRequest((e) => {
  if (e.auth) e.record.set("owner_name", e.auth.get("username"));
  e.next();
}, "public_decks");

onRecordUpdateRequest((e) => {
  e.record.set("owner_name", e.record.original().get("owner_name"));
  e.next();
}, "public_decks");

// ── ตัวนับ ──
onRecordAfterCreateSuccess((e) => {
  require(`${__hooks}/memokard_utils.js`).recountRatings(e.app, e.record.get("public_deck"));
  e.next();
}, "deck_ratings");
onRecordAfterUpdateSuccess((e) => {
  require(`${__hooks}/memokard_utils.js`).recountRatings(e.app, e.record.get("public_deck"));
  e.next();
}, "deck_ratings");
onRecordAfterDeleteSuccess((e) => {
  require(`${__hooks}/memokard_utils.js`).recountRatings(e.app, e.record.get("public_deck"));
  e.next();
}, "deck_ratings");

onRecordAfterCreateSuccess((e) => {
  require(`${__hooks}/memokard_utils.js`).recountImports(e.app, e.record.get("public_deck"));
  e.next();
}, "deck_imports");

onRecordAfterCreateSuccess((e) => {
  require(`${__hooks}/memokard_utils.js`).recountReports(e.app, e.record.get("public_deck"));
  e.next();
}, "deck_reports");
onRecordAfterUpdateSuccess((e) => {
  require(`${__hooks}/memokard_utils.js`).recountReports(e.app, e.record.get("public_deck"));
  e.next();
}, "deck_reports");

// ── routes ──
routerAdd("GET", "/api/memokard/username-available", (e) => {
  const u = String(e.request.url.query().get("u") || "").trim();
  if (!/^[A-Za-z0-9_.]{3,30}$/.test(u)) return e.json(200, { available: false });
  const row = new DynamicModel({ id: "" });
  try {
    e.app.db().newQuery("SELECT id FROM users WHERE username = {:u} COLLATE NOCASE LIMIT 1").bind({ u: u }).one(row);
    return e.json(200, { available: false });
  } catch (_) {
    return e.json(200, { available: true });
  }
});

routerAdd("POST", "/api/memokard/admin/reset-password", (e) => {
  if (!e.auth || e.auth.get("role") !== "admin") throw new ForbiddenError("Admins only.");
  const body = e.requestInfo().body;
  const password = String(body.password || "");
  if (password.length < 8) throw new BadRequestError("Password must be at least 8 characters.");
  const user = e.app.findRecordById("users", String(body.userId || ""));
  user.setPassword(password);
  e.app.save(user);
  return e.json(200, { ok: true });
}, $apis.requireAuth("users"));

routerAdd("POST", "/api/memokard/admin/purge", (e) => {
  const body = e.requestInfo().body;
  const days = typeof body.olderThanDays === "number" ? body.olderThanDays : 30;
  const deleted = require(`${__hooks}/memokard_utils.js`).purgeDeleted(e.app, days);
  return e.json(200, { deleted: deleted });
}, $apis.requireSuperuserAuth());

// ── ลบ record ที่ soft-delete เกิน 30 วัน ทุกวัน 03:30 ──
cronAdd("memokard_purge_deleted", "30 3 * * *", () => {
  require(`${__hooks}/memokard_utils.js`).purgeDeleted($app, 30);
});
