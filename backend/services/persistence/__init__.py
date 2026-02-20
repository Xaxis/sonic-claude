"""
Persistence Services - Data storage and retrieval

Services in this module handle data persistence:
- Composition service (save/load entire DAW state)
"""

from .composition_service import CompositionService

__all__ = [
    "CompositionService",
]
