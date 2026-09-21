"""
services/sms/fast2sms.py — Fast2SMS real provider.

Docs: https://docs.fast2sms.com/
Activate by setting:
  SMS_PROVIDER=fast2sms
  FAST2SMS_API_KEY=<your_key>
"""

import logging
import requests
from backend.services.sms.base import SMSProvider

logger = logging.getLogger(__name__)

FAST2SMS_URL = "https://www.fast2sms.com/dev/bulkV2"


class Fast2SMSProvider(SMSProvider):
    def __init__(self, api_key: str) -> None:
        if not api_key:
            raise ValueError("FAST2SMS_API_KEY is required for Fast2SMS provider.")
        self._api_key = api_key

    @property
    def name(self) -> str:
        return "fast2sms"

    def send(self, phone: str, message: str) -> dict:
        """Send SMS via Fast2SMS Bulk DLT route."""
        headers = {"authorization": self._api_key, "Content-Type": "application/json"}
        payload = {
            "route": "q",           # quick SMS (DLT not required for quick route)
            "message": message,
            "language": "english",
            "flash": 0,
            "numbers": phone,
        }
        try:
            resp = requests.post(FAST2SMS_URL, json=payload, headers=headers, timeout=10)
            data = resp.json()
            success = data.get("return", False)
            logger.info(f"[Fast2SMS] TO={phone} success={success} response={data}")
            return {
                "success": success,
                "provider": self.name,
                "detail": str(data),
            }
        except Exception as exc:
            logger.error(f"[Fast2SMS] Request failed: {exc}")
            return {"success": False, "provider": self.name, "detail": str(exc)}
