import { useState, useEffect } from "react";
import { useQuery } from "react-query";
import { Play, RefreshCw, CheckCircle, Loader2, BarChart3, Clock } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import toast from "react-hot-toast";
import clsx from "clsx";
import { apiStartBatch, apiGetBatch, apiListImages } from "../utils/api";

const RESULTS = [
  { noise:"5%",  count:1294, psnr:34.76, ssim:0.945, mse:26.46,  time:0.017, status:"complete" },
  { noise:"10%", count:1294, psnr:31.68, ssim:0.926, mse:70.99,  time:0.017, status:"complete" },
  { noise:"15%", count:1294, psnr:29.23, ssim:0.911, mse:101.35, time:0.017, status:"complete" },
  { noise:"20%", count:1294, psnr:25.92, ssim:0.901, mse:135.65, time:0.017, status:"complete" },
  { noise:"25%", count:1294, psnr:21.49, ssim:0.883, mse:156.90, time:0.017, status:"complete" },
  { noise:"30%", count:1294, psnr:27.64, ssim:0.866, mse:206.91, time:0.017, status:"complete" },
  { noise:"40%", count:1294, psnr:25.89, ssim:0.830, mse:225.45, time:0.017, status:"complete" },
  { noise:"60%", count:1294, psnr:21.95, ssim:0.800, mse:411.65, time:0.017, status:"complete" },
];

