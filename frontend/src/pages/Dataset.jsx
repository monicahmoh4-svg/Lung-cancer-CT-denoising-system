import { useQuery } from "react-query";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { Database, ExternalLink, BookOpen, Download } from "lucide-react";
import { apiDatasetInfo } from "../utils/api";

const CLASS_DATA  = [
  { name: "Normal",    count: 500, color: "#16a34a" },
  { name: "Benign",   count: 297, color: "#d97706" },
  { name: "Malignant",count: 497, color: "#dc2626" },
];
const NOISE_DATA = [
  { name: "Gaussian Blur (AGBN)", count: 1096, pct: 84.7, color: "#2563eb" },
  { name: "Salt & Pepper (SPN)",  count: 198,  pct: 15.3, color: "#64748b" },
];
const NOISE_INTENSITY = [
  { level:"5%",  snr:18.69 }, { level:"10%", snr:15.46 }, { level:"15%", snr:15.09 },
  { level:"20%", snr:9.80  }, { level:"25%", snr:6.90  }, { level:"30%", snr:5.11  },
  { level:"35%", snr:4.70  }, { level:"40%", snr:4.55  }, { level:"45%", snr:2.90  },
  { level:"50%", snr:2.50  }, { level:"55%", snr:2.19  }, { level:"60%", snr:1.50  },
];

