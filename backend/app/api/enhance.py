"""
Enhanced denoising API — adds BayesShrink, bilateral, NLM, full quality report.
Mounted at /api/v1/enhance/*
"""

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, Field
from typing import Optional

from app.core.database import get_db
from app.models.image_record import ImageRecord
from app.services.image_service import load_image_from_path, save_image, image_to_base64
from app.services.enhancement import (
    enhanced_pipeline, full_quality_report,
    multiscale_noise_estimate, sharpness_score,
)
from app.services.denoising_pipeline import add_gaussian_noise

router = APIRouter()


class EnhanceRequest(BaseModel):
    image_id: str
    sigma: float = Field(0.15, ge=0.001, le=1.0)
    use_bilateral: bool = True
    use_nlm: bool = False
    wavelet_threshold_method: str = Field("bayesshrink", pattern="^(bayesshrink|visushrink)$")
    dwt_level: int = Field(2, ge=1, le=4)
    add_noise_pct: Optional[float] = Field(None, ge=0, le=100)


@router.post("/enhance")
async def enhance_image(req: EnhanceRequest, db: AsyncSession = Depends(get_db)):
    """
    Enhanced pipeline: AGF + Bilateral + NLM + Adaptive Wavelet Threshold.
    Returns full quality report including sharpness, contrast, entropy metrics.
    """
    result_q = await db.execute(select(ImageRecord).where(ImageRecord.id == req.image_id))
    record = result_q.scalar_one_or_none()
    if not record:
        raise HTTPException(404, "Image not found")

    original = load_image_from_path(record.original_path)
    noisy = original
    if req.add_noise_pct:
        noisy = add_gaussian_noise(original, sigma=req.add_noise_pct / 100)

    denoised, metrics = enhanced_pipeline(
        noisy,
        original=original,
        sigma=req.sigma,
        use_bilateral=req.use_bilateral,
        use_nlm=req.use_nlm,
        wavelet_threshold_method=req.wavelet_threshold_method,
        dwt_level=req.dwt_level,
    )

    quality = full_quality_report(original, denoised)
    out_path = record.original_path.replace("_original", "_enhanced")
    save_image(denoised, out_path)

    return {
        "id": req.image_id,
        "metrics": metrics,
        "quality_report": quality,
        "pipeline": metrics["pipeline"],
        "denoised_image": image_to_base64(denoised),
    }


@router.get("/enhance/noise-analysis/{image_id}")
async def noise_analysis(image_id: str, db: AsyncSession = Depends(get_db)):
    """Multi-scale noise analysis for an uploaded image."""
    result_q = await db.execute(select(ImageRecord).where(ImageRecord.id == image_id))
    record = result_q.scalar_one_or_none()
    if not record:
        raise HTTPException(404, "Image not found")

    img = load_image_from_path(record.original_path)
    ms_estimates = multiscale_noise_estimate(img)

    return {
        "image_id": image_id,
        "multiscale_sigma": ms_estimates,
        "sharpness": round(sharpness_score(img), 2),
        "recommendation": (
            "AGF+Haar+DnCNN" if ms_estimates.get("mean", 0) > 0.1
            else "BayesShrink+Bilateral"
        ),
    }
