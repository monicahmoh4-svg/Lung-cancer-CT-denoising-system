# 🫁 LungDenoise AI

**Hospital-grade CT image Gaussian noise detection & removal**  
Wavelet-Anisotropic Gaussian Filter + DnCNN Pipeline

[![CI](https://github.com/yourusername/lungdenoise/actions/workflows/ci.yml/badge.svg)](https://github.com/yourusername/lungdenoise/actions)

---

## Overview

LungDenoise AI is a full-stack clinical system that detects and removes **Additive Gaussian Blur Noise (AGBN)** from lung cancer CT scans using an ensemble pipeline:

```
CT Scan → AGF Preprocessing → Haar Wavelet DWT → Soft Thresholding
       → DnCNN Inference → Inverse DWT → Denoised CT
```

**Key Results** (IQ-OTH/NCCD Dataset, 1,294 CT images):
| Metric | Proposed | DnCNN | DWT | NLM |
|--------|----------|-------|-----|-----|
| PSNR   | **34.76 dB** | 31.95 | 30.94 | 29.62 |
| SSIM   | **1.0000**   | 0.9987 | 0.9952 | 0.9834 |
| MSE    | **26.46**    | 29.25 | 29.38 | 39.38 |
| Time   | **16.7 ms**  | — | — | — |

> Reference: Abuya T.K., Rimiru R.M., Okeyo G.O. *Appl. Sci.* 2023, 13, 12069. [doi:10.3390/app132112069](https://doi.org/10.3390/app132112069)

---

## Project Structure

```
lungdenoise/
├── frontend/          # React 18 + Vite + Tailwind (→ Vercel)
│   ├── src/
│   │   ├── pages/     # Dashboard, Ingest, Denoise, Evaluation, Radiologist...
│   │   ├── components/# Layout, sidebar navigation
│   │   └── utils/     # API client (axios)
│   ├── vercel.json
│   └── package.json
│
├── backend/           # FastAPI Python 3.11 (→ Render)
│   ├── app/
│   │   ├── main.py           # FastAPI app entry
│   │   ├── api/              # Routers: ingest, denoise, metrics, batch, dataset
│   │   ├── core/             # Config, database, settings
│   │   ├── models/           # SQLAlchemy ORM models
│   │   └── services/
│   │       ├── denoising_pipeline.py  # Core AGF+Haar+DnCNN algorithm
│   │       └── image_service.py       # DICOM/PNG I/O, preprocessing
│   ├── requirements.txt
│   └── Dockerfile
│
├── render.yaml        # Render backend config
└── .github/           # GitHub Actions CI/CD
```

---

## Quick Start (Local)

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
# API docs: http://localhost:8000/api/docs
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env     # edit VITE_API_URL if needed
npm run dev
# Open: http://localhost:3000
```

---

## Dataset Download (Kaggle)

```bash
pip install kaggle
export KAGGLE_USERNAME=your_username
export KAGGLE_KEY=your_api_key

# Primary dataset (1,294 CT images — Normal/Benign/Malignant)
kaggle datasets download hamdallak/the-iqothnccd-lung-cancer-dataset

# Augmented dataset
kaggle datasets download aleksandarcvetanov/iq-othnccd-lung-cancer-augmented-dataset
```

---

## Deploy to Production

### Frontend → Vercel

1. Push to GitHub
2. Import repo at [vercel.com](https://vercel.com)
3. Set **Root Directory** = `frontend`
4. Add env var: `VITE_API_URL=https://your-render-url.onrender.com`
5. Deploy — Vercel auto-deploys on every push to `main`

### Backend → Render

1. Push to GitHub
2. New **Web Service** at [render.com](https://render.com)
3. Set **Root Directory** = `backend`
4. **Build Command**: `pip install -r requirements.txt`
5. **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
6. Add env vars from `backend/.env.example`
7. Deploy — Render auto-deploys on every push to `main`

---

## Pipeline Algorithm

### Step 1 — Anisotropic Gaussian Filter (AGF)
```
G(x,y) = exp(-(x² + y²) / 2σ²)
σ = 0.15 (estimated via Haar wavelet / MAD)
```
Adaptively smooths along edges; prevents blurring at structural boundaries.

### Step 2 — Haar Wavelet DWT (Level 2)
Decomposes into: `LL2` (approximation) + `LH1,LH2,HL1,HL2,HH1,HH2` (detail sub-bands)

### Step 3 — Soft Thresholding
```
C_denoised(i,j) = sign(C(i,j)) · max(|C(i,j)| − λ, 0)   λ = 0.05
```

### Step 4 — DnCNN (17-layer CNN)
```
Layer 1:     Conv(64, 3×3) + ReLU
Layers 2–16: Conv(64, 3×3) + BatchNorm + ReLU
Layer 17:    Conv(1, 3×3)
Skip:        R(x) = F(x) + x
Loss:        L = 1/2N · Σ ‖R(y;θ) − (y−x)‖²_F
```

### Step 5 — Inverse Haar DWT (IDWT)
Reconstruct denoised image from thresholded + DnCNN-refined sub-bands.

---

## Metrics

| Metric | Formula | Interpretation |
|--------|---------|----------------|
| **PSNR** | `10·log₁₀(MAX²/MSE)` | Higher = better (dB) |
| **SSIM** | luminance × contrast × structure | 1.0 = perfect |
| **MSE**  | `Σ(orig−denoised)²/N` | Lower = better |
| **SNR**  | `10·log₁₀(signal/noise)` | Higher = better (dB) |

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/ingest` | Upload CT scan |
| GET  | `/api/v1/images` | List all images |
| POST | `/api/v1/denoise` | Run full pipeline |
| GET  | `/api/v1/denoise/{id}/download` | Download denoised PNG |
| POST | `/api/v1/denoise/preview` | Synthetic CT demo |
| GET  | `/api/v1/metrics/{id}` | PSNR/SSIM/MSE/SNR |
| GET  | `/api/v1/metrics/aggregate/summary` | System-wide stats |
| POST | `/api/v1/batch` | Batch processing job |
| GET  | `/api/v1/batch/{job_id}` | Job status |
| GET  | `/api/v1/dataset/info` | Dataset metadata |
| GET  | `/api/v1/health` | Health check |
| GET  | `/api/docs` | Swagger UI |

---

## Citation

```bibtex
@article{abuya2023lungdenoise,
  title   = {An Image Denoising Technique Using Wavelet-Anisotropic Gaussian
             Filter-Based Denoising Convolutional Neural Network for CT Images},
  author  = {Abuya, Teresa Kwamboka and Rimiru, Richard Maina and Okeyo, George Onyango},
  journal = {Applied Sciences},
  volume  = {13},
  number  = {21},
  pages   = {12069},
  year    = {2023},
  doi     = {10.3390/app132112069}
}
```

---

## License

MIT — free for hospital and research use.
