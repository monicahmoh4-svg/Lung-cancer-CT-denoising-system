from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    # App
    APP_NAME: str = "LungDenoise AI"
    VERSION: str = "1.0.0"
    DEBUG: bool = False

    # CORS
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "https://*.vercel.app",
        "https://lungdenoise.vercel.app",
    ]

    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", "sqlite+aiosqlite:///./lungdenoise.db"
    )

    # Storage
    UPLOAD_DIR: str = "uploads"
    OUTPUT_DIR: str = "outputs"
    MAX_FILE_SIZE_MB: int = 50

    # Pipeline
    DEFAULT_NOISE_SIGMA: float = 0.15
    WAVELET_THRESHOLD: float = 0.05
    PATCH_SIZE: int = 45
    IMAGE_SIZE: int = 512
    DWT_LEVEL: int = 2

    # DnCNN model
    MODEL_PATH: str = "app/models/dncnn_weights.h5"
    USE_PRETRAINED_DNCNN: bool = True

    # Kaggle (optional, for dataset download)
    KAGGLE_USERNAME: str = os.getenv("KAGGLE_USERNAME", "")
    KAGGLE_KEY: str = os.getenv("KAGGLE_KEY", "")

    class Config:
        env_file = ".env"


settings = Settings()

# Ensure directories exist
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.OUTPUT_DIR, exist_ok=True)
os.makedirs("app/models", exist_ok=True)
