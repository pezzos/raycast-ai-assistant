# Task Completion Checklist
- Ensure TypeScript source under `extensions/ai-assistant/src` compiles by running `npm run build`.
- Run lint checks (`npm run lint`) to confirm style compliance.
- Manually test relevant Raycast command via `ray develop` inside the Raycast app.
- Update documentation (README/CHANGELOG) when behaviour changes.
- If dependencies or system commands (sox/ffmpeg) are affected, validate auto-install flow in `Install Dependencies` command.