"""Metrics API router."""
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.core.database import get_db
from app.models.image_record import ImageRecord

router = APIRouter()


@router.get("/metrics/{image_id}")
async def get_metrics(image_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ImageRecord).where(ImageRecord.id == image_id))
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(404, "Image not found")
    return {
        "id": image_id,
        "psnr": record.psnr,
        "ssim": record.ssim,
        "mse": record.mse,
        "snr": record.snr,
        "noise_sigma": record.noise_sigma,
        "processing_time_ms": record.processing_time_ms,
        "pipeline": record.pipeline_used,
    }


@router.get("/metrics/aggregate/summary")
async def aggregate_metrics(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(
            func.avg(ImageRecord.psnr).label("avg_psnr"),
            func.avg(ImageRecord.ssim).label("avg_ssim"),
            func.avg(ImageRecord.mse).label("avg_mse"),
            func.avg(ImageRecord.snr).label("avg_snr"),
            func.avg(ImageRecord.processing_time_ms).label("avg_time_ms"),
            func.count(ImageRecord.id).label("total"),
        ).where(ImageRecord.status == "complete")
    )
    row = result.one()
    return {
        "avg_psnr": round(row.avg_psnr or 0, 4),
        "avg_ssim": round(row.avg_ssim or 0, 4),
        "avg_mse": round(row.avg_mse or 0, 4),
        "avg_snr": round(row.avg_snr or 0, 4),
        "avg_time_ms": round(row.avg_time_ms or 0, 2),
        "total_processed": row.total,
    }
