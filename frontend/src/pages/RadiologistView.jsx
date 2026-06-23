import { useState, useRef, useEffect } from "react";
import { useQuery } from "react-query";
import {
  ChevronLeft, ChevronRight, Download, FileText,
  CheckCircle, AlertTriangle, ZoomIn, ZoomOut, RotateCcw,
  Contrast, Sun, Eye,
} from "lucide-react";
import clsx from "clsx";
import { apiListImages } from "../utils/api";

const DEMO_CASES = [
  { id:"R1", patient:"IQ-0042", diagnosis:"Malignant", noise:"5%",  psnr:34.76, ssim:1.000, mse:26.46,  snr:18.69 },
  { id:"R2", patient:"IQ-0087", diagnosis:"Normal",    noise:"10%", psnr:31.68, ssim:1.000, mse:70.99,  snr:15.46 },
  { id:"R3", patient:"IQ-0134", diagnosis:"Benign",    noise:"15%", psnr:29.23, ssim:1.000, mse:101.35, snr:15.09 },
  { id:"R4", patient:"IQ-0221", diagnosis:"Malignant", noise:"20%", psnr:25.92, ssim:0.997, mse:135.65, snr:9.80  },
  { id:"R5", patient:"IQ-0310", diagnosis:"Benign",    noise:"25%", psnr:21.49, ssim:0.980, mse:156.90, snr:6.90  },
  { id:"R6", patient:"IQ-0455", diagnosis:"Normal",    noise:"30%", psnr:27.64, ssim:0.999, mse:206.91, snr:5.11  },
];

const DX_COLORS = { Malignant: "tag-red", Normal: "tag-green", Benign: "tag-amber" };
const DX_BORDER = { Malignant: "border-red-300 bg-red-50", Normal: "border-green-300 bg-green-50", Benign: "border-amber-300 bg-amber-50" };

// Simple synthetic CT canvas drawer
function CTCanvas({ canvasId, noiseLevel = 0, variant = "original", width = 240, height = 240 }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    ctx.fillStyle = "#080808";
    ctx.fillRect(0, 0, W, H);
    const layers = [
      { rx: W * 0.45, ry: H * 0.40, v: 40 },
      { rx: W * 0.35, ry: H * 0.32, v: 65 },
      { rx: W * 0.26, ry: H * 0.24, v: 90 },
      { rx: W * 0.18, ry: H * 0.16, v: 130 },
      { rx: W * 0.10, ry: H * 0.09, v: 190 },
    ];
    layers.forEach(({ rx, ry, v }) => {
      ctx.beginPath();
      ctx.ellipse(W / 2, H / 2, rx, ry, 0, 0, Math.PI * 2);
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fill();
    });
    // Nodule
    ctx.beginPath();
    ctx.ellipse(W / 2 - 22, H / 2 + 14, 9, 7, 0.3, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(220,220,220,0.8)";
    ctx.fill();
    // Vessels
    ctx.beginPath();
    ctx.moveTo(W * 0.3, H * 0.2);
    ctx.bezierCurveTo(W * 0.4, H * 0.5, W * 0.6, H * 0.45, W * 0.7, H * 0.75);
    ctx.strokeStyle = "rgba(160,160,160,0.4)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    if (noiseLevel > 0 && variant !== "denoised") {
      const sigma = (noiseLevel / 100) * (variant === "denoised" ? 0.2 : 1.0) * 60;
      const imgData = ctx.getImageData(0, 0, W, H);
      const d = imgData.data;
      for (let i = 0; i < d.length; i += 4) {
        const n = (Math.random() * 2 - 1) * sigma;
        d[i] = Math.max(0, Math.min(255, d[i] + n));
        d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
        d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
      }
      ctx.putImageData(imgData, 0, 0);
    }
    if (variant === "denoised") {
      // Slight smoothing overlay
      const sigma2 = noiseLevel * 0.12;
      const imgData2 = ctx.getImageData(0, 0, W, H);
      const d2 = imgData2.data;
      for (let i = 0; i < d2.length; i += 4) {
        const n = (Math.random() * 2 - 1) * sigma2;
        d2[i] = Math.max(0, Math.min(255, d2[i] + n));
        d2[i + 1] = Math.max(0, Math.min(255, d2[i + 1] + n));
        d2[i + 2] = Math.max(0, Math.min(255, d2[i + 2] + n));
      }
      ctx.putImageData(imgData2, 0, 0);
      // Green tint for "clean"
      ctx.fillStyle = "rgba(22,163,74,0.04)";
      ctx.fillRect(0, 0, W, H);
    }
  }, [noiseLevel, variant]);

  return (
    <canvas
      ref={ref}
      id={canvasId}
      width={width}
      height={height}
      className="w-full h-full object-cover"
    />
  );
}

