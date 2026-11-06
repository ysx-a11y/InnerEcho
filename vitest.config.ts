import { defineConfig } from 'vitest/config';
import { QuietReporter } from './scripts/vitest-quiet-reporter.mjs';

/**
 * Vitest configuration — covers both src/ (frontend) and server/ (backend) tests.
 * Tests are colocated alongside source files as `*.test.ts` / `*.test.tsx`.
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./test/vitest.setup.ts'],
    // 非 TTY（管道/CI/自动化）只输出失败与汇总，交互终端保持默认进度。
    reporters: [new QuietReporter()],
    // happy-dom + 原生 SQLite 在 Windows 高并发 worker 下会争抢资源并触发随机超时。
    // 两个 worker 保留文件并行能力，同时让默认 npm test 可重复稳定运行。
    maxWorkers: 2,
    env: {
      NODE_ENV: 'test',
      JWT_SECRET: 'test-only-jwt-secret-at-least-32-characters',
      ADMIN_TOKEN: 'test-only-admin-token',
      DATABASE_FILE: ':memory:',
    },
    include: [
      'server/**/*.test.ts',
      'src/**/*.test.ts',
      'src/**/*.test.tsx',
    ],
    coverage: {
      reporter: ['text', 'html'],
      include: ['server/**/*.ts', 'src/**/*.ts', 'src/**/*.tsx'],
      exclude: ['**/*.test.*', '**/*.d.ts', 'server/data/**'],
    },
  },
});
