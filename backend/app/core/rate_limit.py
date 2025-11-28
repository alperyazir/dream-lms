"""
Rate limiting configuration for the application.
Story 4.8 QA Fix: Rate limiting to prevent abuse of save-progress endpoint.
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

# Initialize rate limiter
# Uses client IP address as the key for rate limiting
limiter = Limiter(key_func=get_remote_address, default_limits=[])
