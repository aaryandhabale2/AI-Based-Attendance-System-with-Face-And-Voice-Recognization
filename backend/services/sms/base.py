"""
services/sms/base.py — Abstract SMS provider interface.

Every real/mock provider must implement SMSProvider.
"""

from abc import ABC, abstractmethod


class SMSProvider(ABC):
    """Abstract base class for SMS providers."""

    @property
    @abstractmethod
    def name(self) -> str:
        """Unique identifier for this provider (e.g. 'mock', 'fast2sms')."""
        ...

    @abstractmethod
    def send(self, phone: str, message: str) -> dict:
        """
        Send an SMS message.

        Parameters
        ----------
        phone   : Recipient phone number (10 digits, no country code prefix required).
        message : Message body (plain text, max ~160 chars for single segment).

        Returns
        -------
        dict with at least:
          {"success": bool, "provider": str, "detail": str}
        """
        ...
