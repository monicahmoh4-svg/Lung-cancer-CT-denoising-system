"""
Hybrid Denoising Pipeline
=========================
1. Anisotropic Gaussian Filter (AGF) — preprocessing
2. Haar Wavelet Transform (DWT level-2) — preprocessing + soft thresholding
3. DnCNN (deep CNN) — post-processing
4. Inverse Haar DWT — reconstruct

Reference: Abuya et al., Appl. Sci. 2023, 13, 12069
"""

import numpy as np
import cv2
import pywt
import logging
import time
from typing import Tuple, Optional
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class DenoiseResult:
    denoised: np.ndarray
    psnr: float
    ssim: float
    mse: float
    snr: float
    noise_sigma: float
    processing_time_ms: float
    pipeline: str = "AGF+Haar+DnCNN"


# ─── Noise Estimation ──────────────────────────────────────────────────────────

def estimate_noise_mad(image: np.ndarray) -> float:
    """
    Estimate Gaussian noise σ using Median Absolute Deviation (MAD).
    Robust estimator: σ ≈ MAD / 0.6745
    """
    img_float = image.astype(np.float64) / 255.0
    median = np.median(img_float)
    mad = np.median(np.abs(img_float - median))
    sigma = mad / 0.6745
    return float(np.clip(sigma, 0.001, 1.0))


def estimate_noise_wavelet(image: np.ndarray) -> float:
    """
    Wavelet-based noise estimation (Donoho & Johnstone method).
    Uses HH1 sub-band of Haar DWT.
    """
    img_float = image.astype(np.float64) / 255.0
    _, (_, _, hh) = pywt.dwt2(img_float, "haar")
    sigma = np.median(np.abs(hh)) / 0.6745
    return float(np.clip(sigma, 0.001, 1.0))


def estimate_noise_laplacian(image: np.ndarray) -> float:
    """
    Laplacian-variance method for noise estimation.
    """
    img_float = image.astype(np.float64)
    laplacian = cv2.Laplacian(img_float, cv2.CV_64F)
    sigma = np.sqrt(np.abs(np.mean(laplacian ** 2)) / 36.0) / 255.0
    return float(np.clip(sigma, 0.001, 1.0))


# ─── Anisotropic Gaussian Filter ───────────────────────────────────────────────

def anisotropic_gaussian_filter(
    image: np.ndarray,
    sigma: float,
    ksize: Optional[int] = None,
    sigma_x: Optional[float] = None,
    sigma_y: Optional[float] = None,
) -> np.ndarray:
    """
    Anisotropic Gaussian filter — adaptively smooths along edges.
    G(x,y) = exp(-(x²+y²) / 2σ²)

    Uses separate σ_x and σ_y to model directionality:
    - Small σ_y preserves horizontal edges
    - Small σ_x preserves vertical edges
    Combined by averaging to get directional-aware denoising.
    """
    if ksize is None:
        ksize = max(3, int(6 * sigma + 1))
        if ksize % 2 == 0:
            ksize += 1

    sigma_x = sigma_x or sigma
    sigma_y = sigma_y or sigma * 0.7  # anisotropy: less blur in y-direction

    img_float = image.astype(np.float64)

    # Horizontal pass (σ_x)
    h_pass = cv2.GaussianBlur(img_float, (ksize, ksize), sigmaX=sigma_x, sigmaY=0)
    # Vertical pass (σ_y)
    v_pass = cv2.GaussianBlur(img_float, (ksize, ksize), sigmaX=0, sigmaY=sigma_y)

    # Gradient-based edge map to blend passes
    grad_x = cv2.Sobel(img_float, cv2.CV_64F, 1, 0, ksize=3)
    grad_y = cv2.Sobel(img_float, cv2.CV_64F, 0, 1, ksize=3)
    grad_mag = np.sqrt(grad_x ** 2 + grad_y ** 2)
    grad_mag_norm = grad_mag / (grad_mag.max() + 1e-8)

    # Edge-adaptive blend: at edges, use less smoothing
    blended = (1 - grad_mag_norm) * h_pass + grad_mag_norm * img_float
    blended = cv2.GaussianBlur(blended, (3, 3), sigmaX=sigma * 0.3)

    return np.clip(blended, 0, 255).astype(np.uint8)


