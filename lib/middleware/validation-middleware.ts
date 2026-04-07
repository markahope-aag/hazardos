// Stub: validation-middleware is tested via mocks in test/lib/middleware/validation-middleware.test.ts
// This file exists only to satisfy Vite import resolution.
type Handler = (...args: unknown[]) => unknown
export const validateRequest = () => (handler: Handler) => handler
export const validateBody = () => (handler: Handler) => handler
export const validateQuery = () => (handler: Handler) => handler
export const validateParams = () => (handler: Handler) => handler
