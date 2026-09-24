# แผนลงมือ: ย้าย MemoKard ไป PocketBase ให้ครบ

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ถอด Supabase ออกทั้งหมด ให้ MemoKard ซิงก์ข้อมูลส่วนตัว ระบบชุมชน และแอดมิน ผ่าน PocketBase ตัวเดียวบนเซิร์ฟเวอร์ของผู้ใช้เอง โดยยังใช้งานแบบออฟไลน์ได้เหมือนเดิม

**Architecture:** เครื่องผู้ใช้ (Zustand + IndexedDB) เป็นแหล่งความจริง ทุกการเขียนเข้า `syncQueue` ซึ่งส่งทีละรายการผ่าน `syncTransport` → `pocketbaseStore` การดึงลงใช้ `syncEngine.pullChanges()` ดึงเฉพาะ record ที่ `updated >= lastPulledAt` แล้วรวมด้วยฟังก์ชันบริสุทธิ์ใน `merge.ts` ฝั่งเซิร์ฟเวอร์ใช้ JS migrations + hooks ของ PocketBase เพื่อสร้างตาราง กฎสิทธิ์ ตัวนับ และ route แอดมิน

**Tech Stack:** React 19, Zustand 5, idb-keyval, PocketBase server (JSVM migrations/hooks) + `pocketbase` JS SDK 0.28, Vitest 3, fake-indexeddb

**Spec:** `docs/superpowers/specs/2026-09-24-pocketbase-migration-design.md`

## Global Constraints

- ID ของทุก record ที่สร้างฝั่งเครื่อง = 15 ตัวอักษร `[a-z0-9]` (สร้างด้วย `newId()`) ห้ามใช้ `crypto.randomUUID()` หรือ `uuid`
- ทุก filter ที่มีค่าจากผู้ใช้ต้องใช้ `pb.filter('... {:x}', { x })` ห้ามต่อ string
- ล็อกอินด้วยชื่อผู้ใช้ + รหัสผ่านเท่านั้น (ไม่มี OAuth, อีเมลไม่บังคับ), รหัสผ่านขั้นต่ำ 8 ตัว
- สิทธิ์แอดมินมาจากฟิลด์ `users.role = "admin"` ที่เซิร์ฟเวอร์ ห้ามใช้ `VITE_ADMIN_USER_ID`
- ห้ามพึ่งบริการภายนอก (ไม่มี Discord, Sentry, Vercel, Google)
- ข้อความ UI ภาษาไทย
- ขนาดจำกัด: question/answer ≤ 20000 ตัว, รูป ≤ 1MB (jpeg/png/webp/gif), ชื่อชุด ≤ 100, รายละเอียดรายงาน ≤ 500
- เวอร์ชัน PocketBase server ปักไว้ที่ไฟล์ `deploy/pocketbase/VERSION` ไฟล์เดียว ใช้ทั้งเทสต์และสคริปต์ติดตั้ง
- git บนเครื่องนี้ต้องเรียกเป็น `git -c safe.directory=C:/Users/MIGHTYBIT/Desktop/ZENTYR/MemoKard-master ...` จนกว่าผู้ใช้จะตั้ง safe.directory ถาวร (ในแผนเขียนย่อเป็น `git`)
- Windows: ใช้ `npm.cmd` ใน PowerShell; ใน Git Bash ใช้ `npm` ได้

## Review Focus

1. **สลับบัญชีบนเครื่องเดียวกัน** — ล็อกอินบัญชี B บนเบราว์เซอร์ที่เคยเป็นบัญชี A ต้องไม่เห็นหรือส่งข้อมูลของ A ขึ้นบัญชี B → เทสต์ใน Task 7 (`setAuthState` กับ ownerId ต่างกันต้องล้างข้อมูล) และ Task 5 (action ของ owner อื่นต้องไม่ถูกส่ง)
2. **ลบแล้วกดเลิกทำภายใน 5 วินาที ขณะที่ pull ทำงานพอดี** — ชุดที่อยู่ในช่วง undo ต้องไม่ถูก pull ใส่กลับหรือหายถาวร → เทสต์ใน Task 7 (pending-delete ids ต้องถูกนับเป็น pending)
3. **ส่งสำเร็จแต่คำตอบหาย แล้วส่งซ้ำ** — review log ที่สร้างซ้ำด้วย ID เดิมต้องไม่ทำให้คิวค้าง → เทสต์ integration ใน Task 6 (`createReviewLog` ซ้ำสองครั้งต้องผ่าน)
4. **ออกจากระบบขณะยังมีงานค้างในคิว** — ผู้ใช้ต้องถูกเตือนว่ามี N รายการยังไม่ซิงก์ → Task 11 (ข้อความยืนยันออกจากระบบแสดงจำนวนค้าง)
5. **ข้อมูลเก่าที่เป็น UUID ในเครื่องผู้ใช้เดิม** — เปิดแอปเวอร์ชันใหม่แล้วชุด/การ์ดเดิมต้องอยู่ครบ และการ์ดยังผูกกับชุดถูกต้อง → เทสต์ใน Task 7 (`migrateLegacyIds`)

---

## โครงสร้างไฟล์

| ไฟล์ | สถานะ | หน้าที่ |
|---|---|---|
| `src/lib/ids.ts` | ใหม่ | `newId()`, `isServerId()` |
| `src/lib/pocketbase.ts` | แก้ | client + health check (มีอยู่แล้ว) |
| `deploy/pocketbase/VERSION` | ใหม่ | เวอร์ชัน PocketBase ที่ปักไว้ |
| `deploy/pocketbase/pb_migrations/1758700000_memokard_init.js` | ใหม่ | ตาราง กฎ settings |
| `deploy/pocketbase/pb_hooks/memokard_utils.js` | ใหม่ | ฟังก์ชันช่วยของ hooks |
| `deploy/pocketbase/pb_hooks/memokard.pb.js` | ใหม่ | hooks, routes, cron |
| `scripts/fetch-pocketbase.mjs` | ใหม่ | ดาวน์โหลด PocketBase + ตรวจ checksum ลง `.pocketbase/` |
| `tests/integration/pbHarness.ts` | ใหม่ | เปิด/ปิด PocketBase ชั่วคราวสำหรับเทสต์ |
| `tests/integration/*.test.ts` | ใหม่ | เทสต์กฎ, hooks, pocketbaseStore, community |
| `vitest.config.ts`, `vitest.integration.config.ts` | ใหม่ | config เทสต์ |
| `src/store/merge.ts` | ใหม่ | รวมข้อมูล (บริสุทธิ์) |
| `src/store/legacyMigration.ts` | ใหม่ | แปลง UUID → ID ใหม่ (บริสุทธิ์) |
| `src/store/syncQueue.ts` | เขียนใหม่ | คิว + coalesce + dead-letter + backoff |
| `src/store/syncTransport.ts` | ใหม่ | แปลง action → เรียก pocketbaseStore |
| `src/store/pocketbaseStore.ts` | เขียนใหม่ | mapper + upsert + fetchChanges |
| `src/store/syncEngine.ts` | ใหม่ | pull, auto-pull, adopt, linked decks |
| `src/store/store.ts` | แก้ | เลิกเรียก server ตรง, enqueue แทน, persist v1 |
| `src/store/types.ts` | แก้ | `Flashcard.sourceCardId` |
| `src/store/communityStore.ts` | เขียนใหม่ | ชุมชนบน PocketBase |
| `src/store/adminStore.ts` | ใหม่ | data layer ของหน้าแอดมิน |
| `src/contexts/AuthContext.tsx` | แก้ | role, ไม่มีอีเมล/Google, route เช็กชื่อ |
| `src/pages/AuthPage.tsx` | แก้ | ตัดช่องอีเมลตอนสมัคร |
| `src/pages/AdminPage.tsx` | แก้ | ใช้ adminStore + รีเซ็ตรหัสผ่าน |
| `src/components/SyncStatusBadge.tsx` | แก้ | สถานะใหม่ + dead-letter |
| `src/App.tsx` | แก้ | isAdmin จาก role, ถามย้ายข้อมูล, เตือนออกจากระบบ |
| `src/pages/DeckDetail.tsx`, `PublicDeckDetail.tsx`, `ExplorePage.tsx`, `components/AddDeck.tsx` | แก้ | ตาม signature ใหม่ |
| `src/lib/supabase.ts`, `src/store/supabaseStore.ts`, `supabase/`, `scripts/*migration*`, `deploy/pocketbase/pb_schema.json` | ลบ | |

---

### Task 0: เก็บงานเดิมที่ยังไม่ commit

**Files:** ไฟล์ที่ `git status` แสดงว่าแก้หรือยังไม่ track (ยกเว้น `.claude/`)

- [ ] **Step 1: ดูรายการ**

Run: `git status --short`
Expected: ไฟล์ประมาณ `.env.example, package*.json, src/App.tsx, src/contexts/AuthContext.tsx, src/pages/AuthPage.tsx, src/store/store.ts, src/store/syncQueue.ts, src/utils/deckIO.ts, deploy/, src/components/SyncStatusBadge.tsx, src/lib/pocketbase.ts, src/store/pocketbaseStore.ts`

- [ ] **Step 2: commit เป็น baseline**

```bash
git add .env.example package.json package-lock.json src deploy
git commit -m "chore: snapshot in-progress PocketBase migration before rework"
```

---

### Task 1: เครื่องมือเทสต์ + `newId()`

**Files:**
- Create: `src/lib/ids.ts`, `src/lib/ids.test.ts`, `vitest.config.ts`
- Modify: `package.json` (scripts + devDependencies)

**Interfaces:**
- Produces: `newId(): string`, `isServerId(id: string): boolean`, `ID_PATTERN: RegExp` จาก `src/lib/ids.ts`

- [ ] **Step 1: ติดตั้ง vitest + fake-indexeddb**

Run: `npm install -D vitest@^3.2.0 fake-indexeddb@^6.0.0`

- [ ] **Step 2: สร้าง `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    setupFiles: ['fake-indexeddb/auto'],
  },
});
```

- [ ] **Step 3: เพิ่ม scripts ใน `package.json`**

แทนที่ `"migration:test"` และ `"migration:guide"` ด้วย:

```json
    "test": "vitest run",
    "test:watch": "vitest",
    "test:integration": "vitest run --config vitest.integration.config.ts",
    "pb:fetch": "node scripts/fetch-pocketbase.mjs"
```

- [ ] **Step 4: เขียนเทสต์ที่ fail**

`src/lib/ids.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { ID_PATTERN, isServerId, newId } from './ids';

describe('newId', () => {
  it('returns 15 lowercase alphanumeric characters', () => {
    for (let i = 0; i < 200; i++) {
      expect(newId()).toMatch(ID_PATTERN);
    }
  });

  it('does not repeat across many calls', () => {
    const ids = new Set(Array.from({ length: 5000 }, () => newId()));
    expect(ids.size).toBe(5000);
  });
});

describe('isServerId', () => {
  it('accepts PocketBase ids and rejects UUIDs', () => {
    expect(isServerId('abc123def456ghi')).toBe(true);
    expect(isServerId('3f2a9c1e-8b7d-4e6f-a5c4-1b2d3e4f5a6b')).toBe(false);
    expect(isServerId('ABC123DEF456GHI')).toBe(false);
  });
});
```

- [ ] **Step 5: รันให้ fail**

Run: `npm test -- src/lib/ids.test.ts`
Expected: FAIL — `Failed to resolve import "./ids"`

- [ ] **Step 6: เขียน `src/lib/ids.ts`**

```ts
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';
const ID_LENGTH = 15;

/** รูปแบบ ID ที่ PocketBase รับได้เป็นค่าเริ่มต้น */
export const ID_PATTERN = /^[a-z0-9]{15}$/;

export function newId(): string {
  const bytes = new Uint8Array(ID_LENGTH);
  crypto.getRandomValues(bytes);
  let id = '';
  for (const byte of bytes) id += ALPHABET[byte % ALPHABET.length];
  return id;
}

export const isServerId = (id: string): boolean => ID_PATTERN.test(id);
```

- [ ] **Step 7: รันให้ผ่าน**

Run: `npm test -- src/lib/ids.test.ts`
Expected: PASS 3 tests

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json vitest.config.ts src/lib/ids.ts src/lib/ids.test.ts
git commit -m "test: add vitest and PocketBase-compatible id generator"
```

---

### Task 2: Schema ของ PocketBase + ชุดเทสต์ integration + กฎสิทธิ์

**Files:**
- Create: `deploy/pocketbase/VERSION`, `scripts/fetch-pocketbase.mjs`, `deploy/pocketbase/pb_migrations/1758700000_memokard_init.js`, `vitest.integration.config.ts`, `tests/integration/pbHarness.ts`, `tests/integration/rules.test.ts`
- Modify: `.gitignore`
- Delete: `deploy/pocketbase/pb_schema.json`

**Interfaces:**
- Produces (harness): `startPocketBase(): Promise<PbHarness>` โดย `PbHarness = { url: string; admin: PocketBase; stop(): Promise<void> }`, `createUser(url: string, username: string, password?: string): Promise<PocketBase>`, `makeAdmin(h: PbHarness, userPb: PocketBase): Promise<void>`
- Produces (schema): collections `decks, cards, review_logs, user_progress, public_decks, public_deck_cards, deck_ratings, deck_imports, deck_reports` + ฟิลด์ `users.username`, `users.role` ตามที่เขียนใน migration ด้านล่าง

- [ ] **Step 1: หาเวอร์ชันล่าสุดแล้วเขียน `deploy/pocketbase/VERSION`**

Run: `node -e "fetch('https://api.github.com/repos/pocketbase/pocketbase/releases/latest').then(r=>r.json()).then(j=>console.log(j.tag_name))"`
เขียนเลขที่ได้ (ตัด `v` ออก เช่น `0.30.1`) ลงไฟล์ `deploy/pocketbase/VERSION` บรรทัดเดียว **ต้องขอผู้ใช้ยืนยันก่อนดาวน์โหลดไฟล์ใน Step 3** (บอกชื่อไฟล์ แหล่ง และขนาดประมาณ 30MB)

- [ ] **Step 2: เขียน `scripts/fetch-pocketbase.mjs`**

```js
// ดาวน์โหลด PocketBase ตามเวอร์ชันใน deploy/pocketbase/VERSION ลง .pocketbase/ พร้อมตรวจ SHA-256
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const version = readFileSync('deploy/pocketbase/VERSION', 'utf8').trim();
const os = process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'darwin' : 'linux';
const arch = process.arch === 'arm64' ? 'arm64' : 'amd64';
const file = `pocketbase_${version}_${os}_${arch}.zip`;
const base = `https://github.com/pocketbase/pocketbase/releases/download/v${version}`;
const outDir = '.pocketbase';
const binary = join(outDir, os === 'windows' ? 'pocketbase.exe' : 'pocketbase');

if (existsSync(binary) && readFileSync(join(outDir, 'VERSION'), 'utf8').trim() === version) {
  console.log(`PocketBase ${version} already present`);
  process.exit(0);
}

mkdirSync(outDir, { recursive: true });

const download = async (url) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed (${res.status}): ${url}`);
  return Buffer.from(await res.arrayBuffer());
};

const [zip, checksums] = await Promise.all([download(`${base}/${file}`), download(`${base}/checksums.txt`)]);
const expected = checksums.toString('utf8').split('\n').find((line) => line.trim().endsWith(file))?.split(/\s+/)[0];
const actual = createHash('sha256').update(zip).digest('hex');
if (!expected || expected !== actual) throw new Error(`Checksum mismatch for ${file}`);

const zipPath = join(outDir, file);
writeFileSync(zipPath, zip);
if (os === 'linux') execFileSync('unzip', ['-o', zipPath, '-d', outDir]);
else execFileSync('tar', ['-xf', zipPath, '-C', outDir]);
writeFileSync(join(outDir, 'VERSION'), version);
console.log(`PocketBase ${version} ready at ${binary}`);
```

- [ ] **Step 3: เพิ่ม `.pocketbase/` และ `pb_data/` ใน `.gitignore` แล้วดาวน์โหลด (หลังผู้ใช้ยืนยัน)**

ต่อท้าย `.gitignore`:

```
# PocketBase local binary and data
.pocketbase/
pb_data/
```

Run: `npm run pb:fetch`
Expected: `PocketBase <version> ready at .pocketbase/pocketbase.exe`

- [ ] **Step 4: เขียน migration `deploy/pocketbase/pb_migrations/1758700000_memokard_init.js`**

```js
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
```

- [ ] **Step 5: ลบ schema แบบเก่า**

Run: `git rm deploy/pocketbase/pb_schema.json`

- [ ] **Step 6: เขียน `vitest.integration.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/integration/**/*.test.ts'],
    environment: 'node',
    setupFiles: ['fake-indexeddb/auto'],
    testTimeout: 30000,
    hookTimeout: 60000,
    fileParallelism: false,
  },
});
```

- [ ] **Step 7: เขียน `tests/integration/pbHarness.ts`**

```ts
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import net from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import PocketBase from 'pocketbase';

const ROOT = resolve(__dirname, '../..');
const BIN = join(ROOT, '.pocketbase', process.platform === 'win32' ? 'pocketbase.exe' : 'pocketbase');
const SUPERUSER = { email: 'admin@test.local', password: 'test-password-123' };

export interface PbHarness {
  url: string;
  admin: PocketBase;
  stop(): Promise<void>;
}

function freePort(): Promise<number> {
  return new Promise((resolvePort, reject) => {
    const server = net.createServer();
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close(() => (typeof address === 'object' && address ? resolvePort(address.port) : reject(new Error('no port'))));
    });
  });
}

async function waitForHealth(url: string): Promise<void> {
  for (let i = 0; i < 100; i++) {
    try {
      const res = await fetch(`${url}/api/health`);
      if (res.ok) return;
    } catch {
      // server not up yet
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`PocketBase did not start at ${url}`);
}

export async function startPocketBase(): Promise<PbHarness> {
  if (!existsSync(BIN)) throw new Error('PocketBase binary missing — run: npm run pb:fetch');
  const dataDir = mkdtempSync(join(tmpdir(), 'memokard-pb-'));
  const dirs = [
    '--dir', dataDir,
    '--migrationsDir', join(ROOT, 'deploy/pocketbase/pb_migrations'),
    '--hooksDir', join(ROOT, 'deploy/pocketbase/pb_hooks'),
  ];
  execFileSync(BIN, ['migrate', 'up', ...dirs], { stdio: 'pipe' });
  execFileSync(BIN, ['superuser', 'upsert', SUPERUSER.email, SUPERUSER.password, ...dirs], { stdio: 'pipe' });

  const port = await freePort();
  const url = `http://127.0.0.1:${port}`;
  const proc = spawn(BIN, ['serve', '--http', `127.0.0.1:${port}`, ...dirs], { stdio: 'ignore' });
  await waitForHealth(url);

  const admin = new PocketBase(url);
  admin.autoCancellation(false);
  await admin.collection('_superusers').authWithPassword(SUPERUSER.email, SUPERUSER.password);
  // เทสต์สร้างผู้ใช้หลายคนจาก IP เดียว จึงปิด rate limit เฉพาะในเทสต์
  await admin.settings.update({ rateLimits: { enabled: false } });

  return {
    url,
    admin,
    async stop() {
      const exited = new Promise((r) => proc.once('exit', r));
      proc.kill();
      await exited;
      rmSync(dataDir, { recursive: true, force: true });
    },
  };
}

export async function createUser(url: string, username: string, password = 'password1234'): Promise<PocketBase> {
  const pb = new PocketBase(url);
  pb.autoCancellation(false);
  await pb.collection('users').create({ username, password, passwordConfirm: password });
  await pb.collection('users').authWithPassword(username, password);
  return pb;
}

