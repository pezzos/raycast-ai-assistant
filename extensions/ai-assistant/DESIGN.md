# Design Document

## What We're Building
A startup performance optimization for the dictation feature that reduces initialization time from 1-2 seconds to under 500ms (cold start) and under 200ms (warm start) by implementing parallel execution and intelligent caching.

## Technical Approach (No Buzzwords)

### Core Problem
The dictation startup currently runs expensive operations sequentially:
1. `testAudioSetup()` calls `system_profiler` (500ms-2s)
2. `isLocalTranscriptionAvailable()` checks Parakeet installation (500ms-2s) 
3. `OpenAIClientManager.getClient()` loads settings (100-400ms)

### Simple Solution
Replace sequential execution with parallel execution using `Promise.allSettled()` while maintaining existing error handling patterns.

### Key Changes
1. **Parallel Execution**: Run all independent startup checks simultaneously
2. **Session Caching**: Cache expensive `system_profiler` results for the session
3. **Preserved Error Handling**: Maintain current error handling and user feedback
4. **Performance Measurement**: Use existing profiler to measure improvements

## Files to Modify (MAXIMUM 3)

1. **src/utils/startup-optimizer.ts** (NEW)
   - Core parallel startup logic
   - Error handling for parallel operations
   - Integration with existing utilities

2. **src/utils/audio.ts** (MODIFY)
   - Add session caching to `testAudioSetup()`
   - Cache `system_profiler` results until session ends
   - Maintain existing error handling

3. **src/dictate.tsx** (MODIFY)
   - Replace sequential startup calls with `optimizedStartup()`
   - Maintain existing error handling and user feedback
   - Preserve all current functionality

## Implementation Steps

1. **Create startup-optimizer.ts**
   - Implement `optimizedStartup()` function using `Promise.allSettled()`
   - Handle results individually to maintain existing error behavior
   - Return structured results for easy consumption

2. **Add caching to audio.ts**
   - Create `testAudioSetupCached()` function with session-level caching
   - Cache expensive `system_profiler` call results
   - Maintain cache until process ends (no invalidation needed)

3. **Modify dictate.tsx startup**
   - Replace sequential `await` calls with single `optimizedStartup()` call
   - Handle returned results the same way as current implementation
   - Measure performance improvement with existing profiler

## Testing Plan

### Manual Testing
- Test cold start performance (first run after launching Raycast)
- Test warm start performance (subsequent runs in same session)
- Verify error handling works correctly for each failure scenario
- Test with different whisper modes (local/cloud)
- Verify audio setup, model checks, and OpenAI client work as before

### Performance Validation
- Use existing `performanceProfiler` to measure startup time improvements
- Target: Cold start <500ms, warm start <200ms
- Verify 60-70% improvement in typical scenarios

### Edge Cases
- Test with missing audio devices
- Test with local models not installed
- Test with invalid OpenAI credentials
- Test with slow system (to ensure graceful degradation)

## Error Handling Strategy
- Use `Promise.allSettled()` to allow independent failure handling
- Process each result individually to maintain existing error patterns
- Preserve all current HUD notifications and user feedback
- No change to existing error recovery mechanisms

## Performance Expectations
- **Cold Start**: 1-2s → <500ms (60-75% improvement)
- **Warm Start**: 500ms-1s → <200ms (70-80% improvement)
- **Cache Hit Rate**: >90% for audio setup checks during session
- **No Regression**: All existing functionality preserved

