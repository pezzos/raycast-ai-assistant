# Raycast AI Assistant Overview
- Raycast extension providing voice dictation and AI-powered text generation from the Raycast launcher.
- Built primarily with TypeScript/React using the Raycast API and Node 20 runtime.
- Integrates with OpenAI for transcription (Whisper) and text generation, plus optional local Whisper/Parakeet models.
- Includes commands for dictating text/prompts, managing settings, personal dictionary, local models, history, and dependency installation.
- Audio capture implemented via the external `sox` CLI and FFmpeg/FFprobe for processing.