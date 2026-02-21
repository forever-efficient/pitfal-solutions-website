import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['**/*.test.{ts,tsx}'],
    exclude: ['node_modules', '.next', 'tests/e2e'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: [
        'src/components/**/*.{ts,tsx}',
        'src/lib/**/*.{ts,tsx}',
        'lambda/**/*.{ts,tsx}',
      ],
      exclude: [
        'node_modules/',
        'lambda/**/node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.{js,ts}',
        '**/types/',
        '**/index.ts', // Re-export files
        '**/*.test.{ts,tsx}',
      ],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 90,
        statements: 90,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Lambda deps live in lambda/*/node_modules, not root.
      // Aliases ensure vi.mock() and source files resolve the same physical copy.
      '@aws-sdk/client-ses': path.resolve(__dirname, 'lambda/shared/node_modules/@aws-sdk/client-ses'),
      '@aws-sdk/client-dynamodb': path.resolve(__dirname, 'lambda/shared/node_modules/@aws-sdk/client-dynamodb'),
      '@aws-sdk/lib-dynamodb': path.resolve(__dirname, 'lambda/shared/node_modules/@aws-sdk/lib-dynamodb'),
      '@aws-sdk/client-s3': path.resolve(__dirname, 'lambda/shared/node_modules/@aws-sdk/client-s3'),
      '@aws-sdk/s3-request-presigner': path.resolve(__dirname, 'lambda/shared/node_modules/@aws-sdk/s3-request-presigner'),
      'bcryptjs': path.resolve(__dirname, 'lambda/client-auth/node_modules/bcryptjs'),
    },
  },
});
