import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [
		tailwindcss(),
		// SvelteKit 3 takes its configuration here. The web app is a single-page app on S3 and CloudFront
		// (ARCHITECTURE §8.4, MA-73): adapter-static with an index.html fallback, every page rendered in the browser.
		// The CSP is SvelteKit's, with the hashes of its own inline scripts; the api host joins connect-src with MA-266.
		sveltekit({
			adapter: adapter({ fallback: 'index.html', strict: true }),
			serviceWorker: { register: true },
			csp: {
				mode: 'hash',
				directives: {
					'default-src': ['self'],
					'script-src': ['self'],
					'style-src': ['self', 'unsafe-inline', 'https://fonts.googleapis.com'],
					'font-src': ['self', 'https://fonts.gstatic.com'],
					'img-src': ['self', 'data:', 'blob:'],
					'connect-src': ['self'],
					'manifest-src': ['self'],
					'worker-src': ['self'],
					'base-uri': ['self'],
					'form-action': ['self'],
					'object-src': ['none']
				}
			}
		})
	],
	server: {
		// Development only: /v1 goes to the local backend (`uv run --directory backend uvicorn ... --port 8000`). In dev
		// and prod the app calls the environment's api host, set with MA-266 (ARCHITECTURE §17.2).
		proxy: { '/v1': 'http://127.0.0.1:8000' },
		// Test and build output never reloads the page.
		watch: { ignored: ['**/coverage/**', '**/build/**'] }
	},
	test: {
		include: ['src/**/*.test.ts'],
		environment: 'node',
		coverage: {
			provider: 'v8',
			include: ['src/lib/**/*.ts'],
			exclude: ['src/lib/**/*.test.ts', 'src/lib/api-types.d.ts', 'src/lib/components/ui/**'],
			thresholds: { lines: 90, branches: 90, functions: 90, statements: 90 }
		}
	}
});
