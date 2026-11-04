import { defineConfig, globalIgnores } from 'eslint/config';
import nextPlugin from '@next/eslint-plugin-next';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import path from 'node:path';

const layers = ['domain', 'application', 'infrastructure', 'presentation'];
const features = ['pose', 'experience', 'game'];
const boundaries = {
  meta: { type: 'problem', schema: [], messages: { boundary: '{{reason}}' } },
  create(context) {
    const filename = context.filename.replaceAll('\\', '/');
    return {
      ImportDeclaration(node) {
        const specifier = node.source.value;
        if (typeof specifier !== 'string') return;
        const target = specifier.startsWith('.')
          ? path
              .resolve(path.dirname(context.filename), specifier)
              .replaceAll('\\', '/')
          : specifier.startsWith('@/')
            ? '/apps/web/' + specifier.slice(2)
            : specifier;
        const from = filename.match(
          /\/features\/(pose|experience|game)\/(domain|application|infrastructure|presentation)\//,
        );
        const to = target.match(
          /\/features\/(pose|experience|game)(?:\/(domain|application|infrastructure|presentation))?/,
        );
        let reason;
        if (
          filename.includes('/packages/contracts/') &&
          !specifier.startsWith('.') &&
          specifier !== 'zod'
        ) {
          reason = 'Contracts may depend only on Zod and their own files.';
        }
        if (from) {
          const layer = from[2];
          if (to && to[1] !== from[1] && !target.endsWith('/' + to[1]))
            reason = 'Cross-feature imports must use a public entrypoint.';
          if (to && layer === 'domain' && to[2] !== 'domain')
            reason = 'Domain cannot import outer layers.';
          if (
            to &&
            layer === 'application' &&
            ['infrastructure', 'presentation'].includes(to[2])
          )
            reason =
              'Application cannot import concrete adapters or presentation.';
          if (to && layer === 'presentation' && to[2] === 'infrastructure')
            reason = 'Presentation receives adapters through composition.';
          if (to && layer === 'infrastructure' && to[2] === 'presentation')
            reason = 'Infrastructure cannot import UI.';
          if (
            ['domain', 'application'].includes(layer) &&
            (/^(react|next|zustand|@mediapipe)(\/|$)/.test(specifier) ||
              target.includes('/shared/') ||
              (to && to[1] !== from[1]))
          )
            reason =
              'Inner layers use local contracts and pure dependencies only.';
        }
        if (reason)
          context.report({ node, messageId: 'boundary', data: { reason } });
      },
    };
  },
};
// Keep ownership boundaries executable instead of relying on folder names.
export default defineConfig([
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    plugins: { '@next/next': nextPlugin, 'react-hooks': reactHooks },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
      ...reactHooks.configs.flat.recommended.rules,
    },
  },
  {
    files: ['**/*.mjs'],
    languageOptions: { globals: { process: 'readonly' } },
  },
  {
    settings: {
      next: { rootDir: path.join(import.meta.dirname, 'apps/web/') },
    },
  },
  {
    files: [
      'apps/web/features/**/*.{ts,tsx}',
      'packages/contracts/src/**/*.ts',
    ],
    ignores: ['**/*.test.ts', '**/*.test.tsx'],
    plugins: { architecture: { rules: { boundaries } } },
    rules: { 'architecture/boundaries': 'error' },
  },
  ...features.flatMap((feature) =>
    layers
      .filter((layer) => ['domain', 'application'].includes(layer))
      .map((layer) => ({
        files: [`apps/web/features/${feature}/${layer}/**/*.ts`],
        rules: {
          'no-restricted-globals': [
            'error',
            'window',
            'document',
            'navigator',
            'fetch',
            'requestAnimationFrame',
            'AudioContext',
            'HTMLCanvasElement',
          ],
        },
      })),
  ),
  globalIgnores([
    '**/.next/**',
    '**/next-env.d.ts',
    '**/coverage/**',
    '.npm-cache/**',
  ]),
]);
