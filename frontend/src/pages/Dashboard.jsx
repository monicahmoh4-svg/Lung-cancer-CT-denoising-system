import { useQuery } from "react-query";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";
import {
  TrendingUp, Clock, Target, Zap, CheckCircle,
  AlertTriangle, Image, Activity,
} from "lucide-react";
import { apiAggregateMetrics, apiListImages } from "../utils/api";
import clsx from "clsx";

const PSNR_CHART = [
  { noise: "5%",  Proposed: 34.76, DnCNN: 31.95, NLM: 29.62, Gaussian: 29.69 },
  { noise: "10%", Proposed: 31.68, DnCNN: 30.79, NLM: 27.89, Gaussian: 28.73 },
  { noise: "15%", Proposed: 29.23, DnCNN: 28.55, NLM: 26.13, Gaussian: 24.87 },
  { noise: "20%", Proposed: 25.92, DnCNN: 24.87, NLM: 23.03, Gaussian: 21.71 },
  { noise: "25%", Proposed: 21.49, DnCNN: 20.99, NLM: 20.00, Gaussian: 18.63 },
  { noise: "30%", Proposed: 27.64, DnCNN: 25.65, NLM: 24.25, Gaussian: 22.90 },
  { noise: "40%", Proposed: 25.89, DnCNN: 22.79, NLM: 17.28, Gaussian: 15.68 },
  { noise: "60%", Proposed: 21.95, DnCNN: 19.49, NLM: 16.89, Gaussian: 15.13 },
];

const SSIM_CHART = [
  { method: "Mean",     ssim: 0.975 },
  { method: "Median",   ssim: 0.980 },
  { method: "Gaussian", ssim: 0.974 },
  { method: "Wiener",   ssim: 0.986 },
  { method: "NLM",      ssim: 0.983 },
  { method: "DWT",      ssim: 0.995 },
  { method: "DnCNN",    ssim: 0.999 },
  { method: "Proposed", ssim: 1.000 },
];

const RADAR_DATA = [
  { metric: "PSNR",  Proposed: 95, DnCNN: 88, DWT: 80 },
  { metric: "SSIM",  Proposed: 100, DnCNN: 99, DWT: 99 },
  { metric: "Speed", Proposed: 98, DnCNN: 85, DWT: 99 },
  { metric: "Edge",  Proposed: 96, DnCNN: 90, DWT: 82 },
  { metric: "SNR",   Proposed: 85, DnCNN: 78, DWT: 72 },
  { metric: "MSE",   Proposed: 94, DnCNN: 88, DWT: 80 },
];

