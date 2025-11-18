# Code Style & Conventions
- Source lives under `extensions/ai-assistant/src` with both `.ts(x)` and transpiled `.js` files; TypeScript is preferred.
- Uses Prettier (`.prettierrc`) and ESLint via `@raycast/eslint-config`; follow Raycast extension guidelines.
- Module structure favors small utility files (`utils/`) and Raycast command entrypoints exporting default functions.
- Async operations rely on Promises/async-await; audio/OS integration wrapped in helper utilities.