import { useState, useCallback } from "react";
import toast from "react-hot-toast";
import { apiDenoiseImage, apiPreview } from "../utils/api";

export function useDenoising() {
  const [running, setRunning] = useState(false);
  const [stepIdx, setStepIdx] = useState(-1);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const STEP_COUNT = 9;

  const animateSteps = useCallback(async () => {
    for (let i = 0; i <= STEP_COUNT; i++) {
      setStepIdx(i);
      await new Promise(r => setTimeout(r, 340));
    }
  }, []);

  const runPipeline = useCallback(async (payload) => {
    if (running) return;
    setRunning(true);
    setResult(null);
    setError(null);

    // Start step animation concurrently
    const animPromise = animateSteps();

    try {
      const res = await apiDenoiseImage(payload);
      await animPromise;
      setResult(res.data);
      setStepIdx(STEP_COUNT + 1);
      toast.success(`Done — PSNR: ${res.data.metrics?.psnr?.toFixed(2)} dB · SSIM: ${res.data.metrics?.ssim?.toFixed(4)}`);
      return res.data;
    } catch (err) {
      await animPromise;
      setStepIdx(-1);
      setError(err?.response?.data?.detail || "Pipeline failed");
      return null;
    } finally {
      setRunning(false);
    }
  }, [running, animateSteps]);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    setStepIdx(-1);
  }, []);

  return { running, stepIdx, result, error, runPipeline, reset, STEP_COUNT };
}

export function usePreview() {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);

  const generate = useCallback(async (noisePct = 30, sigma = 0.15, threshold = 0.05) => {
    setLoading(true);
    try {
      const res = await apiPreview(noisePct, sigma, threshold);
      setPreview(res.data);
    } catch {
      toast.error("Preview generation failed");
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, preview, generate };
}
