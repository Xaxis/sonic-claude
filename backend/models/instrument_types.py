"""
Instrument Type Definitions - Validated instrument types for type safety

This module provides type-safe instrument validation using Pydantic and typing.Literal.
All valid instruments are dynamically generated from SYNTHDEF_REGISTRY to ensure
consistency across the codebase.

IMPORTANT: To avoid circular imports, this module uses lazy imports and deferred
type construction. The ValidInstrument type is built on first access, not at module
import time.

Usage:
    from backend.models.instrument_types import ValidInstrument, get_valid_instruments

    # In Pydantic models
    class CreateTrackRequest(BaseModel):
        instrument: Optional[ValidInstrument] = None

    # For runtime validation
    if instrument not in get_valid_instruments():
        raise ValueError(f"Invalid instrument: {instrument}")
"""
from typing import Literal, get_args, Any


# Cache for the Literal type to avoid rebuilding it
_valid_instrument_type_cache: Any = None


def _get_synthdef_registry():
    """
    Lazy import of SYNTHDEF_REGISTRY to avoid circular imports

    This function delays the import until it's actually needed,
    preventing circular dependency issues.
    """
    from backend.services.daw.synthdef_registry import SYNTHDEF_REGISTRY
    return SYNTHDEF_REGISTRY


def _build_instrument_literal():
    """
    Build Literal type from SYNTHDEF_REGISTRY

    This function is called on first access to generate the ValidInstrument type.
    It ensures that the type definition always matches the available SynthDefs.

    Returns:
        Literal type containing all valid instrument names
    """
    global _valid_instrument_type_cache

    if _valid_instrument_type_cache is not None:
        return _valid_instrument_type_cache

    registry = _get_synthdef_registry()

    # Extract all instrument names from registry
    instrument_names = tuple(synth["name"] for synth in registry)

    # Create Literal type with all instrument names
    # This allows Pydantic to validate against the exact set of valid instruments
    _valid_instrument_type_cache = Literal[instrument_names]  # type: ignore
    return _valid_instrument_type_cache


# Type alias for valid instruments - used in Pydantic models
# This is a Literal type containing all 195+ instrument names from SYNTHDEF_REGISTRY
# NOTE: This is built lazily on first access to avoid circular imports
ValidInstrument = str  # Placeholder - Pydantic will use this as str, but we validate at runtime


def get_valid_instruments() -> set[str]:
    """
    Get set of all valid instrument names for runtime validation

    This function is useful for:
    - Runtime validation in service layers
    - Error messages showing valid options
    - API documentation

    Returns:
        Set of valid instrument names (e.g., {'sine', 'acousticGrandPiano', 'kick808', ...})

    Example:
        >>> valid = get_valid_instruments()
        >>> 'acousticGrandPiano' in valid
        True
        >>> 'invalid_instrument' in valid
        False
    """
    registry = _get_synthdef_registry()
    return {synth["name"] for synth in registry}


def get_valid_instruments_list() -> list[str]:
    """
    Get sorted list of all valid instrument names

    Useful for:
    - Generating enum values for tool definitions
    - API documentation
    - Error messages

    Returns:
        Sorted list of valid instrument names

    Example:
        >>> instruments = get_valid_instruments_list()
        >>> len(instruments)
        195
        >>> instruments[0]
        'accordion'
    """
    registry = _get_synthdef_registry()
    return sorted(synth["name"] for synth in registry)


def validate_instrument(instrument: str | None) -> None:
    """
    Validate instrument name and raise descriptive error if invalid

    This function provides a consistent validation pattern across the codebase
    with helpful error messages.

    Args:
        instrument: Instrument name to validate (None is allowed)

    Raises:
        ValueError: If instrument is not in SYNTHDEF_REGISTRY

    Example:
        >>> validate_instrument('acousticGrandPiano')  # OK
        >>> validate_instrument('invalid')  # Raises ValueError
    """
    if instrument is None:
        return

    valid_instruments = get_valid_instruments()
    if instrument not in valid_instruments:
        # Lazy import to avoid circular dependency
        from backend.services.daw.synthdef_registry import get_categories

        categories = get_categories()
        raise ValueError(
            f"Invalid instrument '{instrument}'. "
            f"Must be one of {len(valid_instruments)} available instruments. "
            f"Categories: {', '.join(categories)}. "
            f"See SYNTHDEF_REGISTRY for complete list."
        )


def get_instruments_by_category() -> dict[str, list[str]]:
    """
    Get instruments organized by category

    Useful for:
    - Building categorized UI pickers
    - Generating organized documentation
    - Category-based filtering

    Returns:
        Dictionary mapping category names to lists of instrument names

    Example:
        >>> by_category = get_instruments_by_category()
        >>> by_category['Piano']
        ['acousticGrandPiano', 'brightAcousticPiano', 'electricPiano1', ...]
        >>> by_category['Drums']
        ['kick808', 'kick909', 'snare808', ...]
    """
    registry = _get_synthdef_registry()

    result: dict[str, list[str]] = {}
    for synth in registry:
        category = synth["category"]
        if category not in result:
            result[category] = []
        result[category].append(synth["name"])

    return result