# ─── Haar Wavelet Transform ─────────────────────────────────────────────────────

def haar_dwt2_decompose(image: np.ndarray, level: int = 2):
    """
    2D Haar DWT decomposition.
    Returns coefficients list: [cA, (cH, cV, cD) × level]
    """
    img_float = image.astype(np.float64) / 255.0
    coeffs = pywt.wavedec2(img_float, "haar", level=level)
    return coeffs


def soft_threshold(coeffs, threshold: float):
    """
    Apply soft thresholding: sign(c) · max(|c| - λ, 0)
    Zeroes small-magnitude (noise) coefficients; shrinks larger ones.
    """
    def _threshold(c):
        return pywt.threshold(c, threshold, mode="soft")

    new_coeffs = [coeffs[0]]  # Keep approximation sub-band unchanged
    for level_coeffs in coeffs[1:]:
        new_coeffs.append(tuple(_threshold(c) for c in level_coeffs))
    return new_coeffs


def haar_idwt2_reconstruct(coeffs) -> np.ndarray:
    """
    Inverse 2D Haar DWT to reconstruct the denoised image.
    """
    reconstructed = pywt.waverec2(coeffs, "haar")
    reconstructed = np.clip(reconstructed * 255.0, 0, 255).astype(np.uint8)
    return reconstructed


# ─── DnCNN (Convolutional Denoising Network) ───────────────────────────────────

def build_dncnn(depth: int = 17, filters: int = 64, image_channels: int = 1):
    """
    Build DnCNN architecture:
    - Layer 1: Conv + ReLU
    - Layers 2–(depth-1): Conv + BN + ReLU
    - Layer depth: Conv (output)
    - Skip connection: residual = input - output
    """
    try:
        import tensorflow as tf
        from tensorflow.keras import layers, Model

        inp = layers.Input(shape=(None, None, image_channels))

        # Layer 1
        x = layers.Conv2D(filters, 3, padding="same", use_bias=False)(inp)
        x = layers.Activation("relu")(x)

        # Layers 2 to depth-1
        for _ in range(depth - 2):
            x = layers.Conv2D(filters, 3, padding="same", use_bias=False)(x)
            x = layers.BatchNormalization()(x)
            x = layers.Activation("relu")(x)

        # Final layer
        x = layers.Conv2D(image_channels, 3, padding="same", use_bias=False)(x)

        # Skip / residual connection: subtract predicted noise from input
        out = layers.Subtract()([inp, x])

        model = Model(inp, out, name="DnCNN")
        model.compile(optimizer=tf.keras.optimizers.Adam(learning_rate=0.00238),
                      loss="mse")
        return model

    except ImportError:
        logger.warning("TensorFlow not available — DnCNN step will be skipped.")
        return None


_dncnn_model = None


def get_dncnn_model(weights_path: Optional[str] = None):
    global _dncnn_model
    if _dncnn_model is None:
        model = build_dncnn()
        if model is not None and weights_path:
            try:
                model.load_weights(weights_path)
                logger.info("DnCNN weights loaded from %s", weights_path)
            except Exception as e:
                logger.warning("Could not load weights: %s — using untrained model.", e)
        _dncnn_model = model
    return _dncnn_model


def dncnn_denoise(image: np.ndarray, model) -> np.ndarray:
    """
    Apply DnCNN inference on an image.
    Input: uint8 grayscale HxW
    Output: uint8 grayscale HxW
    """
    if model is None:
        return image  # fallback: no-op

    img_float = image.astype(np.float32) / 255.0
    img_input = img_float[np.newaxis, :, :, np.newaxis]  # (1, H, W, 1)

    try:
        denoised = model.predict(img_input, verbose=0)[0, :, :, 0]
        denoised = np.clip(denoised * 255.0, 0, 255).astype(np.uint8)
        return denoised
    except Exception as e:
        logger.error("DnCNN inference failed: %s", e)
        return image


# ─── Quality Metrics ────────────────────────────────────────────────────────────

