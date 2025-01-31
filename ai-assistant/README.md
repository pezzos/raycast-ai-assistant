# AI Assistant for Raycast

A collection of AI-powered tools to enhance your productivity.

## About the Author
[Alexandre Pezzotta](https://github.com/pezzos) - Software Engineer passionate about AI and automation. Feel free to check out my other projects on GitHub!

## Features

🌐 Smart Translation
- **Features:**
  - Automatic language detection between primary and secondary languages
  - Preserves formatting, punctuation, and technical terms
  - Optional grammar and spelling correction
  - Caches translations for faster repeated use
  - Supports all major languages
- **Usage:**
  1. Select text in any application
  2. Trigger the command through Raycast
  3. Text will be automatically translated and replaced

🎙️ Voice Dictation
- **Features:**
  - Speech-to-text conversion with high accuracy
  - Support for both online (OpenAI) and local Whisper models
  - Automatic language detection
  - Optional translation to target language
  - Text improvement and cleanup
- **Usage:**
  1. Trigger the command through Raycast
  2. Speak your text (recording stops after 2s of silence)
  3. Wait for processing
  4. Transcribed (and optionally translated) text will be pasted

📝 Text Improvement
- **Features:**
  - Grammar and spelling correction
  - Style enhancement
  - Tone adjustment (professional, concise, friendly)
  - Format conversion (bullets, etc.)
- **Usage:**
  1. Select text in any application
  2. Choose the improvement type
  3. Get enhanced text automatically

📄 Page Summarizer
- **Features:**
  - Extracts main content from web pages
  - Generates concise summaries
  - Highlights key points
  - Optional "Explore More" suggestions
  - Multi-language support
- **Usage:**
  1. Copy a URL or select text
  2. Trigger the command
  3. View the summary in Raycast

⚙️ Settings & Configuration
- **Features:**
  - Language preferences (primary/secondary)
  - AI model selection
  - Speech recognition mode (online/local)
  - Whisper model management
  - Feature toggles
- **Usage:**
  Access through Raycast preferences

## Prerequisites

- Node.js 16 or later
- OpenAI API key
- Sox (for voice recording)
  ```bash
  # Install on macOS
  brew install sox
  ```

## Installation

1. Clone this repository
2. Install dependencies: `npm install`
3. Configure your OpenAI API key in Raycast preferences
4. Select your primary and secondary languages

## Tips
- Use keyboard shortcuts in Raycast for quick access
- Combine commands for maximum productivity
- Configure language settings in Raycast preferences
- Check the logs for troubleshooting
- Use local Whisper models for offline speech recognition
- Cache frequently used translations for better performance

## Contributing
Feel free to submit issues and enhancement requests!

## TODO
- [ ] Add support for more AI models (Claude, Gemini, etc.)
- [ ] Allow the use of a single gpt-4o-mini-audio-preview call instead of one whisper + one gpt-4o-mini call.
- [ ] Add support for more languages
- [ ] Add custom prompt templates
- [ ] Improve error handling and recovery
- [ ] Add unit tests and integration tests
- [ ] Improve caching mechanism
