import clsx from "clsx";
import { CheckCircle, Loader2 } from "lucide-react";

// ── Metric display card ──────────────────────────────────────────────────────
export function MetricGrid({ metrics }) {
  if (!metrics) return null;
  const items = [
    { key: "psnr", label: "PSNR",  unit: " dB",   color: "blue",   hint: "Higher = better",    pct: Math.min(100, ((metrics.psnr || 0) / 36) * 100) },
    { key: "ssim", label: "SSIM",  unit: "",       color: "green",  hint: "1.0 = perfect",      pct: (metrics.ssim || 0) * 100 },
    { key: "mse",  label: "MSE",   unit: "",       color: "amber",  hint: "Lower = better",     pct: Math.max(0, 100 - ((metrics.mse || 0) / 1000) * 100) },
    { key: "snr",  label: "SNR",   unit: " dB",    color: "sky",    hint: "Signal-to-noise",    pct: Math.min(100, ((metrics.snr || 0) / 25) * 100) },
  ];
  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map(({ key, label, unit, color, hint, pct }) => (
        <div key={key} className={`rounded-xl border p-3 bg-${color}-50 border-${color}-100`}>
          <div className="text-[10px] text-slate-400 uppercase tracking-wide">{label}</div>
          <div className={`text-xl font-bold text-${color}-700 mt-0.5`}>
            {metrics[key] != null ? `${Number(metrics[key]).toFixed(key === "mse" ? 2 : key === "ssim" ? 4 : 2)}${unit}` : "—"}
          </div>
          <div className="progress mt-1.5">
            <div className={`progress-fill bg-${color}-400`} style={{ width: `${pct}%` }} />
          </div>
          <div className="text-[10px] text-slate-400 mt-1">{hint}</div>
        </div>
      ))}
    </div>
  );
}

// ── Pipeline step list ───────────────────────────────────────────────────────
const STEP_DEFS = [
  { label: "Load & Preprocess CT Scan",       sub: "Grayscale · 512×512 · normalize" },
  { label: "Estimate Noise σ",                sub: "Wavelet / MAD / Laplacian" },
  { label: "Anisotropic Gaussian Filter",     sub: "G(x,y) = exp(-(x²+y²)/2σ²)" },
  { label: "Haar Wavelet DWT (Level 2)",      sub: "LL2, LH, HL, HH sub-bands" },
  { label: "Soft Thresholding (λ = 0.05)",   sub: "Suppress AGBN coefficients" },
  { label: "DnCNN Inference (17 layers)",     sub: "64 filters · BN + ReLU · skip" },
  { label: "Inverse Haar DWT",               sub: "Reconstruct denoised image" },
  { label: "Compute Quality Metrics",        sub: "PSNR · SSIM · MSE · SNR" },
  { label: "Store & Deliver",                sub: "Save PNG · return base64" },
];

export function PipelineSteps({ stepIdx }) {
  return (
    <div className="space-y-1.5">
      {STEP_DEFS.map((step, i) => {
        const done   = stepIdx > i;
        const active = stepIdx === i;
        return (
          <div key={i} className={clsx(
            "flex items-start gap-2.5 p-2.5 rounded-lg border text-xs transition-all duration-200",
            done   ? "border-green-200 bg-green-50/60" :
            active ? "border-blue-300 bg-blue-50 shadow-sm" :
                     "border-slate-100 bg-white opacity-40"
          )}>
            <div className={clsx(
              "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5",
              done   ? "bg-green-500 text-white" :
              active ? "bg-blue-600 text-white"  :
                       "bg-slate-200 text-slate-400"
            )}>
              {done   ? <CheckCircle size={11} /> :
               active ? <Loader2 size={10} className="animate-spin" /> :
                        i + 1}
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-slate-700">{step.label}</div>
              <div className="text-[10px] text-slate-400 font-mono">{step.sub}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Image comparison panel ───────────────────────────────────────────────────
export function ImageCompare({ original, noisy, denoised, labels }) {
  const imgs = [
    { src: original, label: labels?.[0] || "Original" },
    { src: noisy,    label: labels?.[1] || "Noisy" },
    { src: denoised, label: labels?.[2] || "Denoised ✓" },
  ].filter(i => i.src);

  return (
    <div className={clsx("grid gap-2", imgs.length === 3 ? "grid-cols-3" : imgs.length === 2 ? "grid-cols-2" : "grid-cols-1")}>
      {imgs.map(({ src, label }) => (
        <div key={label} className="rounded-xl border border-blue-100 overflow-hidden bg-slate-900">
          <img
            src={src.startsWith("data:") ? src : `data:image/png;base64,${src}`}
            alt={label}
            className="w-full object-cover"
            style={{ imageRendering: "pixelated" }}
          />
          <div className="text-[11px] text-center py-1.5 bg-slate-800 text-slate-300 font-medium">
            {label}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Status badge ─────────────────────────────────────────────────────────────
export function StatusBadge({ status }) {
  const map = {
    complete:   { cls: "tag-green",  text: "Complete" },
    processing: { cls: "tag-blue",   text: "Processing" },
    pending:    { cls: "tag-amber",  text: "Pending" },
    failed:     { cls: "tag-red",    text: "Failed" },
  };
  const { cls, text } = map[status] || { cls: "tag-slate", text: status };
  return <span className={clsx("tag text-[10px]", cls)}>{text}</span>;
}

// ── Pipeline info badge ────────────────────────────────────────────────────────
export function PipelineBadge({ pipeline }) {
  return (
    <span className="tag tag-blue text-[10px] font-mono">
      {pipeline || "AGF+Haar+DnCNN"}
    </span>
  );
}

// ── Inline loading spinner ────────────────────────────────────────────────────
export function Spinner({ size = 16, className = "" }) {
  return <Loader2 size={size} className={clsx("animate-spin", className)} />;
}

// ── Empty state ───────────────────────────────────────────────────────────────
export function EmptyState({ icon = "🔬", title, description, action }) {
  return (
    <div className="card p-10 text-center flex flex-col items-center gap-3">
      <span className="text-4xl">{icon}</span>
      {title && <div className="text-sm font-semibold text-slate-600">{title}</div>}
      {description && <div className="text-xs text-slate-400 max-w-xs">{description}</div>}
      {action}
    </div>
  );
}

// ── Section header ────────────────────────────────────────────────────────────
export function SectionHeader({ title, description, children }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-4">
      <div>
        <h2 className="text-sm font-bold text-slate-700">{title}</h2>
        {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
      </div>
      {children && <div className="flex gap-2 flex-shrink-0">{children}</div>}
    </div>
  );
}
