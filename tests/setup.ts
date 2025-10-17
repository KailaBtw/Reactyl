import { vi } from 'vitest';

// Mock global fetch to avoid network errors in tests
if (!(globalThis as any).fetch) {
	(globalThis as any).fetch = vi.fn(async () => ({
		ok: true,
		status: 200,
		json: async () => ({}),
		text: async () => ''
	})) as any;
}

// Filter noisy logs during tests but keep other logs
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

console.log = (...args: any[]) => {
  if (args.length > 0 && typeof args[0] === 'string' && args[0].startsWith('[DEBUG]:')) {
    return; // suppress debug logs
  }
  originalConsoleLog(...args);
};

console.error = (...args: any[]) => {
  if (args.length > 0 && typeof args[0] === 'string' && 
      (args[0].includes('THREE.Object3D.add: object not an instance of THREE.Object3D') ||
       args[0].includes('ETIMEDOUT') ||
       args[0].includes('ENETUNREACH') ||
       args[0].includes('AggregateError'))) {
    return; // suppress expected errors from error handling tests
  }
  originalConsoleError(...args);
};


