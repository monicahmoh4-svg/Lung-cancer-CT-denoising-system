import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileImage, CheckCircle, Loader2, AlertTriangle, X, Info } from "lucide-react";
import toast from "react-hot-toast";
import clsx from "clsx";
import { apiUploadImage } from "../utils/api";

export default function Ingest() {
  const [files, setFiles] = useState([]);
  const [patientId, setPatientId] = useState("");
  const [diagnosis, setDiagnosis] = useState("unknown");

  const onDrop = useCallback((accepted, rejected) => {
    if (rejected.length) toast.error("Some files were rejected (max 50 MB, DICOM/PNG/JPG)");
    const newFiles = accepted.map(f => ({
      file: f,
      id: Math.random().toString(36).slice(2),
      status: "idle",
      preview: null,
      result: null,
    }));
    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".png", ".jpg", ".jpeg"], "application/dicom": [".dcm", ".dicom"] },
    maxSize: 50 * 1024 * 1024,
    multiple: true,
  });

  const uploadFile = async (item) => {
    setFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: "uploading" } : f));
    try {
      const res = await apiUploadImage(item.file, patientId, diagnosis);
      const data = res.data;
      setFiles(prev => prev.map(f =>
        f.id === item.id
          ? { ...f, status: "done", result: data, preview: data.preview ? `data:image/png;base64,${data.preview}` : null }
          : f
      ));
      toast.success(`${item.file.name} uploaded — σ = ${data.noise_sigma}`);
    } catch (e) {
      setFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: "error" } : f));
    }
  };

  const uploadAll = () => files.filter(f => f.status === "idle").forEach(uploadFile);
  const remove = (id) => setFiles(prev => prev.filter(f => f.id !== id));

  const idleCount = files.filter(f => f.status === "idle").length;

  return (
    <div className="space-y-4">
      {/* Info banner */}
      <div className="card p-4 border-l-4 border-l-blue-500 bg-blue-50/50 flex gap-3">
        <Info size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-blue-700">
          <strong>Accepted formats:</strong> DICOM (.dcm), PNG, JPG.
          Images are auto-converted to grayscale 512×512 and noise σ is estimated with Haar wavelet method.
          All uploads are stored securely and tied to a patient record.
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Upload zone + settings */}
        <div className="space-y-4">
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Patient Metadata</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-500 font-medium mb-1 block">Patient ID (optional)</label>
                <input className="input" placeholder="e.g. IQ-0042" value={patientId} onChange={e => setPatientId(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-slate-500 font-medium mb-1 block">Diagnosis Classification</label>
                <select className="select" value={diagnosis} onChange={e => setDiagnosis(e.target.value)}>
                  <option value="unknown">Unknown</option>
                  <option value="normal">Normal</option>
                  <option value="benign">Benign</option>
                  <option value="malignant">Malignant</option>
                </select>
              </div>
            </div>
          </div>

          <div className="card p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Preprocessing Config</h3>
            <div className="space-y-2 text-sm text-slate-600">
              {[
                ["Output size", "512 × 512 px"],
                ["Color", "Force grayscale"],
                ["Normalisation", "0 – 1 float"],
                ["Noise estimator", "Haar wavelet (σ)"],
                ["Patch size", "45 × 45 → 2,200/img"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between items-center py-1.5 border-b border-blue-50 last:border-0">
                  <span className="text-slate-500 text-xs">{k}</span>
                  <span className="font-mono text-xs text-blue-700 font-medium">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Drop zone */}
        <div className="lg:col-span-2 space-y-4">
          <div
            {...getRootProps()}
            className={clsx(
              "card p-10 text-center cursor-pointer border-2 border-dashed transition-all duration-200",
              isDragActive ? "border-blue-400 bg-blue-50" : "border-blue-200 hover:border-blue-300 hover:bg-blue-50/30"
            )}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-3">
              <div className={clsx(
                "w-14 h-14 rounded-2xl flex items-center justify-center transition-colors",
                isDragActive ? "bg-blue-100" : "bg-blue-50"
              )}>
                <Upload size={24} className="text-blue-500" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-700">
                  {isDragActive ? "Drop CT scans here..." : "Drop CT scan files or click to browse"}
                </div>
                <div className="text-xs text-slate-400 mt-1">DICOM · PNG · JPG — up to 50 MB per file</div>
              </div>
              <button className="btn btn-primary btn-sm" onClick={e => e.stopPropagation()}>
                <FileImage size={13} /> Choose Files
              </button>
            </div>
          </div>

          {/* File list */}
          {files.length > 0 && (
            <div className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-700">Files ({files.length})</h3>
                <div className="flex gap-2">
                  {idleCount > 0 && (
                    <button className="btn btn-primary btn-sm" onClick={uploadAll}>
                      <Upload size={12} /> Upload All ({idleCount})
                    </button>
                  )}
                </div>
              </div>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {files.map((item) => (
                  <FileRow key={item.id} item={item} onUpload={() => uploadFile(item)} onRemove={() => remove(item.id)} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FileRow({ item, onUpload, onRemove }) {
  const status = item.status;
  const icons = {
    idle: <FileImage size={14} className="text-slate-400" />,
    uploading: <Loader2 size={14} className="text-blue-500 animate-spin" />,
    done: <CheckCircle size={14} className="text-green-500" />,
    error: <AlertTriangle size={14} className="text-red-400" />,
  };
  return (
    <div className={clsx(
      "flex items-center gap-3 p-3 rounded-lg border text-sm transition-colors",
      status === "done" ? "border-green-200 bg-green-50/40" :
      status === "error" ? "border-red-200 bg-red-50/30" :
      status === "uploading" ? "border-blue-200 bg-blue-50/40" :
      "border-slate-100 bg-slate-50/50"
    )}>
      {item.preview ? (
        <img src={item.preview} className="w-10 h-10 rounded object-cover border border-blue-100" alt="" />
      ) : (
        <div className="w-10 h-10 rounded bg-blue-100 flex items-center justify-center">{icons[status]}</div>
      )}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-slate-700 truncate text-xs">{item.file.name}</div>
        <div className="text-[11px] text-slate-400">
          {(item.file.size / 1024).toFixed(0)} KB
          {item.result && ` · σ = ${item.result.noise_sigma} · ${item.result.stats?.width}×${item.result.stats?.height}`}
          {item.result?.id && ` · ID: ${item.result.id.slice(0,8)}`}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {status === "idle" && (
          <button className="btn btn-primary btn-xs" onClick={onUpload}>Upload</button>
        )}
        {status === "done" && <span className="tag tag-green text-[10px]">Ready</span>}
        {status === "uploading" && <span className="tag tag-blue text-[10px]">Uploading…</span>}
        {status === "error" && <button className="btn btn-xs text-red-600 border-red-200" onClick={onUpload}>Retry</button>}
        <button onClick={onRemove} className="p-1 text-slate-300 hover:text-red-400 transition-colors rounded">
          <X size={12} />
        </button>
      </div>
    </div>
  );
}