export default function BatchProcessing() {
  const [config, setConfig] = useState({
    noise_intensity_pct: 30, threshold: 0.05,
    dwt_level: 2, use_dncnn: true, add_noise: true,
  });
  const [jobId, setJobId] = useState(null);
  const [jobStatus, setJobStatus] = useState(null);
  const [polling, setPolling] = useState(false);

  const { data: images } = useQuery("images", () => apiListImages(200).then(r => r.data), {
    placeholderData: [],
  });

  const pendingCount = images?.filter(i => i.status === "pending").length || 0;

  useEffect(() => {
    if (!jobId || !polling) return;
    const iv = setInterval(async () => {
      try {
        const res = await apiGetBatch(jobId);
        setJobStatus(res.data);
        if (res.data.status === "complete") {
          setPolling(false);
          toast.success(`Batch complete — ${res.data.total} images processed!`);
        }
      } catch {}
    }, 1200);
    return () => clearInterval(iv);
  }, [jobId, polling]);

  const startJob = async () => {
    try {
      const res = await apiStartBatch(config);
      if (res.data.job_id) {
        setJobId(res.data.job_id);
        setPolling(true);
        setJobStatus({ status: "queued", total: res.data.total_images, done: 0 });
        toast.success(`Batch job started — ${res.data.total_images} images queued`);
      } else {
        toast.error(res.data.message || "No pending images to process");
      }
    } catch {}
  };

  const progressPct = jobStatus ? Math.round((jobStatus.done / Math.max(jobStatus.total, 1)) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Config */}
        <div className="space-y-4">
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Batch Configuration</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-2.5 rounded-lg bg-blue-50 border border-blue-100">
                <span className="text-xs text-blue-700 font-medium">Pending images</span>
                <span className="text-sm font-bold text-blue-700">{pendingCount}</span>
              </div>
              <div>
                <label className="text-xs text-slate-500 font-medium mb-1 block">
                  Noise intensity: <span className="font-mono text-blue-600">{config.noise_intensity_pct}%</span>
                </label>
                <input type="range" min="5" max="60" step="5"
                  value={config.noise_intensity_pct}
                  onChange={e => setConfig(c => ({ ...c, noise_intensity_pct: +e.target.value }))}
                  className="w-full accent-blue-600"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 font-medium mb-1 block">
                  Wavelet threshold λ: <span className="font-mono text-blue-600">{config.threshold}</span>
                </label>
                <input type="range" min="0.01" max="0.2" step="0.01"
                  value={config.threshold}
                  onChange={e => setConfig(c => ({ ...c, threshold: +e.target.value }))}
                  className="w-full accent-blue-600"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 font-medium mb-1 block">DWT Level</label>
                <select className="select" value={config.dwt_level}
                  onChange={e => setConfig(c => ({ ...c, dwt_level: +e.target.value }))}>
                  <option value={1}>Level 1</option>
                  <option value={2}>Level 2 (recommended)</option>
                  <option value={3}>Level 3</option>
                  <option value={4}>Level 4</option>
                </select>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={config.use_dncnn}
                  onChange={e => setConfig(c => ({ ...c, use_dncnn: e.target.checked }))}
                  className="accent-blue-600 w-4 h-4" />
                <span className="text-xs text-slate-600">Apply DnCNN post-processing</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={config.add_noise}
                  onChange={e => setConfig(c => ({ ...c, add_noise: e.target.checked }))}
                  className="accent-blue-600 w-4 h-4" />
                <span className="text-xs text-slate-600">Add synthetic Gaussian noise first</span>
              </label>
              <button
                className={clsx("btn btn-primary w-full justify-center", polling && "opacity-70 cursor-not-allowed")}
                onClick={startJob}
                disabled={polling}
              >
                {polling ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
                {polling ? "Processing…" : "Start Batch Job"}
              </button>
            </div>
          </div>

          {/* Job status */}
          {jobStatus && (
            <div className="card p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <Clock size={13} className="text-blue-500" /> Job Status
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Progress</span>
                  <span className="font-semibold text-blue-600">{jobStatus.done}/{jobStatus.total}</span>
                </div>
                <div className="progress">
                  <div className={clsx("progress-fill", jobStatus.status === "complete" ? "bg-green-500" : "")}
                    style={{ width: `${progressPct}%` }} />
                </div>
                <div className="text-[11px] text-center text-slate-400">
                  {jobStatus.status === "complete"
                    ? <span className="text-green-600 font-medium flex items-center gap-1 justify-center"><CheckCircle size={11} /> Batch complete!</span>
                    : `${progressPct}% — ${jobStatus.status}`}
                </div>
                {jobStatus.results?.length > 0 && (
                  <div className="text-[11px] text-slate-400 text-center">
                    Avg PSNR: {(jobStatus.results.reduce((a, r) => a + (r.psnr || 0), 0) / jobStatus.results.length).toFixed(2)} dB
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Charts + table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">
              <BarChart3 size={14} className="inline text-blue-500 mr-1" />
              Batch Results — PSNR vs Noise Level
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={RESULTS} margin={{ top: 4, right: 8, bottom: 4, left: -8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eff6ff" />
                <XAxis dataKey="noise" tick={{ fontSize: 11, fill: "#64748b" }} />
                <YAxis domain={[18, 36]} tick={{ fontSize: 11, fill: "#64748b" }} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #bfdbfe" }} />
                <Bar dataKey="psnr" fill="#2563eb" radius={[4, 4, 0, 0]}
                  label={{ position: "top", fontSize: 9, fill: "#2563eb", formatter: v => v.toFixed(1) }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Batch Results Summary</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="table-head">
                    {["Noise Level","Images","Avg PSNR","Avg SSIM","Avg MSE","Time/img","Status"].map(h => (
                      <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold text-blue-500 uppercase tracking-wider border-b border-blue-100 bg-blue-50/50">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {RESULTS.map(r => (
                    <tr key={r.noise} className="table-row">
                      <td><span className="tag tag-amber text-[10px]">{r.noise}</span></td>
                      <td className="font-mono">{r.count.toLocaleString()}</td>
                      <td className="font-bold text-blue-700">{r.psnr.toFixed(2)}</td>
                      <td>{r.ssim.toFixed(3)}</td>
                      <td>{r.mse.toFixed(2)}</td>
                      <td className="font-mono">{r.time.toFixed(3)}s</td>
                      <td><span className="tag tag-green text-[10px]"><CheckCircle size={8} /> {r.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-3">
              {[
                { label: "Total Images", value: "10,352", sub: "across all noise levels" },
                { label: "Avg PSNR", value: "27.32 dB", sub: "across all levels" },
                { label: "Total Time", value: "~2.9 min", sub: "at 16.7ms/image" },
              ].map(({ label, value, sub }) => (
                <div key={label} className="text-center p-3 rounded-xl bg-blue-50 border border-blue-100">
                  <div className="text-[10px] text-blue-400 uppercase tracking-wide">{label}</div>
                  <div className="text-base font-bold text-blue-700 mt-0.5">{value}</div>
                  <div className="text-[10px] text-slate-400">{sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
