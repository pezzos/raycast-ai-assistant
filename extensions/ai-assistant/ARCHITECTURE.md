# Architecture Documentation - Raycast AI Assistant

## System Overview

The Raycast AI Assistant is built as a modular, command-based extension that provides AI-powered productivity tools. The architecture emphasizes separation of concerns, type safety, and seamless integration with both local and cloud AI services.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Raycast Extension Host                    │
├─────────────────────────────────────────────────────────────┤
│                Command Layer (React Components)             │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌──────────┐│
│  │ translate   │ │ dictate     │ │ summarize   │ │ settings ││
│  │ .tsx        │ │ .tsx        │ │ .tsx        │ │ .tsx     ││
│  └─────────────┘ └─────────────┘ └─────────────┘ └──────────┘│
├─────────────────────────────────────────────────────────────┤
│                  Service Layer (Utils)                      │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌──────────┐│
│  │ common.ts   │ │ cache.ts    │ │ audio.ts    │ │ timing.ts││
│  │ (core AI)   │ │ (caching)   │ │ (system)    │ │ (perf)   ││
│  └─────────────┘ └─────────────┘ └─────────────┘ └──────────┘│
├─────────────────────────────────────────────────────────────┤
│                External Integrations                        │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌──────────┐│
│  │ OpenAI API  │ │ Local       │ │ macOS       │ │ File     ││
│  │ (GPT/Whisper)│ │ Whisper     │ │ System      │ │ System   ││
│  └─────────────┘ └─────────────┘ └─────────────┘ └──────────┘│
└─────────────────────────────────────────────────────────────┘
```

## Component Architecture

### Command Layer (React Components)

Each command is implemented as a standalone React component with specific responsibilities:

#### translate.tsx
- **Purpose**: Bidirectional text translation with language detection
- **Features**: Smart language detection, formatting preservation, caching
- **Dependencies**: common.ts, cache.ts, system-languages.ts

#### dictate.tsx
- **Purpose**: Speech-to-text conversion with hybrid AI support
- **Features**: Local/cloud Whisper, real-time transcription, audio management
- **Dependencies**: common.ts, audio.ts, whisper-local.ts, timing.ts

#### dictate-prompt.tsx
- **Purpose**: Voice-driven AI text generation
- **Features**: Speech-to-text + AI completion, context awareness
- **Dependencies**: common.ts, audio.ts, whisper-local.ts

#### summarize-page.tsx
- **Purpose**: Web page and text summarization
- **Features**: HTML parsing, content extraction, AI summarization
- **Dependencies**: common.ts, cache.ts, cheerio

#### settings.tsx
- **Purpose**: Configuration management and model administration
- **Features**: Preference management, model installation, validation
- **Dependencies**: whisper-local.ts, dictionary.ts

### Service Layer (Utilities)

#### common.ts (Core AI Service)
```typescript
// Primary AI integration point
- OpenAI client management
- Text processing utilities
- Clipboard operations
- Error handling abstractions
- Language detection
- Translation caching integration
```

#### cache.ts (Caching Service)
```typescript
// Intelligent caching with expiration
- LRU cache with type safety
- 24-hour expiration strategy
- Memory management
- Cache key generation
- Cleanup utilities
```

#### audio.ts (System Audio Service)
```typescript
// macOS audio system integration
- System audio muting/unmuting
- Audio device management
- Recording state management
- AppleScript integration
```

#### whisper-local.ts (Local AI Service)
```typescript
// Local Whisper model management
- Model installation and lifecycle
- Multiple model size support
- Performance optimization
- Offline operation capabilities
```

#### timing.ts (Performance Service)
```typescript
// User feedback and performance monitoring
- Operation timing measurement
- Progress notifications
- HUD feedback management
- Performance logging
```

## Data Flow Architecture

### Translation Flow
```
User Selection → Language Detection → Cache Check → 
AI Translation → Cache Store → Text Replacement → User Feedback
```

### Dictation Flow
```
Audio Recording → Model Selection (Local/Cloud) → 
Speech Processing → Text Improvement → Dictionary Application → 
Clipboard/Replacement → History Storage
```

### Summarization Flow
```
URL/Text Input → Content Extraction → Text Cleaning → 
AI Summarization → Cache Store → Formatted Output → User Display
```

## Integration Architecture

### AI Service Integration

#### OpenAI API Integration
- **Models**: GPT-4, GPT-3.5-turbo, Whisper
- **Rate Limiting**: Built-in retry logic with exponential backoff
- **Error Handling**: Comprehensive error categorization and user feedback
- **Security**: API key management through Raycast preferences

#### Local Whisper Integration
- **Models**: tiny, base, small, medium (size vs accuracy trade-offs)
- **Installation**: Automated model downloading and setup
- **Performance**: Optimized for real-time transcription
- **Fallback**: Graceful degradation to cloud when local unavailable

### System Integration

#### macOS Integration
```typescript
// AppleScript for system control
- Application focus management
- Browser detection and control
- System audio state management
- Window and UI automation
```

#### File System Integration
```typescript
// Local storage and file operations
- Model storage and management
- Recording temporary files
- Dictionary persistence
- History and cache storage
```

## Performance Architecture

### Caching Strategy
- **Translation Cache**: 24-hour expiration, LRU eviction
- **Summarization Cache**: Content-based keys, size limits
- **Model Cache**: Persistent local storage, version management
- **History Cache**: User-controlled retention, searchable

### Memory Management
- **LRU Cache**: Configurable size limits with intelligent eviction
- **Temporary Files**: Automatic cleanup after processing
- **Model Loading**: Lazy loading with memory optimization
- **Background Processing**: Non-blocking operations with progress feedback

### Concurrency Management
- **Async Operations**: Full async/await pattern implementation
- **Queue Management**: Sequential processing for audio operations
- **Resource Locking**: Prevents concurrent access conflicts
- **Progress Tracking**: Real-time feedback for long operations

## Security Architecture

### API Security
- **Key Management**: Secure storage through Raycast preferences
- **Request Validation**: Input sanitization and validation
- **Rate Limiting**: Built-in protection against API abuse
- **Error Handling**: Secure error messages without sensitive data exposure

### Local Security
- **File Permissions**: Appropriate access controls for model storage
- **Temporary Files**: Secure cleanup of sensitive recordings
- **Dictionary Privacy**: Local storage without external transmission
- **History Protection**: User-controlled data retention

## Extension Architecture

### Raycast Integration
- **Command Registration**: Package.json configuration with icons and descriptions
- **Preference Management**: Type-safe preference handling
- **HUD Integration**: Consistent user feedback patterns
- **Keyboard Shortcuts**: Optimized for workflow integration

### Settings Architecture
```typescript
// LocalStorage-based configuration
interface Settings {
  primaryLanguage: string;
  secondaryLanguage: string;
  whisperMode: 'local' | 'cloud';
  modelSize: 'tiny' | 'base' | 'small' | 'medium';
  improveText: boolean;
  translateAfterDictation: boolean;
}
```

### Plugin Architecture
- **Modular Design**: Each feature as independent module
- **Shared Dependencies**: Common utilities for consistency
- **Extension Points**: Easy addition of new commands
- **Configuration**: Centralized settings with validation

## Development Architecture

### Build System
- **Raycast CLI**: Native build and development tools
- **TypeScript**: Strict compilation with comprehensive type checking
- **ESLint**: Code quality enforcement with Raycast-specific rules
- **Prettier**: Consistent code formatting

### Development Workflow
1. **Development**: Hot reload with `npm run dev`
2. **Quality**: Linting and type checking on save
3. **Testing**: Manual testing in Raycast environment
4. **Building**: Production builds with optimization
5. **Publishing**: Automated publishing to Raycast store

### Code Organization
```
src/
├── commands/           # Command implementations
│   ├── translate.tsx
│   ├── dictate.tsx
│   └── ...
├── utils/             # Shared utilities
│   ├── common.ts      # Core AI utilities
│   ├── cache.ts       # Caching system
│   └── ...
├── types/             # Type definitions
└── constants.ts       # Shared constants
```

## Scalability Considerations

### Performance Scalability
- **Caching**: Reduces API calls and improves response times
- **Local Processing**: Reduces cloud dependency and latency
- **Background Operations**: Prevents UI blocking for heavy operations
- **Memory Management**: Prevents memory leaks in long-running sessions

### Feature Scalability
- **Modular Architecture**: Easy addition of new AI capabilities
- **Plugin System**: Extensible command structure
- **Configuration Management**: Scalable settings architecture
- **API Abstraction**: Easy integration of new AI services

### Maintenance Scalability
- **Type Safety**: Comprehensive TypeScript for maintainability
- **Documentation**: Inline documentation and architecture docs
- **Error Handling**: Consistent error patterns across components
- **Testing Strategy**: Structured approach to quality assurance