/// <reference path="../pb_data/types.d.ts" />

// หมายเหตุ: JSVM ของ PocketBase รองรับ ES5 + บางส่วนของ ES6 ใช้ concat แทน spread
migrate((app) => {
  const USERS = "_pb_users_auth_";
  const AUTHED = '@request.auth.id != ""';
  const OWN = AUTHED + " && user = @request.auth.id";
  const OWN_CREATE = AUTHED + " && @request.body.user = @request.auth.id";
  const OWN_UPDATE = OWN + " && (@request.body.user:isset = false || @request.body.user = @request.auth.id)";
  const ADMIN = '@request.auth.role = "admin"';
  const IMAGE = { type: "file", maxSelect: 1, maxSize: 1048576, mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"] };

  const stamps = function () {
    return [
      { name: "created", type: "autodate", onCreate: true, onUpdate: false },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ];
  };
  const ownerField = function () {
    return { name: "user", type: "relation", required: true, maxSelect: 1, collectionId: USERS, cascadeDelete: true };
  };
  const image = function (name) {
    return Object.assign({ name: name }, IMAGE);
  };

  // ── users ──
  const users = app.findCollectionByNameOrId("users");
  users.fields.add(new TextField({ name: "username", required: true, min: 3, max: 30, pattern: "^[A-Za-z0-9_.]+$", presentable: true }));
  users.fields.add(new SelectField({ name: "role", maxSelect: 1, values: ["user", "admin"] }));
  users.fields.getByName("email").required = false;
  users.indexes.push("CREATE UNIQUE INDEX idx_users_username ON users (username COLLATE NOCASE)");
  users.passwordAuth.enabled = true;
  users.passwordAuth.identityFields = ["username", "email"];
  users.oauth2.enabled = false;
  users.listRule = "id = @request.auth.id || " + ADMIN;
  users.viewRule = "id = @request.auth.id || " + ADMIN;
  users.createRule = "@request.body.role:isset = false";
  users.updateRule = "id = @request.auth.id && @request.body.role:isset = false";
  users.deleteRule = "id = @request.auth.id";
  app.save(users);

  // ── ชุมชน (สร้างก่อนเพราะ decks อ้างถึง) ──
  const COUNTERS_UNSET = [
    "@request.body.hidden:isset = false",
    "@request.body.import_count:isset = false",
    "@request.body.rating_avg:isset = false",
    "@request.body.rating_count:isset = false",
    "@request.body.report_count:isset = false",
    "@request.body.owner_name:isset = false",
  ].join(" && ");

  const publicDecks = new Collection({
    type: "base",
    name: "public_decks",
    listRule: "hidden = false || owner = @request.auth.id || " + ADMIN,
    viewRule: "hidden = false || owner = @request.auth.id || " + ADMIN,
    createRule: AUTHED + " && @request.body.owner = @request.auth.id && " + COUNTERS_UNSET,
    updateRule: ADMIN + " || (owner = @request.auth.id && @request.body.owner:isset = false && " + COUNTERS_UNSET + ")",
    deleteRule: "owner = @request.auth.id || " + ADMIN,
    fields: [
      { name: "owner", type: "relation", required: true, maxSelect: 1, collectionId: USERS, cascadeDelete: true },
      { name: "owner_name", type: "text", max: 30 },
      { name: "source_deck", type: "text", max: 15 },
      { name: "name", type: "text", required: true, max: 100 },
      { name: "description", type: "text", max: 1000 },
      { name: "color", type: "text", max: 20 },
      { name: "category", type: "text", max: 50 },
      { name: "tags", type: "json", maxSize: 2000 },
      { name: "card_count", type: "number", min: 0, onlyInt: true },
      { name: "import_count", type: "number", min: 0, onlyInt: true },
      { name: "rating_avg", type: "number", min: 0, max: 5 },
      { name: "rating_count", type: "number", min: 0, onlyInt: true },
      { name: "report_count", type: "number", min: 0, onlyInt: true },
      { name: "hidden", type: "bool" },
    ].concat(stamps()),
    indexes: [
      "CREATE INDEX idx_public_decks_browse ON public_decks (hidden, import_count)",
      "CREATE INDEX idx_public_decks_owner_source ON public_decks (owner, source_deck)",
    ],
  });
  app.save(publicDecks);

  const deckVisible = 'public_deck.hidden = false || public_deck.owner = @request.auth.id || ' + ADMIN;
  app.save(new Collection({
    type: "base",
    name: "public_deck_cards",
    listRule: deckVisible,
    viewRule: deckVisible,
    createRule: AUTHED + " && public_deck.owner = @request.auth.id",
    updateRule: "public_deck.owner = @request.auth.id && @request.body.public_deck:isset = false",
    deleteRule: "public_deck.owner = @request.auth.id || " + ADMIN,
    fields: [
      { name: "public_deck", type: "relation", required: true, maxSelect: 1, collectionId: publicDecks.id, cascadeDelete: true },
      { name: "source_card", type: "text", max: 15 },
      { name: "position", type: "number", min: 0, onlyInt: true },
      { name: "question", type: "text", max: 20000 },
      { name: "answer", type: "text", max: 20000 },
      image("question_image"),
      image("answer_image"),
    ].concat(stamps()),
    indexes: ["CREATE INDEX idx_public_deck_cards_deck ON public_deck_cards (public_deck, position)"],
  }));

  const perDeck = function (name, extraFields, rules) {
    return new Collection(Object.assign({
      type: "base",
      name: name,
      fields: [
        ownerField(),
        { name: "public_deck", type: "relation", required: true, maxSelect: 1, collectionId: publicDecks.id, cascadeDelete: true },
      ].concat(extraFields).concat(stamps()),
      indexes: ["CREATE UNIQUE INDEX idx_" + name + "_user_deck ON " + name + " (user, public_deck)"],
    }, rules));
  };

  app.save(perDeck("deck_ratings", [{ name: "stars", type: "number", required: true, min: 1, max: 5, onlyInt: true }], {
    listRule: OWN, viewRule: OWN, createRule: OWN_CREATE,
    updateRule: OWN_UPDATE + " && @request.body.public_deck:isset = false", deleteRule: OWN,
  }));
  app.save(perDeck("deck_imports", [], {
    listRule: OWN, viewRule: OWN, createRule: OWN_CREATE, updateRule: null, deleteRule: null,
  }));
  app.save(perDeck("deck_reports", [
    { name: "reason", type: "select", required: true, maxSelect: 1, values: ["spam", "inappropriate", "copyright", "other"] },
    { name: "detail", type: "text", max: 500 },
    { name: "status", type: "select", maxSelect: 1, values: ["open", "resolved", "dismissed"] },
  ], {
    listRule: "user = @request.auth.id || " + ADMIN,
    viewRule: "user = @request.auth.id || " + ADMIN,
    createRule: OWN_CREATE + " && @request.body.status:isset = false",
    updateRule: ADMIN, deleteRule: ADMIN,
  }));

  // ── ข้อมูลส่วนตัว ──
  const decks = new Collection({
    type: "base",
    name: "decks",
    listRule: OWN, viewRule: OWN, createRule: OWN_CREATE, updateRule: OWN_UPDATE, deleteRule: null,
    fields: [
      ownerField(),
      { name: "name", type: "text", required: true, max: 100 },
      { name: "color", type: "text", max: 20 },
      { name: "linked_public_deck", type: "relation", maxSelect: 1, collectionId: publicDecks.id, cascadeDelete: false },
      { name: "deleted", type: "bool" },
    ].concat(stamps()),
    indexes: ["CREATE INDEX idx_decks_user_updated ON decks (user, updated)"],
  });
  app.save(decks);

  app.save(new Collection({
    type: "base",
    name: "cards",
    listRule: OWN, viewRule: OWN,
    createRule: OWN_CREATE + " && deck.user = @request.auth.id",
    updateRule: OWN_UPDATE,
    deleteRule: null,
    fields: [
      ownerField(),
      { name: "deck", type: "relation", required: true, maxSelect: 1, collectionId: decks.id, cascadeDelete: true },
      { name: "question", type: "text", max: 20000 },
      { name: "answer", type: "text", max: 20000 },
      image("question_image"),
      image("answer_image"),
      { name: "fsrs_state", type: "json", maxSize: 2000 },
      { name: "next_review", type: "date" },
      { name: "source_card", type: "text", max: 15 },
      { name: "deleted", type: "bool" },
    ].concat(stamps()),
    indexes: ["CREATE INDEX idx_cards_user_updated ON cards (user, updated)"],
  }));

  app.save(new Collection({
    type: "base",
    name: "review_logs",
    listRule: OWN, viewRule: OWN, createRule: OWN_CREATE, updateRule: null, deleteRule: null,
    fields: [
      ownerField(),
      { name: "card_id", type: "text", max: 15 },
      { name: "rating", type: "number", required: true, min: 1, max: 4, onlyInt: true },
      { name: "reviewed_at", type: "date", required: true },
      { name: "device", type: "text", max: 15 },
    ].concat(stamps()),
    indexes: ["CREATE INDEX idx_review_logs_user_updated ON review_logs (user, updated)"],
  }));

  app.save(new Collection({
    type: "base",
    name: "user_progress",
    listRule: OWN, viewRule: OWN,
    createRule: OWN_CREATE + " && @request.body.id = @request.auth.id",
    updateRule: OWN_UPDATE,
    deleteRule: null,
    fields: [
      ownerField(),
      { name: "progress", type: "json", maxSize: 20000 },
    ].concat(stamps()),
    indexes: ["CREATE UNIQUE INDEX idx_user_progress_user ON user_progress (user)"],
  }));

  // ── settings ──
  const settings = app.settings();
  settings.meta.appName = "MemoKard";
  settings.batch.enabled = true;
  settings.batch.maxRequests = 100;
  settings.rateLimits.enabled = true;
  settings.rateLimits.rules = [
    { label: "users:create", maxRequests: 5, duration: 3600 },
    { label: "*:auth", maxRequests: 10, duration: 60 },
    { label: "public_decks:create", maxRequests: 10, duration: 86400 },
    { label: "deck_reports:create", maxRequests: 20, duration: 86400 },
    { label: "/api/", maxRequests: 300, duration: 10 },
  ];
  app.save(settings);
}, (app) => {
  ["user_progress", "review_logs", "cards", "decks", "deck_reports", "deck_imports", "deck_ratings", "public_deck_cards", "public_decks"]
    .forEach(function (name) {
      app.delete(app.findCollectionByNameOrId(name));
    });
  const users = app.findCollectionByNameOrId("users");
  users.indexes = users.indexes.filter(function (idx) { return idx.indexOf("idx_users_username") === -1; });
  users.fields.removeByName("username");
  users.fields.removeByName("role");
  app.save(users);
});
