"""
tests/test_anti_replay.py — Unit tests for anti-replay challenge phrase system.

Verifies:
  1. Challenge generation creates a unique challenge_id, phrase, and expiry window.
  2. First verification with correct phrase succeeds.
  3. Replay attack: attempting to reuse the SAME phrase fails with 'wrong_or_expired_challenge'.
  4. Expiry: challenge submitted past its TTL fails with 'wrong_or_expired_challenge'.
  5. Wrong phrase: submitting an incorrect phrase fails with 'wrong_or_expired_challenge'.
  6. Unknown/missing challenge_id fails with 'wrong_or_expired_challenge'.
"""

import time
from backend.services.challenge_service import (
    create_challenge,
    verify_challenge,
    reset_challenges_for_testing,
)


def setup_function():
    reset_challenges_for_testing()


def test_challenge_generation_and_success():
    """Verify that a valid challenge passes verification on first use."""
    ch = create_challenge(ttl_seconds=30)
    assert "challenge_id" in ch
    assert "phrase" in ch
    assert ch["expires_in"] == 30

    cid = ch["challenge_id"]
    phrase = ch["phrase"]

    valid, reason = verify_challenge(cid, phrase)
    assert valid is True
    assert reason == ""


def test_anti_replay_reuse_prevention():
    """Verify that a phrase CANNOT be used more than once (one-time nonce)."""
    ch = create_challenge(ttl_seconds=30)
    cid = ch["challenge_id"]
    phrase = ch["phrase"]

    # First use: passes
    valid1, reason1 = verify_challenge(cid, phrase)
    assert valid1 is True
    assert reason1 == ""

    # Second use (replay attack): must fail
    valid2, reason2 = verify_challenge(cid, phrase)
    assert valid2 is False
    assert reason2 == "wrong_or_expired_challenge"

    # Third use: still fails
    valid3, reason3 = verify_challenge(cid, phrase)
    assert valid3 is False
    assert reason3 == "wrong_or_expired_challenge"


def test_challenge_expiry():
    """Verify that challenge fails after expiration."""
    # Create with 0 or 1-second TTL
    ch = create_challenge(ttl_seconds=1)
    cid = ch["challenge_id"]
    phrase = ch["phrase"]

    # Sleep past the 1-second TTL
    time.sleep(1.2)

    valid, reason = verify_challenge(cid, phrase)
    assert valid is False
    assert reason == "wrong_or_expired_challenge"


def test_wrong_phrase():
    """Verify that submitting an incorrect phrase fails."""
    ch = create_challenge(ttl_seconds=30)
    cid = ch["challenge_id"]

    valid, reason = verify_challenge(cid, "INCORRECT WRONG PHRASE 99")
    assert valid is False
    assert reason == "wrong_or_expired_challenge"


def test_case_and_whitespace_insensitivity():
    """Verify that verification handles minor whitespace and case differences."""
    ch = create_challenge(ttl_seconds=30)
    cid = ch["challenge_id"]
    phrase = ch["phrase"]

    # Lowercase with extra spaces
    manipulated = f"  {phrase.lower()}   "
    valid, reason = verify_challenge(cid, manipulated)
    assert valid is True
    assert reason == ""


def test_missing_or_unknown_challenge_id():
    """Verify that None or non-existent challenge ID is rejected."""
    valid1, reason1 = verify_challenge(None, "ALPHA TIGER 42")
    assert valid1 is False
    assert reason1 == "wrong_or_expired_challenge"

    valid2, reason2 = verify_challenge("00000000-0000-0000-0000-000000000000", "ALPHA TIGER 42")
    assert valid2 is False
    assert reason2 == "wrong_or_expired_challenge"
