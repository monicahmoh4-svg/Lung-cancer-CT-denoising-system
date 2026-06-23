"""
Advanced noise analysis and enhancement utilities.
Extends the base pipeline with:
 - Bilateral filter (edge-preserving)
 - Non-Local Means (NLM) denoising
 - Adaptive threshold selection (BayesShrink / VisuShrink)
 - Multi-scale noise estimation
 - Image quality scoring
"""

import numpy as np
import cv2
import pywt
import logging
from typing import Optional, Dict, Tuple

logger = logging.getLogger(__name__)


# ─── Adaptive Threshold Selection ──────────────────────────────────────────────

def visushrink_threshold(coeffs_detail, sigma: float) -> float:
    """
    VisuShrink: λ = σ√(2·ln(N))
    Universal threshold — guaranteed to remove all noise with high probability.
    """
    flat = np.concatenate([c.ravel() for c in coeffs_detail])
    N = flat.size
    return float(sigma * np.sqrt(2 * np.log(max(N, 1))))


def bayesshrink_threshold(coeffs_subband: np.ndarray, sigma_noise: float) -> float:
    """
    BayesShrink: adaptive per-sub-band threshold.
    λ = σ²_noise / σ_signal
    Minimises Bayes risk; better detail preservation than VisuShrink.
    """
    sigma2_noise = sigma_noise ** 2
    sigma2_y = float(np.var(coeffs_subband))
    sigma2_x = max(sigma2_y - sigma2_noise, 1e-10)
    return float(sigma2_noise / np.sqrt(sigma2_x))


def adaptive_threshold_wavelet(
    image: np.ndarray,
    sigma: float,
    level: int = 2,
    method: str = "bayesshrink",
) -> np.ndarray:
    """
    Wavelet denoising with adaptive per-sub-band thresholds.
    method: 'bayesshrink' | 'visushrink'
    """
    img_float = image.astype(np.float64) / 255.0
    coeffs = pywt.wavedec2(img_float, "haar", level=level)

    new_coeffs = [coeffs[0]]
    for level_detail in coeffs[1:]:
        new_level = []
        for subband in level_detail:
            if method == "bayesshrink":
                lam = bayesshrink_threshold(subband, sigma)
            else:
                lam = visushrink_threshold([subband], sigma)
            new_level.append(pywt.threshold(subband, lam, mode="soft"))
        new_coeffs.append(tuple(new_level))

    reconstructed = pywt.waverec2(new_coeffs, "haar")
    return np.clip(reconstructed * 255.0, 0, 255).astype(np.uint8)


# ─── Bilateral Filter (edge-preserving) ────────────────────────────────────────

def bilateral_denoise(
    image: np.ndarray,
    d: int = 9,
    sigma_color: float = 75,
    sigma_space: float = 75,
) -> np.ndarray:
    """
    Bilateral filter: smooths while preserving edges.
    Uses both spatial and intensity closeness.
    """
    return cv2.bilateralFilter(image, d, sigma_color, sigma_space)


# ─── Non-Local Means ────────────────────────────────────────────────────────────

def nlm_denoise(
    image: np.ndarray,
    h: float = 10,
    template_window: int = 7,
    search_window: int = 21,
) -> np.ndarray:
    """
    Fast Non-Local Means denoising (OpenCV).
    h: filter strength — larger h removes more noise but blurs details.
    """
    return cv2.fastNlMeansDenoising(image, None, h, template_window, search_window)


# ─── Multi-scale noise estimation ───────────────────────────────────────────────

def multiscale_noise_estimate(image: np.ndarray) -> Dict[str, float]:
    """
    Estimate noise at multiple scales using Haar DWT.
    Returns sigma estimates at each level.
    """
    img_float = image.astype(np.float64) / 255.0
    estimates = {}
    for level in range(1, 4):
        try:
            coeffs = pywt.wavedec2(img_float, "haar", level=level)
            # Use diagonal sub-band (HH) at finest level
            hh = coeffs[1][2]
            sigma = float(np.median(np.abs(hh)) / 0.6745)
            estimates[f"level_{level}"] = round(sigma, 6)
        except Exception:
            break
    estimates["mean"] = round(np.mean(list(estimates.values())), 6) if estimates else 0.0
    return estimates


# ─── Image quality scoring ───────────────────────────────────────────────────────

def sharpness_score(image: np.ndarray) -> float:
    """
    Laplacian variance — measures image sharpness.
    Higher = sharper (more HF content preserved).
    """
    lap = cv2.Laplacian(image.astype(np.float64), cv2.CV_64F)
    return float(lap.var())


