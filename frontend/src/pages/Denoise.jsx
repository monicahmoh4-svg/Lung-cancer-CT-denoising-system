import { useState } from "react";
import { useQuery } from "react-query";
import { Play, CheckCircle, Loader2, Settings2, Download, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import clsx from "clsx";
import { apiListImages, apiDenoiseImage, apiPreview } from "../utils/api";

const STEPS = [
  { id: 1, label: "Load & Preprocess CT Scan", sub: "Grayscale · Normalize · 512×512", color: "blue" },
  { id: 2, label: "Estimate Noise σ (MAD / Wavelet)", sub: "Identify Gaussian blur signature", color: "sky" },
  { id: 3, label: "Anisotropic Gaussian Filter (AGF)", sub: "G(x,y) = exp(-(x²+y²)/2σ²)", color: "purple" },
  { id: 4, label: "Haar Wavelet DWT (Level 2)", sub: "LL2 + LH,HL,HH sub-bands", color: "blue" },
  { id: 5, label: "Soft Thresholding λ = 0.05", sub: "Suppress AGBN wavelet coefficients", color: "sky" },
  { id: 6, label: "DnCNN Inference (17 layers)", sub: "64 filters · BN + ReLU · skip connections", color: "purple" },
  { id: 7, label: "Inverse Haar DWT (IDWT)", sub: "Reconstruct denoised image", color: "blue" },
  { id: 8, label: "Compute PSNR / SSIM / MSE / SNR", sub: "Quality evaluation metrics", color: "green" },
  { id: 9, label: "Store + Deliver Denoised Image", sub: "Write to storage · Return base64", color: "green" },
];

export default function Denoise() {
  const [selectedId, setSelectedId] = useState("");
  const [config, setConfig] = useState({
    threshold: 0.05, dwt_level: 2, estimation_method: "wavelet",
    use_dncnn: true, add_noise_first: false, noise_intensity_pct: 30,
    run_benchmark: false,
  });
  const [running, setRunning] = useState(false);
  const [stepIdx, setStepIdx] = useState(-1);
  const [result, setResult] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const { data: images } = useQuery("images", () => apiListImages(100).then(r => r.data), {
    placeholderData: [],
  });

  const loadPreview = async () => {
    setLoadingPreview(true);
    try {
      const res = await apiPreview(config.noise_intensity_pct, 0.15, config.threshold);
      setPreview(res.data);
    } catch {}
    setLoadingPreview(false);
  };

  const runPipeline = async () => {
    if (!selectedId) { toast.error("Select an image first"); return; }
    setRunning(true);
    setStepIdx(0);
    setResult(null);

    // Animate steps
    for (let i = 0; i < STEPS.length; i++) {
      setStepIdx(i);
      await new Promise(r => setTimeout(r, 350));
    }

    try {
      const res = await apiDenoiseImage({ image_id: selectedId, ...config });
      setResult(res.data);
      setStepIdx(STEPS.length);
      toast.success(`Denoising complete — PSNR: ${res.data.metrics?.psnr?.toFixed(2)} dB`);
    } catch {
      setStepIdx(-1);
    }
    setRunning(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Config panel */}
      <div className="space-y-4">
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <Settings2 size={14} className="text-blue-500" /> Pipeline Configuration
          </h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-500 font-medium mb-1 block">Select Image</label>
              <select className="select" value={selectedId} onChange={e => setSelectedId(e.target.value)}>
                <option value="">-- Choose uploaded CT scan --</option>
                {images?.map(img => (
                  <option key={img.id} value={img.id}>{img.filename} ({img.status})</option>
                ))}
              </select>
              {!images?.length && (
                <p className="text-[11px] text-amber-600 mt-1">⚠ No images uploaded yet. Go to Data Ingestion first.</p>
              )}
            </div>
            <div>
              <label className="text-xs text-slate-500 font-medium mb-1 block">
                Noise Estimator
              </label>
              <select className="select" value={config.estimation_method}
                onChange={e => setConfig(c => ({ ...c, estimation_method: e.target.value }))}>
                <option value="wavelet">Wavelet-based (Donoho & Johnstone)</option>
                <option value="mad">MAD (Median Absolute Deviation)</option>
                <option value="laplacian">Laplacian Variance</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 font-medium mb-1 block">
                Wavelet Threshold λ: <span className="font-mono text-blue-600">{config.threshold}</span>
              </label>
              <input type="range" min="0.01" max="0.2" step="0.01"
                value={config.threshold}
                onChange={e => setConfig(c => ({ ...c, threshold: +e.target.value }))}
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                <span>0.01 (aggressive)</span><span>0.2 (conservative)</span>
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-500 font-medium mb-1 block">
                DWT Level: <span className="font-mono text-blue-600">{config.dwt_level}</span>
              </label>
              <input type="range" min="1" max="4" step="1"
                value={config.dwt_level}
                onChange={e => setConfig(c => ({ ...c, dwt_level: +e.target.value }))}
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                <span>1 (fast)</span><span>4 (deep)</span>
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer py-1">
              <input type="checkbox" checked={config.use_dncnn}
                onChange={e => setConfig(c => ({ ...c, use_dncnn: e.target.checked }))}
                className="accent-blue-600 w-4 h-4" />
              <span className="text-xs text-slate-600">Apply DnCNN post-processing</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer py-1">
              <input type="checkbox" checked={config.add_noise_first}
                onChange={e => setConfig(c => ({ ...c, add_noise_first: e.target.checked }))}
                className="accent-blue-600 w-4 h-4" />
              <span className="text-xs text-slate-600">Add synthetic noise first (testing)</span>
            </label>
            {config.add_noise_first && (
              <div>
                <label className="text-xs text-slate-500 font-medium mb-1 block">
                  Noise Intensity: <span className="font-mono text-blue-600">{config.noise_intensity_pct}%</span>
                </label>
                <input type="range" min="5" max="60" step="5"
                  value={config.noise_intensity_pct}
                  onChange={e => setConfig(c => ({ ...c, noise_intensity_pct: +e.target.value }))}
                  className="w-full accent-blue-600"
                />
              </div>
            )}
            <label className="flex items-center gap-2 cursor-pointer py-1">
              <input type="checkbox" checked={config.run_benchmark}
                onChange={e => setConfig(c => ({ ...c, run_benchmark: e.target.checked }))}
                className="accent-blue-600 w-4 h-4" />
              <span className="text-xs text-slate-600">Run benchmark vs all methods</span>
            </label>
            <button
              onClick={runPipeline}
              disabled={running || !selectedId}
              className={clsx("btn btn-primary w-full justify-center", (running || !selectedId) && "opacity-60 cursor-not-allowed")}
            >
              {running ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
              {running ? "Processing…" : "Run Denoising Pipeline"}
            </button>
          </div>
        </div>

        {/* Preview button */}
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-2">Synthetic CT Preview</h3>
          <p className="text-xs text-slate-500 mb-3">
            Generate a demo preview with synthetic noise at current settings (no image required).
          </p>
          <button onClick={loadPreview} disabled={loadingPreview} className="btn btn-sky btn-sm w-full justify-center">
            {loadingPreview ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            Generate Preview
          </button>
          {preview && (
            <div className="grid grid-cols-3 gap-1.5 mt-3">
              {[["Original", preview.original], ["Noisy", preview.noisy], ["Denoised", preview.denoised]].map(([label, b64]) => (
                <div key={label} className="text-center">
                  <img src={`data:image/png;base64,${b64}`} alt={label}
                    className="w-full rounded-lg border border-blue-100 aspect-square object-cover" />
                  <div className="text-[10px] text-slate-500 mt-1 font-medium">{label}</div>
                </div>
              ))}
              <div className="col-span-3 grid grid-cols-4 gap-1 mt-1">
                {[["PSNR", preview.metrics?.psnr?.toFixed(2)+" dB"], ["SSIM", preview.metrics?.ssim?.toFixed(3)],
                  ["MSE", preview.metrics?.mse?.toFixed(1)], ["SNR", preview.metrics?.snr?.toFixed(2)+" dB"]].map(([k,v]) => (
                  <div key={k} className="bg-blue-50 rounded px-1.5 py-1 text-center">
                    <div className="text-[9px] text-blue-400 uppercase">{k}</div>
                    <div className="text-[11px] text-blue-700 font-bold">{v}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pipeline visualization */}
      <div className="space-y-4">
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Pipeline Steps</h3>
          <div className="space-y-2">
            {STEPS.map((step, i) => {
              const done = stepIdx > i;
              const active = stepIdx === i;
              return (
                <div key={step.id} className={clsx(
                  "flex items-start gap-3 p-2.5 rounded-lg border transition-all duration-300",
                  done ? "border-green-200 bg-green-50/50" :
                  active ? "border-blue-300 bg-blue-50 glow-blue" :
                  "border-slate-100 bg-white opacity-50"
                )}>
                  <div className={clsx(
                    "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5",
                    done ? "bg-green-500 text-white" :
                    active ? "bg-blue-600 text-white" :
                    "bg-slate-200 text-slate-500"
                  )}>
                    {done ? <CheckCircle size={11} /> : active ? <Loader2 size={10} className="animate-spin" /> : step.id}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-700">{step.label}</div>
                    <div className="text-[11px] text-slate-400 font-mono">{step.sub}</div>
                  </div>
                </div>
              );
            })}
          </div>
          {stepIdx === STEPS.length && (
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg text-center">
              <CheckCircle size={20} className="text-green-500 mx-auto mb-1" />
              <div className="text-sm font-semibold text-green-700">Pipeline Complete!</div>
            </div>
          )}
        </div>
      </div>

      {/* Result panel */}
      <div className="space-y-4">
        {result ? (
          <>
            <div className="card p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Denoised Image</h3>
              {result.denoised_image && (
                <img
                  src={`data:image/png;base64,${result.denoised_image}`}
                  alt="Denoised CT"
                  className="w-full rounded-xl border border-blue-100 ct-scan-shadow"
                />
              )}
              <a
                href={`/api/v1/denoise/${result.id}/download`}
                className="btn btn-primary w-full justify-center mt-3"
                download
              >
                <Download size={13} /> Download Denoised PNG
              </a>
            </div>
            <div className="card p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Quality Metrics</h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  ["PSNR", result.metrics?.psnr?.toFixed(2) + " dB", "Higher = better", "blue"],
                  ["SSIM", result.metrics?.ssim?.toFixed(4), "1.0 = perfect", "green"],
                  ["MSE",  result.metrics?.mse?.toFixed(2), "Lower = better", "amber"],
                  ["SNR",  result.metrics?.snr?.toFixed(2) + " dB", "Higher = better", "sky"],
                ].map(([k, v, hint, color]) => (
                  <div key={k} className={`bg-${color}-50 border border-${color}-100 rounded-xl p-3`}>
                    <div className="text-[10px] text-slate-500 uppercase tracking-wide">{k}</div>
                    <div className={`text-lg font-bold text-${color}-700 mt-0.5`}>{v}</div>
                    <div className="text-[10px] text-slate-400">{hint}</div>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-[11px] text-slate-400 text-center">
                Pipeline: {result.pipeline} · {result.processing_time_ms?.toFixed(1)} ms
              </div>
            </div>
            {result.benchmark && (
              <div className="card p-4">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Benchmark vs Other Methods</h3>
                <table className="w-full text-xs">
                  <thead><tr className="table-head"><th>Method</th><th>PSNR</th><th>SSIM</th><th>MSE</th></tr></thead>
                  <tbody>
                    {Object.entries(result.benchmark).map(([method, m]) => (
                      <tr key={method} className={clsx("table-row", method === "proposed" && "bg-blue-50/60 font-semibold")}>
                        <td className={method === "proposed" ? "text-blue-700 font-bold" : ""}>{method === "proposed" ? "★ Proposed" : method}</td>
                        <td className={method === "proposed" ? "text-blue-700" : ""}>{m.psnr?.toFixed(2)}</td>
                        <td>{m.ssim?.toFixed(4)}</td>
                        <td>{m.mse?.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : (
          <div className="card p-8 text-center">
            <div className="text-4xl mb-3">🔬</div>
            <div className="text-sm font-medium text-slate-600">Results appear here after running the pipeline</div>
            <div className="text-xs text-slate-400 mt-1">Select an image and click "Run Denoising Pipeline"</div>
          </div>
        )}
      </div>
    </div>
  );
}
