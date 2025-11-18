# Code Structure
- `extensions/ai-assistant/src/*.tsx` – Raycast command entrypoints (dictation, prompts, settings, models, dictionary, history, performance, dependency installer).
- `extensions/ai-assistant/src/utils/` – shared utilities for audio handling, OpenAI integration, dependency management, local model downloads, storage, and AppleScript helpers.
- `metadata/` and `assets/` – Raycast metadata/images for commands.
- `ARCHITECTURE.md`, `DESIGN.md`, `PLAN.md` – internal planning and documentation.
- Root README/PRD provide product overview and requirements.