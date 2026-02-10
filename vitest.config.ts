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
      reporter: ['text', 'json', 'html'],
      include: [
        'src/components/**/*.{ts,tsx}',
        'src/lib/**/*.{ts,tsx}',
      ],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.{js,ts}',
        '**/types/',
        '**/index.ts', // Re-export files
        '**/*.test.{ts,tsx}',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
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
    },
  },
});
