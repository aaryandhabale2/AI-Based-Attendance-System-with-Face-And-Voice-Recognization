"""
services/sms/factory.py — Returns the correct SMS provider instance from env config.

Priority:
  1. SMS_PROVIDER=fast2sms → Fast2SMSProvider (if FAST2SMS_API_KEY is set)
  2. SMS_PROVIDER=mock     → MockSMSProvider (default / fallback)

Adding a new provider:
  - Create a new module in this package implementing SMSProvider.
  - Add a case in get_sms_provider().
"""

import logging
from functools import lru_cache
from backend.services.sms.base import SMSProvider

logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def get_sms_provider() -> SMSProvider:
    """Return a cached SMS provider instance based on SMS_PROVIDER env var."""
    from backend.config import get_settings
    settings = get_settings()
    provider_name = settings.sms_provider.lower()

    if provider_name == "fast2sms":
        if not settings.fast2sms_api_key:
            logger.warning(
                "[SMSFactory] SMS_PROVIDER=fast2sms but FAST2SMS_API_KEY is empty. "
                "Falling back to MockSMS."
            )
        else:
            from backend.services.sms.fast2sms import Fast2SMSProvider
            logger.info("[SMSFactory] Using Fast2SMS provider.")
            return Fast2SMSProvider(api_key=settings.fast2sms_api_key)

    # Default / fallback
    from backend.services.sms.mock_sms import MockSMSProvider
    logger.info("[SMSFactory] Using MockSMS provider.")
    return MockSMSProvider()
