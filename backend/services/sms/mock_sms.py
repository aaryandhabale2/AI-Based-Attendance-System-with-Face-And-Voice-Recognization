"""
services/sms/mock_sms.py — MockSMS provider.

Logs messages to console and persists them in the database.
Shown in the "Sent Alerts" UI panel.
Used when SMS_PROVIDER=mock (default).
"""

import logging
from backend.services.sms.base import SMSProvider

logger = logging.getLogger(__name__)


class MockSMSProvider(SMSProvider):
    @property
    def name(self) -> str:
        return "mock"

    def send(self, phone: str, message: str) -> dict:
        logger.info(f"[MockSMS] 📱 TO: {phone} | MSG: {message}")
        print(f"\n[MockSMS] ─────────────────────────────────")
        print(f"  TO     : {phone}")
        print(f"  MESSAGE: {message}")
        print(f"──────────────────────────────────────────\n")
        return {
            "success": True,
            "provider": self.name,
            "detail": f"Mock SMS logged to console. TO={phone}",
        }
