import { GitBranch, Server, Cpu, Database, Globe, Shield } from "lucide-react";
import clsx from "clsx";

const PIPELINE = [
  { icon:"🏥", label:"Hospital CT Scanner / PACS",    desc:"DICOM export from imaging equipment",                 color:"blue"  },
  { icon:"📥", label:"Data Ingestion API",             desc:"FastAPI · pydicom · OpenCV · normalize 512×512",     color:"sky"   },
  { icon:"⚙️", label:"Preprocessing Engine",          desc:"Grayscale · normalize · patch extraction 45×45",     color:"purple"},
  { icon:"🔍", label:"Noise Detection Module",         desc:"MAD / Wavelet-based σ estimation · classify AGBN",   color:"amber" },
  { icon:"🌀", label:"Anisotropic Gaussian Filter",    desc:"G(x,y) = exp(-(x²+y²)/2σ²) · edge-adaptive blend",  color:"blue"  },
  { icon:"📊", label:"Haar Wavelet DWT (Level 2)",     desc:"LL2 + LH,HL,HH sub-bands · soft thresholding λ",    color:"sky"   },
  { icon:"🧠", label:"DnCNN Post-Processing",          desc:"17 layers · 64 filters · BN + ReLU · skip connect", color:"purple"},
  { icon:"🔄", label:"Inverse Haar DWT (IDWT)",        desc:"Reconstruct denoised image from sub-bands",          color:"blue"  },
  { icon:"📈", label:"Evaluation Engine",              desc:"PSNR · SSIM · MSE · SNR · benchmark vs 7 methods",  color:"green" },
  { icon:"💾", label:"Storage Service",                desc:"PostgreSQL metadata · file system · clean images",   color:"sky"   },
  { icon:"👁️", label:"Radiologist Interface / API",   desc:"React dashboard · REST API · DICOM download",        color:"purple"},
];

const SERVICES = [
  { name:"Ingestion Service",  tech:"FastAPI + pydicom + OpenCV",   port:"8000", color:"blue"  },
  { name:"Noise Detector",     tech:"NumPy + SciPy + PyWavelets",   port:"8001", color:"sky"   },
  { name:"AGF Processor",      tech:"OpenCV + NumPy",               port:"8002", color:"purple"},
  { name:"Wavelet Engine",     tech:"PyWavelets (Haar DWT/IDWT)",   port:"8003", color:"blue"  },
  { name:"DnCNN Inference",    tech:"TensorFlow/Keras (17-layer)",  port:"8004", color:"sky"   },
  { name:"Metrics Engine",     tech:"scikit-image + NumPy",         port:"8005", color:"green" },
  { name:"Storage Service",    tech:"SQLAlchemy async + aiosqlite", port:"8006", color:"amber" },
  { name:"Radiologist UI",     tech:"React 18 + Recharts + Vite",  port:"3000", color:"purple"},
];

const DEPLOYMENT = [
  { platform:"Vercel",  role:"Frontend",  detail:"React SPA · CDN · auto-deploy from GitHub",       color:"sky"   },
  { platform:"Render",  role:"Backend",   detail:"FastAPI · Python 3.11 · 512 MB RAM tier",          color:"blue"  },
  { platform:"SQLite",  role:"Database",  detail:"Bundled with backend · upgrade to PostgreSQL prod", color:"green" },
  { platform:"GitHub",  role:"CI/CD",     detail:"Push to main → Vercel + Render auto-deploy",        color:"purple"},
];

const colorBg = {
  blue:  "bg-blue-50 text-blue-600 border-blue-200",
  sky:   "bg-sky-50 text-sky-600 border-sky-200",
  purple:"bg-purple-50 text-purple-600 border-purple-200",
  amber: "bg-amber-50 text-amber-600 border-amber-200",
  green: "bg-green-50 text-green-600 border-green-200",
};

