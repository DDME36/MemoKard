import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/integration/**/*.test.ts'],
    environment: 'node',
    setupFiles: ['fake-indexeddb/auto'],
    // ผู้ใช้หลักอยู่ไทย (UTC+7) — บั๊กวันที่แบบ UTC จะโผล่ในเทสต์ด้วย
    env: { TZ: 'Asia/Bangkok' },
    testTimeout: 30000,
    hookTimeout: 60000,
    fileParallelism: false,
  },
});
