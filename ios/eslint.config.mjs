import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import ts from 'typescript-eslint';

export default ts.config(
  { ignores: ['node_modules/', 'build/', 'ReactNativeSPM/', 'MyPaisa.xcodeproj/', 'Packages/', 'MyPaisaCore/'] },
  js.configs.recommended,
  ...ts.configs.strict,
  ...ts.configs.stylistic,
  { plugins: { 'react-hooks': reactHooks }, rules: reactHooks.configs.recommended.rules },
  // The one lazy require, so Metro can drop the Debug-only journey from every bundled build.
  { files: ['src/App.tsx'], rules: { '@typescript-eslint/no-require-imports': 'off' } },
  {
    files: ['*.js', '*.mjs'],
    languageOptions: { globals: globals.node },
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  prettier,
);
