"""
services/voice_service.py — Speaker verification using Resemblyzer.

Architecture:
  - Enrollment : receive N WAV/WebM audio blobs → preprocess with librosa
                 → extract 256-d d-vector embeddings → average → store
  - Recognition: extract embedding from new audio → cosine similarity
                 against enrolled embedding → return score + match bool
"""

import logging
import io
import numpy as np
from typing import Optional

logger = logging.getLogger(__name__)

# ── Resemblyzer lazy init ─────────────────────────────────────────────────────
_encoder = None
_RESEMBLYZER_OK = False

try:
    from resemblyzer import VoiceEncoder, preprocess_wav
    _RESEMBLYZER_OK = True
    logger.info("[VoiceService] Resemblyzer available.")
except ImportError:
    logger.error("[VoiceService] Resemblyzer not found. Voice recognition is DISABLED.")


def _get_encoder() -> "VoiceEncoder":
    global _encoder
    if _encoder is None:
        from resemblyzer import VoiceEncoder
        _encoder = VoiceEncoder(device="cpu")
    return _encoder


# ── Audio loading helper ──────────────────────────────────────────────────────
def _load_wav_from_bytes(audio_bytes: bytes, target_sr: int = 16000) -> Optional[np.ndarray]:
    """
    Decode audio bytes (WAV, WebM, OGG, etc.) to a mono float32 array
    at target_sr Hz using librosa (handles format conversion).
    Returns None on failure.
    """
    try:
        import librosa
        y, sr = librosa.load(io.BytesIO(audio_bytes), sr=target_sr, mono=True)
        if len(y) < target_sr * 0.5:  # reject clips shorter than 0.5 s
            logger.warning("[VoiceService] Audio clip too short (<0.5 s). Skipped.")
            return None
        return y.astype(np.float32)
    except Exception as exc:
        logger.error(f"[VoiceService] Audio decode failed: {exc}")
        return None


# ── Public API ────────────────────────────────────────────────────────────────

def extract_embedding_from_bytes(audio_bytes: bytes) -> Optional[np.ndarray]:
    """
    Extract a 256-d speaker embedding from raw audio bytes.
    Returns None if Resemblyzer is unavailable or audio is too short.
    """
    if not _RESEMBLYZER_OK:
        return None

    wav = _load_wav_from_bytes(audio_bytes)
    if wav is None:
        return None

    try:
        from resemblyzer import preprocess_wav
        preprocessed = preprocess_wav(wav, source_sr=16000)
        encoder = _get_encoder()
        emb = encoder.embed_utterance(preprocessed)
        return emb / (np.linalg.norm(emb) + 1e-10)
    except Exception as exc:
        logger.error(f"[VoiceService] Embedding failed: {exc}")
        return None


def average_embeddings(embeddings: list[np.ndarray]) -> np.ndarray:
    """Average a list of d-vectors and L2-normalise."""
    stacked = np.stack(embeddings, axis=0)
    mean = stacked.mean(axis=0)
    return mean / (np.linalg.norm(mean) + 1e-10)


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """Cosine similarity between two L2-normalised vectors."""
    return float(np.clip(np.dot(a, b), 0.0, 1.0))


def enroll_voice(audio_bytes_list: list[bytes]) -> Optional[list[float]]:
    """
    Enroll a student's voice from a list of audio blobs.
    Returns the averaged embedding as a float list (for JSON storage),
    or None if no valid embeddings were extracted.
    """
    embeddings = []
    for ab in audio_bytes_list:
        emb = extract_embedding_from_bytes(ab)
        if emb is not None:
            embeddings.append(emb)

    if not embeddings:
        logger.warning("[VoiceService] No valid voice embeddings from enrollment samples.")
        return None

    logger.info(f"[VoiceService] Enrolled from {len(embeddings)}/{len(audio_bytes_list)} samples.")
    avg = average_embeddings(embeddings)
    return avg.tolist()


def recognize_voice(
    audio_bytes: bytes,
    stored_embedding: list[float],
    threshold: float = 0.75,
) -> tuple[float, bool]:
    """
    Verify a voice sample against a stored embedding.
    Returns (score, matched) where score ∈ [0, 1].
    """
    probe = extract_embedding_from_bytes(audio_bytes)
    if probe is None:
        return 0.0, False

    gallery = np.array(stored_embedding, dtype=np.float32)
    gallery = gallery / (np.linalg.norm(gallery) + 1e-10)

    score = cosine_similarity(probe, gallery)
    matched = score >= threshold
    logger.info(f"[VoiceService] Score={score:.4f} threshold={threshold} matched={matched}")
    return score, matched


def is_available() -> bool:
    return _RESEMBLYZER_OK
