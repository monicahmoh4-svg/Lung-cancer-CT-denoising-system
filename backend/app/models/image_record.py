from sqlalchemy import Column, String, Float, Integer, DateTime, Text, Enum
from sqlalchemy.sql import func
import uuid
import enum as python_enum
from app.core.database import Base


class NoiseType(str, python_enum.Enum):
    gaussian = "gaussian"
    salt_pepper = "salt_pepper"
    mixed = "mixed"
    unknown = "unknown"


class DiagnosisClass(str, python_enum.Enum):
    normal = "normal"
    benign = "benign"
    malignant = "malignant"
    unknown = "unknown"


class ProcessingStatus(str, python_enum.Enum):
    pending = "pending"
    processing = "processing"
    complete = "complete"
    failed = "failed"


class ImageRecord(Base):
    __tablename__ = "image_records"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    filename = Column(String, nullable=False)
    original_path = Column(String)
    denoised_path = Column(String)
    noisy_path = Column(String)

    # Metadata
    width = Column(Integer, default=512)
    height = Column(Integer, default=512)
    modality = Column(String, default="CT")
    patient_id = Column(String)
    diagnosis = Column(String, default=DiagnosisClass.unknown)

    # Noise parameters
    noise_type = Column(String, default=NoiseType.gaussian)
    noise_sigma = Column(Float, default=0.15)
    noise_intensity_pct = Column(Float, default=0.0)

    # Quality metrics (after denoising)
    psnr = Column(Float)
    ssim = Column(Float)
    mse = Column(Float)
    snr = Column(Float)

    # Processing
    status = Column(String, default=ProcessingStatus.pending)
    processing_time_ms = Column(Float)
    pipeline_used = Column(String, default="AGF+Haar+DnCNN")
    notes = Column(Text)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
