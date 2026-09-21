"""
services/challenge_service.py — Anti-replay challenge phrase generator and verifier.

Protects against pre-recorded audio replay attacks:
  1. Kiosk / client requests a dynamic challenge phrase before recording audio.
  2. Challenge has a short Time-To-Live (default 60 seconds).
  3. Each challenge can be used EXACTLY ONCE (one-time nonce).
  4. Attempting to reuse an expired, unknown, or already-used phrase flags the attempt
     with reason "wrong_or_expired_challenge".
"""

import logging
import random
import threading
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Optional

logger = logging.getLogger(__name__)

# Memorable vocabulary for live voice reading
WORDS = [
    "ALPHA", "BRAVO", "CHARLIE", "DELTA", "ECHO", "FOXTROT",
    "TIGER", "EAGLE", "FALCON", "PHOENIX", "SHADOW", "LIGHT",
    "OCEAN", "RIVER", "SUMMIT", "VALLEY", "FOREST", "HORIZON",
    "SILVER", "GOLDEN", "CRYSTAL", "COBALT", "AMBER", "SCARLET",
    "SECURE", "VERIFY", "ACTIVE", "SYSTEM", "SHIELD", "MATRIX",
]


@dataclass
class Challenge:
    challenge_id: str
    phrase: str
    expires_at: datetime
    created_at: datetime
    used: bool = False


_challenges: dict[str, Challenge] = {}
_lock = threading.Lock()


def _cleanup_expired() -> None:
    """Purge challenges older than 10 minutes to prevent memory leak."""
    now = datetime.now(timezone.utc)
    threshold = now - timedelta(minutes=10)
    to_delete = [
        cid for cid, ch in _challenges.items()
        if ch.created_at < threshold
    ]
    for cid in to_delete:
        del _challenges[cid]


def create_challenge(ttl_seconds: int = 60) -> dict:
    """
    Generate a new anti-replay challenge phrase with a short expiration.
    Returns:
        {
            "challenge_id": str,
            "phrase": str,
            "expires_in": int,
            "expires_at": str (ISO)
        }
    """
    with _lock:
        _cleanup_expired()
        cid = str(uuid.uuid4())
        # Pick 3 random words and a 2-digit number for easy speech
        picked = random.sample(WORDS, 3)
        num = random.randint(10, 99)
        phrase = f"{' '.join(picked)} {num}"

        now = datetime.now(timezone.utc)
        expires = now + timedelta(seconds=ttl_seconds)

        _challenges[cid] = Challenge(
            challenge_id=cid,
            phrase=phrase,
            expires_at=expires,
            created_at=now,
            used=False,
        )

    logger.info(f"[Challenge] Generated new challenge {cid}: '{phrase}' (expires in {ttl_seconds}s)")
    return {
        "challenge_id": cid,
        "phrase": phrase,
        "expires_in": ttl_seconds,
        "expires_at": expires.isoformat(),
    }


def verify_challenge(
    challenge_id: Optional[str],
    submitted_phrase: Optional[str],
) -> tuple[bool, str]:
    """
    Validate a challenge against the active store.

    Checks:
      1. challenge_id exists
      2. Not already used (anti-replay guard)
      3. Not expired
      4. Phrase matches (normalized case & whitespace)

    Returns:
      (True, "") on success.
      (False, "wrong_or_expired_challenge") on any failure.
    """
    if not challenge_id:
        logger.warning("[Challenge] Verification failed: missing challenge_id")
        return False, "wrong_or_expired_challenge"

    with _lock:
        challenge = _challenges.get(challenge_id)
        if challenge is None:
            logger.warning(f"[Challenge] Verification failed: unknown challenge_id {challenge_id}")
            return False, "wrong_or_expired_challenge"

        now = datetime.now(timezone.utc)

        # Anti-replay check: cannot use twice
        if challenge.used:
            logger.warning(f"[Challenge] Replay attack detected: challenge {challenge_id} was already used")
            return False, "wrong_or_expired_challenge"

        # Expiry check
        if now > challenge.expires_at:
            logger.warning(f"[Challenge] Challenge expired for {challenge_id}")
            return False, "wrong_or_expired_challenge"

        # Text match check
        if not submitted_phrase:
            logger.warning(f"[Challenge] Missing submitted_phrase for {challenge_id}")
            return False, "wrong_or_expired_challenge"

        norm_expected = " ".join(challenge.phrase.strip().upper().split())
        norm_submitted = " ".join(submitted_phrase.strip().upper().split())

        if norm_expected != norm_submitted:
            logger.warning(f"[Challenge] Phrase mismatch: expected '{norm_expected}', got '{norm_submitted}'")
            return False, "wrong_or_expired_challenge"

        # Mark as used immediately to prevent replay
        challenge.used = True

    logger.info(f"[Challenge] Successfully verified challenge {challenge_id}")
    return True, ""


def reset_challenges_for_testing() -> None:
    """Utility function to clear active challenge store in tests."""
    with _lock:
        _challenges.clear()
