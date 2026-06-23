"""
DnCNN Training Script
=====================
Trains the 17-layer DnCNN on the IQ-OTH/NCCD lung cancer dataset.

Usage:
    python train_dncnn.py --data_dir ./data --epochs 47 --batch_size 128

Reference: Abuya et al., Appl. Sci. 2023, 13, 12069
"""

import os
import argparse
import logging
import numpy as np
from pathlib import Path
import glob
import cv2
import random

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)


def load_images(data_dir: str, target_size=(512, 512)) -> list:
    """Load all PNG/JPG CT images from the dataset directory."""
    exts = ["*.png", "*.jpg", "*.jpeg", "*.PNG", "*.JPG"]
    paths = []
    for ext in exts:
        paths.extend(glob.glob(os.path.join(data_dir, "**", ext), recursive=True))
    logger.info("Found %d images in %s", len(paths), data_dir)

    images = []
    for p in paths:
        img = cv2.imread(p, cv2.IMREAD_GRAYSCALE)
        if img is None:
            continue
        img = cv2.resize(img, target_size, interpolation=cv2.INTER_LANCZOS4)
        images.append(img)
    logger.info("Loaded %d images successfully", len(images))
    return images


def extract_patches(images: list, patch_size=45, patches_per_image=2200) -> np.ndarray:
    """Extract random patches from all images for training."""
    all_patches = []
    H = W = patch_size
    for img in images:
        ih, iw = img.shape
        count = 0
        attempts = 0
        while count < patches_per_image and attempts < patches_per_image * 3:
            r = random.randint(0, ih - H)
            c = random.randint(0, iw - W)
            patch = img[r:r+H, c:c+W]
            all_patches.append(patch)
            count += 1
            attempts += 1
    arr = np.array(all_patches, dtype=np.float32) / 255.0
    arr = arr[:, :, :, np.newaxis]  # (N, H, W, 1)
    logger.info("Extracted %d patches of size %d×%d", len(arr), patch_size, patch_size)
    return arr


def add_gaussian_noise_batch(patches: np.ndarray, sigma: float = 0.15) -> np.ndarray:
    """Add Gaussian noise to a batch of patches."""
    noise = np.random.normal(0, sigma, patches.shape).astype(np.float32)
    return np.clip(patches + noise, 0.0, 1.0)


def build_dncnn_model(depth=17, filters=64):
    """Build DnCNN architecture as per the paper."""
    try:
        import tensorflow as tf
        from tensorflow.keras import layers, Model, optimizers

        inp = layers.Input(shape=(None, None, 1))

        # Layer 1: Conv + ReLU
        x = layers.Conv2D(filters, 3, padding="same", use_bias=False)(inp)
        x = layers.Activation("relu")(x)

        # Layers 2 to depth-1: Conv + BN + ReLU
        for _ in range(depth - 2):
            x = layers.Conv2D(filters, 3, padding="same", use_bias=False)(x)
            x = layers.BatchNormalization(momentum=0.0, epsilon=0.0001)(x)
            x = layers.Activation("relu")(x)

        # Layer depth: Conv
        x = layers.Conv2D(1, 3, padding="same", use_bias=False)(x)

        # Residual / skip: subtract predicted noise from noisy input
        out = layers.Subtract()([inp, x])

        model = Model(inp, out, name="DnCNN")
        model.compile(
            optimizer=optimizers.Adam(learning_rate=0.00238),
            loss="mse",
            metrics=["mae"],
        )
        model.summary(print_fn=logger.info)
        return model
    except ImportError:
        logger.error("TensorFlow not installed. Run: pip install tensorflow")
        raise


def train(args):
    logger.info("Loading dataset from: %s", args.data_dir)
    images = load_images(args.data_dir)
    if not images:
        raise ValueError(f"No images found in {args.data_dir}. Check dataset path.")

    # Split train/test (80/20 as per paper)
    random.shuffle(images)
    split = int(len(images) * 0.8)
    train_imgs, val_imgs = images[:split], images[split:]
    logger.info("Train: %d  Val: %d", len(train_imgs), len(val_imgs))

    # Extract patches
    logger.info("Extracting patches (%d per image)...", args.patches_per_image)
    X_clean = extract_patches(train_imgs, args.patch_size, args.patches_per_image)
    X_val   = extract_patches(val_imgs,   args.patch_size, 50)

    # Create noisy versions
    logger.info("Adding Gaussian noise (σ=%.2f)...", args.sigma)
    X_noisy     = add_gaussian_noise_batch(X_clean, args.sigma)
    X_val_noisy = add_gaussian_noise_batch(X_val,   args.sigma)

    # Build model
    model = build_dncnn_model(depth=17, filters=64)

    # Callbacks
    import tensorflow as tf
    callbacks = [
        tf.keras.callbacks.ModelCheckpoint(
            args.output_weights,
            save_best_only=True,
            monitor="val_loss",
            verbose=1,
        ),
        tf.keras.callbacks.ReduceLROnPlateau(
            monitor="val_loss", factor=0.5, patience=5, verbose=1
        ),
        tf.keras.callbacks.EarlyStopping(
            monitor="val_loss", patience=10, restore_best_weights=True
        ),
        tf.keras.callbacks.TensorBoard(log_dir="logs/dncnn"),
    ]

    # Shuffle
    idx = np.random.permutation(len(X_noisy))
    X_noisy, X_clean = X_noisy[idx], X_clean[idx]

    logger.info("Starting training: %d epochs, batch=%d, steps/epoch=%d",
                args.epochs, args.batch_size, args.steps_per_epoch)

    history = model.fit(
        X_noisy, X_clean,
        epochs=args.epochs,
        batch_size=args.batch_size,
        steps_per_epoch=args.steps_per_epoch if args.steps_per_epoch > 0 else None,
        validation_data=(X_val_noisy, X_val),
        callbacks=callbacks,
        verbose=1,
    )

    logger.info("Training complete. Best model saved to: %s", args.output_weights)
    return history


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train DnCNN on IQ-OTH/NCCD dataset")
    parser.add_argument("--data_dir",         default="./data",                    help="Root directory of CT images")
    parser.add_argument("--output_weights",   default="app/models/dncnn_weights.h5", help="Where to save model")
    parser.add_argument("--epochs",           type=int,   default=47,              help="Number of training epochs")
    parser.add_argument("--batch_size",       type=int,   default=128,             help="Batch size")
    parser.add_argument("--steps_per_epoch",  type=int,   default=846,             help="Steps per epoch (0=auto)")
    parser.add_argument("--patch_size",       type=int,   default=45,              help="Patch size (px)")
    parser.add_argument("--patches_per_image",type=int,   default=2200,            help="Patches extracted per image")
    parser.add_argument("--sigma",            type=float, default=0.15,            help="Gaussian noise σ")
    args = parser.parse_args()

    os.makedirs("app/models", exist_ok=True)
    os.makedirs("logs/dncnn", exist_ok=True)
    train(args)
