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
const versionFile = join(outDir, 'VERSION');

if (existsSync(binary) && existsSync(versionFile) && readFileSync(versionFile, 'utf8').trim() === version) {
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
// Windows: ใช้ tar.exe ของระบบ (bsdtar แตก zip ได้) ไม่ใช่ GNU tar ของ Git Bash
else if (os === 'windows') execFileSync(join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe'), ['-xf', zipPath, '-C', outDir]);
else execFileSync('tar', ['-xf', zipPath, '-C', outDir]);
writeFileSync(versionFile, version);
console.log(`PocketBase ${version} ready at ${binary}`);
