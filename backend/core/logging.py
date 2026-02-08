"""
Logging configuration
"""
import logging
import sys
from typing import Optional


def setup_logging(level: str = "INFO") -> None:
    """Configure application logging"""
    logging.basicConfig(
        level=getattr(logging, level.upper()),
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[logging.StreamHandler(sys.stdout)]
    )


def get_logger(name: str, level: Optional[str] = None) -> logging.Logger:
    """Get a logger instance"""
    logger = logging.getLogger(name)
    if level:
        logger.setLevel(getattr(logging, level.upper()))
    return logger

