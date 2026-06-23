import { Outlet, NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Upload, Wand2, BarChart3, Eye,
  Layers, Database, GitBranch, Activity, Lung,
} from "lucide-react";
import clsx from "clsx";
import { useQuery } from "react-query";
import { apiHealth } from "../utils/api";

const NAV = [
  { label: "Workflow", items: [
    { to: "/",            icon: LayoutDashboard, label: "Dashboard" },
    { to: "/ingest",      icon: Upload,          label: "Data Ingestion" },
    { to: "/denoise",     icon: Wand2,           label: "Denoise Pipeline" },
    { to: "/evaluation",  icon: BarChart3,       label: "Evaluation" },
  ]},
  { label: "Clinical", items: [
    { to: "/radiologist", icon: Eye,    label: "Radiologist View" },
    { to: "/batch",       icon: Layers, label: "Batch Processing" },
  ]},
  { label: "System", items: [
    { to: "/dataset",      icon: Database,   label: "Dataset Info" },
    { to: "/architecture", icon: GitBranch,  label: "Architecture" },
  ]},
];

export default function Layout() {
  const { data: health } = useQuery("health", () => apiHealth().then(r => r.data), {
    refetchInterval: 30000,
    retry: false,
  });

  return (
    <div className="flex h-screen overflow-hidden bg-mesh" style={{ background: "var(--c-bg)" }}>
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 flex flex-col bg-white border-r border-blue-100 shadow-card">
        {/* Logo */}
        <div className="p-4 border-b border-blue-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-sky-400 flex items-center justify-center text-white text-sm font-bold shadow-sm">
              🫁
            </div>
            <div>
              <div className="text-sm font-bold text-slate-800 leading-none">LungDenoise</div>
              <div className="text-[10px] text-blue-500 mt-0.5 font-medium">AI · v1.0</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-4">
          {NAV.map((group) => (
            <div key={group.label}>
              <div className="section-label px-1">{group.label}</div>
              <div className="space-y-0.5">
                {group.items.map(({ to, icon: Icon, label }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === "/"}
                    className={({ isActive }) =>
                      clsx("nav-link", isActive && "active")
                    }
                  >
                    <Icon size={14} className="flex-shrink-0" />
                    <span>{label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Status footer */}
        <div className="p-3 border-t border-blue-100">
          <div className="flex items-center gap-2 px-2 py-2 rounded-lg bg-blue-50">
            <div className={clsx(
              "w-1.5 h-1.5 rounded-full",
              health ? "bg-green-500 animate-pulse" : "bg-slate-300"
            )} />
            <span className="text-[11px] text-blue-600 font-medium">
              {health ? "API Connected" : "API Offline"}
            </span>
          </div>
          <div className="mt-2 px-2 text-[10px] text-blue-400">
            IQ-OTH/NCCD Dataset · 1,294 CT Scans
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-12 flex items-center justify-between px-5 bg-white border-b border-blue-100 shadow-card flex-shrink-0">
          <PageTitle />
          <div className="flex items-center gap-2">
            <span className="tag tag-blue text-[11px]">
              <Activity size={10} />
              AGF + Haar + DnCNN
            </span>
            <span className="tag tag-sky text-[11px]">PSNR: 34.76 dB</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-5">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function PageTitle() {
  const loc = useLocation();
  const map = {
    "/": "Dashboard", "/ingest": "Data Ingestion", "/denoise": "Denoise Pipeline",
    "/evaluation": "Evaluation Metrics", "/radiologist": "Radiologist Workstation",
    "/batch": "Batch Processing", "/dataset": "Dataset Information",
    "/architecture": "System Architecture",
  };
  return <h1 className="text-sm font-semibold text-slate-700">{map[loc.pathname] || "LungDenoise AI"}</h1>;
}