export default function Dataset() {
  const { data: info } = useQuery("dataset", () => apiDatasetInfo().then(r => r.data), {
    placeholderData: {
      name: "IQ-OTH/NCCD Lung Cancer Dataset",
      total_images: 1294, image_size: "512x512",
      split: { train: 1035, test: 259 },
      collection_period: "Fall 2019 (3 months)",
    },
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="card-md p-5 bg-gradient-to-r from-sky-600 to-blue-600 text-white rounded-2xl">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <Database size={22} className="text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold">IQ-OTH/NCCD Lung Cancer Dataset</h2>
            <p className="text-sky-100 text-sm mt-1">
              Collected over 3 months in Fall 2019 from specialist hospitals, Iraq.
              1,294 CT scans classified as Normal, Benign, and Malignant.
            </p>
            <div className="mt-3 flex gap-3 flex-wrap">
              <a href="https://www.kaggle.com/datasets/hamdallak/the-iqothnccd-lung-cancer-dataset"
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-white text-xs px-3 py-1.5 rounded-lg font-medium transition-colors">
                <ExternalLink size={11} /> Primary Dataset
              </a>
              <a href="https://www.kaggle.com/datasets/aleksandarcvetanov/iq-othnccd-lung-cancer-augmented-dataset"
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-white text-xs px-3 py-1.5 rounded-lg font-medium transition-colors">
                <ExternalLink size={11} /> Augmented Dataset
              </a>
              <a href="https://doi.org/10.3390/app132112069"
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-white text-xs px-3 py-1.5 rounded-lg font-medium transition-colors">
                <BookOpen size={11} /> Research Paper
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total CT Images", value: "1,294", sub: "Grayscale · 512×512 px" },
          { label: "Training Set",    value: "1,035", sub: "80% of dataset" },
          { label: "Test Set",        value: "259",   sub: "20% of dataset" },
          { label: "Patches/Image",   value: "2,200", sub: "45×45 px patches" },
        ].map(({ label, value, sub }) => (
          <div key={label} className="metric-card text-center">
            <div className="text-2xl font-bold text-blue-700">{value}</div>
            <div className="text-[11px] font-semibold text-slate-600 mt-0.5">{label}</div>
            <div className="text-[10px] text-slate-400">{sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Class distribution pie */}
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Class Distribution</h3>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width="50%" height={180}>
              <PieChart>
                <Pie data={CLASS_DATA} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={35}>
                  {CLASS_DATA.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip formatter={(v, n) => [`${v} images`, n]} contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #bfdbfe" }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2">
              {CLASS_DATA.map(d => (
                <div key={d.name}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-slate-600" style={{ color: d.color }}>{d.name}</span>
                    <span className="text-slate-500">{d.count} ({(d.count/1294*100).toFixed(1)}%)</span>
                  </div>
                  <div className="progress">
                    <div className="progress-fill" style={{ width: `${d.count/1294*100}%`, background: d.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Noise distribution */}
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Noise Distribution</h3>
          <div className="space-y-4">
            {NOISE_DATA.map(n => (
              <div key={n.name}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="font-medium text-slate-600">{n.name}</span>
                  <span className="font-bold" style={{ color: n.color }}>{n.count} images ({n.pct}%)</span>
                </div>
                <div className="progress h-3 rounded-lg">
                  <div className="h-full rounded-lg transition-all" style={{ width: `${n.pct}%`, background: n.color }} />
                </div>
              </div>
            ))}
            <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 text-xs text-blue-700">
              <strong>Primary focus:</strong> Additive Gaussian Blur Noise (AGBN) — dominates 84.7% of images.
              Noise σ = 0.15, added at 5%–60% intensity levels for comprehensive evaluation.
            </div>
          </div>
        </div>
      </div>

      {/* SNR vs noise chart */}
      <div className="card p-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-1">SNR vs Noise Intensity (Proposed Approach)</h3>
        <p className="text-[11px] text-slate-400 mb-3">As noise intensity increases, SNR decreases — quantifying the trade-off between noise removal and signal preservation.</p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={NOISE_INTENSITY} margin={{ top: 4, right: 8, bottom: 4, left: -8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eff6ff" />
            <XAxis dataKey="level" tick={{ fontSize: 11, fill: "#64748b" }} />
            <YAxis tick={{ fontSize: 11, fill: "#64748b" }} label={{ value: "SNR (dB)", angle: -90, position: "insideLeft", offset: 12, style: { fontSize: 10, fill: "#94a3b8" } }} />
            <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #bfdbfe" }} />
            <Bar dataKey="snr" fill="#0ea5e9" radius={[4, 4, 0, 0]}
              label={{ position: "top", fontSize: 9, fill: "#0ea5e9", formatter: v => v.toFixed(1) }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Pipeline parameters reference */}
      <div className="card p-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Training Hyperparameters (from Paper)</h3>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
          {[
            ["Noise σ", "0.15"],
            ["Noise range", "5% – 60%"],
            ["Learning rate", "0.00238"],
            ["Epochs", "47"],
            ["Steps/epoch", "846"],
            ["Batch (patch)", "45 × 45 px"],
            ["Patches/image", "2,200"],
            ["DWT wavelet", "Haar"],
            ["DWT levels", "2"],
            ["Threshold λ", "0.05 (soft)"],
            ["DnCNN filters", "64 @ 3×3"],
            ["DnCNN layers", "17"],
            ["Avg compute", "0.01667 s/img"],
            ["Optimizer", "SGD / Adam"],
            ["Loss", "MSE (pixel-level)"],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between items-center p-2 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-[11px] text-slate-500">{k}</span>
              <span className="text-[11px] font-mono font-bold text-blue-700">{v}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 p-3 bg-blue-50 rounded-xl border border-blue-100 text-[11px] text-blue-700">
          <strong>Citation:</strong> Abuya T.K., Rimiru R.M., Okeyo G.O. "An Image Denoising Technique Using
          Wavelet-Anisotropic Gaussian Filter-Based Denoising Convolutional Neural Network for CT Images."
          <em> Applied Sciences</em>, 2023, 13, 12069. <a href="https://doi.org/10.3390/app132112069" target="_blank" rel="noopener noreferrer" className="underline">doi:10.3390/app132112069</a>
        </div>
      </div>

      {/* Kaggle setup */}
      <div className="card p-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
          <Download size={14} className="text-blue-500" /> Kaggle Dataset Setup
        </h3>
        <pre className="bg-slate-900 text-green-400 rounded-xl p-4 text-[11px] font-mono overflow-x-auto leading-relaxed">{`# Install Kaggle CLI
pip install kaggle

# Set credentials (from kaggle.com → Account → API)
export KAGGLE_USERNAME=your_username
export KAGGLE_KEY=your_api_key

# Download primary dataset (1,294 CT images)
kaggle datasets download hamdallak/the-iqothnccd-lung-cancer-dataset
unzip the-iqothnccd-lung-cancer-dataset.zip -d data/

# Download augmented dataset
kaggle datasets download aleksandarcvetanov/iq-othnccd-lung-cancer-augmented-dataset
unzip iq-othnccd-lung-cancer-augmented-dataset.zip -d data/augmented/

# Expected structure:
# data/
#   The IQ-OTHNCCD lung cancer dataset/
#     Normal cases/       (PNG CT scans)
#     Malignant cases/    (PNG CT scans)
#     Benign cases/       (PNG CT scans)`}</pre>
      </div>
    </div>
  );
}