def compute_psnr(original: np.ndarray, denoised: np.ndarray) -> float:
    """PSNR = 10 · log10(MAX² / MSE)"""
    mse = compute_mse(original, denoised)
    if mse < 1e-10:
        return 100.0
    max_val = 255.0
    return float(10 * np.log10((max_val ** 2) / mse))


def compute_mse(original: np.ndarray, denoised: np.ndarray) -> float:
    """Mean Squared Error"""
    orig = original.astype(np.float64)
    den = denoised.astype(np.float64)
    return float(np.mean((orig - den) ** 2))


def compute_ssim(original: np.ndarray, denoised: np.ndarray) -> float:
    """
    Structural Similarity Index (SSIM).
    SSIM(x,y) = (2μxμy + C1)(2σxy + C2) / ((μx²+μy²+C1)(σx²+σy²+C2))
    """
    try:
        from skimage.metrics import structural_similarity
        score, _ = structural_similarity(
            original, denoised, full=True, data_range=255
        )
        return float(np.clip(score, 0.0, 1.0))
    except Exception:
        # Manual fallback
        C1, C2 = (0.01 * 255) ** 2, (0.03 * 255) ** 2
        o = original.astype(np.float64)
        d = denoised.astype(np.float64)
        mu_o, mu_d = o.mean(), d.mean()
        sig_o = o.std() ** 2
        sig_d = d.std() ** 2
        sig_od = np.cov(o.flat, d.flat)[0, 1]
        num = (2 * mu_o * mu_d + C1) * (2 * sig_od + C2)
        den = (mu_o ** 2 + mu_d ** 2 + C1) * (sig_o + sig_d + C2)
        return float(np.clip(num / den, 0.0, 1.0))


def compute_snr(original: np.ndarray, denoised: np.ndarray) -> float:
    """SNR = 10 · log10(signal_power / noise_power)"""
    orig = original.astype(np.float64)
    den = denoised.astype(np.float64)
    signal_power = np.mean(orig ** 2)
    noise_power = np.mean((orig - den) ** 2)
    if noise_power < 1e-10:
        return 60.0
    return float(10 * np.log10(signal_power / noise_power))


# ─── Main Pipeline ──────────────────────────────────────────────────────────────

def run_denoising_pipeline(
    image: np.ndarray,
    original_clean: Optional[np.ndarray] = None,
    sigma: Optional[float] = None,
    threshold: float = 0.05,
    dwt_level: int = 2,
    estimation_method: str = "wavelet",
    use_dncnn: bool = True,
    weights_path: Optional[str] = None,
) -> DenoiseResult:
    """
    Full AGF → Haar DWT → Soft Threshold → DnCNN → IDWT pipeline.

    Args:
        image: Noisy grayscale uint8 [H, W]
        original_clean: Clean reference for metrics (optional)
        sigma: Noise std; if None, estimated automatically
        threshold: Wavelet soft-threshold value λ
        dwt_level: Number of DWT decomposition levels
        estimation_method: 'wavelet' | 'mad' | 'laplacian'
        use_dncnn: Whether to apply DnCNN post-processing
        weights_path: Path to DnCNN .h5 weights file
    """
    t0 = time.perf_counter()

    # Ensure grayscale uint8
    if image.ndim == 3:
        image = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    image = np.clip(image, 0, 255).astype(np.uint8)

    # ── Step 1: Estimate noise σ ────────────────────────────────────────────
    if sigma is None:
        if estimation_method == "mad":
            sigma = estimate_noise_mad(image)
        elif estimation_method == "laplacian":
            sigma = estimate_noise_laplacian(image)
        else:
            sigma = estimate_noise_wavelet(image)
    logger.info("Estimated noise σ = %.4f", sigma)

    # ── Step 2: Anisotropic Gaussian Filter ─────────────────────────────────
    ksize = max(3, int(6 * sigma * 255 + 1))
    if ksize % 2 == 0:
        ksize += 1
    ksize = min(ksize, 15)  # cap at 15 for speed
    agf_denoised = anisotropic_gaussian_filter(image, sigma=sigma * 255, ksize=ksize)

    # ── Step 3: Haar DWT decomposition ──────────────────────────────────────
    coeffs = haar_dwt2_decompose(agf_denoised, level=dwt_level)

    # ── Step 4: Soft thresholding on detail sub-bands ───────────────────────
    thresholded_coeffs = soft_threshold(coeffs, threshold=threshold)

    # ── Step 5: Inverse DWT → reconstructed image ───────────────────────────
    wavelet_denoised = haar_idwt2_reconstruct(thresholded_coeffs)
    # Resize if shape changed due to DWT padding
    if wavelet_denoised.shape != image.shape:
        wavelet_denoised = cv2.resize(wavelet_denoised, (image.shape[1], image.shape[0]))

    # ── Step 6: DnCNN post-processing ───────────────────────────────────────
    if use_dncnn:
        model = get_dncnn_model(weights_path)
        final_denoised = dncnn_denoise(wavelet_denoised, model)
    else:
        final_denoised = wavelet_denoised

    t1 = time.perf_counter()
    processing_time_ms = (t1 - t0) * 1000

    # ── Step 7: Compute metrics ──────────────────────────────────────────────
    reference = original_clean if original_clean is not None else image
    psnr = compute_psnr(reference, final_denoised)
    ssim = compute_ssim(reference, final_denoised)
    mse = compute_mse(reference, final_denoised)
    snr = compute_snr(reference, final_denoised)

    logger.info(
        "Pipeline complete — PSNR=%.2f SSIM=%.4f MSE=%.2f SNR=%.2f time=%.1fms",
        psnr, ssim, mse, snr, processing_time_ms,
    )

    return DenoiseResult(
        denoised=final_denoised,
        psnr=psnr,
        ssim=ssim,
        mse=mse,
        snr=snr,
        noise_sigma=sigma,
        processing_time_ms=processing_time_ms,
    )


