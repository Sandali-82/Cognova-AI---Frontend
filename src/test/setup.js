import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// Unmount rendered components after every test
afterEach(() => {
  cleanup()
})

// Recharts' ResponsiveContainer needs ResizeObserver, which jsdom does not provide
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
}