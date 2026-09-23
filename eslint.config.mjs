import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier/flat';
import nodePlugin from 'eslint-plugin-n';
import { defineConfig, globalIgnores } from 'eslint/config';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  {
    plugins: {
      n: nodePlugin,
    },
    rules: {
      'prefer-arrow-callback': ['error'],
      'prefer-template': ['error'],
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'n/no-process-env': ['error'],
      'consistent-return': 'off',
      'func-names': 'off',
      'object-shorthand': 'off',
      'no-param-reassign': 'off',
      'no-underscore-dangle': 'off',
      'prefer-destructuring': ['warn', { object: true, array: true }],
      'no-use-before-define': [
        'error',
        {
          functions: false,
          classes: true,
          variables: true,
          allowNamedExports: false,
        },
      ],
      'no-use-before-define': [
        'error',
        {
          functions: false,
          classes: true,
          variables: true,
          allowNamedExports: false,
        },
      ],
      'no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_*|^(req|res|next|val)',
          args: 'after-used',
          argsIgnorePattern: '^_*|^(req|res|next|val)',
        },
      ],
      'prefer-arrow-callback': ['error'],
      'prefer-template': ['error'],
    },
  },
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),
]);

export default eslintConfig;
