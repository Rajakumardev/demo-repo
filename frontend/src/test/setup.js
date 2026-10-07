import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Unmount anything rendered by a test so the next one starts from a clean DOM.
afterEach(() => {
  cleanup();
});
