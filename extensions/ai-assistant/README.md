# AI Assistant for Raycast

**Apple Intelligence, but for ALL Macs!**

Imagine a personal assistant integrated directly into your Mac, capable of writing, rephrasing, correcting, summarizing and translating your texts in a flash. Have an idea? Dictate it, and it transforms it into clear and precise notes. Want it to write for you, ask it, and it delivers or updates a text for you.

All of this, without waiting for Apple Intelligence to be ready and without needing a latest-generation Mac! Enjoy a smooth, fast, and intuitive AI, accessible to everyone, directly from your keyboard.

🔥 A shortcut, a command, and the AI does the rest. You'll never have to copy-paste into Google Translate or ChatGPT again!

## Installation

1. Install the extension from the Raycast Store
2. Configure your OpenAI API key in Raycast preferences (you can create one [here](https://platform.openai.com/settings/organization/api-keys))
3. Select your primary and secondary languages

## Configuration

### Required Permissions
- Accessibility permissions for text selection and replacement
- Microphone access for voice recording
- AppleScript permissions for browser integration 

### Settings
1. Open Raycast Settings
2. Navigate to Extensions > AI Assistant
3. Configure:
   - OpenAI API Key
   - Primary/Secondary languages
   - AI model preferences
   - Speech recognition mode
   - Optional features

## Features

See the features in action in the [Demo Video](https://youtu.be/TfOwWesfGqw).

🎙️ Voice Dictation
Tired of typing? Need to capture an idea on the fly? Speak, and your assistant transforms your voice into accurate and fluid text.
With ultra-high-performance voice recognition, you can dictate your notes, emails, or messages with ease. The AI automatically can automatically translate your text, and even improve it for better readability.
- **Features:**
  - Speech-to-text conversion with high accuracy
  - Support for both online (OpenAI) and local Whisper models
  - Automatic language detection
  - Optional translation to target language
  - Text improvement and cleanup (removing filler words, correcting grammar)
  - Automatic system audio muting during dictation
  - Active application detection for better context
  - Transcription history with metadata
  - Personal dictionary integration
- **Usage:**
  1. Trigger the command "**Dictate Text**" through Raycast
  2. Speak your text (recording stops after 2s of silence)
  3. Wait for processing
  4. Transcribed (and optionally translated) text will be pasted

🤖 Dictate Prompt Everywhere
Your workflow, your rules! Dictate your prompts to guide the AI according to your needs: brainstorming, writing emails, optimizing code… One shortcut, and your assistant will know exactly what to do. No need to write anymore, let your assistant do the work!
- **Features:**
  - Dictate a prompt to generate or improve content. E.g.:
    - Dictate "Generate a 100-word essay on the benefits of AI"
    - Respond to John's email with a friendly tone, explain him I can't make it to the meeting because I'm working on an AI assistant for Raycast
    - Improve this email to sound more professional but still friendly
    - ...
  - Supports multiple languages
- **Usage:**
  1. Select editable text in any application or place the cursor where you want the result to be inserted
  2. Trigger the command "**Dictate AI Prompt**" through Raycast, then dictate your prompt
  3. Wait for processing
  4. Result will be inserted into the selected text

⚙️ Settings & Configuration
- **Features:**
  - Language preferences (primary/secondary)
  - AI model selection
  - Speech recognition mode (online/local)
  - Whisper model management
  - Personal dictionary management
  - Audio settings (muting during dictation)
  - Feature toggles
- **Usage:**
  - Trigger the command "**Settings**" through Raycast for main settings
  - Trigger the command "**Manage Whisper Models**" through Raycast for local Whisper model management
  - Trigger the command "**Add Word to Dictionary**" through Raycast to add custom word replacements
  - Trigger the command "**Manage Personal Dictionary**" through Raycast to manage your personal dictionary

📖 Personal Dictionary
Customize your dictation experience by adding your own words, names, and phrases to your personal dictionary. Perfect for technical terms, proper nouns, or frequently used expressions that need specific formatting or spelling.
- **Features:**
  - Add custom word replacements
  - Support for technical terms and proper nouns
  - Automatic correction during dictation
  - Case-sensitive replacements
  - Export/Import dictionary
- **Usage:**
  1. Trigger the command "**Add Word to Dictionary**" through Raycast
  2. Enter the word to replace and its replacement
  3. Your personal dictionary will be automatically applied during dictation

📜 Transcription History
Keep track of all your dictations and manage your transcription history efficiently.
- **Features:**
  - View complete transcription history
  - Search through past transcriptions
  - Retranscribe original audio recordings if needed
  - Copy previous transcriptions
  - Automatic cleanup of old recordings
- **Usage:**
  1. Trigger the command "**View Dictation History**" through Raycast
  2. Browse or search through your transcription history
  3. Select an entry to view or use filters to find specific transcriptions
  5. Press Enter to add it to the clipboard and paste it to the active application or use the CMD+K shortcut to use it differently

## Prerequisites

- macOS 12 or later
- Node.js 16 or later
- OpenAI API key

### System Dependencies (Auto-installed)

The extension will automatically install required system dependencies:
- **Sox** (for voice recording)
- **FFmpeg** (for audio processing)
- **FFprobe** (for audio analysis)
- **uv** (for Parakeet models on Apple Silicon)

**No manual installation required!** The extension includes:
- Automatic dependency checking in Settings
- One-click installation of missing dependencies
- Dedicated "Install Dependencies" command for easy management

If you prefer manual installation:
```bash
# Install via Homebrew
brew install sox ffmpeg
curl -LsSf https://astral.sh/uv/install.sh | sh  # For uv
```



#### Detailed Settings Description

##### Language Settings
- **Primary Language**: Your main language for translations and AI interactions
- **Secondary Language**: Your alternate language for translations
- **Default Output Language**: Language used as output after speech recognition if you want an automatic translation (can be set to "Keep the same language as the input")

##### Speech Recognition Settings
- **Whisper Mode**: Choose between online (OpenAI API) or local processing
- **Experimental Single Call Mode**: (Online mode only) Send audio directly to GPT-4o-mini-audio-preview for faster processing instead of using Whisper then the selected model to reduce latency
- **Local Whisper Model**: (Local mode only) Select the local Whisper model to use (Tiny, Base, Small, Medium) to have faster processing (require more disk space and need to be set up manually)

##### AI Model Settings
- **AI Model**: Select the AI model for all operations:
  - GPT-4o: Most capable model
  - GPT-4o Mini: Fastest/Recommended
  - o1: Most powerful reasoning model
  - o1-mini: Smaller reasoning model

##### Recording Settings
- **Silence Timeout**: Number of seconds of silence before stopping recording
- **Mute During Dictation**: Automatically mute system audio output while recording (e.g.: music, notification sounds)

##### Feature Settings
- **Improve Text Quality**: Automatically fix grammar and spelling during translations and text generation
- **Show 'Explore More' in Summaries**: Include additional resources and related topics in page summaries
- **Personal Dictionary**: Apply personal dictionary corrections during speech recognition

## Usage Tips
- Use keyboard shortcuts in Raycast for quick access to the dictation
- Combine commands for maximum productivity
- Configure language settings in Raycast preferences

## Support

If you encounter any issues or have questions:
1. Open an issue on [GitHub](https://github.com/pezzos/raycast-ai-assistant)
2. Contact me on [LinkedIn](https://www.linkedin.com/in/alexandrepezzotta/)

## Privacy

This extension:
- Does not store your OpenAI API key or any sensitive data (it's sent directly to OpenAI and stored locally)
- Temporarily stores voice recordings (deleted after 1 hour with the next dictation)
- Only sends necessary data to OpenAI API
- Processes text fully locally when possible (if you use locally installed Whisper models and don't translate or improve the text)
- Does not track usage or collect analytics
- Is open-source and transparent, if you have any doubts about privacy, the code is available on GitHub

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Credits

- OpenAI for their amazing APIs
- Raycast team for the excellent extension platform and Raycast I use every day
- [Whisper.cpp](https://github.com/ggerganov/whisper.cpp) for local speech recognition
- All the [contributors](https://github.com/pezzos/raycast-ai-assistant/graphs/contributors)

## About the Author
[Alexandre Pezzotta](https://github.com/pezzos) - Engineer passionate about AI and automation. Feel free to check out my other projects on GitHub!