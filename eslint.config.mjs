import nextPlugin from "@next/eslint-plugin-next";
import reactPlugin from "eslint-plugin-react";
import hooksPlugin from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

// In-repo ESLint plugin that guards against adding an app/api route that
// forgets to wrap its handler in some form of auth or rate-limit check.
// The common path is `createApiHandler` from lib/utils/api-handler, but a
// handful of routes legitimately use other mechanisms (webhook signature
// verification, CRON_SECRET compare, public-API key auth, OAuth state
// round-trip). The rule is therefore file-level: any route.ts under
// app/api/ must contain at least one of the sanctioned markers below. If
// you're adding a new route that genuinely needs none of these — say an
// intentionally public endpoint — add an explicit
// `// hazardos/allow-unauthenticated: <reason>` comment in the file.
const SANCTIONED_AUTH_MARKERS = [
  "createApiHandler", // covers createApiHandler + createApiHandlerWithParams
  "createPublicApiHandler", // sanctioned wrapper for token-auth'd public endpoints
  "withApiKeyAuth", // public /api/v1 endpoints
  "withCronLogging", // cron wrapper that delegates to applyUnifiedRateLimit
  "applyUnifiedRateLimit", // raw rate-limit guard — always paired with auth below
  "webhooks.constructEvent", // Stripe webhook signature
  "validateRequest", // twilio signature
  "timingSafeEqual", // CRON_SECRET compare
  "handlePreflight", // CORS preflight on v1
  "apiKey", // defensive: any explicit reference means the route is doing key work
  "allow-unauthenticated", // escape-hatch annotation
];

const requireRouteAuthWrapper = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Route files under app/api must include at least one sanctioned auth/rate-limit marker",
    },
    schema: [],
    messages: {
      missingAuthMarker:
        "app/api route file does not appear to wrap its handler in any auth or rate-limit construct. Use createApiHandler (from lib/utils/api-handler) or, if this endpoint legitimately needs no guard, add a '// hazardos/allow-unauthenticated: <reason>' comment.",
    },
  },
  create(context) {
    return {
      Program(node) {
        const source = context.sourceCode.getText();
        const hasMarker = SANCTIONED_AUTH_MARKERS.some((m) => source.includes(m));
        if (!hasMarker) {
          context.report({ node, messageId: "missingAuthMarker" });
        }
      },
    };
  },
};

export default tseslint.config(
  {
    ignores: [".next/**", "node_modules/**", "public/**", "scripts/**", "coverage/**"],
  },
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    plugins: {
      "@next/next": nextPlugin,
      react: reactPlugin,
      "react-hooks": hooksPlugin,
    },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",
      // Prevent console statements in production code
      "no-console": ["error", { allow: ["warn", "error"] }],
    },
    settings: {
      react: {
        version: "detect",
      },
    },
  },
  // Relaxed rules for test files and scripts
  {
    files: ["test/**/*.{ts,tsx}", "**/*.test.{ts,tsx}", "**/*.spec.{ts,tsx}", "scripts/**/*.{js,ts}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": ["warn", {
        argsIgnorePattern: "^_|^req$|^res$|^next$|^body$|^query$|^args$|^value$|^field$|^error$",
        varsIgnorePattern: "^_|^vi$|^render$|^screen$|^waitFor$|^act$|^fireEvent$|^userEvent$|^container$|^rerender$|^beforeEach$|^afterEach$|^beforeAll$|^afterAll$"
      }],
      // Allow console in tests and scripts
      "no-console": "off",
    },
  },
  // Route-handler guardrail — every route.ts under app/api must contain a
  // sanctioned auth/rate-limit marker (see SANCTIONED_AUTH_MARKERS above)
  // or opt out via the escape-hatch comment.
  {
    files: ["app/api/**/route.ts"],
    plugins: {
      hazardos: { rules: { "require-route-auth-wrapper": requireRouteAuthWrapper } },
    },
    rules: {
      "hazardos/require-route-auth-wrapper": "error",
    },
  }
);