export default function RadiologistView() {
  const [idx, setIdx] = useState(0);
  const [notes, setNotes] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [dxOverride, setDxOverride] = useState(null);

  const { data: images } = useQuery("images", () =>
    import("../utils/api").then(m => m.apiListImages(20)).then(r => r.data), {
    placeholderData: [],
  });

  const cases = images?.length ? images : DEMO_CASES;
  const cur = cases[idx] || DEMO_CASES[0];
  const noiseVal = parseInt(cur.noise || cur.noise_intensity_pct || "30") || 30;
  const dx = dxOverride || cur.diagnosis || "Unknown";

  const prev = () => { setIdx(i => Math.max(0, i - 1)); setAccepted(false); setDxOverride(null); setNotes(""); };
  const next = () => { setIdx(i => Math.min(cases.length - 1, i + 1)); setAccepted(false); setDxOverride(null); setNotes(""); };

  const psnrPct = Math.min(100, ((cur.psnr || 28) / 36) * 100);
  const ssimPct = ((cur.ssim || 0.98) * 100);
  const msePct = Math.max(0, 100 - ((cur.mse || 100) / 1000) * 100);

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="card p-3 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button className="btn btn-sm" onClick={prev} disabled={idx === 0}><ChevronLeft size={14} /></button>
          <div>
            <div className="text-sm font-semibold text-slate-700">
              Patient: <span className="text-blue-700">{cur.patient || cur.patient_id || "IQ-0042"}</span>
            </div>
            <div className="text-[11px] text-slate-400">Case {idx + 1} of {cases.length}</div>
          </div>
          <button className="btn btn-sm" onClick={next} disabled={idx === cases.length - 1}><ChevronRight size={14} /></button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={clsx("tag text-xs", DX_COLORS[dx] || "tag-slate")}>{dx}</span>
          <span className="tag tag-amber text-[11px]">Noise: {cur.noise || `${noiseVal}%`}</span>
          {accepted && <span className="tag tag-green text-[11px]"><CheckCircle size={10} /> Accepted</span>}
        </div>
        <div className="flex gap-2">
          <button className="btn btn-sm" onClick={() => window.print()}>
            <FileText size={13} /> Export Report
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Image viewer */}
        <div className="lg:col-span-2 space-y-4">
          {/* Controls */}
          <div className="card p-3 flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <button className="btn btn-xs" onClick={() => setZoom(z => Math.min(3, z + 0.25))}><ZoomIn size={12} /></button>
              <span className="text-xs text-slate-500 font-mono w-12 text-center">{(zoom * 100).toFixed(0)}%</span>
              <button className="btn btn-xs" onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}><ZoomOut size={12} /></button>
              <button className="btn btn-xs" onClick={() => setZoom(1)}><RotateCcw size={12} /></button>
            </div>
            <div className="flex items-center gap-2">
              <Sun size={12} className="text-amber-500" />
              <input type="range" min="50" max="200" value={brightness}
                onChange={e => setBrightness(+e.target.value)}
                className="w-20 accent-amber-500" title="Brightness" />
            </div>
            <div className="flex items-center gap-2">
              <Contrast size={12} className="text-blue-500" />
              <input type="range" min="50" max="250" value={contrast}
                onChange={e => setContrast(+e.target.value)}
                className="w-20 accent-blue-500" title="Contrast" />
            </div>
            <button className="btn btn-xs" onClick={() => { setBrightness(100); setContrast(100); }}>Reset</button>
          </div>

          {/* Image panels */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Original CT", variant: "original", noise: 0, borderClass: "border-slate-200" },
              { label: `Noisy Input (+${noiseVal}% AGBN)`, variant: "noisy", noise: noiseVal, borderClass: "border-amber-200" },
              { label: "AI Denoised ✓", variant: "denoised", noise: noiseVal, borderClass: "border-green-200" },
            ].map(({ label, variant, noise, borderClass }) => (
              <div key={variant} className={clsx("card border-2 overflow-hidden", borderClass)}>
                <div
                  style={{
                    transform: `scale(${zoom})`,
                    transformOrigin: "center",
                    filter: `brightness(${brightness}%) contrast(${contrast}%)`,
                    transition: "transform 0.2s",
                  }}
                >
                  <CTCanvas
                    canvasId={`rad-${variant}`}
                    noiseLevel={noise}
                    variant={variant}
                    width={200}
                    height={200}
                  />
                </div>
                <div className={clsx(
                  "text-[11px] text-center py-1.5 font-medium",
                  variant === "denoised" ? "text-green-700 bg-green-50" :
                  variant === "noisy" ? "text-amber-700 bg-amber-50" :
                  "text-slate-500 bg-slate-50"
                )}>{label}</div>
              </div>
            ))}
          </div>

          {/* Metrics bars */}
          <div className="card p-4 grid grid-cols-2 gap-4">
            {[
              { label: "PSNR", value: `${(cur.psnr || 28).toFixed(2)} dB`, pct: psnrPct, color: "blue", hint: "Higher = better quality" },
              { label: "SSIM", value: (cur.ssim || 0.98).toFixed(4), pct: ssimPct, color: "green", hint: "1.0 = perfect match" },
              { label: "MSE",  value: (cur.mse || 100).toFixed(2), pct: msePct, color: "amber", hint: "Lower = less error" },
              { label: "SNR",  value: `${(cur.snr || 8).toFixed(2)} dB`, pct: Math.min(100, ((cur.snr || 8) / 25) * 100), color: "sky", hint: "Signal-to-noise ratio" },
            ].map(({ label, value, pct, color, hint }) => (
              <div key={label}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-semibold text-slate-600">{label}</span>
                  <span className={`text-xs font-bold text-${color}-600`}>{value}</span>
                </div>
                <div className="progress">
                  <div className={`progress-fill bg-${color}-500`} style={{ width: `${pct}%` }} />
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">{hint}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Clinical panel */}
        <div className="space-y-4">
          {/* Diagnosis selector */}
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <Eye size={14} className="text-blue-500" /> Diagnosis Classification
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {["Normal","Benign","Malignant"].map(d => (
                <button
                  key={d}
                  onClick={() => setDxOverride(d)}
                  className={clsx(
                    "p-2.5 rounded-xl border-2 text-xs font-semibold transition-all text-center",
                    dx === d
                      ? DX_BORDER[d] + " scale-105 shadow-sm"
                      : "border-slate-100 text-slate-400 hover:border-slate-200"
                  )}
                >
                  {d === "Normal" && "✅"}
                  {d === "Benign" && "⚠️"}
                  {d === "Malignant" && "🔴"}
                  <div className="mt-1">{d}</div>
                </button>
              ))}
            </div>
          </div>

          {/* DICOM metadata */}
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Scan Metadata</h3>
            <div className="space-y-1.5">
              {[
                ["Patient ID", cur.patient || cur.patient_id || "IQ-0042"],
                ["Modality", "CT"],
                ["Image Size", "512 × 512 px"],
                ["Bit Depth", "16-bit grayscale"],
                ["Noise Type", "Additive Gaussian Blur"],
                ["Noise σ", (cur.noise_sigma || 0.15).toFixed(4)],
                ["Pipeline", "AGF + Haar + DnCNN"],
                ["Compute Time", `${cur.processing_time_ms || 16.7} ms`],
                ["Status", cur.status || "complete"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between items-center py-1 border-b border-slate-50 last:border-0">
                  <span className="text-[11px] text-slate-400">{k}</span>
                  <span className="text-[11px] text-slate-700 font-mono font-medium text-right max-w-[140px] truncate">{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-2">Radiologist Notes</h3>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Add clinical observations about denoising quality, visible structures, and diagnostic confidence…"
              className="input h-28 resize-none text-xs"
            />
          </div>

          {/* Action buttons */}
          <div className="space-y-2">
            <button
              onClick={() => setAccepted(true)}
              className="btn btn-primary w-full justify-center"
            >
              <CheckCircle size={14} /> Accept Denoised Image
            </button>
            <button className="btn w-full justify-center text-amber-600 border-amber-200 hover:bg-amber-50">
              <AlertTriangle size={14} /> Request Re-process
            </button>
            <button className="btn w-full justify-center">
              <Download size={14} /> Download Report (PDF)
            </button>
          </div>

          {accepted && (
            <div className="card p-3 bg-green-50 border border-green-200 text-center">
              <CheckCircle size={18} className="text-green-500 mx-auto mb-1" />
              <div className="text-xs font-semibold text-green-700">Image accepted for clinical use</div>
              <div className="text-[10px] text-green-600 mt-0.5">Diagnosis: {dx} · SSIM: {(cur.ssim || 0.98).toFixed(4)}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
