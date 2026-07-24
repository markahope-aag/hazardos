// Ambient types for the ~10 test files that rely on vitest globals
// (describe/it/expect/vi) without importing them, plus the jest-dom matcher
// augmentations (toBeInTheDocument, etc.). Referenced by tsconfig.test.json.
// Triple-slash references add these globals without narrowing `types`, so the
// rest of the ambient @types (node, react) stay in scope.
/// <reference types="vitest/globals" />
/// <reference types="@testing-library/jest-dom" />
