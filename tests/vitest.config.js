import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { transformWithOxc } from 'vite'
import { defineConfig } from 'vitest/config'

const here = path.dirname(fileURLToPath(import.meta.url))
const repo = path.resolve(here, '..')

export default defineConfig({
  plugins: [
    {
      // The app writes JSX in .js files, as Next allows; Vite only expects it in .jsx/.tsx.
      name: 'jsx-in-js',
      enforce: 'pre',
      async transform(code, id) {
        if (!/\/(app|tests)\/.*\.js$/.test(id) || id.includes('node_modules')) return null
        return transformWithOxc(code, id, { lang: 'jsx', jsx: { runtime: 'automatic' } })
      },
    },
  ],
  // The app's Tailwind PostCSS plugin is not needed (or loadable) here.
  css: { postcss: { plugins: [] } },
  resolve: { alias: [{ find: /^@\//, replacement: `${repo}/` }] },
  test: {
    root: repo,
    include: ['tests/**/*.test.js'],
    environment: 'jsdom',
    setupFiles: ['tests/setup/setup.js'],
    coverage: {
      provider: 'v8',
      reportsDirectory: path.join(here, 'coverage'),
      include: ['app/**/*.{js,jsx}'],
      thresholds: { statements: 90, branches: 85, functions: 90, lines: 90 },
    },
  },
})
