"""
services/fusion_service.py — Two-factor biometric decision fusion engine.

Computes weighted score fusion and applies the decision logic matrix:
  Combined Score = w_face * Score_face + w_voice * Score_voice

Decision rules:
  1. Face PASS and Voice PASS and Combined PASS:
     → is_present=True, is_flagged=False, flag_reason=None
  2. Face PASS and Voice PASS but Combined FAIL:
     → is_present=False, is_flagged=True, flag_reason="combined_score_low"
  3. Face PASS and Voice FAIL:
     → is_present=False, is_flagged=True, flag_reason="face_matches_voice_fails"
  4. Face FAIL and Voice PASS:
     → is_present=False, is_flagged=True, flag_reason="voice_matches_face_fails"
  5. Face FAIL and Voice FAIL:
     → is_present=False, is_flagged=True, flag_reason="unknown_face"
"""

from typing import Optional


def evaluate_fusion(
    face_score: float,
    voice_score: float,
    face_threshold: float = 0.45,
    voice_threshold: float = 0.75,
    face_weight: float = 0.60,
    voice_weight: float = 0.40,
    combined_threshold: float = 0.60,
) -> tuple[bool, bool, Optional[str], float]:
    """
    Evaluate two-factor biometric fusion for given individual scores.

    Parameters:
      face_score: Cosine similarity score for face (0.0 to 1.0)
      voice_score: Cosine similarity score for voice (0.0 to 1.0)
      face_threshold: Cutoff for face match (default 0.45)
      voice_threshold: Cutoff for voice match (default 0.75)
      face_weight: Weight for face score in linear combination (default 0.60)
      voice_weight: Weight for voice score in linear combination (default 0.40)
      combined_threshold: Cutoff for combined score (default 0.60)

    Returns:
      (is_present, is_flagged, flag_reason, combined_score)
    """
    combined_score = round(face_weight * face_score + voice_weight * voice_score, 4)

    face_match = face_score >= face_threshold
    voice_match = voice_score >= voice_threshold
    combined_match = combined_score >= combined_threshold

    if face_match and voice_match:
        if combined_match:
            return True, False, None, combined_score
        else:
            return False, True, "combined_score_low", combined_score
    elif face_match and not voice_match:
        return False, True, "face_matches_voice_fails", combined_score
    elif not face_match and voice_match:
        return False, True, "voice_matches_face_fails", combined_score
    else:
        return False, True, "unknown_face", combined_score
