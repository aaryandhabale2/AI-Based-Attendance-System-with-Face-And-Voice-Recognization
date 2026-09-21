"""
services/face_service.py — Face recognition using InsightFace (ArcFace).

Fallback: if insightface is not installed, DeepFace with ArcFace model is used.

Architecture:
  - Enrollment : receive N JPEG frames → detect face → extract 512-d embedding
                 → average all embeddings → store as student.face_embedding
  - Recognition: extract embedding from new frame → cosine similarity
                 against enrolled embedding → return score + match bool
"""

import logging
import numpy as np
from typing import Optional

logger = logging.getLogger(__name__)

# ── Backend detection (InsightFace → DeepFace fallback) ──────────────────────
_BACKEND = "none"
_app_instance = None  # InsightFace app
_deepface_available = False

try:
    import insightface
    from insightface.app import FaceAnalysis
    _BACKEND = "insightface"
    logger.info("[FaceService] InsightFace available — using ArcFace.")
except ImportError:
    logger.warning("[FaceService] InsightFace not found — trying DeepFace …")
    try:
        import deepface  # noqa: F401
        _BACKEND = "deepface"
        _deepface_available = True
        logger.info("[FaceService] DeepFace available — using ArcFace model.")
    except ImportError:
        logger.error(
            "[FaceService] Neither InsightFace nor DeepFace found. "
            "Face recognition is DISABLED."
        )


def _get_insightface_app():
    """Lazy-init InsightFace FaceAnalysis (downloads model on first call)."""
    global _app_instance
    if _app_instance is None:
        _app_instance = FaceAnalysis(
            name="buffalo_sc",  # lightweight ArcFace model
            providers=["CPUExecutionProvider"],
        )
        _app_instance.prepare(ctx_id=0, det_size=(640, 640))
    return _app_instance


# ── Public API ────────────────────────────────────────────────────────────────

def extract_embedding_from_bytes(image_bytes: bytes) -> Optional[np.ndarray]:
    """
    Decode a JPEG/PNG image from bytes, detect the largest face,
    and return its ArcFace embedding vector (512-d float32).
    Returns None if no face detected.
    """
    import cv2

    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        logger.warning("[FaceService] Could not decode image bytes.")
        return None

    return _extract_embedding_from_bgr(img)


def _extract_embedding_from_bgr(bgr_img: np.ndarray) -> Optional[np.ndarray]:
    """Internal: extract embedding from a BGR numpy array."""
    if _BACKEND == "insightface":
        return _insightface_embed(bgr_img)
    elif _BACKEND == "deepface":
        return _deepface_embed(bgr_img)
    else:
        return None


def _insightface_embed(bgr_img: np.ndarray) -> Optional[np.ndarray]:
    """Extract ArcFace embedding via InsightFace."""
    try:
        app = _get_insightface_app()
        faces = app.get(bgr_img)
        if not faces:
            return None
        # Use largest face by bounding-box area
        largest = max(faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))
        emb = largest.embedding
        return emb / (np.linalg.norm(emb) + 1e-10)  # L2 normalise
    except Exception as exc:
        logger.error(f"[FaceService/InsightFace] Embedding failed: {exc}")
        return None


def _deepface_embed(bgr_img: np.ndarray) -> Optional[np.ndarray]:
    """Extract ArcFace embedding via DeepFace."""
    try:
        import cv2
        from deepface import DeepFace

        # DeepFace expects BGR numpy array or file path
        result = DeepFace.represent(
            img_path=bgr_img,
            model_name="ArcFace",
            enforce_detection=True,
            detector_backend="opencv",
        )
        if result:
            emb = np.array(result[0]["embedding"], dtype=np.float32)
            return emb / (np.linalg.norm(emb) + 1e-10)
        return None
    except Exception as exc:
        logger.error(f"[FaceService/DeepFace] Embedding failed: {exc}")
        return None


def average_embeddings(embeddings: list[np.ndarray]) -> np.ndarray:
    """Average a list of embedding vectors and L2-normalise the result."""
    stacked = np.stack(embeddings, axis=0)
    mean = stacked.mean(axis=0)
    return mean / (np.linalg.norm(mean) + 1e-10)


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """Return cosine similarity between two L2-normalised vectors [0, 1]."""
    return float(np.clip(np.dot(a, b), 0.0, 1.0))


def enroll_face(frame_bytes_list: list[bytes]) -> Optional[list[float]]:
    """
    Enroll a student face from a list of image byte strings.
    Extracts embeddings, averages them, returns the averaged embedding
    as a Python float list (for JSON storage).
    Returns None if no valid embeddings could be extracted.
    """
    embeddings = []
    for fb in frame_bytes_list:
        emb = extract_embedding_from_bytes(fb)
        if emb is not None:
            embeddings.append(emb)

    if not embeddings:
        logger.warning("[FaceService] No valid face embeddings from enrollment frames.")
        return None

    logger.info(f"[FaceService] Enrolled from {len(embeddings)}/{len(frame_bytes_list)} frames.")
    avg = average_embeddings(embeddings)
    return avg.tolist()


def recognize_face(
    frame_bytes: bytes,
    stored_embedding: list[float],
    threshold: float = 0.45,
) -> tuple[float, bool]:
    """
    Recognize a face against a stored embedding.
    Returns (score, matched) where score ∈ [0, 1].
    """
    probe = extract_embedding_from_bytes(frame_bytes)
    if probe is None:
        return 0.0, False

    gallery = np.array(stored_embedding, dtype=np.float32)
    gallery = gallery / (np.linalg.norm(gallery) + 1e-10)

    score = cosine_similarity(probe, gallery)
    matched = score >= threshold
    logger.info(f"[FaceService] Score={score:.4f} threshold={threshold} matched={matched}")
    return score, matched


def get_backend_name() -> str:
    """Return the active face recognition backend name."""
    return _BACKEND
