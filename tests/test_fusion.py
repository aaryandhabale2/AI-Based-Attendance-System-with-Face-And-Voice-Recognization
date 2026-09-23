"""
tests/test_fusion.py — Unit tests for two-factor biometric decision fusion.

Tests every pass/fail combination of face, voice, and combined thresholds:
  1. Face PASS, Voice PASS, Combined PASS → PRESENT
  2. Face PASS, Voice PASS, Combined FAIL → FLAGGED (combined_score_low)
  3. Face PASS, Voice FAIL, Combined PASS/FAIL → FLAGGED (face_matches_voice_fails)
  4. Face FAIL, Voice PASS, Combined PASS/FAIL → FLAGGED (voice_matches_face_fails)
  5. Face FAIL, Voice FAIL, Combined FAIL → FLAGGED (unknown_face)
"""

import pytest
from backend.services.fusion_service import evaluate_fusion


def test_fusion_both_pass_combined_pass():
    """Face and Voice both meet thresholds, combined score meets threshold → PRESENT."""
    face_score = 0.85
    voice_score = 0.90
    is_present, is_flagged, reason, combined = evaluate_fusion(
        face_score=face_score,
        voice_score=voice_score,
        face_threshold=0.45,
        voice_threshold=0.75,
        face_weight=0.60,
        voice_weight=0.40,
        combined_threshold=0.60,
    )
    expected_combined = round(0.60 * 0.85 + 0.40 * 0.90, 4)  # 0.51 + 0.36 = 0.87
    assert is_present is True
    assert is_flagged is False
    assert reason is None
    assert combined == expected_combined


def test_fusion_both_pass_combined_fail():
    """Face and voice meet individual thresholds, but combined score is below combined threshold."""
    face_score = 0.46  # >= 0.45 (pass)
    voice_score = 0.76  # >= 0.75 (pass)
    # Combined = 0.60 * 0.46 + 0.40 * 0.76 = 0.276 + 0.304 = 0.58
    # If combined_threshold is 0.65:
    is_present, is_flagged, reason, combined = evaluate_fusion(
        face_score=face_score,
        voice_score=voice_score,
        face_threshold=0.45,
        voice_threshold=0.75,
        face_weight=0.60,
        voice_weight=0.40,
        combined_threshold=0.65,
    )
    assert is_present is False
    assert is_flagged is True
    assert reason == "combined_score_low"
    assert combined == 0.58


def test_fusion_face_pass_voice_fail():
    """Face matches, but voice fails → FLAGGED (face_matches_voice_fails)."""
    face_score = 0.92  # >= 0.45
    voice_score = 0.30  # < 0.75
    is_present, is_flagged, reason, combined = evaluate_fusion(
        face_score=face_score,
        voice_score=voice_score,
        face_threshold=0.45,
        voice_threshold=0.75,
        face_weight=0.60,
        voice_weight=0.40,
        combined_threshold=0.60,
    )
    assert is_present is False
    assert is_flagged is True
    assert reason == "face_matches_voice_fails"


def test_fusion_voice_pass_face_fail():
    """Voice matches, but face fails → FLAGGED (voice_matches_face_fails)."""
    face_score = 0.25  # < 0.45
    voice_score = 0.88  # >= 0.75
    is_present, is_flagged, reason, combined = evaluate_fusion(
        face_score=face_score,
        voice_score=voice_score,
        face_threshold=0.45,
        voice_threshold=0.75,
        face_weight=0.60,
        voice_weight=0.40,
        combined_threshold=0.60,
    )
    assert is_present is False
    assert is_flagged is True
    assert reason == "voice_matches_face_fails"


def test_fusion_both_fail():
    """Neither face nor voice matches → FLAGGED (unknown_face)."""
    face_score = 0.20  # < 0.45
    voice_score = 0.35  # < 0.75
    is_present, is_flagged, reason, combined = evaluate_fusion(
        face_score=face_score,
        voice_score=voice_score,
        face_threshold=0.45,
        voice_threshold=0.75,
        face_weight=0.60,
        voice_weight=0.40,
        combined_threshold=0.60,
    )
    assert is_present is False
    assert is_flagged is True
    assert reason == "unknown_face"


@pytest.mark.parametrize(
    "face,voice,f_thresh,v_thresh,c_thresh,expected_present,expected_flagged,expected_reason",
    [
        # All pass
        (0.70, 0.80, 0.45, 0.75, 0.60, True, False, None),
        # Exactly on thresholds (boundary equality)
        (0.45, 0.75, 0.45, 0.75, 0.57, True, False, None),
        # Individual pass, combined fail
        (0.45, 0.75, 0.45, 0.75, 0.65, False, True, "combined_score_low"),
        # Face pass, voice fail
        (0.80, 0.50, 0.45, 0.75, 0.60, False, True, "face_matches_voice_fails"),
        # Voice pass, face fail
        (0.30, 0.90, 0.45, 0.75, 0.60, False, True, "voice_matches_face_fails"),
        # Both fail
        (0.10, 0.10, 0.45, 0.75, 0.60, False, True, "unknown_face"),
    ],
)
def test_fusion_full_matrix(
    face, voice, f_thresh, v_thresh, c_thresh,
    expected_present, expected_flagged, expected_reason
):
    present, flagged, reason, _ = evaluate_fusion(
        face_score=face,
        voice_score=voice,
        face_threshold=f_thresh,
        voice_threshold=v_thresh,
        combined_threshold=c_thresh,
    )
    assert present is expected_present
    assert flagged is expected_flagged
    assert reason == expected_reason
