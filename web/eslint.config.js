import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import ts from 'typescript-eslint';

export default ts.config(
	{ ignores: ['.svelte-kit/', 'build/', 'coverage/', 'src/lib/api-types.d.ts'] },
	js.configs.recommended,
	...ts.configs.strictTypeChecked,
	...ts.configs.stylisticTypeChecked,
	...svelte.configs.recommended,
	prettier,
	...svelte.configs.prettier,
	{
		languageOptions: {
			globals: { ...globals.browser, ...globals.node },
			parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname, extraFileExtensions: ['.svelte'] }
		}
	},
	{
		files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
		languageOptions: { parserOptions: { parser: ts.parser } }
	},
	{
		rules: {
			// web/CLAUDE.md: shared code is imported as #lib/... and every import names its file (SvelteKit 3, TS bundler).
			'no-restricted-imports': [
				'error',
				{
					patterns: [
						{
							regex: '^(\\.{1,2}/|#lib/)(?!.*\\.(ts|svelte|js|css|json)$)',
							message: 'Name the file with its extension: #lib/formatting/money.ts, ./client.ts.'
						},
						{ regex: '^\\$lib(/|$)', message: '$lib is gone in SvelteKit 3: import #lib/... instead.' }
					]
				}
			],
			// No code from strings, in .ts and in a component's <script> alike (semgrep does not parse .svelte).
			'no-eval': 'error',
			'no-new-func': 'error',
			'@typescript-eslint/no-implied-eval': 'error',
			'@typescript-eslint/no-unused-vars': [
				'error',
				{ argsIgnorePattern: '^_', varsIgnorePattern: '^_', destructuredArrayIgnorePattern: '^_' }
			]
		}
	},
	{
		// shadcn-svelte's components are kept as its registry writes them, so an update replaces them cleanly. Their
		// Button takes any href a caller passes; callers resolve() theirs.
		files: ['src/lib/components/ui/**'],
		rules: {
			'@typescript-eslint/no-useless-default-assignment': 'off',
			'svelte/no-navigation-without-resolve': 'off'
		}
	},
	{
		// The service worker is typed against the WebWorker libs, in its own project.
		files: ['src/service-worker.ts'],
		languageOptions: { parserOptions: { projectService: false, project: './tsconfig.sw.json' } }
	},
	{ files: ['**/*.js'], ...ts.configs.disableTypeChecked }
);
