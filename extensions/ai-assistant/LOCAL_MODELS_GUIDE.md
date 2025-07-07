# Local Speech Recognition Models Guide

This guide covers the installation and use of local speech recognition models in the AI Assistant extension, supporting both Whisper and Parakeet engines.

## Overview

The AI Assistant now supports two local speech recognition engines:

- **🤖 Whisper**: Universal compatibility, multiple model sizes
- **🦜 Parakeet**: Apple Silicon optimized, ultra-fast transcription (60x faster than Whisper)

## System Requirements

### Whisper
- Any Mac (Intel or Apple Silicon)
- Homebrew installed
- ~2GB free disk space (varies by model)

### Parakeet  
- **Apple Silicon Mac required** (M1, M2, M3, M4 series)
- 2GB+ unified memory minimum
- Python 3.9+ with `uv` package manager
- ~1GB free disk space

## Installation Instructions

### 1. Install Whisper

1. Open the **"Manage Local Models"** command in Raycast
2. Click **"Install Whisper"** if not already installed
3. Wait for compilation to complete (5-10 minutes)
4. Download your preferred model:
   - **Tiny**: Fast, decent accuracy (~75MB)
   - **Base**: Balanced performance (~150MB) - **Recommended**
   - **Small**: Higher accuracy (~500MB)
   - **Medium**: Best accuracy (~1.5GB)

### 2. Install Parakeet (Apple Silicon Only)

#### Prerequisites
```bash
# Install uv if not already installed
curl -LsSf https://astral.sh/uv/install.sh | sh
```

#### Installation
1. Open the **"Manage Local Models"** command in Raycast
2. Click **"Install Parakeet (Apple Silicon)"** if you have a compatible Mac
3. The extension will automatically install `parakeet-mlx` via `uv`
4. Download the **Parakeet TDT 0.6B v2** model (600M parameters, 6.05% WER)

## Configuration

### Settings Menu
1. Open **"Settings"** command in Raycast
2. Navigate to **"Speech Recognition Settings"**
3. Set **"Speech Recognition Mode"** to **"Local (Offline)"**
4. Select your preferred **"Local Engine"**:
   - **Whisper**: For universal compatibility
   - **Parakeet**: For ultra-fast Apple Silicon performance
5. Choose your model based on the selected engine

### Model Selection Guidelines

#### Whisper Models
- **Tiny**: Quick transcriptions, good for notes
- **Base**: Best balance of speed and accuracy
- **Small**: More accurate for complex audio
- **Medium**: Highest accuracy, slower processing

#### Parakeet Models
- **Parakeet TDT 0.6B v2**: Fast model optimized for Apple Silicon (600M params, English only)
- **Parakeet RNNT 1.1B**: Higher accuracy model with FastConformer-RNNT architecture (1.1B params, English only)

## Language Support

### Whisper Models
- **All languages**: Supports 100+ languages including English, French, Spanish, German, Italian, Portuguese, etc.
- **Automatic detection**: Can automatically detect the input language
- **Multilingual**: Works seamlessly across languages in the same session

### Parakeet Models
- **English only**: Currently available MLX models are limited to English transcription
- **No language detection**: Does not support other languages
- **Recommendation**: Use Whisper or OpenAI models for non-English content

### Advanced: Parakeet NIM (Expert Mode)
- **Multilingual available**: NVIDIA offers Parakeet 1.1B RNNT Multilingual via NIM
- **25 languages**: Including French (fr-FR, fr-CA), Spanish (es-ES, es-US), German, Italian, etc.
- **Requirements**: Linux/Windows with NVIDIA GPU, Docker, NGC API key
- **Not compatible**: Mac systems (no NVIDIA GPU support)
- **Setup complexity**: Requires Docker container management and 30min initial setup

For users with NVIDIA GPU systems, see [NVIDIA NIM Documentation](https://build.nvidia.com/nvidia/parakeet-1_1b-rnnt-multilingual-asr/modelcard)

## Performance Comparison

| Engine | Platform | Speed | Accuracy | Memory | Languages | Notes |
|--------|----------|-------|----------|---------|-----------|-------|
| Whisper Tiny | Universal | Fast | Good | 75MB | 100+ | Best for quick notes |
| Whisper Base | Universal | Medium | Good | 150MB | 100+ | **Recommended** |
| Whisper Small | Universal | Slow | Better | 500MB | 100+ | Complex audio |
| Whisper Medium | Universal | Very Slow | Best | 1.5GB | 100+ | Highest quality |
| Parakeet TDT 0.6B | Apple Silicon | **Ultra Fast** | Excellent | ~1GB | English only | **60x faster** |
| Parakeet RNNT 1.1B | Apple Silicon | **Very Fast** | Superior | ~2GB | English only | **Higher accuracy** |

## Usage

1. **Configure** your preferred engine and model in Settings
2. **Use** any dictation command (Dictate Text, Dictate AI Prompt)
3. **Enjoy** offline speech recognition without API calls

## Troubleshooting

### Common Issues

#### Whisper Installation Fails
- Ensure Homebrew is installed: `/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"`
- Check Xcode Command Line Tools: `xcode-select --install`
- Try cleaning up and reinstalling from the Manage Local Models menu

#### Parakeet Installation Fails
- Verify Apple Silicon: Check "System Info" in Manage Local Models
- Install uv manually: `curl -LsSf https://astral.sh/uv/install.sh | sh`
- Restart terminal and try again

#### Models Not Downloading
- Check internet connection
- Ensure sufficient disk space
- Try downloading individual models from the Manage Local Models menu

#### Performance Issues
- **Whisper**: Try a smaller model (Tiny or Base)
- **Parakeet**: Ensure no memory pressure (Activity Monitor > Memory)
- Close unnecessary applications before transcription

### Getting Help

1. Check the **System Info** section in Manage Local Models
2. Try the **Clean up All Local Files** option to reset
3. Reinstall engines from scratch if issues persist

## Advanced Configuration

### Model Storage Locations
- **Whisper**: `~/.raycast-whisper/`
- **Parakeet**: Managed by `uv` and MLX framework

### Manual Installation (Advanced Users)

#### Parakeet via pip (alternative to uv)
```bash
pip install parakeet-mlx
```

#### Using Parakeet CLI directly
```bash
# Install
uv tool install parakeet-mlx

# Use
parakeet-mlx audio_file.wav
```

## Best Practices

1. **Start with Whisper Base** for universal compatibility
2. **Upgrade to Parakeet** on Apple Silicon for maximum speed
3. **Use appropriate models** based on your accuracy/speed needs
4. **Keep models updated** through the Manage Local Models interface
5. **Clean up unused models** periodically to save disk space

## Performance Tips

### For Maximum Speed
- Use **Parakeet** on Apple Silicon
- Close unnecessary applications
- Ensure good microphone quality

### For Best Accuracy
- Use **Whisper Medium** for critical transcriptions
- Speak clearly and at moderate pace
- Use in quiet environments

### For Storage Efficiency
- Use **Whisper Tiny** for basic needs
- Regularly clean up unused models
- Monitor disk space usage

---

**Note**: This feature requires local installation and may take several minutes to set up initially. All transcription happens offline once configured, providing privacy and independence from internet connectivity.