import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  outDir: 'dist/out',
  target: 'node18',
  splitting: false,
  sourcemap: false,
  clean: true,
});
