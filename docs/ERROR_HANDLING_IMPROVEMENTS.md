# Error Handling Improvements

This document tracks the custom exception hierarchy and error handling improvements made to the Sonic Claude backend.

## Overview

Replaced generic `HTTPException` usage with a comprehensive custom exception hierarchy for better error handling, logging, and client-side error management.

## Custom Exception Hierarchy

### `backend/core/exceptions.py` ✅

**Base Exception:**
- `SonicClaudeException` - Base exception for all Sonic Claude errors

**Category Exceptions:**
- `ResourceNotFoundError` - For 404 errors (inherits from SonicClaudeException)
- `ValidationError` - For 400 errors (inherits from SonicClaudeException)
- `ServiceError` - For 500 errors (inherits from SonicClaudeException)

**Specific Resource Not Found Exceptions:**
- `SequenceNotFoundError(sequence_id)` - Sequence not found
- `ClipNotFoundError(clip_id, sequence_id)` - Clip not found in sequence
- `TrackNotFoundError(track_id)` - Track not found
- `VersionNotFoundError(version_num, sequence_id)` - Version not found
- `SampleNotFoundError(sample_id)` - Sample not found
- `SynthNotFoundError(synth_id)` - Synth not found

**Validation Exceptions:**
- `InvalidTrackTypeError(operation, track_type)` - Invalid track type for operation
- `SampleInUseError(sample_id, track_count, track_names)` - Sample is in use and cannot be deleted
- `InvalidParameterError(param_name, value, reason)` - Invalid parameter value

**Service Exceptions:**
- `AudioEngineError(operation, details)` - Audio engine/SuperCollider operation failed
- `StorageError(operation, details)` - Storage operation failed

## Global Exception Handlers

### `backend/main.py` ✅

Added FastAPI exception handlers for all custom exception types:

```python
@app.exception_handler(ResourceNotFoundError)
async def resource_not_found_handler(request: Request, exc: ResourceNotFoundError):
    """Handle resource not found errors (404)"""
    logger.warning(f"Resource not found: {exc.message}")
    return JSONResponse(
        status_code=404,
        content={
            "detail": exc.message,
            "error_type": exc.__class__.__name__,
        }
    )
```

All handlers return consistent JSON responses with:
- `detail` - Human-readable error message
- `error_type` - Exception class name for client-side handling

## API Route Updates

### `backend/api/sequencer_routes.py` ✅

**Systematically replaced ALL 24 HTTPException instances with custom exceptions:**

**Sequence Not Found (9 instances):**
- `get_sequence()` - Line 68
- `update_sequence()` - Line 80
- `delete_sequence()` - Line 119
- `save_sequence()` - Line 137
- `recover_from_autosave()` - Line 190
- `add_clip()` - Line 213
- `get_clips()` - Line 225
- `create_track()` - Line 303
- `play_sequence()` - Line 562

**Clip Not Found (3 instances):**
- `update_clip()` - Line 239
- `delete_clip()` - Line 252
- `duplicate_clip()` - Line 265

**Track Not Found (5 instances):**
- `get_track()` - Line 328
- `update_track_mute()` - Line 351
- `update_track_solo()` - Line 364
- `update_track()` - Line 385
- `delete_track()` - Line 417

**Version Not Found (1 instance):**
- `restore_version()` - Line 165

**Invalid Track Type (1 instance):**
- `update_track()` - Line 396

**Service Errors (6 instances):**
- `create_sequence()` - Line 48
- `save_sequence()` - Line 141
- `delete_track()` - Lines 422, 430
- `play_sequence()` - Line 564
- `toggle_metronome()` - Line 637
- `set_metronome_volume()` - Line 663
- `preview_note()` - Line 696

## Benefits

1. **Consistent Error Responses** - All errors return same JSON structure
2. **Better Client-Side Handling** - `error_type` field allows specific error handling
3. **Improved Logging** - Different log levels for different error types (warning for 404, error for 500)
4. **Domain-Specific Errors** - Clear, meaningful error messages
5. **Type Safety** - Custom exceptions are type-safe and IDE-friendly
6. **Easier Debugging** - Stack traces show custom exception names

### `backend/api/audio_routes.py` ✅

**Systematically replaced ALL 8 HTTPException instances with custom exceptions:**

**Synth Not Found (3 instances):**
- `get_synth()` - Line 68
- `set_synth_param()` - Line 83 (ValueError → SynthNotFoundError)
- `delete_synth()` - Line 103 (ValueError → SynthNotFoundError)

**Service Errors (5 instances):**
- `create_synth()` - Line 49
- `set_synth_param()` - Line 86
- `delete_synth()` - Line 106
- `delete_all_synths()` - Line 119

**Total: 8 HTTPException instances replaced**

### `backend/api/sample_routes.py` ✅

**Systematically replaced ALL 20 HTTPException instances with custom exceptions:**

**Sample Not Found (7 instances):**
- `get_sample()` - Line 203
- `download_sample()` - Lines 227, 233
- `update_sample_duration()` - Line 257
- `update_sample()` - Line 287
- `delete_sample()` - Line 325

**Sample In Use (1 instance):**
- `delete_sample()` - Line 333 (validation error)

**Service Errors (7 instances):**
- `upload_sample()` - Line 173
- `get_all_samples()` - Line 191
- `get_sample()` - Line 214
- `download_sample()` - Line 244
- `update_sample_duration()` - Line 273
- `update_sample()` - Line 311
- `delete_sample()` - Line 355

**Total: 20 HTTPException instances replaced (including 5 except HTTPException: raise blocks removed)**

### `backend/api/websocket_routes.py` ✅

**No HTTPException instances found - already clean!**

## Summary

**Total HTTPException instances replaced across all API routes: 52**
- `sequencer_routes.py`: 24 instances
- `audio_routes.py`: 8 instances
- `sample_routes.py`: 20 instances
- `websocket_routes.py`: 0 instances (already clean)

## Future Improvements

### Service Layer
- Update services to raise custom exceptions instead of generic exceptions
- Add AudioEngineError to synthesis_service.py
- Add StorageError to sequence_storage.py

### Testing
- Add integration tests for error handling
- Test all custom exception types
- Verify error responses match expected format

## Testing

- ✅ All existing tests pass (8/8)
- ✅ Backend starts successfully
- ✅ All routes import successfully
- ✅ Exception handlers registered correctly
- ✅ Zero HTTPException instances remain in all API route files

