import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Ingest from "./pages/Ingest";
import Denoise from "./pages/Denoise";
import Evaluation from "./pages/Evaluation";
import RadiologistView from "./pages/RadiologistView";
import BatchProcessing from "./pages/BatchProcessing";
import Dataset from "./pages/Dataset";
import Architecture from "./pages/Architecture";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/"           element={<Dashboard />} />
        <Route path="/ingest"     element={<Ingest />} />
        <Route path="/denoise"    element={<Denoise />} />
        <Route path="/evaluation" element={<Evaluation />} />
        <Route path="/radiologist" element={<RadiologistView />} />
        <Route path="/batch"      element={<BatchProcessing />} />
        <Route path="/dataset"    element={<Dataset />} />
        <Route path="/architecture" element={<Architecture />} />
      </Route>
    </Routes>
  );
}
