import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    setupFiles: ['fake-indexeddb/auto'],
    // ผู้ใช้หลักอยู่ไทย (UTC+7) — บั๊กวันที่แบบ UTC จะโผล่ในเทสต์ด้วย
    env: { TZ: 'Asia/Bangkok' },
  },
});
