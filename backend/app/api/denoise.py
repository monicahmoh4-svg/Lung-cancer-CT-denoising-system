"""Denoising endpoint — runs AGF + Haar + DnCNN pipeline."""

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, Field
from typing import Optional
import os, logging

from app.core.database import get_db
from app.core.config import settings
from app.models.image_record import ImageRecord, ProcessingStatus
from app.services.denoising_pipeline import run_denoising_pipeline, add_gaussian_noise, benchmark_all_methods
from app.services.image_service import load_image_from_path, save_image, image_to_base64

router = APIRouter()
logger = logging.getLogger(__name__)


class DenoiseRequest(BaseModel):
    image_id: str
    noise_sigma: Optional[float] = Field(None, ge=0.001, le=1.0)
    noise_intensity_pct: Optional[float] = Field(None, ge=0, le=100)
    threshold: float = Field(0.05, ge=0.001, le=1.0)
    dwt_level: int = Field(2, ge=1, le=4)
    estimation_method: str = Field("wavelet", pattern="^(wavelet|mad|laplacian)$")
    use_dncnn: bool = True
    add_noise_first: bool = False
    run_benchmark: bool = False


async def _process(record: ImageRecord, req: DenoiseRequest, db: AsyncSession):
    record.status = ProcessingStatus.processing
    await db.commit()
    try:
        original = load_image_from_path(record.original_path)
        noisy = original
        if req.add_noise_first and req.noise_intensity_pct:
            sigma = req.noise_intensity_pct / 100
            noisy = add_gaussian_noise(original, sigma=sigma)
            noisy_path = record.original_path.replace("_original", "_noisy")
            save_image(noisy, noisy_path)
            record.noisy_path = noisy_path
            record.noise_intensity_pct = req.noise_intensity_pct

        result = run_denoising_pipeline(
            noisy,
            original_clean=original,
            sigma=req.noise_sigma,
            threshold=req.threshold,
            dwt_level=req.dwt_level,
            estimation_method=req.estimation_method,
            use_dncnn=req.use_dncnn,
            weights_path=settings.MODEL_PATH if settings.USE_PRETRAINED_DNCNN else None,
        )

        denoised_path = record.original_path.replace("_original", "_denoised")
        save_image(result.denoised, denoised_path)

        record.denoised_path = denoised_path
        record.psnr = round(result.psnr, 4)
        record.ssim = round(result.ssim, 4)
        record.mse = round(result.mse, 4)
        record.snr = round(result.snr, 4)
        record.noise_sigma = round(result.noise_sigma, 4)
        record.processing_time_ms = round(result.processing_time_ms, 2)
        record.status = ProcessingStatus.complete
        await db.commit()
        return result
    except Exception as e:
        record.status = ProcessingStatus.failed
        await db.commit()
        raise e


@router.post("/denoise")
async def denoise_image(req: DenoiseRequest, db: AsyncSession = Depends(get_db)):
    """Run the full AGF → Haar DWT → DnCNN → IDWT denoising pipeline."""
    result_q = await db.execute(select(ImageRecord).where(ImageRecord.id == req.image_id))
    record = result_q.scalar_one_or_none()
    if not record:
        raise HTTPException(404, "Image not found")

    result = await _process(record, req, db)

    response = {
        "id": record.id,
        "status": "complete",
        "metrics": {
            "psnr": record.psnr,
            "ssim": record.ssim,
            "mse": record.mse,
            "snr": record.snr,
        },
        "noise_sigma": record.noise_sigma,
        "processing_time_ms": record.processing_time_ms,
        "pipeline": "AGF+Haar+DnCNN",
        "denoised_image": image_to_base64(result.denoised),
    }

    if req.run_benchmark:
        original = load_image_from_path(record.original_path)
        noisy = load_image_from_path(record.noisy_path or record.original_path)
        response["benchmark"] = benchmark_all_methods(original, noisy)

    return response


@router.get("/denoise/{image_id}/download")
async def download_denoised(image_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ImageRecord).where(ImageRecord.id == image_id))
    record = result.scalar_one_or_none()
    if not record or not record.denoised_path:
        raise HTTPException(404, "Denoised image not ready")
    if not os.path.exists(record.denoised_path):
        raise HTTPException(404, "File not found on disk")
    return FileResponse(
        record.denoised_path,
        media_type="image/png",
        filename=f"denoised_{record.filename}",
    )


@router.post("/denoise/preview")
async def denoise_preview(
    noise_pct: float = 30,
    sigma: float = 0.15,
    threshold: float = 0.05,
):
    """Generate a synthetic CT preview with noise + denoising for UI demo."""
    import numpy as np
    from app.services.denoising_pipeline import add_gaussian_noise
    H, W = 256, 256
    clean = np.zeros((H, W), dtype=np.uint8)
    for i, r in enumerate(range(15, 80, 12)):
        v = 40 + i * 25
        cv2_import = True
        try:
            import cv2
            cv2.ellipse(clean, (W//2, H//2), (r, int(r*0.8)), 0, 0, 360, int(v), -1)
        except ImportError:
            cv2_import = False

    noisy = add_gaussian_noise(clean, sigma=noise_pct / 100)
    result = run_denoising_pipeline(
        noisy, original_clean=clean, sigma=sigma,
        threshold=threshold, use_dncnn=False
    )
    return {
        "original": image_to_base64(clean),
        "noisy": image_to_base64(noisy),
        "denoised": image_to_base64(result.denoised),
        "metrics": {"psnr": result.psnr, "ssim": result.ssim, "mse": result.mse, "snr": result.snr},
    }
