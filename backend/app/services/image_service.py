"""Image I/O utilities: DICOM, PNG, JPG → grayscale numpy arrays."""

import numpy as np
import cv2
import io
import base64
import logging
from pathlib import Path
from typing import Optional, Tuple

logger = logging.getLogger(__name__)


def load_image_from_bytes(data: bytes, filename: str = "") -> np.ndarray:
    """Load image bytes into a grayscale uint8 numpy array."""
    ext = Path(filename).suffix.lower()

    if ext in (".dcm", ".dicom"):
        return _load_dicom(data)

    arr = np.frombuffer(data, np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_GRAYSCALE)
    if img is None:
        raise ValueError(f"Could not decode image: {filename}")
    return img


def _load_dicom(data: bytes) -> np.ndarray:
    """Load DICOM file and extract pixel array as grayscale."""
    try:
        import pydicom
        ds = pydicom.dcmread(io.BytesIO(data))
        pixel_array = ds.pixel_array.astype(np.float64)
        # Window/level normalisation
        pixel_min, pixel_max = pixel_array.min(), pixel_array.max()
        if pixel_max > pixel_min:
            pixel_array = (pixel_array - pixel_min) / (pixel_max - pixel_min) * 255
        return pixel_array.astype(np.uint8)
    except ImportError:
        logger.warning("pydicom not installed — treating DICOM as raw bytes.")
        arr = np.frombuffer(data, np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_GRAYSCALE)
        if img is None:
            raise ValueError("Cannot decode DICOM without pydicom.")
        return img


def preprocess_image(
    image: np.ndarray,
    target_size: Tuple[int, int] = (512, 512),
) -> np.ndarray:
    """Resize to target_size and ensure grayscale uint8."""
    if image.ndim == 3:
        image = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    if image.shape[:2] != target_size:
        image = cv2.resize(image, target_size, interpolation=cv2.INTER_LANCZOS4)
    return image.astype(np.uint8)


def image_to_base64(image: np.ndarray, fmt: str = ".png") -> str:
    """Encode numpy uint8 image as base64 string."""
    success, buffer = cv2.imencode(fmt, image)
    if not success:
        raise ValueError("Failed to encode image to base64")
    return base64.b64encode(buffer.tobytes()).decode("utf-8")


def save_image(image: np.ndarray, path: str) -> None:
    """Save numpy uint8 image to disk."""
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(path, image)


def load_image_from_path(path: str) -> np.ndarray:
    """Load grayscale image from filesystem path."""
    img = cv2.imread(path, cv2.IMREAD_GRAYSCALE)
    if img is None:
        raise FileNotFoundError(f"Image not found: {path}")
    return img


def get_image_stats(image: np.ndarray) -> dict:
    """Return basic statistics for a grayscale image."""
    return {
        "width": int(image.shape[1]),
        "height": int(image.shape[0]),
        "mean": float(np.mean(image)),
        "std": float(np.std(image)),
        "min": int(image.min()),
        "max": int(image.max()),
        "dtype": str(image.dtype),
    }
