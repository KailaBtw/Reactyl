import { defineConfig } from 'vitest/config';

export default defineConfig({
	// Use happy-dom so Three.js and DOM APIs are available in tests
	test: {
		environment: 'happy-dom',
		setupFiles: ['tests/setup.ts'],
		coverage: {
			provider: 'v8'
		},
		include: ['tests/**/*.{test,spec}.ts']
	}
});


