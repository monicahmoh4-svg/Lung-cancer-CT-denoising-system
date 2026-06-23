import axios from "axios";
import toast from "react-hot-toast";

const API_BASE = import.meta.env.VITE_API_URL || "";

const api = axios.create({
  baseURL: `${API_BASE}/api/v1`,
  timeout: 60000,
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const msg =
      err.response?.data?.detail ||
      err.response?.data?.message ||
      err.message ||
      "An error occurred";
    toast.error(msg);
    return Promise.reject(err);
  }
);

export const apiUploadImage = (file, patientId = "", diagnosis = "unknown") => {
  const form = new FormData();
  form.append("file", file);
  form.append("patient_id", patientId);
  form.append("diagnosis", diagnosis);
  return api.post("/ingest", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const apiDenoiseImage = (payload) => api.post("/denoise", payload);

export const apiGetMetrics = (id) => api.get(`/metrics/${id}`);

export const apiAggregateMetrics = () => api.get("/metrics/aggregate/summary");

export const apiListImages = (limit = 50, offset = 0) =>
  api.get(`/images?limit=${limit}&offset=${offset}`);

export const apiGetImage = (id) => api.get(`/images/${id}`);

export const apiDeleteImage = (id) => api.delete(`/images/${id}`);

export const apiStartBatch = (payload) => api.post("/batch", payload);

export const apiGetBatch = (jobId) => api.get(`/batch/${jobId}`);

export const apiDatasetInfo = () => api.get("/dataset/info");

export const apiPsnrTable = () => api.get("/dataset/psnr-table");

export const apiSsimTable = () => api.get("/dataset/ssim-table");

export const apiMseTable = () => api.get("/dataset/mse-table");

export const apiHealth = () => api.get("/health");

export const apiPreview = (noisePct, sigma, threshold) =>
  api.post(`/denoise/preview?noise_pct=${noisePct}&sigma=${sigma}&threshold=${threshold}`);

export default api;