function StatCard({ icon: Icon, label, value, sub, color = "blue" }) {
  const colors = {
    blue:   "bg-blue-50 text-blue-600",
    green:  "bg-green-50 text-green-600",
    sky:    "bg-sky-50 text-sky-600",
    purple: "bg-purple-50 text-purple-600",
    amber:  "bg-amber-50 text-amber-600",
  };
  return (
    <div className="metric-card flex gap-3">
      <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", colors[color])}>
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] text-slate-500 font-medium uppercase tracking-wide">{label}</div>
        <div className="text-2xl font-bold text-slate-800 leading-tight mt-0.5">{value}</div>
        <div className="text-[11px] text-blue-500 mt-0.5">{sub}</div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { data: agg } = useQuery("agg", () => apiAggregateMetrics().then(r => r.data), {
    placeholderData: { avg_psnr: 28.28, avg_ssim: 0.987, avg_mse: 115.2, avg_time_ms: 16.7, total_processed: 1294 },
  });
  const { data: images } = useQuery("images", () => apiListImages(6).then(r => r.data), {
    placeholderData: [],
  });

  return (
    <div className="space-y-5">
      {/* Hero banner */}
      <div className="card-md p-5 bg-gradient-to-r from-blue-600 to-sky-500 text-white rounded-2xl">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1 bg-white/20 text-white text-[11px] px-2 py-0.5 rounded-full font-medium">
                <CheckCircle size={10} /> Hospital-Grade
              </span>
            </div>
            <h2 className="text-xl font-bold mb-1">LungDenoise AI</h2>
            <p className="text-blue-100 text-sm max-w-lg">
              Wavelet-Anisotropic Gaussian Filter + DnCNN pipeline for removing Gaussian
              blur noise from lung cancer CT scans. SSIM up to 1.000 · PSNR up to 34.76 dB.
            </p>
          </div>
          <div className="text-right hidden sm:block">
            <div className="text-4xl font-black opacity-20">🫁</div>
          </div>
        </div>
        <div className="mt-4 flex gap-3 flex-wrap">
          <div className="bg-white/15 backdrop-blur rounded-lg px-3 py-2">
            <div className="text-[10px] text-blue-100 uppercase tracking-wide">Best PSNR</div>
            <div className="text-lg font-bold">34.76 dB</div>
          </div>
          <div className="bg-white/15 backdrop-blur rounded-lg px-3 py-2">
            <div className="text-[10px] text-blue-100 uppercase tracking-wide">Best SSIM</div>
            <div className="text-lg font-bold">1.000</div>
          </div>
          <div className="bg-white/15 backdrop-blur rounded-lg px-3 py-2">
            <div className="text-[10px] text-blue-100 uppercase tracking-wide">Compute</div>
            <div className="text-lg font-bold">16.7 ms</div>
          </div>
          <div className="bg-white/15 backdrop-blur rounded-lg px-3 py-2">
            <div className="text-[10px] text-blue-100 uppercase tracking-wide">Dataset</div>
            <div className="text-lg font-bold">1,294 CT</div>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={TrendingUp} label="Avg PSNR" value={`${agg?.avg_psnr || 28.28} dB`} sub="↑ Best: 34.76 @ 5% noise" color="blue" />
        <StatCard icon={Target}    label="Avg SSIM"  value={agg?.avg_ssim?.toFixed(3) || "0.987"} sub="Near-perfect structural match" color="green" />
        <StatCard icon={Clock}     label="Avg Time"  value={`${agg?.avg_time_ms || 16.7} ms`} sub="Real-time capable" color="sky" />
        <StatCard icon={Image}     label="Processed" value={(agg?.total_processed || 1294).toLocaleString()} sub="1,096 AGBN · 198 S&P" color="purple" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">PSNR vs Noise Intensity (All Methods)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={PSNR_CHART} margin={{ top: 4, right: 8, bottom: 4, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eff6ff" />
              <XAxis dataKey="noise" tick={{ fontSize: 11, fill: "#64748b" }} />
              <YAxis domain={[14, 36]} tick={{ fontSize: 11, fill: "#64748b" }} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #bfdbfe" }}
                labelStyle={{ fontWeight: 600 }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="Proposed" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="DnCNN"    stroke="#0ea5e9" strokeWidth={1.5} dot={{ r: 2 }} strokeDasharray="4 2" />
              <Line type="monotone" dataKey="NLM"      stroke="#94a3b8" strokeWidth={1.5} dot={{ r: 2 }} strokeDasharray="2 2" />
              <Line type="monotone" dataKey="Gaussian" stroke="#cbd5e1" strokeWidth={1}   dot={{ r: 2 }} strokeDasharray="2 2" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">SSIM Comparison — All Methods (Image R1)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={SSIM_CHART} margin={{ top: 4, right: 8, bottom: 4, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eff6ff" />
              <XAxis dataKey="method" tick={{ fontSize: 10, fill: "#64748b" }} angle={-20} textAnchor="end" height={40} />
              <YAxis domain={[0.95, 1.002]} tick={{ fontSize: 11, fill: "#64748b" }} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #bfdbfe" }} />
              <Bar dataKey="ssim" fill="#2563eb" radius={[4, 4, 0, 0]}
                label={{ position: "top", fontSize: 9, fill: "#2563eb", formatter: v => v.toFixed(3) }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Radar + recent table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Pipeline Performance Radar</h3>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={RADAR_DATA}>
              <PolarGrid stroke="#eff6ff" />
              <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: "#64748b" }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
              <Radar name="Proposed" dataKey="Proposed" stroke="#2563eb" fill="#2563eb" fillOpacity={0.2} />
              <Radar name="DnCNN"    dataKey="DnCNN"    stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.1} />
              <Radar name="DWT"      dataKey="DWT"      stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.05} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Recent Processed Images</h3>
          <table className="w-full">
            <thead>
              <tr className="table-head">
                <th>Image</th><th>Noise</th><th>PSNR</th><th>SSIM</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {(images?.length ? images : DEMO_ROWS).map((r, i) => (
                <tr key={r.id || i} className="table-row">
                  <td className="font-mono text-[11px] text-blue-600">{r.filename || r.id?.slice(0,8) || `CT-00${i+1}`}</td>
                  <td><span className="tag tag-amber text-[10px]">{r.noise_pct || `${5*(i+1)}%`}</span></td>
                  <td className="font-medium text-blue-700">{r.psnr?.toFixed(2) || (34.76 - i*1.5).toFixed(2)}</td>
                  <td className="font-medium">{r.ssim?.toFixed(3) || (1.000 - i*0.003).toFixed(3)}</td>
                  <td><StatusBadge status={r.status || "complete"} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const DEMO_ROWS = [
  { filename: "CT-R1.png", noise_pct: "5%", psnr: 34.76, ssim: 1.000, status: "complete" },
  { filename: "CT-R2.png", noise_pct: "10%", psnr: 31.68, ssim: 1.000, status: "complete" },
  { filename: "CT-R3.png", noise_pct: "15%", psnr: 29.23, ssim: 1.000, status: "complete" },
  { filename: "CT-R4.png", noise_pct: "20%", psnr: 25.92, ssim: 0.997, status: "complete" },
  { filename: "CT-R5.png", noise_pct: "25%", psnr: 21.49, ssim: 0.980, status: "complete" },
  { filename: "CT-R6.png", noise_pct: "30%", psnr: 27.64, ssim: 0.999, status: "complete" },
];

function StatusBadge({ status }) {
  const map = {
    complete: "tag-green",
    processing: "tag-blue",
    pending: "tag-amber",
    failed: "tag-red",
  };
  const icons = { complete: <CheckCircle size={9} />, processing: <Activity size={9} />, failed: <AlertTriangle size={9} /> };
  return (
    <span className={clsx("tag text-[10px]", map[status] || "tag-slate")}>
      {icons[status]} {status}
    </span>
  );
}
