# CLAUDE.md - Raycast AI Assistant Project

## Project Overview
**Raycast AI Assistant** is a productivity-focused Raycast extension that provides AI-powered tools for translation, dictation, summarization, and voice-driven text generation.

## Architecture and Patterns

### Command-Based Architecture
- Each feature is implemented as a separate command file (translate.tsx, dictate.tsx, etc.)
- Commands are registered in package.json and follow Raycast's command structure
- Each command handles its own UI, state management, and API integrations

### Utility-Driven Design
- Common functionality extracted into `/src/utils/` modules
- Single responsibility utilities: audio.ts, cache.ts, timing.ts, etc.
- Shared utilities in `common.ts` for text operations and OpenAI integration

### Settings-Driven Configuration
- Centralized settings management using Raycast's LocalStorage API
- Settings keys exported from constants for consistency
- Reactive UI updates through React hooks

## Tech Stack

### Core Technologies
- **React + TypeScript**: Modern React with strict TypeScript typing
- **Raycast API**: Native integration with @raycast/api v1.91.1
- **OpenAI API**: v4.28.0 for GPT models and cloud Whisper
- **Node.js**: v20.15.1 for system operations and file handling

### Key Dependencies
- **cheerio**: HTML parsing for web page summarization
- **lru-cache**: In-memory caching with intelligent expiration
- **date-fns**: Date/time utilities for cache management
- **glob**: File pattern matching for model management

## Build and Development Tools

### Available Commands
```bash
npm run build      # Build extension with Raycast CLI
npm run dev        # Start development mode
npm run lint       # Run ESLint
npm run fix-lint   # Auto-fix linting issues
npm run publish    # Publish to Raycast store
```

### Development Workflow
1. **Development**: `npm run dev` for hot reload
2. **Linting**: `npm run lint` before commits
3. **Building**: `npm run build` for production
4. **Publishing**: `npm run publish` for store submission

## Code Conventions

### TypeScript Patterns
- Strict typing enabled with `strict: true`
- Interface-first design for data structures
- Generic utilities for type safety
- Explicit null checks and optional chaining

### Function Naming
- Descriptive verbs: `getSelectedText()`, `replaceSelectedText()`
- System operations: `setSystemAudioMute()`, `isSystemAudioMuted()`
- Async operations clearly marked as async
- Utility prefixes: `measure*()`, `clean*()`, `get*()`, `set*()`

### File Organization
- Single responsibility per command file
- Utilities grouped by functionality
- Constants centralized in dedicated files
- Co-located types with implementations

### Error Handling
- Comprehensive try-catch blocks with logging
- User-friendly HUD notifications for all error states
- Graceful degradation when features unavailable
- Structured console logging for debugging

## AI Integration Patterns

### Hybrid Approach
- Support for both OpenAI API and local Whisper models
- Graceful fallback from local to cloud when needed
- Model size selection for accuracy/speed trade-offs
- Centralized AI utilities in `common.ts`

### OpenAI Integration
- GPT models for text generation and translation
- Whisper for cloud speech-to-text
- Structured prompt engineering for consistent results
- Rate limiting and error handling

### Local Whisper
- Complete model lifecycle management
- Multiple model sizes (tiny, base, small, medium)
- Offline operation capabilities
- Performance optimization for real-time use

## Performance Optimizations

### Caching Strategy
- 24-hour expiration for translations and summaries
- LRU cache with memory limits
- Typed cache keys for type safety
- Intelligent cache invalidation

### Background Processing
- Async operations with user feedback
- Progress indicators for long-running tasks
- Non-blocking UI updates
- Timing utilities for performance measurement

## macOS Integration

### System Integration
- AppleScript for browser detection and control
- System audio control and monitoring
- Application focus and window management
- Clipboard operations with formatting preservation

### Audio Handling
- System audio muting during recording
- High-quality audio capture
- Format conversion and optimization
- Audio device management

## Development Guidelines

### Code Quality
- Run `npm run lint` before commits
- Use TypeScript strict mode
- Follow existing naming conventions
- Add comprehensive error handling

### Testing Strategy
- Manual testing in Raycast development environment
- Test with various input types and edge cases
- Verify system integration functionality
- Test both online and offline modes

### Performance Considerations
- Minimize API calls through caching
- Optimize large file operations
- Use background processing for heavy operations
- Monitor memory usage with LRU cache

## Extension-Specific Notes

### Settings Management
- All settings use LocalStorage with consistent keys
- Settings validation and fallback values
- Reactive UI updates for settings changes
- Export/import functionality for configuration

### Command Implementation
- Each command follows Raycast's no-view or view pattern
- Consistent error handling across all commands
- Progress feedback for long operations
- Keyboard shortcuts and user experience optimization

### Model Management
- Local Whisper model installation and management
- Model size selection UI
- Storage optimization and cleanup
- Version compatibility checking

## Future Development

### Recommended Practices
- Maintain single responsibility in utilities
- Use TypeScript interfaces for all data structures
- Implement comprehensive error handling
- Add performance monitoring for critical paths
- Consider adding automated tests for core utilities

### Extension Points
- Additional AI model support
- Enhanced caching strategies
- More system integration points
- Performance optimization opportunities