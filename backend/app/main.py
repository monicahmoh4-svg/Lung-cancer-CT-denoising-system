"""
LungDenoise AI — Production FastAPI Backend
Wavelet-Anisotropic Gaussian Filter + DnCNN Pipeline
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from contextlib import asynccontextmanager
import logging

from app.api import ingest, denoise, metrics, batch, health, dataset, enhance
from app.core.config import settings
from app.core.database import init_db

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting LungDenoise AI backend...")
    await init_db()
    logger.info("Database initialised.")
    yield
    logger.info("Shutting down.")


app = FastAPI(
    title="LungDenoise AI",
    description="Hospital-grade CT image denoising using AGF + Haar Wavelet + DnCNN",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)

app.include_router(health.router, prefix="/api/v1", tags=["Health"])
app.include_router(ingest.router, prefix="/api/v1", tags=["Data Ingestion"])
app.include_router(denoise.router, prefix="/api/v1", tags=["Denoising"])
app.include_router(metrics.router, prefix="/api/v1", tags=["Metrics"])
app.include_router(batch.router, prefix="/api/v1", tags=["Batch"])
app.include_router(dataset.router, prefix="/api/v1", tags=["Dataset"])
app.include_router(enhance.router, prefix="/api/v1", tags=["Enhancement"])


@app.get("/")
async def root():
    return {
        "service": "LungDenoise AI",
        "version": "1.0.0",
        "status": "operational",
        "docs": "/api/docs",
    }
