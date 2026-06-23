"""Data ingestion — upload CT scans (DICOM/PNG/JPG)."""

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid, os, logging

from app.core.database import get_db
from app.core.config import settings
from app.models.image_record import ImageRecord, ProcessingStatus
from app.services.image_service import (
    load_image_from_bytes, preprocess_image,
    save_image, get_image_stats, image_to_base64,
)
from app.services.denoising_pipeline import estimate_noise_wavelet

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/ingest")
async def ingest_image(
    file: UploadFile = File(...),
    patient_id: str = "",
    diagnosis: str = "unknown",
    db: AsyncSession = Depends(get_db),
):
    """Upload a CT scan image for processing."""
    if file.size and file.size > settings.MAX_FILE_SIZE_MB * 1024 * 1024:
        raise HTTPException(413, "File too large")

    data = await file.read()
    try:
        raw = load_image_from_bytes(data, file.filename)
        image = preprocess_image(raw, (settings.IMAGE_SIZE, settings.IMAGE_SIZE))
    except Exception as e:
        raise HTTPException(422, f"Cannot process image: {e}")

    record_id = str(uuid.uuid4())
    orig_path = os.path.join(settings.UPLOAD_DIR, f"{record_id}_original.png")
    save_image(image, orig_path)

    sigma = estimate_noise_wavelet(image)

    record = ImageRecord(
        id=record_id,
        filename=file.filename,
        original_path=orig_path,
        patient_id=patient_id or f"PT-{record_id[:6].upper()}",
        diagnosis=diagnosis,
        noise_sigma=round(float(sigma), 4),
        status=ProcessingStatus.pending,
        **get_image_stats(image),
    )
    db.add(record)
    await db.commit()

    return {
        "id": record_id,
        "filename": file.filename,
        "status": "pending",
        "noise_sigma": round(float(sigma), 4),
        "preview": image_to_base64(image),
        "stats": get_image_stats(image),
    }


@router.get("/images")
async def list_images(
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ImageRecord).order_by(ImageRecord.created_at.desc()).limit(limit).offset(offset)
    )
    records = result.scalars().all()
    return [
        {
            "id": r.id,
            "filename": r.filename,
            "status": r.status,
            "psnr": r.psnr,
            "ssim": r.ssim,
            "mse": r.mse,
            "noise_sigma": r.noise_sigma,
            "diagnosis": r.diagnosis,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in records
    ]


@router.get("/images/{image_id}")
async def get_image(image_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ImageRecord).where(ImageRecord.id == image_id))
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(404, "Image not found")
    return record


@router.delete("/images/{image_id}")
async def delete_image(image_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ImageRecord).where(ImageRecord.id == image_id))
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(404, "Image not found")
    for path in [record.original_path, record.denoised_path, record.noisy_path]:
        if path and os.path.exists(path):
            os.remove(path)
    await db.delete(record)
    return {"deleted": image_id}