export async function makeAdmin(h: PbHarness, userPb: PocketBase): Promise<void> {
  await h.admin.collection('users').update(userPb.authStore.record!.id, { role: 'admin' });
  await userPb.collection('users').authRefresh();
}
```

- [ ] **Step 8: เขียนเทสต์กฎสิทธิ์ `tests/integration/rules.test.ts`**

```ts
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import PocketBase from 'pocketbase';
import { createUser, makeAdmin, startPocketBase, type PbHarness } from './pbHarness';

let h: PbHarness;
let alice: PocketBase;
let bob: PocketBase;

beforeAll(async () => {
  h = await startPocketBase();
  alice = await createUser(h.url, 'alice');
  bob = await createUser(h.url, 'bob');
});
afterAll(async () => h?.stop());

const uid = (pb: PocketBase) => pb.authStore.record!.id;

describe('users', () => {
  it('signs up with username only (no email) and logs in by username', async () => {
    expect(alice.authStore.isValid).toBe(true);
    expect(alice.authStore.record!.username).toBe('alice');
  });

  it('rejects a duplicate username regardless of case', async () => {
    await expect(createUser(h.url, 'ALICE')).rejects.toMatchObject({ status: 400 });
  });

  it('forbids setting role on signup or self-update', async () => {
    const pb = await createUser(h.url, 'mallory');
    await expect(pb.collection('users').update(uid(pb), { role: 'admin' })).rejects.toMatchObject({ status: 404 });
    const fresh = await h.admin.collection('users').getOne(uid(pb));
    expect(fresh.role).toBe('');
  });
});

describe('private data', () => {
  it('lets a user create and read own deck with a client id', async () => {
    const deck = await alice.collection('decks').create({ id: 'alicedeck000001', user: uid(alice), name: 'A' });
    expect(deck.id).toHaveLength(15);
    const list = await alice.collection('decks').getFullList();
    expect(list.map((d) => d.id)).toContain(deck.id);
  });

  it('hides other users decks and rejects writes to them', async () => {
    const deck = await alice.collection('decks').create({ user: uid(alice), name: 'secret' });
    expect(await bob.collection('decks').getFullList()).toHaveLength(0);
    await expect(bob.collection('decks').update(deck.id, { name: 'hacked' })).rejects.toMatchObject({ status: 404 });
    await expect(bob.collection('decks').create({ user: uid(alice), name: 'spoof' })).rejects.toMatchObject({ status: 400 });
  });

  it('rejects a card pointing at someone else deck', async () => {
    const deck = await alice.collection('decks').create({ user: uid(alice), name: 'mine' });
    await expect(bob.collection('cards').create({ user: uid(bob), deck: deck.id, question: 'q', answer: 'a' }))
      .rejects.toMatchObject({ status: 400 });
  });

  it('never lets anyone hard-delete decks through the API', async () => {
    const deck = await alice.collection('decks').create({ user: uid(alice), name: 'x' });
    await expect(alice.collection('decks').delete(deck.id)).rejects.toMatchObject({ status: 403 });
  });
});

describe('community', () => {
  it('lets anonymous visitors browse visible public decks', async () => {
    await alice.collection('public_decks').create({ owner: uid(alice), name: 'Shared' });
    const anon = new PocketBase(h.url);
    const list = await anon.collection('public_decks').getFullList();
    expect(list.map((d) => d.name)).toContain('Shared');
  });

  it('forbids owners from setting counters or hidden', async () => {
    await expect(alice.collection('public_decks').create({ owner: uid(alice), name: 'x', import_count: 999 }))
      .rejects.toMatchObject({ status: 400 });
  });

  it('keeps reports private to reporter and admins', async () => {
    const pd = await alice.collection('public_decks').create({ owner: uid(alice), name: 'rep' });
    await bob.collection('deck_reports').create({ user: uid(bob), public_deck: pd.id, reason: 'spam' });
    expect(await alice.collection('deck_reports').getFullList()).toHaveLength(0);
    expect(await bob.collection('deck_reports').getFullList()).toHaveLength(1);
    const boss = await createUser(h.url, 'boss');
    await makeAdmin(h, boss);
    expect((await boss.collection('deck_reports').getFullList()).length).toBeGreaterThan(0);
  });
});

describe('settings', () => {
  it('ships with batch enabled and rate limit rules', async () => {
    const s = await h.admin.settings.getAll();
    expect(s.batch.enabled).toBe(true);
    expect(s.rateLimits.rules.map((r: { label: string }) => r.label)).toContain('users:create');
  });
});
```


- [ ] **Step 9: รันเทสต์**

Run: `npm run test:integration -- tests/integration/rules.test.ts`
Expected: PASS ทุกเทสต์ ถ้า `email.required = false` หรือ label rate limit ใช้ไม่ได้ในเวอร์ชันที่ปักไว้ ให้ดู error จาก `migrate up` แล้วแก้ migration ตาม API ของเวอร์ชันนั้น (อ่าน `.pocketbase/pb_data/types.d.ts` ที่สร้างขึ้นมา)

- [ ] **Step 10: Commit**

```bash
git add .gitignore deploy/pocketbase scripts/fetch-pocketbase.mjs vitest.integration.config.ts tests/integration package.json
git commit -m "feat(server): PocketBase schema, rules and integration test harness"
```

---

### Task 3: Hooks ฝั่งเซิร์ฟเวอร์ (ตัวนับ, ซ่อนอัตโนมัติ, route แอดมิน, ลบถาวร)

**Files:**
- Create: `deploy/pocketbase/pb_hooks/memokard_utils.js`, `deploy/pocketbase/pb_hooks/memokard.pb.js`, `tests/integration/hooks.test.ts`

**Interfaces:**
- Produces routes: `GET /api/memokard/username-available?u=<name>` → `{ available: boolean }`; `POST /api/memokard/admin/reset-password` body `{ userId, password }` → `{ ok: true }` (ต้องเป็น role admin); `POST /api/memokard/admin/purge` (superuser เท่านั้น) → `{ deleted: number }`
- Produces: `public_decks.rating_avg/rating_count/import_count/report_count/hidden/owner_name` ดูแลโดยเซิร์ฟเวอร์

- [ ] **Step 1: เขียนเทสต์ที่ fail `tests/integration/hooks.test.ts`**

```ts
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import PocketBase from 'pocketbase';
import { createUser, makeAdmin, startPocketBase, type PbHarness } from './pbHarness';

let h: PbHarness;
let owner: PocketBase;
const uid = (pb: PocketBase) => pb.authStore.record!.id;

beforeAll(async () => {
  h = await startPocketBase();
  owner = await createUser(h.url, 'owner');
});
afterAll(async () => h?.stop());

const newPublicDeck = (name = 'deck') => owner.collection('public_decks').create({ owner: uid(owner), name });

describe('public deck counters', () => {
  it('stamps owner_name from the authenticated user', async () => {
    const pd = await newPublicDeck();
    expect(pd.owner_name).toBe('owner');
  });

  it('recomputes rating average and count', async () => {
    const pd = await newPublicDeck();
    const u1 = await createUser(h.url, 'rater1');
    const u2 = await createUser(h.url, 'rater2');
    await u1.collection('deck_ratings').create({ user: uid(u1), public_deck: pd.id, stars: 5 });
    const r2 = await u2.collection('deck_ratings').create({ user: uid(u2), public_deck: pd.id, stars: 2 });
    let fresh = await owner.collection('public_decks').getOne(pd.id);
    expect(fresh.rating_count).toBe(2);
    expect(fresh.rating_avg).toBe(3.5);
    await u2.collection('deck_ratings').update(r2.id, { stars: 4 });
    fresh = await owner.collection('public_decks').getOne(pd.id);
    expect(fresh.rating_avg).toBe(4.5);
  });

  it('counts imports once per user', async () => {
    const pd = await newPublicDeck();
    const u = await createUser(h.url, 'importer');
    await u.collection('deck_imports').create({ user: uid(u), public_deck: pd.id });
    await expect(u.collection('deck_imports').create({ user: uid(u), public_deck: pd.id })).rejects.toMatchObject({ status: 400 });
    expect((await owner.collection('public_decks').getOne(pd.id)).import_count).toBe(1);
  });

  it('auto-hides a deck after 3 open reports', async () => {
    const pd = await newPublicDeck('spammy');
    for (const name of ['rep1', 'rep2', 'rep3']) {
      const u = await createUser(h.url, name);
      await u.collection('deck_reports').create({ user: uid(u), public_deck: pd.id, reason: 'spam' });
    }
    const fresh = await owner.collection('public_decks').getOne(pd.id);
    expect(fresh.report_count).toBe(3);
    expect(fresh.hidden).toBe(true);
    const anon = new PocketBase(h.url);
    await expect(anon.collection('public_decks').getOne(pd.id)).rejects.toMatchObject({ status: 404 });
  });

  it('owner cannot unhide an auto-hidden deck', async () => {
    const pd = (await owner.collection('public_decks').getFullList({ filter: 'hidden = true' }))[0];
    await expect(owner.collection('public_decks').update(pd.id, { hidden: false })).rejects.toMatchObject({ status: 404 });
  });
});

describe('routes', () => {
  it('reports username availability case-insensitively', async () => {
    const anon = new PocketBase(h.url);
    expect(await anon.send('/api/memokard/username-available', { query: { u: 'OWNER' } })).toEqual({ available: false });
    expect(await anon.send('/api/memokard/username-available', { query: { u: 'freshname' } })).toEqual({ available: true });
    expect(await anon.send('/api/memokard/username-available', { query: { u: 'x' } })).toEqual({ available: false });
  });

  it('lets only admins reset passwords', async () => {
    const victim = await createUser(h.url, 'forgetful');
    const body = { userId: uid(victim), password: 'brand-new-pass' };
    await expect(owner.send('/api/memokard/admin/reset-password', { method: 'POST', body })).rejects.toMatchObject({ status: 403 });
    const boss = await createUser(h.url, 'boss2');
    await makeAdmin(h, boss);
    expect(await boss.send('/api/memokard/admin/reset-password', { method: 'POST', body })).toEqual({ ok: true });
    const again = new PocketBase(h.url);
    await again.collection('users').authWithPassword('forgetful', 'brand-new-pass');
    expect(again.authStore.isValid).toBe(true);
  });

  it('purges soft-deleted records older than 30 days', async () => {
    const deck = await owner.collection('decks').create({ user: uid(owner), name: 'old', deleted: true });
    await h.admin.send('/api/memokard/admin/purge', { method: 'POST', body: { olderThanDays: 0 } });
    await expect(h.admin.collection('decks').getOne(deck.id)).rejects.toMatchObject({ status: 404 });
  });
});
```

- [ ] **Step 2: รันให้ fail**

Run: `npm run test:integration -- tests/integration/hooks.test.ts`
Expected: FAIL (owner_name ว่าง, ตัวนับเป็น 0, route 404)

- [ ] **Step 3: เขียน `deploy/pocketbase/pb_hooks/memokard_utils.js`**

```js
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
    const row = new DynamicModel({ c: 0, a: 0 });
    app.db()
      .newQuery("SELECT COUNT(*) AS c, COALESCE(AVG(stars), 0) AS a FROM deck_ratings WHERE public_deck = {:id}")
      .bind({ id: deckId })
      .one(row);
    deck.set("rating_count", row.c);
    deck.set("rating_avg", Math.round(row.a * 10) / 10);
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
```

- [ ] **Step 4: เขียน `deploy/pocketbase/pb_hooks/memokard.pb.js`**

```js
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
```

- [ ] **Step 5: รันให้ผ่าน**

Run: `npm run test:integration`
Expected: PASS ทั้ง `rules.test.ts` และ `hooks.test.ts`

- [ ] **Step 6: Commit**

```bash
git add deploy/pocketbase/pb_hooks tests/integration/hooks.test.ts
git commit -m "feat(server): counters, auto-hide, admin routes and purge hooks"
```

---

### Task 4: ฟังก์ชันรวมข้อมูล `merge.ts`

**Files:**
- Create: `src/store/merge.ts`, `src/store/merge.test.ts`

**Interfaces:**
- Produces:
  - `interface RemoteChange<T> { record: T; deleted: boolean }`
  - `mergeById<T extends { id: string }>(local: T[], remote: RemoteChange<T>[], pendingIds: ReadonlySet<string>): T[]`
  - `interface RemoteReviewLog { id: string; reviewedAt: string; device: string }`
  - `addReviewCounts(history: Record<string, number>, logs: RemoteReviewLog[], thisDevice: string): Record<string, number>`
  - `interface SyncedProgress { counters: UserProgress; unlockedAchievements: string[] }`
  - `mergeProgress(local: SyncedProgress, remote: SyncedProgress): SyncedProgress`

- [ ] **Step 1: เขียนเทสต์ที่ fail `src/store/merge.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { addReviewCounts, mergeById, mergeProgress, type SyncedProgress } from './merge';

type Item = { id: string; v: string };

