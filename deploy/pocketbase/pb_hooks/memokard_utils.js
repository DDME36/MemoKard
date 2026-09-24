// ฟังก์ชันช่วยของ hooks — handler ของ PocketBase รันแยก context จึงต้อง require ไฟล์นี้ในแต่ละ handler
module.exports = {
  findPublicDeck: function (app, id) {
    try {
      return app.findRecordById("public_decks", id);
    } catch (_) {
      return null; // ถูกลบไปแล้ว (เช่น cascade)
    }
  },

  recountRatings: function (app, deckId) {
    const deck = module.exports.findPublicDeck(app, deckId);
    if (!deck) return;
    // DynamicModel({ x: 0 }) ถูกมองเป็น int64 จึงอ่าน AVG ที่เป็นทศนิยมไม่ได้ — ใช้ SUM แล้วหารเอง
    const row = new DynamicModel({ c: 0, s: 0 });
    app.db()
      .newQuery("SELECT COUNT(*) AS c, COALESCE(SUM(stars), 0) AS s FROM deck_ratings WHERE public_deck = {:id}")
      .bind({ id: deckId })
      .one(row);
    deck.set("rating_count", row.c);
    deck.set("rating_avg", row.c > 0 ? Math.round((row.s / row.c) * 10) / 10 : 0);
    app.save(deck);
  },

  recountImports: function (app, deckId) {
    const deck = module.exports.findPublicDeck(app, deckId);
    if (!deck) return;
    const row = new DynamicModel({ c: 0 });
    app.db().newQuery("SELECT COUNT(*) AS c FROM deck_imports WHERE public_deck = {:id}").bind({ id: deckId }).one(row);
    deck.set("import_count", row.c);
    app.save(deck);
  },

  AUTO_HIDE_AT: 3,

  recountReports: function (app, deckId) {
    const deck = module.exports.findPublicDeck(app, deckId);
    if (!deck) return;
    const row = new DynamicModel({ c: 0 });
    app.db()
      .newQuery("SELECT COUNT(*) AS c FROM deck_reports WHERE public_deck = {:id} AND (status = '' OR status = 'open')")
      .bind({ id: deckId })
      .one(row);
    deck.set("report_count", row.c);
    if (row.c >= module.exports.AUTO_HIDE_AT) deck.set("hidden", true);
    app.save(deck);
  },

  purgeDeleted: function (app, olderThanDays) {
    const cutoff = new Date(Date.now() - olderThanDays * 86400000).toISOString().replace("T", " ");
    let deleted = 0;
    ["cards", "decks"].forEach(function (name) {
      const records = app.findRecordsByFilter(name, "deleted = true && updated <= {:cutoff}", "", 1000, 0, { cutoff: cutoff });
      records.forEach(function (record) {
        app.delete(record);
        deleted++;
      });
    });
    return deleted;
  },
};