export default function Architecture() {
  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="card p-4 border-l-4 border-l-blue-500 bg-blue-50/50 flex gap-3">
        <GitBranch size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-blue-700">
          <strong>Full-stack microservices architecture</strong> — FastAPI backend (Render) + React frontend (Vercel) +
          SQLite/PostgreSQL storage. All services communicate via REST API.
          The pipeline implements <strong>AGF → Haar DWT → Soft Threshold → DnCNN → IDWT</strong> as described in Abuya et al. 2023.
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pipeline flow */}
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <Cpu size={14} className="text-blue-500" /> High-Level Pipeline Flow
          </h3>
          <div className="space-y-1.5">
            {PIPELINE.map((node, i) => (
              <div key={node.label}>
                <div className={clsx(
                  "flex items-center gap-3 p-2.5 rounded-lg border transition-all hover:shadow-sm cursor-default",
                  colorBg[node.color]
                )}>
                  <span className="text-base">{node.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold truncate">{node.label}</div>
                    <div className="text-[10px] opacity-75 truncate">{node.desc}</div>
                  </div>
                </div>
                {i < PIPELINE.length - 1 && (
                  <div className="text-center text-blue-300 text-sm leading-none py-0.5">↓</div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {/* Microservices */}
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <Server size={14} className="text-blue-500" /> Microservices
            </h3>
            <div className="space-y-2">
              {SERVICES.map(s => (
                <div key={s.name} className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-100 hover:bg-blue-50/40 transition-colors">
                  <div className={clsx("w-1.5 h-8 rounded-full flex-shrink-0", `bg-${s.color}-400`)} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-slate-700">{s.name}</div>
                    <div className="text-[10px] text-slate-400">{s.tech}</div>
                  </div>
                  <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">:{s.port}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Deployment */}
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <Globe size={14} className="text-blue-500" /> Deployment Strategy
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {DEPLOYMENT.map(d => (
                <div key={d.platform} className={clsx("p-3 rounded-xl border", colorBg[d.color])}>
                  <div className="text-xs font-bold">{d.platform}</div>
                  <div className="text-[10px] font-semibold opacity-80 mt-0.5">{d.role}</div>
                  <div className="text-[10px] opacity-65 mt-1">{d.detail}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* DnCNN architecture */}
      <div className="card p-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">DnCNN Architecture Detail</h3>
        <div className="flex flex-wrap gap-2 items-center">
          {[
            { label:"Input", sub:"Noisy CT (H×W×1)", color:"slate" },
            { label:"Layer 1", sub:"Conv+ReLU (64 filters 3×3)", color:"blue" },
            ...Array.from({ length: 5 }, (_, i) => ({ label: `Layer ${i+2}–${i+3}`, sub: "Conv+BN+ReLU ×2", color: "sky" })),
            { label:"Layer 17", sub:"Conv (3×3×1) output", color:"purple" },
            { label:"Subtract", sub:"Input − Noise", color:"green" },
            { label:"Output", sub:"Denoised CT", color:"green" },
          ].map((l, i, arr) => (
            <div key={i} className="flex items-center gap-1">
              <div className={clsx("px-3 py-2 rounded-lg border text-center min-w-[80px]", colorBg[l.color])}>
                <div className="text-[10px] font-bold">{l.label}</div>
                <div className="text-[9px] opacity-70 mt-0.5 leading-tight">{l.sub}</div>
              </div>
              {i < arr.length - 1 && <span className="text-blue-300 text-xs">→</span>}
            </div>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-3">
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
            <div className="text-[10px] text-slate-400 uppercase tracking-wide">Skip Connection</div>
            <div className="font-mono text-xs text-blue-700 mt-1">R(x) = F(x) + x</div>
          </div>
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
            <div className="text-[10px] text-slate-400 uppercase tracking-wide">Loss Function</div>
            <div className="font-mono text-xs text-blue-700 mt-1">L = 1/2N · Σ‖R(y;θ)−(y-x)‖²</div>
          </div>
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
            <div className="text-[10px] text-slate-400 uppercase tracking-wide">Optimiser</div>
            <div className="font-mono text-xs text-blue-700 mt-1">Adam lr=0.00238 · 47 epochs</div>
          </div>
        </div>
      </div>

      {/* API reference table */}
      <div className="card p-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <Shield size={14} className="text-blue-500" /> REST API Endpoints
        </h3>
        <table className="w-full text-xs">
          <thead>
            <tr className="table-head">
              {["Method","Endpoint","Description","Auth"].map(h => (
                <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold text-blue-500 uppercase tracking-wider border-b border-blue-100 bg-blue-50/50">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              ["POST","GET", "/api/v1/ingest",             "Upload CT scan (DICOM/PNG/JPG)", "—"],
              ["GET", "GET", "/api/v1/images",             "List all ingested images",        "—"],
              ["POST","POST","/api/v1/denoise",            "Run AGF+Haar+DnCNN pipeline",     "—"],
              ["GET", "GET", "/api/v1/denoise/{id}/download","Download denoised PNG",         "—"],
              ["POST","POST","/api/v1/denoise/preview",   "Synthetic CT preview",            "—"],
              ["GET", "GET", "/api/v1/metrics/{id}",      "Get PSNR/SSIM/MSE/SNR",          "—"],
              ["GET", "GET", "/api/v1/metrics/aggregate/summary","Aggregate stats",           "—"],
              ["POST","POST","/api/v1/batch",              "Start batch processing job",      "—"],
              ["GET", "GET", "/api/v1/batch/{job_id}",    "Poll batch job status",           "—"],
              ["GET", "GET", "/api/v1/dataset/info",      "Dataset metadata",                "—"],
              ["GET", "GET", "/api/v1/health",            "Health check",                    "—"],
            ].map(([, method, path, desc, auth]) => (
              <tr key={path} className="table-row">
                <td>
                  <span className={clsx(
                    "tag text-[10px] font-mono font-bold",
                    method === "POST" ? "tag-green" : "tag-blue"
                  )}>{method}</span>
                </td>
                <td className="font-mono text-blue-700">{path}</td>
                <td className="text-slate-500">{desc}</td>
                <td><span className="tag tag-slate text-[10px]">{auth}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