def add_gaussian_noise(image: np.ndarray, sigma: float = 0.15) -> np.ndarray:
    """Add additive Gaussian blur noise to a clean image for testing."""
    img_float = image.astype(np.float64) / 255.0
    noise = np.random.normal(0, sigma, img_float.shape)
    noisy = np.clip(img_float + noise, 0, 1) * 255
    return noisy.astype(np.uint8)


def benchmark_all_methods(
    original: np.ndarray, noisy: np.ndarray
) -> dict:
    """
    Benchmark proposed pipeline vs standard filters.
    Returns dict of {method: {psnr, ssim, mse, snr}}.
    """
    results = {}

    def _metrics(den):
        return {
            "psnr": round(compute_psnr(original, den), 4),
            "ssim": round(compute_ssim(original, den), 4),
            "mse": round(compute_mse(original, den), 4),
            "snr": round(compute_snr(original, den), 4),
        }

    # Mean filter
    results["mean"] = _metrics(cv2.blur(noisy, (5, 5)))

    # Median filter
    results["median"] = _metrics(cv2.medianBlur(noisy, 5))

    # Gaussian filter
    results["gaussian"] = _metrics(cv2.GaussianBlur(noisy, (5, 5), 1.5))

    # Bilateral (approximates NLM)
    results["nlm"] = _metrics(cv2.fastNlMeansDenoising(noisy, h=10))

    # DWT only
    try:
        coeffs = haar_dwt2_decompose(noisy, level=2)
        thr = soft_threshold(coeffs, 0.05)
        dwt_out = haar_idwt2_reconstruct(thr)
        if dwt_out.shape != original.shape:
            dwt_out = cv2.resize(dwt_out, (original.shape[1], original.shape[0]))
        results["dwt"] = _metrics(dwt_out)
    except Exception:
        results["dwt"] = _metrics(noisy)

    # Proposed pipeline (no DnCNN for speed in benchmarking)
    proposed_result = run_denoising_pipeline(
        noisy, original_clean=original, use_dncnn=False
    )
    results["proposed"] = {
        "psnr": round(proposed_result.psnr, 4),
        "ssim": round(proposed_result.ssim, 4),
        "mse": round(proposed_result.mse, 4),
        "snr": round(proposed_result.snr, 4),
    }

    return results