describe('mergeById', () => {
  const local: Item[] = [{ id: 'a', v: 'local-a' }, { id: 'b', v: 'local-b' }];

  it('takes the remote version when nothing is pending', () => {
    const out = mergeById(local, [{ record: { id: 'a', v: 'remote-a' }, deleted: false }], new Set());
    expect(out).toEqual([{ id: 'a', v: 'remote-a' }, { id: 'b', v: 'local-b' }]);
  });

  it('keeps the local version while it is pending in the queue', () => {
    const out = mergeById(local, [{ record: { id: 'a', v: 'remote-a' }, deleted: false }], new Set(['a']));
    expect(out[0].v).toBe('local-a');
  });

  it('removes records deleted remotely', () => {
    const out = mergeById(local, [{ record: { id: 'b', v: '' }, deleted: true }], new Set());
    expect(out.map((i) => i.id)).toEqual(['a']);
  });

  it('adds new remote records', () => {
    const out = mergeById(local, [{ record: { id: 'c', v: 'remote-c' }, deleted: false }], new Set());
    expect(out.map((i) => i.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('addReviewCounts', () => {
  it('counts logs from other devices by UTC day and ignores this device', () => {
    const out = addReviewCounts({ '2026-09-20': 2 }, [
      { id: '1', reviewedAt: '2026-09-20T10:00:00.000Z', device: 'other' },
      { id: '2', reviewedAt: '2026-09-21 01:00:00.000Z', device: 'other' },
      { id: '3', reviewedAt: '2026-09-21T02:00:00.000Z', device: 'me' },
    ], 'me');
    expect(out).toEqual({ '2026-09-20': 3, '2026-09-21': 1 });
  });
});

describe('mergeProgress', () => {
  const base = (n: number): SyncedProgress => ({
    counters: {
      cardsCreated: n, decksCreated: n, reviewsCompleted: n, currentStreak: n, maxStreak: n,
      perfectReviews: n, totalStudyTime: n, decksShared: n, decksImported: n,
    },
    unlockedAchievements: [],
  });

  it('takes the max of each counter and the union of achievements', () => {
    const local = { ...base(1), unlockedAchievements: ['first_deck'] };
    const remote = { ...base(5), unlockedAchievements: ['first_card', 'first_deck'] };
    remote.counters.decksCreated = 0;
    const out = mergeProgress(local, remote);
    expect(out.counters.cardsCreated).toBe(5);
    expect(out.counters.decksCreated).toBe(1);
    expect(out.unlockedAchievements.sort()).toEqual(['first_card', 'first_deck']);
  });
});
```

- [ ] **Step 2: รันให้ fail**

Run: `npm test -- src/store/merge.test.ts`
Expected: FAIL — `Failed to resolve import "./merge"`

- [ ] **Step 3: เขียน `src/store/merge.ts`**

```ts
import type { UserProgress } from '../utils/achievements';

export interface RemoteChange<T> {
  record: T;
  deleted: boolean;
}

/**
 * รวมข้อมูลจากเซิร์ฟเวอร์เข้ากับข้อมูลในเครื่อง
 * - record ที่ยังค้างในคิว (pendingIds) ใช้ของในเครื่องเสมอ
 * - นอกนั้นใช้ของเซิร์ฟเวอร์ (เพราะของในเครื่องที่ไม่ค้างย่อมเก่ากว่าหรือเท่ากับเซิร์ฟเวอร์)
 */
export function mergeById<T extends { id: string }>(
  local: T[],
  remote: RemoteChange<T>[],
  pendingIds: ReadonlySet<string>,
): T[] {
  const byId = new Map(local.map((item) => [item.id, item]));
  for (const change of remote) {
    const id = change.record.id;
    if (pendingIds.has(id)) continue;
    if (change.deleted) byId.delete(id);
    else byId.set(id, change.record);
  }
  return [...byId.values()];
}

export interface RemoteReviewLog {
  id: string;
  reviewedAt: string;
  device: string;
}

/** นับประวัติการทบทวนจากเครื่องอื่นเพิ่มเข้าไป (log ของเครื่องนี้ถูกนับไปแล้วตอนทบทวน) */
export function addReviewCounts(
  history: Record<string, number>,
  logs: RemoteReviewLog[],
  thisDevice: string,
): Record<string, number> {
  const next = { ...history };
  for (const log of logs) {
    if (log.device === thisDevice) continue;
    const day = new Date(log.reviewedAt.replace(' ', 'T')).toISOString().slice(0, 10);
    next[day] = (next[day] ?? 0) + 1;
  }
  return next;
}

export interface SyncedProgress {
  counters: UserProgress;
  unlockedAchievements: string[];
}

export function mergeProgress(local: SyncedProgress, remote: SyncedProgress): SyncedProgress {
  const counters = { ...local.counters };
  for (const key of Object.keys(counters) as (keyof UserProgress)[]) {
    counters[key] = Math.max(local.counters[key] ?? 0, remote.counters[key] ?? 0);
  }
  return {
    counters,
    unlockedAchievements: [...new Set([...local.unlockedAchievements, ...remote.unlockedAchievements])],
  };
}
```

- [ ] **Step 4: รันให้ผ่าน**

Run: `npm test -- src/store/merge.test.ts`
Expected: PASS 6 tests

- [ ] **Step 5: Commit**

```bash
git add src/store/merge.ts src/store/merge.test.ts
git commit -m "feat(sync): pure merge helpers for pulled server changes"
```

---

### Task 5: เขียนคิวซิงก์ใหม่

**Files:**
- Rewrite: `src/store/syncQueue.ts`
- Create: `src/store/syncQueue.test.ts`

**Interfaces:**
- Produces:
  - `type SyncActionType = 'UPSERT_DECK' | 'DELETE_DECK' | 'UPSERT_CARD' | 'DELETE_CARD' | 'LOG_REVIEW' | 'UPSERT_PROGRESS'`
  - `interface ReviewLogPayload { id: string; cardId: string; rating: number; reviewedAt: string; device: string }`
  - `interface SyncAction { id: string; type: SyncActionType; entityId: string; ownerId: string; log?: ReviewLogPayload; enqueuedAt: number; attempts: number; lastError?: string }`
  - `type SyncStatus = 'idle' | 'syncing' | 'offline' | 'retrying' | 'auth'`
  - `class PermanentSyncError`, `class AuthSyncError`, `classifyError(err: unknown): Error`
  - `coalesce(queue: SyncAction[], incoming: SyncAction): SyncAction[]`
  - `createSyncQueue(deps: QueueDeps)` คืน object ที่มีเมธอด `getQueue()`, `getDeadLetters()`, `enqueue(type, entityId, ownerId, log?)`, `processQueue()`, `retryDeadLetters()`, `discardDeadLetters()`, `pendingEntityIds(): Promise<Set<string>>`, `getStatus(): { status: SyncStatus; lastSyncedAt: number | null }`, `subscribe(fn: () => void): () => void`
  - `syncQueue` — instance จริงที่ใช้ในแอป (`send` มาจาก `./syncTransport` แบบ lazy import)

- [ ] **Step 1: เขียนเทสต์ที่ fail `src/store/syncQueue.test.ts`**

```ts
import { describe, expect, it, vi } from 'vitest';
import {
  AuthSyncError, PermanentSyncError, coalesce, createSyncQueue,
  type QueueDeps, type SyncAction,
} from './syncQueue';

function memoryDeps(overrides: Partial<QueueDeps> = {}) {
  const store: Record<string, SyncAction[]> = {};
  const sent: SyncAction[] = [];
  const scheduled: number[] = [];
  const deps: QueueDeps = {
    load: async (key) => structuredClone(store[key] ?? []),
    save: async (key, value) => { store[key] = structuredClone(value); },
    send: async (action) => { sent.push(action); },
    currentOwner: () => 'u1',
    isOnline: () => true,
    now: () => 1000,
    schedule: (_fn, ms) => { scheduled.push(ms); },
    ...overrides,
  };
  return { deps, sent, scheduled, store };
}

const action = (type: SyncAction['type'], entityId: string, extra: Partial<SyncAction> = {}): SyncAction => ({
  id: `${type}-${entityId}-${Math.random()}`, type, entityId, ownerId: 'u1', enqueuedAt: 0, attempts: 0, ...extra,
});

describe('coalesce', () => {
  it('keeps only one upsert for the same card', () => {
    const q = coalesce([action('UPSERT_CARD', 'c1')], action('UPSERT_CARD', 'c1'));
    expect(q).toHaveLength(1);
  });

  it('keeps the position of the first upsert so a deck is sent before its cards', () => {
    const q = coalesce([action('UPSERT_DECK', 'd1'), action('UPSERT_CARD', 'c1')], action('UPSERT_DECK', 'd1'));
    expect(q.map((a) => a.entityId)).toEqual(['d1', 'c1']);
  });

  it('replaces a pending upsert with a delete', () => {
    const q = coalesce([action('UPSERT_CARD', 'c1'), action('UPSERT_CARD', 'c2')], action('DELETE_CARD', 'c1'));
    expect(q.map((a) => `${a.type}:${a.entityId}`)).toEqual(['UPSERT_CARD:c2', 'DELETE_CARD:c1']);
  });

  it('never drops review logs', () => {
    const log = { id: 'l', cardId: 'c1', rating: 3, reviewedAt: '', device: 'd' };
    let q = coalesce([], action('LOG_REVIEW', 'l1', { log }));
    q = coalesce(q, action('LOG_REVIEW', 'l2', { log }));
    expect(q).toHaveLength(2);
  });

  it('does not merge actions from different owners', () => {
    const q = coalesce([action('UPSERT_CARD', 'c1', { ownerId: 'other' })], action('UPSERT_CARD', 'c1'));
    expect(q).toHaveLength(2);
  });
});

describe('processQueue', () => {
  it('sends in order and empties the queue', async () => {
    const { deps, sent } = memoryDeps();
    const q = createSyncQueue(deps);
    await q.enqueue('UPSERT_DECK', 'd1', 'u1');
    await q.enqueue('UPSERT_CARD', 'c1', 'u1');
    await q.processQueue();
    expect(sent.map((a) => a.entityId)).toEqual(['d1', 'c1']);
    expect(await q.getQueue()).toHaveLength(0);
    expect(q.getStatus()).toEqual({ status: 'idle', lastSyncedAt: 1000 });
  });

  it('keeps the action and schedules a retry on a transient error', async () => {
    const { deps, scheduled } = memoryDeps({ send: vi.fn().mockRejectedValue(new Error('network')) });
    const q = createSyncQueue(deps);
    await q.enqueue('UPSERT_DECK', 'd1', 'u1');
    await q.processQueue();
    const [pending] = await q.getQueue();
    expect(pending.attempts).toBe(1);
    expect(scheduled).toEqual([2000]);
    expect(q.getStatus().status).toBe('retrying');
  });

  it('moves permanent failures to dead letters and continues', async () => {
    const send = vi.fn()
      .mockRejectedValueOnce(new PermanentSyncError('bad'))
      .mockResolvedValue(undefined);
    const { deps } = memoryDeps({ send });
    const q = createSyncQueue(deps);
    await q.enqueue('UPSERT_DECK', 'd1', 'u1');
    await q.enqueue('UPSERT_DECK', 'd2', 'u1');
    await q.processQueue();
    expect(await q.getQueue()).toHaveLength(0);
    expect((await q.getDeadLetters()).map((a) => a.entityId)).toEqual(['d1']);
    expect(send).toHaveBeenCalledTimes(2);
  });

  it('stops with auth status on 401', async () => {
    const { deps } = memoryDeps({ send: vi.fn().mockRejectedValue(new AuthSyncError('expired')) });
    const q = createSyncQueue(deps);
    await q.enqueue('UPSERT_DECK', 'd1', 'u1');
    await q.processQueue();
    expect(await q.getQueue()).toHaveLength(1);
    expect(q.getStatus().status).toBe('auth');
  });

  it('never sends actions that belong to another account', async () => {
    const { deps, sent } = memoryDeps({ currentOwner: () => 'u2' });
    const q = createSyncQueue(deps);
    await q.enqueue('UPSERT_DECK', 'd1', 'u1');
    await q.processQueue();
    expect(sent).toHaveLength(0);
    expect(await q.getQueue()).toHaveLength(1);
  });

  it('does not lose an enqueue that happens while sending', async () => {
    let q: ReturnType<typeof createSyncQueue>;
    const { deps } = memoryDeps({
      send: async (a) => {
        if (a.entityId === 'd1') await q.enqueue('UPSERT_CARD', 'c9', 'u1');
      },
    });
    q = createSyncQueue(deps);
    await q.enqueue('UPSERT_DECK', 'd1', 'u1');
    await q.processQueue();
    await q.processQueue();
    expect(await q.getQueue()).toHaveLength(0);
  });

  it('resends when the same entity changes while it is being sent', async () => {
    let q: ReturnType<typeof createSyncQueue>;
    let calls = 0;
    const { deps } = memoryDeps({
      send: async () => {
        calls++;
        if (calls === 1) await q.enqueue('UPSERT_CARD', 'c1', 'u1'); // แก้การ์ดระหว่างกำลังส่ง
      },
    });
    q = createSyncQueue(deps);
    await q.enqueue('UPSERT_CARD', 'c1', 'u1');
    await q.processQueue();
    expect(calls).toBe(2);
    expect(await q.getQueue()).toHaveLength(0);
  });

  it('reports pending entity ids', async () => {
    const { deps } = memoryDeps({ isOnline: () => false });
    const q = createSyncQueue(deps);
    await q.enqueue('UPSERT_CARD', 'c1', 'u1');
    await q.enqueue('DELETE_DECK', 'd1', 'u1');
    expect([...(await q.pendingEntityIds())].sort()).toEqual(['c1', 'd1']);
  });
});
```

- [ ] **Step 2: รันให้ fail**

Run: `npm test -- src/store/syncQueue.test.ts`
Expected: FAIL — ไม่มี export `coalesce`, `createSyncQueue`

- [ ] **Step 3: เขียน `src/store/syncQueue.ts` ใหม่ทั้งไฟล์**

```ts
import { get as idbGet, set as idbSet } from 'idb-keyval';
import { newId } from '../lib/ids';
import { safeLocalStorage } from '../utils/safeStorage';

const QUEUE_KEY = 'offline-sync-queue-v2';
const DEAD_KEY = 'offline-sync-dead-v2';
const MAX_BACKOFF_MS = 5 * 60 * 1000;

export type SyncActionType =
  | 'UPSERT_DECK'
  | 'DELETE_DECK'
  | 'UPSERT_CARD'
  | 'DELETE_CARD'
  | 'LOG_REVIEW'
  | 'UPSERT_PROGRESS';

export interface ReviewLogPayload {
  id: string;
  cardId: string;
  rating: number;
  reviewedAt: string;
  device: string;
}

export interface SyncAction {
  id: string;
  type: SyncActionType;
  entityId: string;
  ownerId: string;
  log?: ReviewLogPayload;
  enqueuedAt: number;
  attempts: number;
  lastError?: string;
}

export type SyncStatus = 'idle' | 'syncing' | 'offline' | 'retrying' | 'auth';

/** 400/403/404 — ส่งซ้ำก็ไม่มีวันสำเร็จ */
export class PermanentSyncError extends Error {}
/** 401 — ต้องล็อกอินใหม่ */
export class AuthSyncError extends Error {}

export function classifyError(err: unknown): Error {
  const status = (err as { status?: number })?.status;
  const message = err instanceof Error ? err.message : String(err);
  if (status === 401) return new AuthSyncError(message);
  if (status === 400 || status === 403 || status === 404) return new PermanentSyncError(message);
  return err instanceof Error ? err : new Error(message);
}

const entityKind = (type: SyncActionType): string => {
  if (type.endsWith('_DECK')) return 'deck';
  if (type.endsWith('_CARD')) return 'card';
  if (type === 'UPSERT_PROGRESS') return 'progress';
  return 'log';
};

const entityKey = (a: Pick<SyncAction, 'type' | 'entityId' | 'ownerId'>) =>
  `${a.ownerId}:${entityKind(a.type)}:${a.entityId}`;

/**
 * รวม action ซ้ำของ entity เดียวกัน (ข้อมูลจริงอ่านจาก store ตอนส่ง จึงไม่ต้องเก็บหลายอัน)
 * - UPSERT ซ้ำ UPSERT → คงอันเดิมไว้ที่ตำแหน่งเดิม (ชุดต้องขึ้นก่อนการ์ด)
 * - DELETE ↔ UPSERT → ตัดอันเก่า แล้วต่อท้ายอันใหม่
 * - LOG_REVIEW เก็บทุกอัน
 */
export function coalesce(queue: SyncAction[], incoming: SyncAction): SyncAction[] {
  if (incoming.type === 'LOG_REVIEW') return [...queue, incoming];
  const key = entityKey(incoming);
  const existing = queue.find((a) => entityKey(a) === key);
  if (existing && existing.type === incoming.type && incoming.type.startsWith('UPSERT')) return queue;
  return [...queue.filter((a) => entityKey(a) !== key), incoming];
}

export interface QueueDeps {
  load(key: string): Promise<SyncAction[]>;
  save(key: string, actions: SyncAction[]): Promise<void>;
  send(action: SyncAction): Promise<void>;
  currentOwner(): string | null;
  isOnline(): boolean;
  now(): number;
  schedule(fn: () => void, ms: number): void;
}

export function createSyncQueue(deps: QueueDeps) {
  let lock: Promise<unknown> = Promise.resolve();
  let inFlight: Promise<void> | null = null;
  let rerun = false;
  // entity ที่ถูกแก้อีกครั้งระหว่างกำลังส่ง → ต้องส่งซ้ำหลังส่งรอบนี้เสร็จ
  const touchedWhileSending = new Set<string>();
  let sendingKey: string | null = null;
  let status: SyncStatus = 'idle';
  let lastSyncedAt: number | null = null;
  const listeners = new Set<() => void>();

  const notify = () => listeners.forEach((fn) => fn());
  const setStatus = (next: SyncStatus) => {
    status = next;
    notify();
  };

  /** ทุกการอ่าน-แก้-เขียนคิวต้องผ่าน lock เพื่อไม่ให้ enqueue ระหว่างส่งหาย */
  const withLock = <T>(fn: () => Promise<T>): Promise<T> => {
    const result = lock.then(fn, fn);
    lock = result.catch(() => undefined);
    return result;
  };

  const removeFromQueue = (id: string) =>
    withLock(async () => deps.save(QUEUE_KEY, (await deps.load(QUEUE_KEY)).filter((a) => a.id !== id)));

  async function run(): Promise<void> {
    if (!deps.isOnline()) {
      setStatus('offline');
      return;
    }
    const owner = deps.currentOwner();
    if (!owner) return;

    setStatus('syncing');
    do {
      rerun = false;
      for (;;) {
        const next = (await deps.load(QUEUE_KEY)).find((a) => a.ownerId === owner);
        if (!next) break;

        sendingKey = entityKey(next);
        touchedWhileSending.delete(sendingKey);
        try {
          await deps.send(next);
          const resend = touchedWhileSending.has(sendingKey);
          sendingKey = null;
          if (!resend) await removeFromQueue(next.id);
        } catch (err) {
          sendingKey = null;
          if (err instanceof PermanentSyncError) {
            await removeFromQueue(next.id);
            await withLock(async () =>
              deps.save(DEAD_KEY, [...(await deps.load(DEAD_KEY)), { ...next, lastError: err.message }]));
            continue;
          }
          if (err instanceof AuthSyncError) {
            setStatus('auth');
            return;
          }
          const attempts = next.attempts + 1;
          const lastError = err instanceof Error ? err.message : String(err);
          await withLock(async () => deps.save(QUEUE_KEY, (await deps.load(QUEUE_KEY)).map((a) =>
            a.id === next.id ? { ...a, attempts, lastError } : a)));
          deps.schedule(() => void api.processQueue(), Math.min(2000 * 2 ** (attempts - 1), MAX_BACKOFF_MS));
          setStatus('retrying');
          return;
        }
      }
    } while (rerun);
    lastSyncedAt = deps.now();
    setStatus('idle');
  }

  const api = {
    getQueue: () => deps.load(QUEUE_KEY),
    getDeadLetters: () => deps.load(DEAD_KEY),
    getStatus: () => ({ status, lastSyncedAt }),

    subscribe(fn: () => void): () => void {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },

    async enqueue(type: SyncActionType, entityId: string, ownerId: string, log?: ReviewLogPayload): Promise<void> {
      const incoming: SyncAction = { id: newId(), type, entityId, ownerId, log, enqueuedAt: deps.now(), attempts: 0 };
      if (sendingKey === entityKey(incoming)) touchedWhileSending.add(sendingKey);
      await withLock(async () => deps.save(QUEUE_KEY, coalesce(await deps.load(QUEUE_KEY), incoming)));
      notify();
      void api.processQueue();
    },

    async pendingEntityIds(): Promise<Set<string>> {
      const queue = await deps.load(QUEUE_KEY);
      return new Set(queue.map((a) => a.entityId));
    },

    /** ถ้ากำลังส่งอยู่ คืน promise เดิม และตั้ง rerun ให้วนอีกรอบเพื่อเก็บ action ที่เพิ่งเข้ามา */
    processQueue(): Promise<void> {
      if (inFlight) {
        rerun = true;
        return inFlight;
      }
      inFlight = run().finally(() => {
        inFlight = null;
      });
      return inFlight;
    },

    async retryDeadLetters(): Promise<void> {
      await withLock(async () => {
        const dead = await deps.load(DEAD_KEY);
        const revived = dead.map((a) => ({ ...a, attempts: 0, lastError: undefined }));
        await deps.save(QUEUE_KEY, [...(await deps.load(QUEUE_KEY)), ...revived]);
        await deps.save(DEAD_KEY, []);
      });
      notify();
      void api.processQueue();
    },

    async discardDeadLetters(): Promise<void> {
      await withLock(() => deps.save(DEAD_KEY, []));
      notify();
    },
  };

  return api;
}

// ── instance ที่ใช้จริงในแอป ──

async function loadPersisted(key: string): Promise<SyncAction[]> {
  try {
    const value = await idbGet<SyncAction[]>(key);
    if (Array.isArray(value)) return value;
  } catch {
    // IndexedDB ถูกบล็อก ใช้ localStorage แทน
  }
  try {
    const raw = safeLocalStorage.get(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function savePersisted(key: string, actions: SyncAction[]): Promise<void> {
  safeLocalStorage.set(key, JSON.stringify(actions));
  try {
    await idbSet(key, actions);
  } catch {
    // มีสำรองใน localStorage แล้ว
  }
}

export const syncQueue = createSyncQueue({
  load: loadPersisted,
  save: savePersisted,
  send: async (action) => {
    const { sendAction } = await import('./syncTransport');
    await sendAction(action);
  },
  currentOwner: () => {
    // lazy เพื่อตัด circular import กับ store.ts
    const state = (globalThis as { __memokardStore?: { getState(): { userId: string | null; isDemo: boolean; ownerId: string | null } } })
      .__memokardStore?.getState();
    return state && !state.isDemo && state.ownerId === state.userId ? state.userId : null;
  },
  isOnline: () => (typeof navigator === 'undefined' ? true : navigator.onLine),
  now: () => Date.now(),
  schedule: (fn, ms) => setTimeout(fn, ms),
});

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => void syncQueue.processQueue());
}
```

(`globalThis.__memokardStore` ถูกตั้งค่าใน Task 7 Step 7 เพื่อเลี่ยง import วนกันระหว่าง `store.ts` ↔ `syncQueue.ts`)

- [ ] **Step 4: รันให้ผ่าน**

Run: `npm test -- src/store/syncQueue.test.ts`
Expected: PASS 13 tests

- [ ] **Step 5: Commit** (ยัง build ไม่ผ่านเพราะ store.ts ยังเรียก API เก่า ซึ่งจะแก้ใน Task 7)

```bash
git add src/store/syncQueue.ts src/store/syncQueue.test.ts
git commit -m "feat(sync): rewrite offline queue with coalescing, dead letters and backoff"
```

---

### Task 6: `pocketbaseStore` ใหม่ (mapper, upsert, รูป, fetchChanges)

**Files:**
- Rewrite: `src/store/pocketbaseStore.ts`
- Modify: `src/store/types.ts`, `src/lib/pocketbase.ts`
- Create: `tests/integration/pocketbaseStore.test.ts`

**Interfaces:**
- Consumes: `newId` (Task 1), `RemoteChange`, `RemoteReviewLog`, `SyncedProgress` (Task 4), `ReviewLogPayload` (Task 5)
- Produces (ใน `pocketbaseStore`):
  - `upsertDeck(userId: string, deck: Deck): Promise<void>`
  - `softDeleteDeck(id: string): Promise<void>`
  - `upsertCard(userId: string, card: Flashcard): Promise<void>`
  - `softDeleteCard(id: string): Promise<void>`
  - `createReviewLog(userId: string, log: ReviewLogPayload): Promise<void>`
  - `upsertProgress(userId: string, progress: SyncedProgress): Promise<void>`
  - `fetchChanges(userId: string, since: string | null): Promise<ServerChanges>` โดย `ServerChanges = { decks: RemoteChange<Deck>[]; cards: RemoteChange<Flashcard>[]; logs: RemoteReviewLog[]; progress: SyncedProgress | null; maxUpdated: string | null; boundaryLogIds: string[] }` (`boundaryLogIds` = log ที่ `updated` เท่ากับ `maxUpdated` พอดี ใช้กันนับซ้ำเพราะ pull ครั้งถัดไปใช้ `>=`)
  - `imageToBlob(value: string | undefined): Promise<Blob | null>` (export แยก ใช้ซ้ำใน community)
- Produces (`src/lib/pocketbase.ts`): `setPocketBaseClient(client: PocketBase)` สำหรับเทสต์
- Produces (`types.ts`): `Flashcard.sourceCardId?: string`

- [ ] **Step 1: เพิ่มฟิลด์ใน `src/store/types.ts`**

ใน `interface Flashcard` ต่อจาก `answerImage?: string;`:

```ts
  // ID ของการ์ดในชุดสาธารณะ (เฉพาะชุดที่ติดตาม) ใช้จับคู่ตอนอัปเดตจากชุดต้นทาง
  sourceCardId?: string;
```

และแก้คอมเมนต์หัวไฟล์จาก `store.ts, supabaseStore.ts, and syncQueue.ts` เป็น `store.ts, pocketbaseStore.ts, and syncQueue.ts`

- [ ] **Step 2: แก้ `src/lib/pocketbase.ts` ให้เปลี่ยน client ได้ในเทสต์**

แทนที่ส่วนท้ายไฟล์ (ตั้งแต่ `// สร้าง PocketBase client instance`) ด้วย:

```ts
// สร้าง PocketBase client instance
export let pb = new PocketBase(pocketbaseUrl || 'http://127.0.0.1:8090');

// ปิด auto-cancellation ของ request ซ้ำใน PocketBase เพื่อให้ sync และ mutation ทำงานราบรื่น
pb.autoCancellation(false);

/** ใช้ในเทสต์ integration เท่านั้น */
export function setPocketBaseClient(client: PocketBase): void {
  pb = client;
  pb.autoCancellation(false);
}
```

และแก้ `isPocketBaseConfigured` ให้รู้จัก client ที่ตั้งจากเทสต์:

```ts
let configuredOverride = false;
export const isPocketBaseConfigured = () =>
  configuredOverride || Boolean(pocketbaseUrl && pocketbaseUrl.trim() !== '');
```

พร้อมเพิ่ม `configuredOverride = true;` ใน `setPocketBaseClient` (ประกาศ `configuredOverride` ไว้เหนือ `isPocketBaseConfigured`)

- [ ] **Step 3: เขียนเทสต์ที่ fail `tests/integration/pocketbaseStore.test.ts`**

```ts
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import PocketBase from 'pocketbase';
import { setPocketBaseClient } from '../../src/lib/pocketbase';
import { newId } from '../../src/lib/ids';
import { pocketbaseStore } from '../../src/store/pocketbaseStore';
import { createInitialFSRSState } from '../../src/utils/fsrs';
import type { Deck, Flashcard } from '../../src/store/types';
import { createUser, startPocketBase, type PbHarness } from './pbHarness';

let h: PbHarness;
let user: PocketBase;
let userId: string;

const PNG_1PX = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const deck = (): Deck => ({ id: newId(), name: 'Deck', color: 'violet', createdAt: new Date() });
const card = (deckId: string, extra: Partial<Flashcard> = {}): Flashcard => {
  const now = new Date();
  return {
    id: newId(), deckId, question: 'Q', answer: 'A', interval: 0, repetition: 0, easeFactor: 2.5,
    nextReviewDate: now, createdAt: now, lastReviewDate: now, fsrsState: createInitialFSRSState(), ...extra,
  };
};

beforeAll(async () => {
  h = await startPocketBase();
  user = await createUser(h.url, 'syncer');
  userId = user.authStore.record!.id;
  setPocketBaseClient(user);
});
afterAll(async () => h?.stop());

describe('pocketbaseStore', () => {
  it('upserts a deck and card with client ids, then pulls them back', async () => {
    const d = deck();
    const c = card(d.id);
    await pocketbaseStore.upsertDeck(userId, d);
    await pocketbaseStore.upsertCard(userId, c);
    await pocketbaseStore.upsertCard(userId, { ...c, question: 'Q2' });

    const changes = await pocketbaseStore.fetchChanges(userId, null);
    expect(changes.decks.map((x) => x.record.id)).toContain(d.id);
    const pulled = changes.cards.find((x) => x.record.id === c.id)!;
    expect(pulled.record.question).toBe('Q2');
    expect(pulled.record.deckId).toBe(d.id);
    expect(pulled.record.nextReviewDate.getTime()).not.toBeNaN();
    expect(changes.maxUpdated).toBeTruthy();
  });

  it('uploads a data-URL image and returns a file URL', async () => {
    const d = deck();
    await pocketbaseStore.upsertDeck(userId, d);
    const c = card(d.id, { questionImage: PNG_1PX });
    await pocketbaseStore.upsertCard(userId, c);
    const changes = await pocketbaseStore.fetchChanges(userId, null);
    const pulled = changes.cards.find((x) => x.record.id === c.id)!;
    expect(pulled.record.questionImage).toMatch(new RegExp(`/api/files/.+/${c.id}/`));
  });

  it('soft-deletes and only returns changes since the cursor', async () => {
    const untouched = deck();
    await pocketbaseStore.upsertDeck(userId, untouched);
    await new Promise((r) => setTimeout(r, 20));
    const d = deck();
    await pocketbaseStore.upsertDeck(userId, d);
    const first = await pocketbaseStore.fetchChanges(userId, null);
    await new Promise((r) => setTimeout(r, 20));
    await pocketbaseStore.softDeleteDeck(d.id);
    const second = await pocketbaseStore.fetchChanges(userId, first.maxUpdated);
    expect(second.decks.find((x) => x.record.id === d.id)?.deleted).toBe(true);
    expect(second.decks.map((x) => x.record.id)).not.toContain(untouched.id);
  });

  it('treats deleting a record that never reached the server as done', async () => {
    await expect(pocketbaseStore.softDeleteCard(newId())).resolves.toBeUndefined();
  });

  it('accepts the same review log twice (lost response retry)', async () => {
    const log = { id: newId(), cardId: newId(), rating: 3, reviewedAt: new Date().toISOString(), device: 'dev1' };
    await pocketbaseStore.createReviewLog(userId, log);
    await expect(pocketbaseStore.createReviewLog(userId, log)).resolves.toBeUndefined();
    const changes = await pocketbaseStore.fetchChanges(userId, null);
    expect(changes.logs.filter((l) => l.id === log.id)).toHaveLength(1);
  });

  it('upserts progress keyed by user id', async () => {
    const counters = {
      cardsCreated: 3, decksCreated: 1, reviewsCompleted: 0, currentStreak: 0, maxStreak: 0,
      perfectReviews: 0, totalStudyTime: 0, decksShared: 0, decksImported: 0,
    };
    await pocketbaseStore.upsertProgress(userId, { counters, unlockedAchievements: ['a'] });
    await pocketbaseStore.upsertProgress(userId, { counters: { ...counters, cardsCreated: 4 }, unlockedAchievements: ['a'] });
    const changes = await pocketbaseStore.fetchChanges(userId, null);
    expect(changes.progress?.counters.cardsCreated).toBe(4);
  });
});
```

- [ ] **Step 4: รันให้ fail**

Run: `npm run test:integration -- tests/integration/pocketbaseStore.test.ts`
Expected: FAIL — `pocketbaseStore.upsertDeck is not a function`

- [ ] **Step 5: เขียน `src/store/pocketbaseStore.ts` ใหม่ทั้งไฟล์**

```ts
import type { RecordModel } from 'pocketbase';
import { pb } from '../lib/pocketbase';
import { createInitialFSRSState } from '../utils/fsrs';
import type { UserProgress } from '../utils/achievements';
import type { RemoteChange, RemoteReviewLog, SyncedProgress } from './merge';
import type { ReviewLogPayload } from './syncQueue';
import type { Deck, Flashcard } from './types';

export interface ServerChanges {
  decks: RemoteChange<Deck>[];
  cards: RemoteChange<Flashcard>[];
  logs: RemoteReviewLog[];
  progress: SyncedProgress | null;
  maxUpdated: string | null;
  boundaryLogIds: string[];
}

const status = (err: unknown) => (err as { status?: number })?.status;

/** แปลงรูป (data URL หรือ URL ไฟล์) เป็น Blob สำหรับอัปโหลด; ไม่มีรูปคืน null */
export async function imageToBlob(value: string | undefined): Promise<Blob | null> {
  if (!value) return null;
  const res = await fetch(value);
  if (!res.ok) throw new Error(`Cannot read image (${res.status})`);
  return res.blob();
}

/**
 * ตัดสินว่าจะส่งรูปอย่างไร
 * - ไม่มีรูป → null (ลบรูปบนเซิร์ฟเวอร์)
 * - URL ไฟล์ของ record นี้เอง → 'unchanged'
 * - data URL หรือ URL จากที่อื่น (เช่นชุดสาธารณะ) → Blob
 */
async function resolveImage(value: string | undefined, recordId: string): Promise<Blob | null | 'unchanged'> {
  if (!value) return null;
  if (/^https?:/.test(value) && value.includes(`/${recordId}/`)) return 'unchanged';
  return imageToBlob(value);
}

async function upsert(collection: string, id: string, body: Record<string, unknown> | FormData): Promise<void> {
  try {
    await pb.collection(collection).update(id, body);
  } catch (err) {
    if (status(err) !== 404) throw err;
    if (body instanceof FormData) body.set('id', id);
    else body = { ...body, id };
    await pb.collection(collection).create(body);
  }
}

async function softDelete(collection: string, id: string): Promise<void> {
  try {
    await pb.collection(collection).update(id, { deleted: true });
  } catch (err) {
    if (status(err) !== 404) throw err; // ไม่เคยขึ้นเซิร์ฟเวอร์ = ถือว่าลบแล้ว
  }
}

const fileUrl = (record: RecordModel, field: string): string | undefined =>
  record[field] ? pb.files.getURL(record, record[field]) : undefined;

const toDeck = (r: RecordModel): RemoteChange<Deck> => ({
  deleted: Boolean(r.deleted),
  record: {
    id: r.id,
    name: r.name,
    color: r.color || 'violet',
    createdAt: new Date(r.created.replace(' ', 'T')),
    linkedPublicDeckId: r.linked_public_deck || null,
  },
});

const toCard = (r: RecordModel): RemoteChange<Flashcard> => {
  const fsrsState = r.fsrs_state ?? createInitialFSRSState();
  const nextReview = new Date((r.next_review || fsrsState.due).replace(' ', 'T'));
  return {
    deleted: Boolean(r.deleted),
    record: {
      id: r.id,
      deckId: r.deck,
      question: r.question,
      answer: r.answer,
      questionImage: fileUrl(r, 'question_image'),
      answerImage: fileUrl(r, 'answer_image'),
      sourceCardId: r.source_card || undefined,
      interval: fsrsState.scheduled_days ?? 0,
      repetition: fsrsState.reps ?? 0,
      easeFactor: 2.5,
      nextReviewDate: nextReview,
      createdAt: new Date(r.created.replace(' ', 'T')),
      lastReviewDate: new Date((fsrsState.last_review ?? r.updated).replace(' ', 'T')),
      fsrsState,
    },
  };
};

const maxOf = (current: string | null, records: RecordModel[]): string | null =>
  records.reduce<string | null>((max, r) => (!max || r.updated > max ? r.updated : max), current);

export const pocketbaseStore = {
  async upsertDeck(userId: string, deck: Deck): Promise<void> {
    await upsert('decks', deck.id, {
      user: userId,
      name: deck.name,
      color: deck.color,
      linked_public_deck: deck.linkedPublicDeckId || '',
      deleted: false,
    });
  },

  softDeleteDeck: (id: string) => softDelete('decks', id),

  async upsertCard(userId: string, card: Flashcard): Promise<void> {
    const form = new FormData();
    form.set('user', userId);
    form.set('deck', card.deckId);
    form.set('question', card.question);
    form.set('answer', card.answer);
    form.set('fsrs_state', JSON.stringify(card.fsrsState));
    form.set('next_review', new Date(card.nextReviewDate).toISOString());
    form.set('source_card', card.sourceCardId ?? '');
    form.set('deleted', 'false');
    for (const [field, value] of [['question_image', card.questionImage], ['answer_image', card.answerImage]] as const) {
      const image = await resolveImage(value, card.id);
      if (image === 'unchanged') continue;
      if (image) form.set(field, image, `${field}.${image.type.split('/')[1] || 'png'}`);
      else form.set(field, '');
    }
    await upsert('cards', card.id, form);
  },

  softDeleteCard: (id: string) => softDelete('cards', id),

  async createReviewLog(userId: string, log: ReviewLogPayload): Promise<void> {
    try {
      await pb.collection('review_logs').create({
        id: log.id,
        user: userId,
        card_id: log.cardId,
        rating: log.rating,
        reviewed_at: log.reviewedAt,
        device: log.device,
      });
    } catch (err) {
      if (status(err) !== 400) throw err;
      // สร้างสำเร็จไปแล้วรอบก่อนแต่คำตอบหาย → ถือว่าสำเร็จ
      await pb.collection('review_logs').getOne(log.id);
    }
  },

  async upsertProgress(userId: string, progress: SyncedProgress): Promise<void> {
    await upsert('user_progress', userId, { user: userId, progress });
  },

  async fetchChanges(userId: string, since: string | null): Promise<ServerChanges> {
    const filter = since
      ? pb.filter('user = {:uid} && updated >= {:since}', { uid: userId, since })
      : pb.filter('user = {:uid}', { uid: userId });
    const options = { filter, sort: 'updated' };
    const [decks, cards, logs, progress] = await Promise.all([
      pb.collection('decks').getFullList(options),
      pb.collection('cards').getFullList(options),
      pb.collection('review_logs').getFullList(options),
      pb.collection('user_progress').getFullList(options),
    ]);
    const p = progress[0]?.progress as { counters?: UserProgress; unlockedAchievements?: string[] } | undefined;
    const maxUpdated = maxOf(maxOf(maxOf(maxOf(since, decks), cards), logs), progress);
    return {
      decks: decks.map(toDeck),
      cards: cards.map(toCard),
      logs: logs.map((r) => ({ id: r.id, reviewedAt: r.reviewed_at, device: r.device })),
      progress: p?.counters ? { counters: p.counters, unlockedAchievements: p.unlockedAchievements ?? [] } : null,
      maxUpdated,
      boundaryLogIds: logs.filter((r) => r.updated === maxUpdated).map((r) => r.id),
    };
  },
};
```

- [ ] **Step 6: รันให้ผ่าน**

Run: `npm run test:integration -- tests/integration/pocketbaseStore.test.ts`
หมายเหตุการออกแบบ: รูปที่เป็น URL จากที่อื่น (เช่นการ์ดที่คัดลอกจากชุดสาธารณะ) จะถูกดาวน์โหลดแล้วอัปโหลดเป็นไฟล์ของการ์ดเราเอง ครั้งถัดไปที่ pull รูปจะกลายเป็น URL ของการ์ดเราและไม่ถูกอัปโหลดซ้ำอีก ส่วน `refreshLinkedDecks` เทียบแค่ข้อความ ไม่เทียบ URL รูป เพื่อไม่ให้วนแก้ไม่จบ

Expected: PASS 6 tests (ถ้า `fetch(dataUrl)` ใน Node ใช้ไม่ได้ ให้แปลงเองด้วย `Buffer.from(base64,'base64')` ใน `imageToBlob` เมื่อ value ขึ้นต้น `data:`)

- [ ] **Step 7: Commit**

```bash
git add src/store/pocketbaseStore.ts src/store/types.ts src/lib/pocketbase.ts tests/integration/pocketbaseStore.test.ts
git commit -m "feat(sync): PocketBase adapter with upserts, images and incremental pull"
```

---

### Task 7: เชื่อม store กับคิว + transport + syncEngine + ย้าย ID เก่า

**Files:**
- Create: `src/store/legacyMigration.ts`, `src/store/legacyMigration.test.ts`, `src/store/syncTransport.ts`, `src/store/syncEngine.ts`, `src/store/store.sync.test.ts`
- Modify: `src/store/store.ts`, `src/components/AddDeck.tsx`
- Delete: `src/store/supabaseStore.ts`

**Interfaces:**
- Consumes: ทุกอย่างจาก Task 1, 4, 5, 6
- Produces (store state ใหม่): `ownerId: string | null`, `lastPulledAt: string | null`, `deviceId: string`, `pendingAdoption: boolean`
- Produces (store actions ใหม่/เปลี่ยน):
  - `addDeck(name: string, color: string, opts?: { linkedPublicDeckId?: string }): Promise<Deck>`
  - `addCard(deckId, question, answer, questionImage?, answerImage?, opts?: { skipAchievementCheck?: boolean; sourceCardId?: string }): Promise<string>` (คืน id การ์ด)
  - `syncFromServer(): Promise<void>` (แทน `syncFromSupabase`)
  - `applyServerChanges(changes: ServerChanges, pendingIds: ReadonlySet<string>): void`
  - `resetForAccount(userId: string): void`
  - `adoptLocalData(): Promise<void>`
  - `declineAdoption(): Promise<void>`
- Produces: `migrateLegacyIds(state: { decks: Deck[]; cards: Flashcard[] }): { decks: Deck[]; cards: Flashcard[] }`
- Produces (`syncEngine`): `pullChanges(): Promise<void>`, `startAutoPull(): () => void`, `refreshLinkedDecks(): Promise<void>`
- Produces (`syncTransport`): `sendAction(action: SyncAction): Promise<void>`

- [ ] **Step 1: เขียนเทสต์ที่ fail `src/store/legacyMigration.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { isServerId } from '../lib/ids';
import { migrateLegacyIds } from './legacyMigration';
import type { Deck, Flashcard } from './types';

const uuid = '3f2a9c1e-8b7d-4e6f-a5c4-1b2d3e4f5a6b';

describe('migrateLegacyIds', () => {
  it('re-keys UUID decks and cards and keeps card→deck links', () => {
    const decks = [{ id: uuid, name: 'D' }] as Deck[];
    const cards = [
      { id: '11111111-2222-4333-8444-555555555555', deckId: uuid },
      { id: '66666666-7777-4888-9999-000000000000', deckId: uuid },
    ] as Flashcard[];
    const out = migrateLegacyIds({ decks, cards });
    expect(isServerId(out.decks[0].id)).toBe(true);
    expect(out.cards.every((c) => isServerId(c.id) && c.deckId === out.decks[0].id)).toBe(true);
    expect(new Set(out.cards.map((c) => c.id)).size).toBe(2);
  });

  it('leaves valid ids untouched', () => {
    const decks = [{ id: 'abcdefghijklmno', name: 'D' }] as Deck[];
    const cards = [{ id: 'pqrstuvwxyz0123', deckId: 'abcdefghijklmno' }] as Flashcard[];
    expect(migrateLegacyIds({ decks, cards })).toEqual({ decks, cards });
  });
});
```

- [ ] **Step 2: รันให้ fail แล้วเขียน `src/store/legacyMigration.ts`**

Run: `npm test -- src/store/legacyMigration.test.ts` → Expected: FAIL (ไม่มีไฟล์)

```ts
import { isServerId, newId } from '../lib/ids';
import type { Deck, Flashcard } from './types';

/** เวอร์ชันก่อนหน้าใช้ UUID ซึ่ง PocketBase ไม่รับ แปลงเป็น ID 15 ตัวพร้อมแก้ deckId ของการ์ด */
export function migrateLegacyIds(state: { decks: Deck[]; cards: Flashcard[] }): { decks: Deck[]; cards: Flashcard[] } {
  const deckIdMap = new Map<string, string>();
  const decks = state.decks.map((deck) => {
    if (isServerId(deck.id)) return deck;
    const id = newId();
    deckIdMap.set(deck.id, id);
    return { ...deck, id };
  });
  const cards = state.cards.map((card) => {
    const id = isServerId(card.id) ? card.id : newId();
    const deckId = deckIdMap.get(card.deckId) ?? card.deckId;
    return id === card.id && deckId === card.deckId ? card : { ...card, id, deckId };
  });
  return { decks, cards };
}
```

Run: `npm test -- src/store/legacyMigration.test.ts` → Expected: PASS 2 tests

- [ ] **Step 3: เขียน `src/store/syncTransport.ts`**

```ts
import { useFlashcardStore } from './store';
import { pocketbaseStore } from './pocketbaseStore';
import { classifyError, type SyncAction } from './syncQueue';

/** อ่านสถานะล่าสุดจาก store ตอนส่ง (ไม่ใช่ตอน enqueue) จึงส่งข้อมูลล่าสุดเสมอ */
export async function sendAction(action: SyncAction): Promise<void> {
  const state = useFlashcardStore.getState();
  const userId = action.ownerId;
  try {
    switch (action.type) {
      case 'UPSERT_DECK': {
        const deck = state.decks.find((d) => d.id === action.entityId);
        if (deck) await pocketbaseStore.upsertDeck(userId, deck);
        return;
      }
      case 'DELETE_DECK':
        return await pocketbaseStore.softDeleteDeck(action.entityId);
      case 'UPSERT_CARD': {
        const card = state.cards.find((c) => c.id === action.entityId);
        if (card) await pocketbaseStore.upsertCard(userId, card);
        return;
      }
      case 'DELETE_CARD':
        return await pocketbaseStore.softDeleteCard(action.entityId);
      case 'LOG_REVIEW':
        if (action.log) await pocketbaseStore.createReviewLog(userId, action.log);
        return;
      case 'UPSERT_PROGRESS':
        return await pocketbaseStore.upsertProgress(userId, {
          counters: state.userProgress,
          unlockedAchievements: state.unlockedAchievements,
        });
    }
  } catch (err) {
    throw classifyError(err);
  }
}
```

- [ ] **Step 4: เขียน `src/store/syncEngine.ts`**

```ts
import { communityStore } from './communityStore';
import { pocketbaseStore } from './pocketbaseStore';
import { useFlashcardStore } from './store';
import { syncQueue } from './syncQueue';

const PULL_INTERVAL_MS = 5 * 60 * 1000;
let pulling: Promise<void> | null = null;

/** ดึงเฉพาะที่เปลี่ยนตั้งแต่ครั้งล่าสุดแล้วรวมเข้า store */
export function pullChanges(): Promise<void> {
  if (pulling) return pulling;
  pulling = (async () => {
    const state = useFlashcardStore.getState();
    if (state.isDemo || !state.userId || state.ownerId !== state.userId) return;
    const pending = await syncQueue.pendingEntityIds();
    for (const id of state.pendingDeleteDecks.keys()) pending.add(id);
    for (const id of state.pendingDeleteCards.keys()) pending.add(id);
    const changes = await pocketbaseStore.fetchChanges(state.userId, state.lastPulledAt);
    useFlashcardStore.getState().applyServerChanges(changes, pending);
    await refreshLinkedDecks();
  })().finally(() => {
    pulling = null;
  });
  return pulling;
}

/** ชุดที่ติดตามจากชุมชน: เพิ่ม/แก้/ลบการ์ดตามชุดต้นทาง โดยเก็บความคืบหน้า FSRS ไว้ */
export async function refreshLinkedDecks(): Promise<void> {
  const store = useFlashcardStore.getState();
  for (const deck of store.decks.filter((d) => d.linkedPublicDeckId)) {
    let remoteCards;
    try {
      remoteCards = await communityStore.getPublicDeckCards(deck.linkedPublicDeckId!);
    } catch {
      continue; // ชุดต้นทางถูกซ่อนหรือลบ — เก็บของเดิมไว้
    }
    const local = useFlashcardStore.getState().cards.filter((c) => c.deckId === deck.id);
    const bySource = new Map(local.filter((c) => c.sourceCardId).map((c) => [c.sourceCardId!, c]));
    const remoteIds = new Set(remoteCards.map((c) => c.id));

    for (const remote of remoteCards) {
      const existing = bySource.get(remote.id);
      if (!existing) {
        await store.addCard(deck.id, remote.question, remote.answer, remote.questionImage, remote.answerImage, {
          skipAchievementCheck: true,
          sourceCardId: remote.id,
        });
      } else if (existing.question !== remote.question || existing.answer !== remote.answer) {
        await store.editCard(existing.id, remote.question, remote.answer, remote.questionImage, remote.answerImage);
      }
    }
    for (const card of local) {
      if (card.sourceCardId && !remoteIds.has(card.sourceCardId)) await store.deleteCard(card.id, true);
    }
  }
}

/** ดึงอัตโนมัติ: ตอนกลับมาออนไลน์ ตอนสลับกลับมาที่แท็บ และทุก 5 นาที */
export function startAutoPull(): () => void {
  const run = () => {
    void pullChanges().catch((err) => console.warn('[sync] pull failed', err));
    void syncQueue.processQueue();
  };
  const onVisible = () => {
    if (document.visibilityState === 'visible') run();
  };
  window.addEventListener('online', run);
  document.addEventListener('visibilitychange', onVisible);
  const timer = window.setInterval(run, PULL_INTERVAL_MS);
  return () => {
    window.removeEventListener('online', run);
    document.removeEventListener('visibilitychange', onVisible);
    window.clearInterval(timer);
  };
}
```

(`communityStore.getPublicDeckCards` และฟิลด์ `questionImage/answerImage` ของ `PublicDeckCard` มาจาก Task 9 จนกว่า Task 9 เสร็จ ไฟล์นี้จะ type error ที่บรรทัดนั้น ให้ทำ Task 9 ต่อทันที หรือทำ Step 9 ของ Task 9 (เพิ่มฟิลด์ใน type) ก่อน)

- [ ] **Step 5: เขียนเทสต์ store ที่ fail `src/store/store.sync.test.ts`**

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

const enqueue = vi.fn().mockResolvedValue(undefined);
vi.mock('./syncQueue', () => ({
  syncQueue: {
    enqueue,
    processQueue: vi.fn().mockResolvedValue(undefined),
    pendingEntityIds: vi.fn().mockResolvedValue(new Set()),
  },
}));
vi.mock('./syncEngine', () => ({ pullChanges: vi.fn().mockResolvedValue(undefined) }));

const { useFlashcardStore } = await import('./store');
const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  enqueue.mockClear();
  useFlashcardStore.getState().clearStore();
});

describe('store → queue', () => {
  it('does not enqueue anything in guest mode', async () => {
    await useFlashcardStore.getState().addDeck('D', 'violet');
    await flush();
    expect(enqueue).not.toHaveBeenCalled();
  });

  it('enqueues upserts for the signed-in owner', async () => {
    useFlashcardStore.getState().resetForAccount('user1');
    useFlashcardStore.getState().setAuthState('user1', false);
    const deck = await useFlashcardStore.getState().addDeck('D', 'violet');
    const cardId = await useFlashcardStore.getState().addCard(deck.id, 'q', 'a');
    await flush();
    expect(enqueue).toHaveBeenCalledWith('UPSERT_DECK', deck.id, 'user1', undefined);
    expect(enqueue).toHaveBeenCalledWith('UPSERT_CARD', cardId, 'user1', undefined);
  });

  it('logs a review with this device id', async () => {
    useFlashcardStore.getState().resetForAccount('user1');
    useFlashcardStore.getState().setAuthState('user1', false);
    const deck = await useFlashcardStore.getState().addDeck('D', 'violet');
    const cardId = await useFlashcardStore.getState().addCard(deck.id, 'q', 'a');
    enqueue.mockClear();
    await useFlashcardStore.getState().reviewCard(cardId, 3);
    await flush();
    const logCall = enqueue.mock.calls.find((c) => c[0] === 'LOG_REVIEW')!;
    expect(logCall[3]).toMatchObject({ cardId, rating: 3, device: useFlashcardStore.getState().deviceId });
  });
});

describe('account switching', () => {
  it('asks before adopting guest data', async () => {
    await useFlashcardStore.getState().addDeck('guest deck', 'violet');
    useFlashcardStore.getState().setAuthState('user1', false);
    expect(useFlashcardStore.getState().pendingAdoption).toBe(true);
    expect(useFlashcardStore.getState().decks).toHaveLength(1);
  });

  it('adopting enqueues every local deck and card', async () => {
    const deck = await useFlashcardStore.getState().addDeck('guest deck', 'violet');
    await useFlashcardStore.getState().addCard(deck.id, 'q', 'a');
    useFlashcardStore.getState().setAuthState('user1', false);
    await useFlashcardStore.getState().adoptLocalData();
    await flush();
    expect(useFlashcardStore.getState().ownerId).toBe('user1');
    expect(enqueue.mock.calls.map((c) => c[0])).toEqual(expect.arrayContaining(['UPSERT_DECK', 'UPSERT_CARD', 'UPSERT_PROGRESS']));
  });

  it('clears another account data instead of mixing it', async () => {
    useFlashcardStore.getState().resetForAccount('userA');
    useFlashcardStore.getState().setAuthState('userA', false);
    await useFlashcardStore.getState().addDeck('A deck', 'violet');
    useFlashcardStore.getState().setAuthState('userB', false);
    expect(useFlashcardStore.getState().decks).toHaveLength(0);
    expect(useFlashcardStore.getState().ownerId).toBe('userB');
  });
});

describe('applyServerChanges', () => {
  it('does not resurrect a deck that is waiting in the undo window', async () => {
    useFlashcardStore.getState().resetForAccount('user1');
    useFlashcardStore.getState().setAuthState('user1', false);
    const deck = await useFlashcardStore.getState().addDeck('D', 'violet');
    await useFlashcardStore.getState().deleteDeck(deck.id);
    useFlashcardStore.getState().applyServerChanges(
      { decks: [{ record: deck, deleted: false }], cards: [], logs: [], progress: null, maxUpdated: '2026-09-24 00:00:00.000Z', boundaryLogIds: [] },
      new Set([deck.id]),
    );
    expect(useFlashcardStore.getState().decks).toHaveLength(0);
    expect(useFlashcardStore.getState().lastPulledAt).toBe('2026-09-24 00:00:00.000Z');
  });

  it('counts a boundary review log only once across two pulls', () => {
    useFlashcardStore.getState().resetForAccount('user1');
    useFlashcardStore.getState().setAuthState('user1', false);
    const log = { id: 'log000000000001', reviewedAt: '2026-09-20T10:00:00.000Z', device: 'other' };
    const changes = { decks: [], cards: [], logs: [log], progress: null, maxUpdated: '2026-09-24 00:00:00.000Z', boundaryLogIds: [log.id] };
    useFlashcardStore.getState().applyServerChanges(changes, new Set());
    useFlashcardStore.getState().applyServerChanges(changes, new Set());
    expect(useFlashcardStore.getState().reviewHistory['2026-09-20']).toBe(1);
  });
});
```

Run: `npm test -- src/store/store.sync.test.ts`
Expected: FAIL (`resetForAccount is not a function` ฯลฯ)

- [ ] **Step 6: แก้ `src/store/store.ts` — imports, state, helper**

6a. imports บนสุด เพิ่ม:

```ts
import { newId } from '../lib/ids';
import { addReviewCounts, mergeById, mergeProgress } from './merge';
import { migrateLegacyIds } from './legacyMigration';
import type { ServerChanges } from './pocketbaseStore';
import type { ReviewLogPayload, SyncActionType } from './syncQueue';
```

6b. ใน `interface FlashcardState` เพิ่มหลัง `isDemo: boolean;`:

```ts
  // เจ้าของข้อมูลในเครื่อง (null = โหมดทดลอง), เคอร์เซอร์ pull และ ID เครื่องนี้
  ownerId: string | null;
  lastPulledAt: string | null;
  deviceId: string;
  pendingAdoption: boolean;
  // log ที่อยู่พอดีขอบเคอร์เซอร์ pull ครั้งก่อน (กันนับซ้ำ)
  pullBoundaryLogIds: string[];
```

6c. ใน `interface FlashcardActions` แทนที่ `syncFromSupabase`, `addDeck`, `addCard` ด้วย:

```ts
  syncFromServer: () => Promise<void>;
  applyServerChanges: (changes: ServerChanges, pendingIds: ReadonlySet<string>) => void;
  resetForAccount: (userId: string) => void;
  adoptLocalData: () => Promise<void>;
  declineAdoption: () => Promise<void>;
```

```ts
  addDeck: (name: string, color: string, opts?: { linkedPublicDeckId?: string }) => Promise<Deck>;
```

```ts
  addCard: (
    deckId: string, question: string, answer: string, questionImage?: string, answerImage?: string,
    opts?: { skipAchievementCheck?: boolean; sourceCardId?: string },
  ) => Promise<string>;
```

6d. ใน `mergePersistedState` เพิ่มใน object ที่ return:

```ts
    ownerId: typeof raw.ownerId === 'string' ? raw.ownerId : null,
    lastPulledAt: typeof raw.lastPulledAt === 'string' ? raw.lastPulledAt : null,
    deviceId: typeof raw.deviceId === 'string' ? raw.deviceId : currentState.deviceId,
```

6e. เหนือ `export const useFlashcardStore` เพิ่ม helper:

```ts
const EMPTY_PROGRESS: UserProgress = {
  cardsCreated: 0, decksCreated: 0, reviewsCompleted: 0, currentStreak: 0, maxStreak: 0,
  perfectReviews: 0, totalStudyTime: 0, decksShared: 0, decksImported: 0,
};

/** ส่งเข้าคิวเฉพาะเมื่อข้อมูลในเครื่องเป็นของผู้ใช้ที่ล็อกอินอยู่ */
function queueSync(
  state: Pick<FlashcardState, 'userId' | 'isDemo' | 'ownerId'>,
  type: SyncActionType,
  entityId: string,
  log?: ReviewLogPayload,
): void {
  const { userId, isDemo, ownerId } = state;
  if (isDemo || !userId || ownerId !== userId) return;
  void import('./syncQueue').then(({ syncQueue }) => syncQueue.enqueue(type, entityId, userId, log));
}
```

6f. ในค่าเริ่มต้นของ store (หลัง `isDemo: true,`) เพิ่ม:

```ts
      ownerId: null,
      lastPulledAt: null,
      deviceId: newId(),
      pendingAdoption: false,
      pullBoundaryLogIds: [],
```

และใน `clearStore` เพิ่ม `ownerId: null, lastPulledAt: null, pendingAdoption: false, pullBoundaryLogIds: [],` (คง `deviceId` เดิม)

- [ ] **Step 7: แก้ `src/store/store.ts` — auth, sync, actions**

7a. แทนที่ `setAuthState` และ `syncFromSupabase` ทั้งสองก้อน (บรรทัด ~336–397) ด้วย:

```ts
      setAuthState: (userId, isDemo) => {
        set({ userId, isDemo });
        if (!userId || isDemo) return;
        const { ownerId, decks, cards } = get();
        if (ownerId === userId) {
          void get().syncFromServer();
          return;
        }
        if (ownerId === null && (decks.length > 0 || cards.length > 0)) {
          set({ pendingAdoption: true });
          return;
        }
        get().resetForAccount(userId);
        void get().syncFromServer();
      },

      syncFromServer: async () => {
        const { userId, isDemo, ownerId } = get();
        if (isDemo || !userId || ownerId !== userId) return;
        try {
          const { pullChanges } = await import('./syncEngine');
          await pullChanges();
        } catch (error) {
          console.warn('[store] pull failed, keeping local data:', error);
        }
        const { syncQueue } = await import('./syncQueue');
        void syncQueue.processQueue();
      },

      applyServerChanges: (changes, pendingIds) => {
        set((state) => {
          const decks = mergeById(state.decks, changes.decks, pendingIds);
          const deckIds = new Set(decks.map((d) => d.id));
          const cards = mergeById(state.cards, changes.cards, pendingIds).filter((c) => deckIds.has(c.deckId));
          const seen = new Set(state.pullBoundaryLogIds);
          const reviewHistory = addReviewCounts(
            state.reviewHistory, changes.logs.filter((l) => !seen.has(l.id)), state.deviceId);
          const merged = changes.progress
            ? mergeProgress({ counters: state.userProgress, unlockedAchievements: state.unlockedAchievements }, changes.progress)
            : { counters: state.userProgress, unlockedAchievements: state.unlockedAchievements };
          const { currentStreak, maxStreak } = calculateDynamicStreak(reviewHistory);
          return {
            decks,
            cards,
            reviewHistory,
            streak: currentStreak,
            maxStreak,
            unlockedAchievements: merged.unlockedAchievements,
            userProgress: { ...merged.counters, currentStreak, maxStreak },
            lastPulledAt: changes.maxUpdated ?? state.lastPulledAt,
            pullBoundaryLogIds: changes.maxUpdated === state.lastPulledAt
              ? [...new Set([...state.pullBoundaryLogIds, ...changes.boundaryLogIds])]
              : changes.boundaryLogIds,
          };
        });
      },

      resetForAccount: (userId) => {
        get().clearStore();
        set({ ownerId: userId, userId, isDemo: false, pendingAdoption: false });
      },

      adoptLocalData: async () => {
        const { userId, decks, cards, reviewHistory, deviceId } = get();
        if (!userId) return;
        set({ ownerId: userId, pendingAdoption: false, lastPulledAt: null });
        const state = get();
        decks.forEach((d) => queueSync(state, 'UPSERT_DECK', d.id));
        cards.forEach((c) => queueSync(state, 'UPSERT_CARD', c.id));
        // ประวัติรายวันมีแค่จำนวน จึงสร้าง log แทนวันละ n รายการ (เวลาเที่ยงวัน UTC)
        Object.entries(reviewHistory).forEach(([day, count]) => {
          for (let i = 0; i < count; i++) {
            const id = newId();
            queueSync(state, 'LOG_REVIEW', id, { id, cardId: '', rating: 3, reviewedAt: `${day}T12:00:00.000Z`, device: deviceId });
          }
        });
        queueSync(state, 'UPSERT_PROGRESS', userId);
        await get().syncFromServer();
      },

      declineAdoption: async () => {
        const { userId } = get();
        if (!userId) return;
        get().resetForAccount(userId);
        await get().syncFromServer();
      },
```

7b. `addDeck` แทนที่ทั้งก้อนด้วย:

```ts
      addDeck: async (name, color, opts) => {
        const newDeck: Deck = {
          id: newId(),
          name,
          color,
          createdAt: new Date(),
          linkedPublicDeckId: opts?.linkedPublicDeckId ?? null,
        };
        set((state) => ({
          decks: [...state.decks, newDeck],
          userProgress: { ...state.userProgress, decksCreated: state.userProgress.decksCreated + 1 },
        }));
        get().checkAndUnlockAchievements();
        queueSync(get(), 'UPSERT_DECK', newDeck.id);
        queueSync(get(), 'UPSERT_PROGRESS', get().userId ?? '');
        return newDeck;
      },
```

7c. `editDeck` แทนที่ส่วน `if (!isDemo && userId) {...}` ด้วย `queueSync(get(), 'UPSERT_DECK', id);` และลบ `const { userId, isDemo } = get();`

7d. `deleteDeck` แทนที่ทั้งก้อนด้วย:

```ts
      deleteDeck: async (id, immediate = false) => {
        const deck = get().decks.find((d) => d.id === id);
        if (!deck) return;
        const deckCards = get().cards.filter((c) => c.deckId === id);

        const commitDelete = () => {
          const state = get();
          queueSync(state, 'DELETE_DECK', id);
          deckCards.forEach((c) => queueSync(state, 'DELETE_CARD', c.id));
        };

        set((state) => ({
          decks: state.decks.filter((d) => d.id !== id),
          cards: state.cards.filter((c) => c.deckId !== id),
          pendingDeleteDecks: immediate
            ? state.pendingDeleteDecks
            : new Map(state.pendingDeleteDecks).set(id, { deck, cards: deckCards }),
        }));

        if (immediate) {
          commitDelete();
          return;
        }

        setTimeout(() => {
          if (!get().pendingDeleteDecks.has(id)) return; // ผู้ใช้กดเลิกทำแล้ว
          set((state) => {
            const pending = new Map(state.pendingDeleteDecks);
            pending.delete(id);
            return { pendingDeleteDecks: pending };
          });
          commitDelete();
        }, 5000);
      },
```

7e. `addCard` แทนที่ทั้งก้อนด้วย:

```ts
      addCard: async (deckId, question, answer, questionImage, answerImage, opts) => {
        const fsrsState = createInitialFSRSState();
        const now = new Date();
        const newCard: Flashcard = {
          id: newId(),
          deckId,
          question,
          answer,
          questionImage,
          answerImage,
          sourceCardId: opts?.sourceCardId,
          interval: 0,
          repetition: 0,
          easeFactor: 2.5,
          nextReviewDate: now,
          createdAt: now,
          lastReviewDate: now,
          fsrsState,
        };
        set((state) => ({
          cards: [...state.cards, newCard],
          userProgress: { ...state.userProgress, cardsCreated: state.userProgress.cardsCreated + 1 },
        }));
        if (!opts?.skipAchievementCheck) get().checkAndUnlockAchievements();
        queueSync(get(), 'UPSERT_CARD', newCard.id);
        queueSync(get(), 'UPSERT_PROGRESS', get().userId ?? '');
        return newCard.id;
      },
```

7f. `editCard` แทนที่ส่วน `if (!isDemo && userId) {...}` ด้วย `queueSync(get(), 'UPSERT_CARD', id);` และลบบรรทัด destructure ที่ไม่ได้ใช้

7g. `deleteCard` แทนที่ทั้งก้อนด้วย:

```ts
      deleteCard: async (id, immediate = false) => {
        const card = get().cards.find((c) => c.id === id);
        if (!card) return;
        set((state) => ({
          cards: state.cards.filter((c) => c.id !== id),
          pendingDeleteCards: immediate ? state.pendingDeleteCards : new Map(state.pendingDeleteCards).set(id, card),
        }));
        if (immediate) {
          queueSync(get(), 'DELETE_CARD', id);
          return;
        }
        setTimeout(() => {
          if (!get().pendingDeleteCards.has(id)) return;
          set((state) => {
            const pending = new Map(state.pendingDeleteCards);
            pending.delete(id);
            return { pendingDeleteCards: pending };
          });
          queueSync(get(), 'DELETE_CARD', id);
        }, 5000);
      },
```

7h. `undoDeleteDeck` และ `undoDeleteCard`: ต่อท้ายใน `if (pending) {...}` ด้วย `queueSync(get(), 'UPSERT_DECK', id);` (สำหรับ deck เพิ่มวน `pending.cards.forEach((c) => queueSync(get(), 'UPSERT_CARD', c.id));` ด้วย) และ `queueSync(get(), 'UPSERT_CARD', id);` สำหรับ card — กันกรณี pull ใส่ `deleted` มาก่อนเลิกทำ

7i. `reviewCard` แทนที่ส่วน `// Sync to Supabase ...` ทั้งก้อน (ตั้งแต่ `if (!isDemo && userId) {` จนถึงปิดก้อน ก่อน `await get().updateStreak();`) ด้วย:

```ts
        const state = get();
        if (!isCramMode) queueSync(state, 'UPSERT_CARD', id);
        const logId = newId();
        queueSync(state, 'LOG_REVIEW', logId, {
          id: logId,
          cardId: id,
          rating: quality,
          reviewedAt: new Date().toISOString(),
          device: state.deviceId,
        });
```

และลบ `const { userId, isDemo } = get();` บรรทัดแรกของ `reviewCard`

7j. `updateStreak` แทนที่ส่วน `if (!isDemo && userId) {...}` ด้วย `queueSync(get(), 'UPSERT_PROGRESS', get().userId ?? '');` และแก้ destructure เหลือ `const { reviewHistory } = get();`

7k. `checkAndUnlockAchievements` แทนที่ส่วน `// Sync to Supabase` ด้วย `queueSync(get(), 'UPSERT_PROGRESS', get().userId ?? '');` และลบ `userId, isDemo` ออกจาก destructure

7l. `trackStudyTime` แทนที่ส่วน `// Sync to Supabase` ด้วย `queueSync(get(), 'UPSERT_PROGRESS', get().userId ?? '');` และลบ destructure

7m. `addDeck` เดิมไม่มี `isDemo/userId` แล้ว ให้ตรวจว่าไม่มีคำว่า `supabase` เหลือ:

Run: `grep -n -i supabase src/store/store.ts`
Expected: ไม่มีผลลัพธ์

7n. ตั้งค่า persist: ใน option ของ `persist(...)` เพิ่ม `version: 1,` และ

```ts
      migrate: (persisted, version) => {
        const raw = asRecord(persisted);
        if (!raw || version >= 1) return persisted as FlashcardStore;
        const { decks, cards } = migrateLegacyIds({
          decks: Array.isArray(raw.decks) ? (raw.decks as Deck[]) : [],
          cards: Array.isArray(raw.cards) ? (raw.cards as Flashcard[]) : [],
        });
        // ข้อมูลเดิมไม่เคยขึ้น PocketBase จริง จึงถือเป็นข้อมูลโหมดทดลองแล้วให้ผู้ใช้เลือกย้ายขึ้นบัญชี
        return { ...raw, decks, cards, ownerId: null, lastPulledAt: null } as unknown as FlashcardStore;
      },
```

และใน `partialize` เพิ่ม `ownerId: state.ownerId, lastPulledAt: state.lastPulledAt, deviceId: state.deviceId, pullBoundaryLogIds: state.pullBoundaryLogIds,` และใน `mergePersistedState` เพิ่ม `pullBoundaryLogIds: Array.isArray(raw.pullBoundaryLogIds) ? raw.pullBoundaryLogIds.filter((id): id is string => typeof id === 'string') : [],`

7o. ท้ายไฟล์ (หลัง `useFlashcardStore` ถูกสร้าง) เพิ่ม:

```ts
// ให้ syncQueue อ่าน userId ได้โดยไม่ import store (ตัด circular import)
(globalThis as { __memokardStore?: typeof useFlashcardStore }).__memokardStore = useFlashcardStore;
```

- [ ] **Step 8: แก้ผู้เรียก `addCard` ใน `src/components/AddDeck.tsx`**

สองจุด (บรรทัด ~157 และ ~197):

```ts
        addCard(deck.id, card.question, card.answer, undefined, undefined, true)
```

เปลี่ยนเป็น

```ts
        addCard(deck.id, card.question, card.answer, undefined, undefined, { skipAchievementCheck: true })
```

- [ ] **Step 9: ลบ adapter เก่า**

Run: `git rm src/store/supabaseStore.ts`

- [ ] **Step 10: รันเทสต์**

Run: `npm test`
Expected: PASS ทุกไฟล์ unit (ids, merge, syncQueue, legacyMigration, store.sync)

- [ ] **Step 11: Commit**

```bash
git add src/store src/components/AddDeck.tsx
git commit -m "feat(sync): route all store writes through the queue and pull incrementally"
```

---

### Task 8: ล็อกอินด้วยชื่อผู้ใช้ + role + ถามย้ายข้อมูลโหมดทดลอง

**Files:**
- Modify: `src/contexts/AuthContext.tsx`, `src/pages/AuthPage.tsx`, `src/App.tsx`, `src/utils/errorMapper.ts` (ถ้ามีข้อความเกี่ยวกับอีเมล)

**Interfaces:**
- Produces: `AuthUser.role: 'user' | 'admin'`; `signUp(username: string, password: string)`; `signIn(username: string, password: string)`; ลบ `signInWithGoogle`

- [ ] **Step 1: แก้ `AuthContext.tsx`**

1a. `interface AuthUser` เพิ่ม `role: 'user' | 'admin';` และใน `mapRecordToAuthUser` เพิ่ม `role: record.role === 'admin' ? 'admin' : 'user',`

1b. ใน `AuthContextType` แก้เป็น

```ts
  signUp: (username: string, password: string) => Promise<{ error: { message: string } | null }>;
  signIn: (username: string, password: string) => Promise<{ error: { message: string } | null }>;
```

และลบบรรทัด `signInWithGoogle`

1c. `signUp` แทนที่ body การ create ด้วย:

```ts
      await pb.collection('users').create({
        username: username.trim(),
        password,
        passwordConfirm: password,
      });
      await pb.collection('users').authWithPassword(username.trim(), password);
```

และเปลี่ยน signature เป็น `async (username: string, password: string)`

1d. ลบฟังก์ชัน `signInWithGoogle` ทั้งก้อน และเอาออกจาก value ของ Provider

1e. `checkUsernameAvailable` แทนที่ try/catch ด้วย:

```ts
    try {
      const res = await pb.send<{ available: boolean }>('/api/memokard/username-available', {
        query: { u: username.trim() },
      });
      return res.available;
    } catch {
      return true; // ติดต่อเซิร์ฟเวอร์ไม่ได้ ให้ผู้ใช้ลองสมัครแล้วดู error จริงแทน
    }
```

1f. ใน `signOut` ก่อน `pb.authStore.clear()` เพิ่ม `useFlashcardStore.getState().clearStore();` ถ้ายังไม่มี (บรรทัด 186 มีอยู่แล้ว ให้คงไว้)

- [ ] **Step 2: แก้ `AuthPage.tsx`**

2a. ลบ state `email`, `emailValid` และ `useEffect` "Real-time Email Validation" ทั้งก้อน
2b. เพิ่ม state สำหรับช่องล็อกอิน: `const [loginName, setLoginName] = useState('');`
2c. `isFormValid`:

```ts
  const isFormValid = () => {
    if (mode === 'login') return loginName.trim().length > 0 && password.length > 0;
    return usernameStatus === 'available' && password.length >= 8 && password === confirmPassword;
  };
```

2d. `handleSubmit`: `signUp(username.trim(), password)` และ `signIn(loginName.trim(), password)`
2e. ในฟอร์ม: ลบบล็อก input อีเมลตอนสมัคร (บล็อกที่มี `type={mode === 'register' ? 'email' : 'text'}` และไอคอนถูก/ผิดของอีเมล) แล้วแทนด้วย input ที่แสดงเฉพาะ `mode === 'login'`:

```tsx
                {mode === 'login' && (
                  <div className="relative">
                    <input type="text" autoComplete="username" value={loginName} onChange={(e) => setLoginName(e.target.value)} placeholder="ชื่อผู้ใช้" className={inputClasses} required disabled={loading} />
                  </div>
                )}
```

(คงไอคอนด้านซ้ายแบบเดียวกับ input อื่นในไฟล์ โดยคัดลอก element ไอคอนจากช่องชื่อผู้ใช้ตอนสมัครที่อยู่ด้านบน)

2f. input รหัสผ่าน: `minLength={8}` และ placeholder ตอนสมัคร `'รหัสผ่าน (อย่างน้อย 8 ตัว)'`; ใน `getPasswordStrength` เปลี่ยน `>= 6` เป็น `>= 8` และ `>= 8` เป็น `>= 12`
2g. regex ชื่อผู้ใช้ใน effect ตรวจชื่อ: `/^[A-Za-z0-9_.]+$/` ให้ตรงกับเซิร์ฟเวอร์

- [ ] **Step 3: แก้ `App.tsx`**

3a. แทนที่

```ts
  const ADMIN_USER_ID = import.meta.env.VITE_ADMIN_USER_ID;
  const isAdmin = user?.id === ADMIN_USER_ID && !!ADMIN_USER_ID;
```

ด้วย `const isAdmin = user?.role === 'admin';`

3b. เพิ่ม selector และ effect สำหรับ auto-pull ใกล้ ๆ effect `setAuthState`:

```ts
  const pendingAdoption = useFlashcardStore((state) => state.pendingAdoption);
  const adoptLocalData = useFlashcardStore((state) => state.adoptLocalData);
  const declineAdoption = useFlashcardStore((state) => state.declineAdoption);

  useEffect(() => {
    if (!user || isDemo) return;
    let stop: (() => void) | undefined;
    void import('./store/syncEngine').then(({ startAutoPull }) => {
      stop = startAutoPull();
    });
    return () => stop?.();
  }, [user, isDemo]);
```

3c. เพิ่ม modal ถามย้ายข้อมูล ข้าง ๆ `ConfirmModal` ของการออกจากระบบที่มีอยู่แล้ว (ใช้ component `ConfirmModal` เดิม ดู props ที่ใช้กับ `showLogoutConfirm` แล้วทำแบบเดียวกัน):

```tsx
      <ConfirmModal
        isOpen={pendingAdoption}
        title="นำข้อมูลในเครื่องขึ้นบัญชีไหม?"
        message="เครื่องนี้มีชุดการ์ดที่ทำไว้ตอนยังไม่ล็อกอิน ต้องการเก็บไว้ในบัญชีนี้ด้วยไหม? ถ้าเลือกไม่ ข้อมูลในเครื่องจะถูกแทนด้วยข้อมูลของบัญชี"
        confirmText="นำขึ้นบัญชี"
        cancelText="ไม่ ใช้ข้อมูลบัญชี"
        onConfirm={() => void adoptLocalData()}
        onCancel={() => void declineAdoption()}
      />
```

(ถ้าชื่อ props ของ `ConfirmModal` ต่างจากนี้ ให้ใช้ชื่อตามไฟล์ `src/components/ConfirmModal.tsx`)

- [ ] **Step 4: ตรวจ type และ lint**

Run: `npx tsc -b` แล้ว `npm run lint`
Expected: ไม่มี error ที่เกี่ยวกับไฟล์ใน Task นี้ (error จาก `communityStore.ts`/`AdminPage.tsx` ที่ยัง import supabase จะหายใน Task 9–10)

- [ ] **Step 5: Commit**

```bash
git add src/contexts/AuthContext.tsx src/pages/AuthPage.tsx src/App.tsx src/utils/errorMapper.ts
git commit -m "feat(auth): username-only accounts, server roles and guest data adoption"
```

---

### Task 9: ระบบชุมชนบน PocketBase

**Files:**
- Rewrite: `src/store/communityStore.ts`
- Modify: `src/pages/DeckDetail.tsx`, `src/pages/PublicDeckDetail.tsx`, `src/pages/ExplorePage.tsx`
- Create: `tests/integration/community.test.ts`

**Interfaces:**
- Consumes: `pb`, `imageToBlob` (Task 6), store `addDeck/addCard/deleteDeck` (Task 7)
- Produces (`communityStore`): ชื่อเดิม signature เดิม ยกเว้น
  - `shareDeckToCommunity(userId, deckId, name, description, category, tags, color, cards: ShareCard[]): Promise<PublicDeck | null>` โดย `ShareCard = { id: string; question: string; answer: string; questionImage?: string; answerImage?: string }` (null = แชร์ไปแล้ว)
  - `updatePublicDeckCards(publicDeckId: string, cards: ShareCard[]): Promise<boolean>`
  - `PublicDeckCard` เพิ่ม `questionImage?: string; answerImage?: string; sourceCardId: string | null`
  - ลบ: `importPublicDeck`, `getSyncedDeckCards`, `sendDiscordNotification`
  - ฟังก์ชันอ่านข้อมูล throw เมื่อเครือข่าย/เซิร์ฟเวอร์ error (ยกเว้น 404 → null/false) เพื่อให้ UI แยก "ไม่พบ" กับ "ติดต่อไม่ได้" ได้

- [ ] **Step 1: เขียนเทสต์ที่ fail `tests/integration/community.test.ts`**

```ts
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import PocketBase from 'pocketbase';
import { setPocketBaseClient } from '../../src/lib/pocketbase';
import { communityStore } from '../../src/store/communityStore';
import { useFlashcardStore } from '../../src/store/store';
import { createUser, startPocketBase, type PbHarness } from './pbHarness';

let h: PbHarness;
let alice: PocketBase;
let bob: PocketBase;
const uid = (pb: PocketBase) => pb.authStore.record!.id;
const cards = [
  { id: 'aaaaaaaaaaaaaa1', question: 'cat', answer: 'แมว' },
  { id: 'aaaaaaaaaaaaaa2', question: 'dog', answer: 'หมา' },
];

beforeAll(async () => {
  h = await startPocketBase();
  alice = await createUser(h.url, 'alice');
  bob = await createUser(h.url, 'bob');
});
afterAll(async () => h?.stop());

describe('community flow', () => {
  let publicId: string;

  it('shares a deck once', async () => {
    setPocketBaseClient(alice);
    const pd = await communityStore.shareDeckToCommunity(uid(alice), 'alicedeck000001', 'Animals', 'desc', 'ภาษา', ['en'], 'violet', cards);
    expect(pd).toMatchObject({ name: 'Animals', cardCount: 2, creatorUsername: 'alice', isActive: true });
    publicId = pd!.id;
    expect(await communityStore.shareDeckToCommunity(uid(alice), 'alicedeck000001', 'Animals', '', 'ภาษา', [], 'violet', cards)).toBeNull();
  });

  it('finds it by search and category without logging in', async () => {
    setPocketBaseClient(new PocketBase(h.url));
    const found = await communityStore.searchPublicDecks('Anim', 'ภาษา', ['en']);
    expect(found.decks.map((d) => d.id)).toContain(publicId);
  });

  it('subscribes into the local store with source links', async () => {
    setPocketBaseClient(bob);
    useFlashcardStore.getState().resetForAccount(uid(bob));
    useFlashcardStore.getState().setAuthState(uid(bob), false);
    const localDeckId = await communityStore.subscribePublicDeck(publicId, uid(bob), 'Animals', 'violet');
    const state = useFlashcardStore.getState();
    expect(state.decks.find((d) => d.id === localDeckId)?.linkedPublicDeckId).toBe(publicId);
    expect(state.cards.filter((c) => c.deckId === localDeckId && c.sourceCardId)).toHaveLength(2);
    expect(await communityStore.hasUserImportedDeck(publicId, uid(bob))).toBe(true);
  });

  it('updates public cards by diff keeping ids stable', async () => {
    setPocketBaseClient(alice);
    const before = await communityStore.getPublicDeckCards(publicId);
    await communityStore.updatePublicDeckCards(publicId, [
      { ...cards[0], answer: 'แมว (cat)' },
      { id: 'aaaaaaaaaaaaaa3', question: 'bird', answer: 'นก' },
    ]);
    const after = await communityStore.getPublicDeckCards(publicId);
    expect(after.map((c) => c.answer)).toEqual(['แมว (cat)', 'นก']);
    expect(after[0].id).toBe(before[0].id);
    expect((await communityStore.getPublicDeckById(publicId))?.cardCount).toBe(2);
  });

  it('rates and reports', async () => {
    setPocketBaseClient(bob);
    await communityStore.ratePublicDeck(publicId, uid(bob), 4);
    await communityStore.ratePublicDeck(publicId, uid(bob), 5);
    expect(await communityStore.getUserRating(publicId, uid(bob))).toBe(5);
    expect((await communityStore.getPublicDeckById(publicId))?.avgRating).toBe(5);
    expect(await communityStore.reportPublicDeck(publicId, uid(bob), 'spam', 'test')).toBe(true);
    expect(await communityStore.reportPublicDeck(publicId, uid(bob), 'spam')).toBe(true);
    expect(await communityStore.getUserReportStatus(publicId, uid(bob))).toBe(true);
  });

  it('unshares by deleting the public deck', async () => {
    setPocketBaseClient(alice);
    await communityStore.unshareDecktoCommunity(publicId);
    expect(await communityStore.getPublicDeckById(publicId)).toBeNull();
  });
});
```

Run: `npm run test:integration -- tests/integration/community.test.ts`
Expected: FAIL (ยัง import supabase)

- [ ] **Step 2: เขียน `src/store/communityStore.ts` ใหม่ทั้งไฟล์**

```ts
import type { RecordModel } from 'pocketbase';
import { pb } from '../lib/pocketbase';
import { imageToBlob } from './pocketbaseStore';

// ============================================
// Types
// ============================================

export interface PublicDeck {
  id: string;
  creatorId: string;
  creatorUsername: string;
  sourceDeckId: string | null;
  name: string;
  description: string | null;
  color: string;
  category: string;
  tags: string[];
  importCount: number;
  isActive: boolean;
  cardCount: number;
  avgRating: number;
  ratingCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PublicDeckCard {
  id: string;
  publicDeckId: string;
  sourceCardId: string | null;
  question: string;
  answer: string;
  questionImage?: string;
  answerImage?: string;
  createdAt: Date;
}

export interface ShareCard {
  id: string;
  question: string;
  answer: string;
  questionImage?: string;
  answerImage?: string;
}

export type ReportReason = 'spam' | 'inappropriate' | 'copyright' | 'other';

export const DECK_CATEGORIES = [
  'ภาษา',
  'วิทยาศาสตร์',
  'คณิตศาสตร์',
  'ประวัติศาสตร์',
  'ทั่วไป',
  'อื่นๆ',
] as const;

export type DeckCategory = typeof DECK_CATEGORIES[number];

export const REPORT_REASONS = [
  { value: 'spam', label: 'สแปม' },
  { value: 'inappropriate', label: 'เนื้อหาไม่เหมาะสม' },
  { value: 'copyright', label: 'ละเมิดลิขสิทธิ์' },
  { value: 'other', label: 'อื่นๆ' },
] as const;

// ============================================
// Helpers
// ============================================

const status = (err: unknown) => (err as { status?: number })?.status;
const asDate = (value: string) => new Date(value.replace(' ', 'T'));

async function orNull<T>(promise: Promise<T>): Promise<T | null> {
  try {
    return await promise;
  } catch (err) {
    if (status(err) === 404) return null;
    throw err;
  }
}

const toPublicDeck = (r: RecordModel): PublicDeck => ({
  id: r.id,
  creatorId: r.owner,
  creatorUsername: r.owner_name || 'ไม่ทราบชื่อ',
  sourceDeckId: r.source_deck || null,
  name: r.name,
  description: r.description || null,
  color: r.color || 'violet',
  category: r.category || 'ทั่วไป',
  tags: Array.isArray(r.tags) ? r.tags : [],
  importCount: r.import_count || 0,
  isActive: !r.hidden,
  cardCount: r.card_count || 0,
  avgRating: r.rating_avg || 0,
  ratingCount: r.rating_count || 0,
  createdAt: asDate(r.created),
  updatedAt: asDate(r.updated),
});

const toPublicCard = (r: RecordModel): PublicDeckCard => ({
  id: r.id,
  publicDeckId: r.public_deck,
  sourceCardId: r.source_card || null,
  question: r.question,
  answer: r.answer,
  questionImage: r.question_image ? pb.files.getURL(r, r.question_image) : undefined,
  answerImage: r.answer_image ? pb.files.getURL(r, r.answer_image) : undefined,
  createdAt: asDate(r.created),
});

async function publicCardForm(publicDeckId: string, card: ShareCard, position: number): Promise<FormData> {
  const form = new FormData();
  form.set('public_deck', publicDeckId);
  form.set('source_card', card.id);
  form.set('position', String(position));
  form.set('question', card.question);
  form.set('answer', card.answer);
  for (const [field, value] of [['question_image', card.questionImage], ['answer_image', card.answerImage]] as const) {
    const blob = await imageToBlob(value);
    if (blob) form.set(field, blob, `${field}.${blob.type.split('/')[1] || 'png'}`);
  }
  return form;
}

const BATCH_SIZE = 50;

// ============================================
// Community Store Operations
// ============================================

export const communityStore = {
  // ── Share ──

  async shareDeckToCommunity(
    userId: string,
    deckId: string,
    name: string,
    description: string,
    category: DeckCategory,
    tags: string[],
    color: string,
    cards: ShareCard[],
  ): Promise<PublicDeck | null> {
    if (await this.getPublicDeckBySourceDeckId(deckId, userId)) return null;

    const record = await pb.collection('public_decks').create({
      owner: userId,
      source_deck: deckId,
      name,
      description: description || `ชุดการ์ด ${name}`,
      color,
      category,
      tags,
      card_count: cards.length,
    });
    try {
      for (let i = 0; i < cards.length; i += BATCH_SIZE) {
        const batch = pb.createBatch();
        const chunk = cards.slice(i, i + BATCH_SIZE);
        for (const [offset, card] of chunk.entries()) {
          batch.collection('public_deck_cards').create(await publicCardForm(record.id, card, i + offset));
        }
        await batch.send();
      }
    } catch (err) {
      await pb.collection('public_decks').delete(record.id); // cascade ลบการ์ดที่ขึ้นไปแล้ว
      throw err;
    }
    return this.getPublicDeckById(record.id);
  },

  async unshareDecktoCommunity(publicDeckId: string): Promise<boolean> {
    await pb.collection('public_decks').delete(publicDeckId);
    return true;
  },

  async updatePublicDeck(
    publicDeckId: string,
    updates: { name?: string; description?: string; category?: DeckCategory; tags?: string[] },
  ): Promise<boolean> {
    await pb.collection('public_decks').update(publicDeckId, updates);
    return true;
  },

  /** อัปเดตแบบ diff ตาม source_card เพื่อให้ ID การ์ดสาธารณะคงเดิม (ผู้ติดตามจับคู่ได้) */
  async updatePublicDeckCards(publicDeckId: string, cards: ShareCard[]): Promise<boolean> {
    const existing = await pb.collection('public_deck_cards').getFullList({
      filter: pb.filter('public_deck = {:id}', { id: publicDeckId }),
    });
    const bySource = new Map(existing.map((r) => [r.source_card as string, r]));
    const keep = new Set(cards.map((c) => c.id));

    const ops: ((batch: ReturnType<typeof pb.createBatch>) => Promise<void>)[] = [];
    cards.forEach((card, position) => {
      const current = bySource.get(card.id);
      if (!current) {
        ops.push(async (b) => { b.collection('public_deck_cards').create(await publicCardForm(publicDeckId, card, position)); });
      } else if (current.question !== card.question || current.answer !== card.answer || current.position !== position) {
        ops.push(async (b) => {
          b.collection('public_deck_cards').update(current.id, { question: card.question, answer: card.answer, position });
        });
      }
    });
    existing.filter((r) => !keep.has(r.source_card)).forEach((r) => {
      ops.push(async (b) => { b.collection('public_deck_cards').delete(r.id); });
    });

    for (let i = 0; i < ops.length; i += BATCH_SIZE) {
      const batch = pb.createBatch();
      for (const op of ops.slice(i, i + BATCH_SIZE)) await op(batch);
      await batch.send();
    }
    await pb.collection('public_decks').update(publicDeckId, { card_count: cards.length });
    return true;
  },

  // ── Read ──

  async getPublicDeckById(publicDeckId: string): Promise<PublicDeck | null> {
    const record = await orNull(pb.collection('public_decks').getOne(publicDeckId));
    return record ? toPublicDeck(record) : null;
  },

  async getPublicDeckBySourceDeckId(sourceDeckId: string, userId: string): Promise<PublicDeck | null> {
    const record = await orNull(pb.collection('public_decks').getFirstListItem(
      pb.filter('owner = {:uid} && source_deck = {:src}', { uid: userId, src: sourceDeckId }),
    ));
    return record ? toPublicDeck(record) : null;
  },

  async getPublicDeckCards(publicDeckId: string): Promise<PublicDeckCard[]> {
    const records = await pb.collection('public_deck_cards').getFullList({
      filter: pb.filter('public_deck = {:id}', { id: publicDeckId }),
      sort: 'position,created',
    });
    return records.map(toPublicCard);
  },

  // ── Subscribe / duplicate (สร้างในเครื่องผ่าน store แล้วซิงก์ผ่านคิว) ──

  async copyIntoLocalStore(publicDeckId: string, deckName: string, color: string, linked: boolean): Promise<string> {
    const { useFlashcardStore } = await import('./store');
    const cards = await this.getPublicDeckCards(publicDeckId);
    const store = useFlashcardStore.getState();
    const deck = await store.addDeck(deckName, color, linked ? { linkedPublicDeckId: publicDeckId } : undefined);
    for (const card of cards) {
      await store.addCard(deck.id, card.question, card.answer, card.questionImage, card.answerImage, {
        skipAchievementCheck: true,
        sourceCardId: linked ? card.id : undefined,
      });
    }
    return deck.id;
  },

  async recordImport(publicDeckId: string, userId: string): Promise<void> {
    try {
      await pb.collection('deck_imports').create({ user: userId, public_deck: publicDeckId });
    } catch (err) {
      if (status(err) !== 400) throw err; // 400 = เคยนำเข้าแล้ว
    }
  },

  async subscribePublicDeck(publicDeckId: string, userId: string, deckName: string, deckColor: string): Promise<string | null> {
    if (await this.hasUserImportedDeck(publicDeckId, userId)) return null;
    const localDeckId = await this.copyIntoLocalStore(publicDeckId, deckName, deckColor, true);
    await this.recordImport(publicDeckId, userId);
    return localDeckId;
  },

  async duplicatePublicDeck(publicDeckId: string, userId: string, newDeckName: string): Promise<string | null> {
    const publicDeck = await this.getPublicDeckById(publicDeckId);
    if (!publicDeck) return null;
    const localDeckId = await this.copyIntoLocalStore(publicDeckId, newDeckName, publicDeck.color, false);
    await this.recordImport(publicDeckId, userId);
    return localDeckId;
  },

  async unsubscribePublicDeck(localDeckId: string): Promise<boolean> {
    const { useFlashcardStore } = await import('./store');
    await useFlashcardStore.getState().deleteDeck(localDeckId, true);
    return true;
  },

  async hasUserImportedDeck(publicDeckId: string, userId: string): Promise<boolean> {
    const record = await orNull(pb.collection('deck_imports').getFirstListItem(
      pb.filter('user = {:uid} && public_deck = {:id}', { uid: userId, id: publicDeckId }),
    ));
    return record !== null;
  },

  async getImportedDecks(userId: string): Promise<string[]> {
    const records = await pb.collection('deck_imports').getFullList({ filter: pb.filter('user = {:uid}', { uid: userId }) });
    return records.map((r) => r.public_deck);
  },

  // ── Explore ──

  async getPublicDecks(
    page = 1,
    limit = 50,
    sortBy: 'import_count' | 'rating' | 'newest' = 'import_count',
  ): Promise<{ decks: PublicDeck[]; total: number }> {
    const sort = { import_count: '-import_count', rating: '-rating_avg', newest: '-created' }[sortBy];
    const result = await pb.collection('public_decks').getList(page, limit, { filter: 'hidden = false', sort });
    return { decks: result.items.map(toPublicDeck), total: result.totalItems };
  },

  async searchPublicDecks(
    query: string,
    category?: DeckCategory,
    tags?: string[],
    page = 1,
    limit = 50,
  ): Promise<{ decks: PublicDeck[]; total: number }> {
    const parts = ['hidden = false'];
    const params: Record<string, string> = {};
    if (query.trim()) {
      parts.push('(name ~ {:q} || description ~ {:q})');
      params.q = query.trim();
    }
    if (category) {
      parts.push('category = {:c}');
      params.c = category;
    }
    (tags ?? []).forEach((tag, i) => {
      parts.push(`tags ~ {:t${i}}`);
      params[`t${i}`] = tag;
    });
    const result = await pb.collection('public_decks').getList(page, limit, {
      filter: pb.filter(parts.join(' && '), params),
      sort: '-import_count',
    });
    return { decks: result.items.map(toPublicDeck), total: result.totalItems };
  },

  async getPublicDecksByCategory(category: DeckCategory, page = 1, limit = 50) {
    return this.searchPublicDecks('', category, undefined, page, limit);
  },

  // ── Rating ──

  async ratePublicDeck(publicDeckId: string, userId: string, rating: number): Promise<boolean> {
    const existing = await orNull(pb.collection('deck_ratings').getFirstListItem(
      pb.filter('user = {:uid} && public_deck = {:id}', { uid: userId, id: publicDeckId }),
    ));
    if (existing) await pb.collection('deck_ratings').update(existing.id, { stars: rating });
    else await pb.collection('deck_ratings').create({ user: userId, public_deck: publicDeckId, stars: rating });
    return true;
  },

  async getUserRating(publicDeckId: string, userId: string): Promise<number | null> {
    const record = await orNull(pb.collection('deck_ratings').getFirstListItem(
      pb.filter('user = {:uid} && public_deck = {:id}', { uid: userId, id: publicDeckId }),
    ));
    return record ? record.stars : null;
  },

  async getAverageRating(publicDeckId: string): Promise<{ avg: number; count: number }> {
    const deck = await this.getPublicDeckById(publicDeckId);
    return { avg: deck?.avgRating ?? 0, count: deck?.ratingCount ?? 0 };
  },

  // ── Moderation ──

  async reportPublicDeck(publicDeckId: string, userId: string, reason: ReportReason, details?: string): Promise<boolean> {
    try {
      await pb.collection('deck_reports').create({
        user: userId,
        public_deck: publicDeckId,
        reason,
        detail: (details ?? '').slice(0, 500),
      });
    } catch (err) {
      if (status(err) !== 400 || !(await this.getUserReportStatus(publicDeckId, userId))) throw err;
    }
    return true;
  },

  async getUserReportStatus(publicDeckId: string, userId: string): Promise<boolean> {
    const record = await orNull(pb.collection('deck_reports').getFirstListItem(
      pb.filter('user = {:uid} && public_deck = {:id}', { uid: userId, id: publicDeckId }),
    ));
    return record !== null;
  },
};
```

- [ ] **Step 3: แก้ `DeckDetail.tsx`**

ใน `handleShare` และ `handleUpdateDeck` เปลี่ยน

```ts
      const cardsData = cards.map((c) => ({
        question: c.question,
        answer: c.answer,
      }));
```

เป็น

```ts
      const cardsData = cards.map((c) => ({
        id: c.id,
        question: c.question,
        answer: c.answer,
        questionImage: c.questionImage,
        answerImage: c.answerImage,
      }));
```

และใน `handleUnsubscribe` แทน `window.location.reload();` ด้วยการเรียก callback กลับหน้าแรกที่ component ได้รับอยู่แล้ว (ดู props ของ `DeckDetail` เช่น `onBack`) ถ้าไม่มี ให้คง `window.location.reload()` ไว้

- [ ] **Step 4: แก้ `ExplorePage.tsx` ให้แยก error กับรายการว่าง**

เพิ่ม state `const [loadError, setLoadError] = useState(false);` ในฟังก์ชันโหลด (ที่เรียก `searchPublicDecks`/`getPublicDecks` บรรทัด ~29–37) ครอบด้วย try/catch: ก่อนเรียกตั้ง `setLoadError(false)`, ใน catch ตั้ง `setLoadError(true)` และในส่วน render ก่อนแสดงรายการ/empty state เพิ่ม:

```tsx
      {loadError && (
        <div className={`p-6 rounded-3xl text-center ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-white text-slate-600'}`}>
          <p className="font-bold">ติดต่อเซิร์ฟเวอร์ไม่ได้</p>
          <p className="text-sm mt-1">ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่อีกครั้ง</p>
          <button onClick={() => void loadDecks()} className="mt-4 px-5 py-2 rounded-xl bg-violet-500 text-white font-bold">ลองใหม่</button>
        </div>
      )}
```

(ใช้ชื่อฟังก์ชันโหลดตามที่ไฟล์ใช้จริงแทน `loadDecks` และใช้ `isDark` จาก `useTheme()` ที่ไฟล์มีอยู่)

- [ ] **Step 5: `PublicDeckDetail.tsx`** — ไม่ต้องแก้ signature แต่ตรวจว่า `onImported(newDeckId)` ทำงานได้ทันที (ชุดอยู่ใน store แล้ว ไม่ต้องรีเฟรช)

- [ ] **Step 6: รันเทสต์**

Run: `npm run test:integration` แล้ว `npm test`
Expected: PASS ทั้งหมด

- [ ] **Step 7: Commit**

```bash
git add src/store/communityStore.ts src/pages/DeckDetail.tsx src/pages/ExplorePage.tsx tests/integration/community.test.ts
git commit -m "feat(community): share, subscribe, rate and report on PocketBase"
```

---

### Task 10: หน้าแอดมิน

**Files:**
- Create: `src/store/adminStore.ts`, `src/components/AdminPasswordReset.tsx`, `tests/integration/admin.test.ts`
- Modify: `src/pages/AdminPage.tsx`, `src/App.tsx`

**Interfaces:**
- Produces (`adminStore`): `loadReportedDecks(): Promise<ReportedDeck[]>`, `setHidden(deckId: string, hidden: boolean): Promise<void>`, `deletePublicDeck(deckId: string): Promise<void>`, `dismissReports(deckId: string): Promise<void>`, `countOpenReports(): Promise<number>`, `findUsers(query: string): Promise<{ id: string; username: string }[]>`, `resetPassword(userId: string, password: string): Promise<void>`
- `ReportedDeck` ใช้ interface เดียวกับที่ `AdminPage.tsx` ประกาศอยู่ (ย้ายไป export จาก `adminStore.ts`)

- [ ] **Step 1: เขียนเทสต์ที่ fail `tests/integration/admin.test.ts`**

```ts
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import PocketBase from 'pocketbase';
import { setPocketBaseClient } from '../../src/lib/pocketbase';
import { adminStore } from '../../src/store/adminStore';
import { createUser, makeAdmin, startPocketBase, type PbHarness } from './pbHarness';

let h: PbHarness;
let boss: PocketBase;
let deckId: string;
const uid = (pb: PocketBase) => pb.authStore.record!.id;

beforeAll(async () => {
  h = await startPocketBase();
  const owner = await createUser(h.url, 'owner');
  const reporter = await createUser(h.url, 'reporter');
  boss = await createUser(h.url, 'boss');
  await makeAdmin(h, boss);
  deckId = (await owner.collection('public_decks').create({ owner: uid(owner), name: 'bad deck' })).id;
  await reporter.collection('deck_reports').create({ user: uid(reporter), public_deck: deckId, reason: 'spam', detail: 'ads' });
  setPocketBaseClient(boss);
});
afterAll(async () => h?.stop());

describe('adminStore', () => {
  it('lists decks with open reports and reporter names', async () => {
    const decks = await adminStore.loadReportedDecks();
    expect(decks).toHaveLength(1);
    expect(decks[0]).toMatchObject({ id: deckId, name: 'bad deck', creator_username: 'owner', report_count: 1 });
    expect(decks[0].reports[0]).toMatchObject({ reporter_username: 'reporter', reason: 'spam', details: 'ads' });
    expect(await adminStore.countOpenReports()).toBe(1);
  });

  it('hides and restores', async () => {
    await adminStore.setHidden(deckId, true);
    expect((await h.admin.collection('public_decks').getOne(deckId)).hidden).toBe(true);
    await adminStore.setHidden(deckId, false);
    expect((await h.admin.collection('public_decks').getOne(deckId)).hidden).toBe(false);
  });

  it('dismisses reports so the deck leaves the list', async () => {
    await adminStore.dismissReports(deckId);
    expect(await adminStore.loadReportedDecks()).toHaveLength(0);
  });

  it('finds users and resets a password', async () => {
    const [found] = await adminStore.findUsers('repor');
    expect(found.username).toBe('reporter');
    await adminStore.resetPassword(found.id, 'new-password-1');
  });
});
```

Run: `npm run test:integration -- tests/integration/admin.test.ts` → Expected: FAIL (ไม่มี `adminStore`)

- [ ] **Step 2: เขียน `src/store/adminStore.ts`**

```ts
import { pb } from '../lib/pocketbase';

export interface Report {
  id: string;
  reporter_username: string;
  reason: string;
  details: string | null;
  created_at: string;
}

export interface ReportedDeck {
  id: string;
  name: string;
  creator_username: string;
  creator_id: string;
  category: string;
  import_count: number;
  is_active: boolean;
  is_hidden: boolean;
  report_count: number;
  created_at: string;
  reports: Report[];
}

const OPEN = 'status = "" || status = "open"';

export const adminStore = {
  async loadReportedDecks(): Promise<ReportedDeck[]> {
    const reports = await pb.collection('deck_reports').getFullList({
      filter: OPEN,
      sort: '-created',
      expand: 'user,public_deck',
    });
    const byDeck = new Map<string, ReportedDeck>();
    for (const r of reports) {
      const deck = r.expand?.public_deck;
      if (!deck) continue;
      const entry = byDeck.get(deck.id) ?? {
        id: deck.id,
        name: deck.name,
        creator_username: deck.owner_name || 'ไม่ทราบชื่อ',
        creator_id: deck.owner,
        category: deck.category || 'ทั่วไป',
        import_count: deck.import_count || 0,
        is_active: !deck.hidden,
        is_hidden: Boolean(deck.hidden),
        report_count: 0,
        created_at: deck.created,
        reports: [],
      };
      entry.reports.push({
        id: r.id,
        reporter_username: r.expand?.user?.username || 'ไม่ทราบชื่อ',
        reason: r.reason,
        details: r.detail || null,
        created_at: r.created,
      });
      entry.report_count = entry.reports.length;
      byDeck.set(deck.id, entry);
    }
    return [...byDeck.values()].sort((a, b) => b.report_count - a.report_count);
  },

  async setHidden(deckId: string, hidden: boolean): Promise<void> {
    await pb.collection('public_decks').update(deckId, { hidden });
  },

  async deletePublicDeck(deckId: string): Promise<void> {
    await pb.collection('public_decks').delete(deckId);
  },

  async dismissReports(deckId: string): Promise<void> {
    const open = await pb.collection('deck_reports').getFullList({
      filter: pb.filter(`public_deck = {:id} && (${OPEN})`, { id: deckId }),
    });
    for (let i = 0; i < open.length; i += 50) {
      const batch = pb.createBatch();
      open.slice(i, i + 50).forEach((r) => batch.collection('deck_reports').update(r.id, { status: 'dismissed' }));
      await batch.send();
    }
  },

  async countOpenReports(): Promise<number> {
    const result = await pb.collection('deck_reports').getList(1, 1, { filter: OPEN });
    return result.totalItems;
  },

  async findUsers(query: string): Promise<{ id: string; username: string }[]> {
    const result = await pb.collection('users').getList(1, 20, {
      filter: pb.filter('username ~ {:q}', { q: query.trim() }),
      sort: 'username',
    });
    return result.items.map((u) => ({ id: u.id, username: u.username }));
  },

  async resetPassword(userId: string, password: string): Promise<void> {
    await pb.send('/api/memokard/admin/reset-password', { method: 'POST', body: { userId, password } });
  },
};
```

Run: `npm run test:integration -- tests/integration/admin.test.ts` → Expected: PASS 4 tests

- [ ] **Step 3: แก้ `AdminPage.tsx` ให้ใช้ `adminStore`**

3a. ลบ `import { supabase } from '../lib/supabase';` และ interface `ReportedDeck`, `Report` ในไฟล์ แล้วเพิ่ม
`import { adminStore, type ReportedDeck } from '../store/adminStore';` และ `import AdminPasswordReset from '../components/AdminPasswordReset';`

3b. `loadReportedDecks` แทนที่ body ใน `try` ด้วย `setDecks(await adminStore.loadReportedDecks());` และใน catch เพิ่ม `showToast('โหลดรายงานไม่สำเร็จ', 'error');` (เพิ่ม `showToast` ใน dependency array)

3c. `handleHide`: แทนที่การเรียก supabase + `if (error) throw error;` ด้วย `await adminStore.setHidden(deckId, true);`
3d. `handleRestore`: `await adminStore.setHidden(deckId, false);`
3e. `handleDelete`: แทนที่ก้อน supabase + if error ด้วย `await adminStore.deletePublicDeck(deckId);`
3f. `handleDismissReports`: `await adminStore.dismissReports(deckId);`
3g. ใน JSX ต่อท้ายเนื้อหาหลัก (ก่อนปิด `motion.div` นอกสุด) เพิ่ม `<AdminPasswordReset />`

- [ ] **Step 4: เขียน `src/components/AdminPasswordReset.tsx`**

```tsx
import { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { adminStore } from '../store/adminStore';

export default function AdminPasswordReset() {
  const { isDark } = useTheme();
  const { showToast } = useToast();
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<{ id: string; username: string }[]>([]);
  const [selected, setSelected] = useState<{ id: string; username: string } | null>(null);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const panel = isDark ? 'bg-slate-800 text-slate-100' : 'bg-white text-slate-800';
  const input = `w-full px-4 py-2.5 rounded-xl border-2 ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'}`;

  const search = async () => {
    if (query.trim().length < 2) return;
    try {
      setUsers(await adminStore.findUsers(query));
    } catch {
      showToast('ค้นหาผู้ใช้ไม่สำเร็จ', 'error');
    }
  };

  const reset = async () => {
    if (!selected || password.length < 8) return;
    setBusy(true);
    try {
      await adminStore.resetPassword(selected.id, password);
      showToast(`ตั้งรหัสผ่านใหม่ให้ ${selected.username} แล้ว`, 'success');
      setPassword('');
      setSelected(null);
    } catch {
      showToast('รีเซ็ตรหัสผ่านไม่สำเร็จ', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={`mt-8 p-6 rounded-3xl ${panel}`}>
      <h2 className="text-lg font-bold">รีเซ็ตรหัสผ่านผู้ใช้</h2>
      <p className="text-sm opacity-70 mt-1">ใช้เมื่อผู้ใช้ลืมรหัสผ่าน ตั้งรหัสชั่วคราวแล้วแจ้งให้เขาเปลี่ยนเอง</p>
      <div className="flex gap-2 mt-4">
        <input className={input} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ชื่อผู้ใช้" onKeyDown={(e) => e.key === 'Enter' && void search()} />
        <button className="px-4 rounded-xl bg-violet-500 text-white font-bold" onClick={() => void search()}>ค้นหา</button>
      </div>
      <ul className="mt-3 space-y-1">
        {users.map((u) => (
          <li key={u.id}>
            <button className={`w-full text-left px-3 py-2 rounded-lg ${selected?.id === u.id ? 'bg-violet-500 text-white' : ''}`} onClick={() => setSelected(u)}>
              {u.username}
            </button>
          </li>
        ))}
      </ul>
      {selected && (
        <div className="flex gap-2 mt-4">
          <input className={input} type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="รหัสผ่านใหม่ (อย่างน้อย 8 ตัว)" />
          <button disabled={busy || password.length < 8} className="px-4 rounded-xl bg-rose-500 text-white font-bold disabled:opacity-50" onClick={() => void reset()}>
            ตั้งรหัสใหม่
          </button>
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 5: ตัวเลขรายงานค้างบนปุ่มแอดมินใน `App.tsx`**

ใกล้ `isAdmin` เพิ่ม:

```ts
  const [openReports, setOpenReports] = useState(0);
  useEffect(() => {
    if (!isAdmin) return;
    void import('./store/adminStore').then(({ adminStore }) =>
      adminStore.countOpenReports().then(setOpenReports).catch(() => setOpenReports(0)));
  }, [isAdmin, view]);
```

และในปุ่มแอดมิน (บล็อก `{isAdmin && view !== 'admin' && (`) ภายใน `<button>` เพิ่ม:

```tsx
                    {openReports > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-rose-500 text-white text-xs font-bold flex items-center justify-center">
                        {openReports}
                      </span>
                    )}
```

(ถ้าปุ่มไม่มี `relative` ให้เพิ่ม `relative` ใน className ของปุ่ม)

- [ ] **Step 6: รันเทสต์ + type check**

Run: `npm run test:integration` แล้ว `npx tsc -b`
Expected: PASS และไม่มี type error

- [ ] **Step 7: Commit**

```bash
git add src/store/adminStore.ts src/components/AdminPasswordReset.tsx src/pages/AdminPage.tsx src/App.tsx tests/integration/admin.test.ts
git commit -m "feat(admin): moderation and password reset on PocketBase"
```

---

### Task 11: ป้ายสถานะซิงก์ + เตือนก่อนออกจากระบบ

**Files:**
- Modify: `src/components/SyncStatusBadge.tsx`, `src/components/PwaStatusBar.tsx`, `src/App.tsx`

**Interfaces:**
- Consumes: `syncQueue.getStatus()`, `syncQueue.subscribe()`, `getQueue()`, `getDeadLetters()`, `retryDeadLetters()`, `discardDeadLetters()` (Task 5)

- [ ] **Step 1: แก้ `SyncStatusBadge.tsx`**

1a. แทนที่ state + effect นับคิว (ตั้งแต่ `const [pendingCount...` จนจบ `useEffect` แรก) ด้วย:

```ts
  const [pendingCount, setPendingCount] = useState(0);
  const [deadCount, setDeadCount] = useState(0);
  const [syncStatus, setSyncStatus] = useState(syncQueue.getStatus());
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(() => typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [showTooltip, setShowTooltip] = useState(false);

  const refresh = useCallback(async () => {
    setSyncStatus(syncQueue.getStatus());
    try {
      setPendingCount((await syncQueue.getQueue()).length);
      setDeadCount((await syncQueue.getDeadLetters()).length);
    } catch {
      setPendingCount(0);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const unsubscribe = syncQueue.subscribe(() => void refresh());
    const handleOnline = () => { setIsOnline(true); void refresh(); };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [refresh]);
```

และใน `handleManualSync` เปลี่ยน `updatePendingQueue()` เป็น `refresh()` พร้อมเพิ่ม `const { pullChanges } = await import('../store/syncEngine'); await pullChanges().catch(() => undefined);` ก่อน `processQueue`

1b. ข้อความใน tooltip: เพิ่มฟังก์ชันเหนือ `return`:

```ts
  const lastSynced = syncStatus.lastSyncedAt
    ? new Date(syncStatus.lastSyncedAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
    : null;
  const statusText =
    !isOnline ? 'ออฟไลน์ — บันทึกในเครื่องไว้ก่อน'
    : syncStatus.status === 'auth' ? 'ต้องเข้าสู่ระบบใหม่เพื่อซิงก์'
    : deadCount > 0 ? `มี ${deadCount} รายการส่งไม่สำเร็จ`
    : pendingCount > 0 ? `กำลังซิงก์ ${pendingCount} รายการ`
    : lastSynced ? `ซิงก์แล้ว ${lastSynced} น.`
    : 'เชื่อมต่อคลาวด์สำเร็จ';
```

แล้วแทนข้อความเดิม `{backendStatus === 'available' ? 'เชื่อมต่อคลาวด์สำเร็จ' : 'กำลังตรวจสอบเซิร์ฟเวอร์'}` ด้วย `{backendStatus === 'available' ? statusText : 'กำลังตรวจสอบเซิร์ฟเวอร์'}`

1c. ใน tooltip ต่อท้ายเนื้อหา เมื่อ `deadCount > 0` แสดงปุ่ม:

```tsx
              {deadCount > 0 && (
                <div className="flex gap-2 mt-2">
                  <button className="px-3 py-1 rounded-lg bg-violet-500 text-white text-xs font-bold" onClick={() => void syncQueue.retryDeadLetters()}>ลองใหม่</button>
                  <button className="px-3 py-1 rounded-lg bg-slate-500 text-white text-xs font-bold" onClick={() => void syncQueue.discardDeadLetters()}>ทิ้ง</button>
                </div>
              )}
```

- [ ] **Step 2: `PwaStatusBar.tsx`** — ตรวจว่ายังเรียก `syncQueue.getQueue()`/`processQueue()` ได้ (API เดิมยังอยู่) ไม่ต้องแก้ถ้า `tsc` ผ่าน

- [ ] **Step 3: เตือนก่อนออกจากระบบใน `App.tsx`**

เพิ่ม state `const [unsyncedCount, setUnsyncedCount] = useState(0);` และตรงที่เปิด `setShowLogoutConfirm(true)` เปลี่ยนเป็น:

```ts
  const openLogoutConfirm = async () => {
    const { syncQueue } = await import('./store/syncQueue');
    setUnsyncedCount((await syncQueue.getQueue()).length);
    setShowLogoutConfirm(true);
  };
```

(แทนทุกจุดที่เรียก `setShowLogoutConfirm(true)` ด้วย `void openLogoutConfirm()`) และใน `ConfirmModal` ของการออกจากระบบ ให้ message เป็น:

```tsx
        message={unsyncedCount > 0
          ? `ยังมี ${unsyncedCount} รายการที่ยังไม่ซิงก์ขึ้นเซิร์ฟเวอร์ ถ้าออกจากระบบตอนนี้รายการเหล่านี้จะหาย แนะนำให้เชื่อมต่ออินเทอร์เน็ตแล้วรอให้ซิงก์เสร็จก่อน`
          : 'ต้องการออกจากระบบใช่ไหม?'}
```

(คงข้อความเดิมถ้าไฟล์ใช้ข้อความอื่นสำหรับกรณีไม่มีงานค้าง)

- [ ] **Step 4: ตรวจ**

Run: `npx tsc -b` แล้ว `npm run lint`
Expected: ไม่มี error

- [ ] **Step 5: Commit**

```bash
git add src/components/SyncStatusBadge.tsx src/components/PwaStatusBar.tsx src/App.tsx
git commit -m "feat(sync): richer sync status, dead-letter actions and logout warning"
```

---

### Task 12: ถอด Supabase ออก + อัปเดตเอกสาร + ตรวจรอบสุดท้าย

**Files:**
- Delete: `src/lib/supabase.ts`, `supabase/`, `scripts/run-migration-auto.js`, `scripts/run-migration.sh`, `scripts/test-migration.js`
- Modify: `package.json`, `.env.example`, `README.md`, `deploy/setup-oracle.sh`, `deploy/DEPLOY_GUIDE_TH.md`, `.gitignore`

- [ ] **Step 1: ลบไฟล์และแพ็กเกจ**

```bash
git rm -r src/lib/supabase.ts supabase scripts/run-migration-auto.js scripts/run-migration.sh scripts/test-migration.js
npm uninstall @supabase/supabase-js dotenv uuid
```

(`uuid` ไม่ถูกใช้แล้วหลัง Task 5; ตรวจก่อนด้วย `grep -rn "from 'uuid'" src` ต้องไม่มีผล)

- [ ] **Step 2: ตรวจว่าไม่เหลืออ้างอิง**

Run: `grep -rn -i "supabase\|VITE_ADMIN_USER_ID\|signInWithGoogle\|discord" src package.json .env.example`
Expected: ไม่มีผลลัพธ์

- [ ] **Step 3: `.env.example` เหลือแค่**

```dotenv
# URL ของเซิร์ฟเวอร์ MemoKard (PocketBase หลัง Nginx) เช่น https://memokard.example.com
VITE_POCKETBASE_URL=https://YOUR_DOMAIN.COM

# ทดสอบบนเครื่องตัวเอง:
# VITE_POCKETBASE_URL=http://127.0.0.1:8090
```

- [ ] **Step 4: `.gitignore`** ลบบล็อก `# Supabase SQL files (local use only)` สองบรรทัดท้าย

- [ ] **Step 5: `deploy/setup-oracle.sh`** เปลี่ยนบรรทัด `PB_VERSION="0.25.9" ...` เป็นเวอร์ชันเดียวกับ `deploy/pocketbase/VERSION` และใน `deploy/DEPLOY_GUIDE_TH.md` แทนที่ "ขั้นตอนที่ 6: นำเข้า Collection Schema" ทั้งหัวข้อด้วย:

```markdown
## 📦 ขั้นตอนที่ 6: ติดตั้งตาราง กฎ และ hooks ของ MemoKard

1. คัดลอกโฟลเดอร์ `deploy/pocketbase/pb_migrations` และ `deploy/pocketbase/pb_hooks` ไปที่ `/opt/pocketbase/`
2. สั่ง `sudo systemctl restart pocketbase` — PocketBase จะสร้างตารางและกฎให้อัตโนมัติตอนเริ่มทำงาน
3. เปิด `https://yourdomain.com/_/` สร้างบัญชีผู้ดูแล (superuser)
4. ตั้งแอดมินในแอป: เปิดตาราง `users` เลือกบัญชีของคุณ แล้วตั้ง `role` เป็น `admin`
```

- [ ] **Step 6: README** — แทนที่หัวข้อ "สร้างหรือกู้ Supabase", "Discord report notification", "Deploy" และรายการ "โครงสร้างหลัก" ด้วยเนื้อหาที่อ้าง PocketBase:

```markdown
## เซิร์ฟเวอร์ (PocketBase)

ทดสอบบนเครื่อง:

    npm run pb:fetch
    .pocketbase/pocketbase serve --migrationsDir deploy/pocketbase/pb_migrations --hooksDir deploy/pocketbase/pb_hooks

แล้วตั้ง `VITE_POCKETBASE_URL=http://127.0.0.1:8090` ใน `.env`

ติดตั้งบน Oracle Ubuntu: ดู [deploy/DEPLOY_GUIDE_TH.md](deploy/DEPLOY_GUIDE_TH.md)

## ทดสอบ

    npm test                 # unit
    npm run test:integration # รัน PocketBase จริงชั่วคราว (ต้อง npm run pb:fetch ก่อน)

## โครงสร้างหลัก

- `src/store/store.ts` — ข้อมูลในเครื่อง, FSRS และ Zustand persistence
- `src/store/syncQueue.ts` — คิวส่งข้อมูลขึ้นเซิร์ฟเวอร์ (ออฟไลน์ได้)
- `src/store/syncEngine.ts` — ดึงข้อมูลที่เปลี่ยนจากเซิร์ฟเวอร์แล้วรวมเข้าเครื่อง
- `src/store/pocketbaseStore.ts` — แปลงข้อมูลกับ PocketBase
- `src/store/communityStore.ts` — ชุดการ์ดสาธารณะ, ดาว, รายงาน
- `deploy/pocketbase/` — migrations, hooks และเวอร์ชันเซิร์ฟเวอร์
```

และแก้บรรทัดแรกของ README จาก "เลือกซิงก์ข้อมูลผ่าน Supabase ได้" เป็น "ซิงก์ข้ามเครื่องผ่านเซิร์ฟเวอร์ PocketBase ของตัวเอง"

- [ ] **Step 7: ตรวจทั้งหมด**

Run: `npm run build` แล้ว `npm run lint` แล้ว `npm test` แล้ว `npm run test:integration`
Expected: ผ่านทั้งหมด ไม่มี error

- [ ] **Step 8: ทดสอบจริงในเบราว์เซอร์**

1. รัน PocketBase บนเครื่องตาม README (พอร์ต 8090) และตั้ง `.env` เป็น `VITE_POCKETBASE_URL=http://127.0.0.1:8090`
2. เปิด dev server (`preview_start` ชื่อ `memokard-dev`)
3. สมัครบัญชี `tester1` → สร้างชุด → เพิ่มการ์ดที่มีรูป → ทบทวน 3 ใบ → รีเฟรช: ข้อมูลต้องอยู่ครบ และเห็นใน `http://127.0.0.1:8090/_/` ตาราง `decks`, `cards`, `review_logs`
4. ตั้ง DevTools เป็น offline (หรือ `javascript_tool`: หยุด PocketBase ชั่วคราว) → แก้การ์ดและทบทวน → ป้ายต้องแสดงงานค้าง → เปิดเซิร์ฟเวอร์กลับ → ป้ายต้องเป็น "ซิงก์แล้ว" และข้อมูลบนเซิร์ฟเวอร์ตรง
5. เปิดแท็บ private ล็อกอิน `tester1` → ต้องเห็นชุด การ์ด รูป และ heatmap เท่ากัน; ลบการ์ดในแท็บนี้ แล้วกลับแท็บแรกกดซิงก์ → การ์ดต้องหาย
6. แชร์ชุดจาก `tester1` → สมัคร `tester2` ในแท็บ private → Explore ค้นเจอ → ติดตาม → ให้ดาว → รายงาน
7. ตั้ง `tester1` เป็น admin ในหน้า `/_/` → รีเฟรช → ปุ่มแอดมินมีตัวเลขรายงาน → ซ่อน/คืน/ยกเลิกรายงาน → รีเซ็ตรหัส `tester2` แล้วล็อกอินด้วยรหัสใหม่ได้
8. ใช้โหมดทดลองสร้างชุดหนึ่งชุด → สมัคร `tester3` → ต้องมีกล่องถาม "นำข้อมูลในเครื่องขึ้นบัญชีไหม?" → กดนำขึ้น → เห็นใน `/_/`

บันทึกผลแต่ละข้อ ถ้าข้อไหนไม่ผ่านให้ใช้ superpowers:systematic-debugging ก่อนแก้

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "chore: remove Supabase and document the PocketBase setup"
```