def contrast_score(image: np.ndarray) -> float:
    """Standard deviation of pixel intensities — measures contrast."""
    return float(image.astype(np.float64).std())


def entropy_score(image: np.ndarray) -> float:
    """Shannon entropy of pixel histogram — measures information content."""
    hist = cv2.calcHist([image], [0], None, [256], [0, 256]).flatten()
    hist = hist / (hist.sum() + 1e-10)
    hist = hist[hist > 0]
    return float(-np.sum(hist * np.log2(hist)))


def full_quality_report(
    original: np.ndarray,
    denoised: np.ndarray,
) -> Dict[str, float]:
    """
    Comprehensive quality report comparing original and denoised images.
    """
    from app.services.denoising_pipeline import compute_psnr, compute_ssim, compute_mse, compute_snr

    return {
        # Standard metrics
        "psnr":     round(compute_psnr(original, denoised), 4),
        "ssim":     round(compute_ssim(original, denoised), 4),
        "mse":      round(compute_mse(original, denoised), 4),
        "snr":      round(compute_snr(original, denoised), 4),
        # Sharpness / detail preservation
        "sharpness_original":  round(sharpness_score(original),  2),
        "sharpness_denoised":  round(sharpness_score(denoised),  2),
        "sharpness_ratio":     round(sharpness_score(denoised) / max(sharpness_score(original), 1e-6), 4),
        # Contrast
        "contrast_original":   round(contrast_score(original),   2),
        "contrast_denoised":   round(contrast_score(denoised),   2),
        # Information
        "entropy_original":    round(entropy_score(original),    4),
        "entropy_denoised":    round(entropy_score(denoised),    4),
    }


# ─── Enhanced pipeline with multiple filter options ──────────────────────────────

def enhanced_pipeline(
    noisy: np.ndarray,
    original: Optional[np.ndarray] = None,
    sigma: float = 0.15,
    use_bilateral: bool = True,
    use_nlm: bool = False,
    wavelet_threshold_method: str = "bayesshrink",
    dwt_level: int = 2,
) -> Tuple[np.ndarray, Dict]:
    """
    Enhanced pipeline with extra filter stages.

    Flow: AGF → [Bilateral] → [NLM] → Adaptive Wavelet → [DnCNN]
    """
    import time
    from app.services.denoising_pipeline import (
        anisotropic_gaussian_filter, estimate_noise_wavelet,
        compute_psnr, compute_ssim, compute_mse, compute_snr,
    )

    t0 = time.perf_counter()

    if noisy.ndim == 3:
        noisy = cv2.cvtColor(noisy, cv2.COLOR_BGR2GRAY)
    noisy = np.clip(noisy, 0, 255).astype(np.uint8)

    # Stage 1: AGF
    ksize = max(3, int(6 * sigma * 255 + 1))
    if ksize % 2 == 0:
        ksize += 1
    ksize = min(ksize, 15)
    result = anisotropic_gaussian_filter(noisy, sigma * 255, ksize)

    # Stage 2: Bilateral (optional)
    if use_bilateral:
        sigma_c = max(20, sigma * 255 * 0.8)
        result = bilateral_denoise(result, d=7, sigma_color=sigma_c, sigma_space=sigma_c)

    # Stage 3: NLM (optional)
    if use_nlm:
        h_strength = max(3, sigma * 255 * 0.6)
        result = nlm_denoise(result, h=h_strength)

    # Stage 4: Adaptive wavelet threshold
    result = adaptive_threshold_wavelet(result, sigma, level=dwt_level, method=wavelet_threshold_method)

    # Resize if needed
    if result.shape != noisy.shape:
        result = cv2.resize(result, (noisy.shape[1], noisy.shape[0]))

    elapsed_ms = (time.perf_counter() - t0) * 1000
    ref = original if original is not None else noisy

    metrics = {
        "psnr": round(compute_psnr(ref, result), 4),
        "ssim": round(compute_ssim(ref, result), 4),
        "mse":  round(compute_mse(ref, result),  4),
        "snr":  round(compute_snr(ref, result),  4),
        "processing_time_ms": round(elapsed_ms, 2),
        "pipeline": f"AGF+{'Bilateral+' if use_bilateral else ''}{'NLM+' if use_nlm else ''}AdaptiveWavelet({wavelet_threshold_method})",
    }

    return result, metrics
