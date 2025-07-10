# Architecture

## Simple Functions (NO CLASSES!)

This optimization follows the existing codebase patterns: utilities in `src/utils/`, async functions with proper error handling, and performance measurement integration.

### Core Functions

**src/utils/startup-optimizer.ts** (NEW)
```typescript
async function optimizedStartup(whisperMode, localEngine, currentModelId) {
  // Run all checks in parallel using Promise.allSettled()
  // Return structured results for individual error handling
}
```

**src/utils/audio.ts** (MODIFIED)  
```typescript
let audioSetupCache = null; // Session-level cache

async function testAudioSetupCached() {
  // Return cached result or run expensive system_profiler check
}
```

**src/dictate.tsx** (MODIFIED)
```typescript
// Replace sequential calls with single optimizedStartup() call
const startupResults = await optimizedStartup(whisperMode, localEngine, currentModelId);
```

## How They Work Together

### Parallel Execution Flow
```
dictate.tsx calls optimizedStartup()
    ↓
Promise.allSettled([
  testAudioSetupCached(),           // From audio.ts with caching
  isLocalTranscriptionAvailable(),  // Existing function
  OpenAIClientManager.getClient()   // Existing function
])
    ↓
Process results individually (maintain existing error handling)
    ↓
Continue with normal dictation flow
```

### Session Caching
```
First call: testAudioSetup() → system_profiler (slow) → cache result
Subsequent calls: testAudioSetupCached() → return cached result (fast)
```

## Key Files

### startup-optimizer.ts (NEW)
- **Input**: whisperMode, localEngine, currentModelId
- **Processing**: Promise.allSettled() for parallel execution  
- **Output**: { audioSetup, modelAvailable, openaiClient } with individual error handling

### audio.ts (MODIFIED)
- **Input**: None (uses cached result if available)
- **Processing**: system_profiler call only when cache miss
- **Output**: Audio setup validation result

### dictate.tsx (MODIFIED)  
- **Input**: User command invocation
- **Processing**: Single optimizedStartup() call instead of sequential awaits
- **Output**: Faster startup before recording begins

## Data Flow

### Input
- User invokes dictation command
- Current whisper mode and model settings
- System state (audio devices, installed models)

### Processing  
- **Phase 1**: Parallel startup checks (new optimized flow)
- **Phase 2**: Audio recording (unchanged)
- **Phase 3**: Transcription and post-processing (unchanged)

### Output
- Faster startup (1-2s → <500ms cold, <200ms warm)
- Same dictation functionality and quality
- Preserved error handling and user feedback

