"""Dataset information and statistics router."""
from fastapi import APIRouter

router = APIRouter()

DATASET_INFO = {
    "name": "IQ-OTH/NCCD Lung Cancer Dataset",
    "source": "Kaggle — hamdallak/the-iqothnccd-lung-cancer-dataset",
    "url": "https://www.kaggle.com/datasets/hamdallak/the-iqothnccd-lung-cancer-dataset",
    "augmented_url": "https://www.kaggle.com/datasets/aleksandarcvetanov/iq-othnccd-lung-cancer-augmented-dataset",
    "total_images": 1294,
    "image_size": "512x512",
    "color": "grayscale",
    "noise": {
        "gaussian_blur": {"count": 1096, "pct": 84.7},
        "salt_and_pepper": {"count": 198, "pct": 15.3},
    },
    "split": {"train": 1035, "test": 259},
    "classes": {
        "normal": {"count": 500, "pct": 38.6},
        "benign": {"count": 297, "pct": 22.9},
        "malignant": {"count": 497, "pct": 38.4},
    },
    "collection_period": "Fall 2019 (3 months)",
    "collection_source": "Specialist hospitals, Iraq",
    "paper": "Abuya et al., Applied Sciences 2023, 13, 12069",
    "doi": "10.3390/app132112069",
}

PSNR_TABLE = {
    "NLM": [29.62, 27.89, 26.13, 23.03, 20.00, 24.25, 22.02, 17.28, 18.35, 17.68, 17.14, 16.89],
    "Gaussian": [29.69, 28.73, 24.87, 21.71, 18.63, 22.90, 19.61, 15.68, 16.79, 16.26, 14.65, 15.13],
    "Median": [31.85, 28.98, 27.13, 22.02, 18.99, 13.24, 20.99, 16.01, 17.21, 16.53, 15.79, 15.58],
    "DWT": [30.94, 29.79, 27.18, 23.14, 19.99, 23.22, 23.13, 18.42, 18.46, 18.16, 17.53, 17.32],
    "Mean": [27.99, 27.99, 27.18, 19.03, 18.99, 21.62, 20.97, 16.05, 17.23, 16.57, 15.86, 15.37],
    "Wiener": [30.80, 27.89, 26.15, 20.96, 17.98, 22.19, 20.40, 15.01, 16.18, 15.43, 14.97, 14.84],
    "DnCNN": [31.95, 30.79, 28.55, 24.87, 20.99, 25.65, 25.95, 22.79, 22.65, 20.90, 20.99, 19.49],
    "Proposed": [34.76, 31.68, 29.23, 25.92, 21.49, 27.64, 27.04, 25.89, 24.98, 23.95, 22.57, 21.95],
}

SSIM_TABLE = {
    "Proposed": [1.000, 1.000, 1.000, 0.9967, 0.9796, 0.9986],
    "DnCNN": [0.9987, 0.9899, 0.9887, 0.9786, 0.9785, 0.9897],
    "DWT": [0.9952, 0.9876, 0.9854, 0.9591, 0.9589, 0.9675],
    "NLM": [0.9834, 0.9694, 0.9712, 0.9391, 0.9545, 0.9486],
    "Wiener": [0.9863, 0.9589, 0.9335, 0.9045, 0.9123, 0.9345],
    "Gaussian": [0.9774, 0.9408, 0.9071, 0.8703, 0.9278, 0.9221],
    "Median": [0.9796, 0.9570, 0.9418, 0.9051, 0.9042, 0.8964],
    "Mean": [0.9775, 0.9647, 0.9291, 0.8934, 0.8963, 0.9121],
}

MSE_TABLE = [
    {"image": "R1", "median": 29.72, "mean": 29.73, "wiener": 24.56, "gaussian": 24.57, "nlm": 39.38, "dwt": 29.38, "dncnn": 29.25, "proposed": 26.46},
    {"image": "R2", "median": 69.37, "mean": 69.93, "wiener": 227.40, "gaussian": 218.84, "nlm": 97.03, "dwt": 85.03, "dncnn": 80.95, "proposed": 70.99},
    {"image": "R3", "median": 236.70, "mean": 487.10, "wiener": 575.09, "gaussian": 815.50, "nlm": 137.13, "dwt": 127.13, "dncnn": 111.88, "proposed": 101.35},
    {"image": "R4", "median": 276.35, "mean": 526.76, "wiener": 614.75, "gaussian": 855.15, "nlm": 166.78, "dwt": 156.78, "dncnn": 158.01, "proposed": 135.65},
    {"image": "R5", "median": 325.35, "mean": 630.45, "wiener": 640.90, "gaussian": 916.25, "nlm": 186.02, "dwt": 176.02, "dncnn": 165.90, "proposed": 156.90},
    {"image": "R6", "median": 386.23, "mean": 689.23, "wiener": 705.76, "gaussian": 947.99, "nlm": 255.25, "dwt": 245.35, "dncnn": 230.87, "proposed": 206.91},
]


@router.get("/dataset/info")
async def dataset_info():
    return DATASET_INFO


@router.get("/dataset/psnr-table")
async def psnr_table():
    noise_levels = ["5%", "10%", "15%", "20%", "25%", "30%", "35%", "40%", "45%", "50%", "55%", "60%"]
    return {"methods": PSNR_TABLE, "noise_levels": noise_levels}


@router.get("/dataset/ssim-table")
async def ssim_table():
    return {"methods": SSIM_TABLE, "images": ["R1", "R2", "R3", "R4", "R5", "R6"]}


@router.get("/dataset/mse-table")
async def mse_table():
    return {"data": MSE_TABLE}
