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
