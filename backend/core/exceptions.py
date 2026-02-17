"""
Custom Exception Hierarchy for Sonic Claude Backend

Provides structured exceptions for different error types with consistent
error messages and HTTP status codes.
"""


class SonicClaudeException(Exception):
    """Base exception for all Sonic Claude errors"""
    
    def __init__(self, message: str, details: str | None = None):
        self.message = message
        self.details = details
        super().__init__(self.message)


# ============================================================================
# RESOURCE EXCEPTIONS (404)
# ============================================================================

class ResourceNotFoundError(SonicClaudeException):
    """Raised when a requested resource is not found"""
    pass


class SequenceNotFoundError(ResourceNotFoundError):
    """Raised when a sequence is not found"""
    
    def __init__(self, sequence_id: str):
        super().__init__(
            message=f"Sequence not found: {sequence_id}",
            details=f"No sequence exists with ID '{sequence_id}'"
        )
        self.sequence_id = sequence_id


class ClipNotFoundError(ResourceNotFoundError):
    """Raised when a clip is not found"""
    
    def __init__(self, clip_id: str, sequence_id: str | None = None):
        message = f"Clip not found: {clip_id}"
        if sequence_id:
            message += f" in sequence {sequence_id}"
        super().__init__(message=message)
        self.clip_id = clip_id
        self.sequence_id = sequence_id


class TrackNotFoundError(ResourceNotFoundError):
    """Raised when a track is not found"""
    
    def __init__(self, track_id: str):
        super().__init__(
            message=f"Track not found: {track_id}",
            details=f"No track exists with ID '{track_id}'"
        )
        self.track_id = track_id


class SampleNotFoundError(ResourceNotFoundError):
    """Raised when a sample is not found"""
    
    def __init__(self, sample_id: str):
        super().__init__(
            message=f"Sample not found: {sample_id}",
            details=f"No sample exists with ID '{sample_id}'"
        )
        self.sample_id = sample_id


class SynthNotFoundError(ResourceNotFoundError):
    """Raised when a synth is not found"""
    
    def __init__(self, synth_id: int):
        super().__init__(
            message=f"Synth not found: {synth_id}",
            details=f"No active synth with ID {synth_id}"
        )
        self.synth_id = synth_id


class VersionNotFoundError(ResourceNotFoundError):
    """Raised when a sequence version is not found"""
    
    def __init__(self, sequence_id: str, version_num: int):
        super().__init__(
            message=f"Version {version_num} not found for sequence {sequence_id}",
            details=f"No version {version_num} exists for sequence '{sequence_id}'"
        )
        self.sequence_id = sequence_id
        self.version_num = version_num


# ============================================================================
# VALIDATION EXCEPTIONS (400)
# ============================================================================

class ValidationError(SonicClaudeException):
    """Raised when input validation fails"""
    pass


class InvalidTrackTypeError(ValidationError):
    """Raised when an operation is invalid for a track type"""
    
    def __init__(self, operation: str, track_type: str):
        super().__init__(
            message=f"Invalid operation for track type",
            details=f"Cannot {operation} on {track_type} track"
        )
        self.operation = operation
        self.track_type = track_type


class InvalidParameterError(ValidationError):
    """Raised when a parameter value is invalid"""

    def __init__(self, param_name: str, value: any, reason: str):
        super().__init__(
            message=f"Invalid parameter: {param_name}",
            details=f"Value '{value}' is invalid: {reason}"
        )
        self.param_name = param_name
        self.value = value


class SampleInUseError(ValidationError):
    """Raised when attempting to delete a sample that is in use"""

    def __init__(self, sample_id: str, track_count: int, track_names: list[str]):
        tracks_list = ", ".join(track_names[:3])
        if len(track_names) > 3:
            tracks_list += f" and {len(track_names) - 3} more"
        super().__init__(
            message=f"Cannot delete sample: it is being used in {track_count} track(s): {tracks_list}",
            details=f"Sample '{sample_id}' is referenced by {track_count} tracks"
        )
        self.sample_id = sample_id
        self.track_count = track_count
        self.track_names = track_names


# ============================================================================
# SERVICE EXCEPTIONS (500)
# ============================================================================

class ServiceError(SonicClaudeException):
    """Base exception for service-level errors"""
    pass


class AudioEngineError(ServiceError):
    """Raised when SuperCollider/audio engine operations fail"""
    
    def __init__(self, operation: str, details: str | None = None):
        super().__init__(
            message=f"Audio engine error: {operation}",
            details=details
        )
        self.operation = operation


class StorageError(ServiceError):
    """Raised when storage operations fail"""
    
    def __init__(self, operation: str, details: str | None = None):
        super().__init__(
            message=f"Storage error: {operation}",
            details=details
        )
        self.operation = operation

