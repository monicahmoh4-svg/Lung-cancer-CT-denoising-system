"""Basic backend tests."""
import pytest
import numpy as np
from app.services.denoising_pipeline import (
    estimate_noise_mad, estimate_noise_wavelet,
    anisotropic_gaussian_filter, haar_dwt2_decompose,
    soft_threshold, haar_idwt2_reconstruct,
    compute_psnr, compute_ssim, compute_mse, compute_snr,
    add_gaussian_noise, run_denoising_pipeline,
)


@pytest.fixture
def sample_image():
    """256×256 synthetic CT-like image."""
    img = np.zeros((256, 256), dtype=np.uint8)
    for i, r in enumerate(range(20, 100, 15)):
        v = min(255, 40 + i * 30)
        import cv2
        cv2.ellipse(img, (128, 128), (r, int(r * 0.8)), 0, 0, 360, v, -1)
    return img


def test_noise_estimation_mad(sample_image):
    noisy = add_gaussian_noise(sample_image, sigma=0.15)
    sigma = estimate_noise_mad(noisy)
    assert 0.001 <= sigma <= 1.0, f"sigma out of range: {sigma}"


def test_noise_estimation_wavelet(sample_image):
    noisy = add_gaussian_noise(sample_image, sigma=0.15)
    sigma = estimate_noise_wavelet(noisy)
    assert 0.001 <= sigma <= 1.0


def test_agf_output_shape(sample_image):
    result = anisotropic_gaussian_filter(sample_image, sigma=5.0)
    assert result.shape == sample_image.shape
    assert result.dtype == np.uint8


def test_haar_dwt_reconstruct(sample_image):
    coeffs = haar_dwt2_decompose(sample_image, level=2)
    thresholded = soft_threshold(coeffs, threshold=0.05)
    reconstructed = haar_idwt2_reconstruct(thresholded)
    assert reconstructed.ndim == 2
    assert reconstructed.dtype == np.uint8


def test_psnr_identical():
    img = np.random.randint(0, 255, (64, 64), dtype=np.uint8)
    assert compute_psnr(img, img) == 100.0


def test_ssim_identical():
    img = np.random.randint(0, 255, (64, 64), dtype=np.uint8)
    score = compute_ssim(img, img)
    assert score >= 0.999


def test_mse_identical():
    img = np.random.randint(0, 255, (64, 64), dtype=np.uint8)
    assert compute_mse(img, img) == 0.0


def test_full_pipeline_no_dncnn(sample_image):
    noisy = add_gaussian_noise(sample_image, sigma=0.15)
    result = run_denoising_pipeline(noisy, original_clean=sample_image, use_dncnn=False)
    assert result.psnr > 0
    assert 0.0 <= result.ssim <= 1.0
    assert result.mse >= 0
    assert result.processing_time_ms > 0
    assert result.denoised.shape == sample_image.shape


def test_pipeline_improves_psnr(sample_image):
    noisy = add_gaussian_noise(sample_image, sigma=0.30)
    result = run_denoising_pipeline(noisy, original_clean=sample_image, use_dncnn=False)
    noisy_psnr = compute_psnr(sample_image, noisy)
    assert result.psnr >= noisy_psnr * 0.9, "Pipeline should not degrade PSNR"
