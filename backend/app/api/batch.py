"""Batch processing router."""
from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
import asyncio, uuid, logging

from app.core.database import get_db
from app.models.image_record import ImageRecord, ProcessingStatus
from app.services.denoising_pipeline import run_denoising_pipeline, add_gaussian_noise
from app.services.image_service import load_image_from_path, save_image

router = APIRouter()
logger = logging.getLogger(__name__)

_jobs: dict = {}  # in-memory job tracker (use Redis in production)


class BatchRequest(BaseModel):
    noise_intensity_pct: Optional[float] = 30
    threshold: float = 0.05
    dwt_level: int = 2
    use_dncnn: bool = True
    add_noise: bool = True


async def _run_batch(job_id: str, image_ids: list, req: BatchRequest):
    _jobs[job_id] = {"status": "running", "total": len(image_ids), "done": 0, "results": []}
    from app.core.database import AsyncSessionLocal
    async with AsyncSessionLocal() as db:
        for img_id in image_ids:
            try:
                result_q = await db.execute(select(ImageRecord).where(ImageRecord.id == img_id))
                record = result_q.scalar_one_or_none()
                if not record:
                    continue
                original = load_image_from_path(record.original_path)
                noisy = add_gaussian_noise(original, sigma=req.noise_intensity_pct / 100) if req.add_noise else original
                result = run_denoising_pipeline(noisy, original_clean=original, use_dncnn=req.use_dncnn)
                denoised_path = record.original_path.replace("_original", "_denoised")
                save_image(result.denoised, denoised_path)
                record.denoised_path = denoised_path
                record.psnr = round(result.psnr, 4)
                record.ssim = round(result.ssim, 4)
                record.mse = round(result.mse, 4)
                record.snr = round(result.snr, 4)
                record.status = ProcessingStatus.complete
                await db.commit()
                _jobs[job_id]["results"].append({"id": img_id, "psnr": result.psnr, "ssim": result.ssim})
            except Exception as e:
                logger.error("Batch error on %s: %s", img_id, e)
            _jobs[job_id]["done"] += 1
            await asyncio.sleep(0)
    _jobs[job_id]["status"] = "complete"


@router.post("/batch")
async def start_batch(req: BatchRequest, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ImageRecord.id).where(ImageRecord.status == ProcessingStatus.pending))
    ids = [row[0] for row in result.all()]
    if not ids:
        return {"message": "No pending images", "job_id": None}
    job_id = str(uuid.uuid4())
    background_tasks.add_task(_run_batch, job_id, ids, req)
    _jobs[job_id] = {"status": "queued", "total": len(ids), "done": 0, "results": []}
    return {"job_id": job_id, "total_images": len(ids), "status": "queued"}


@router.get("/batch/{job_id}")
async def get_batch_status(job_id: str):
    job = _jobs.get(job_id)
    if not job:
        return {"error": "Job not found"}
    pct = round(job["done"] / max(job["total"], 1) * 100, 1)
    return {**job, "progress_pct": pct}
