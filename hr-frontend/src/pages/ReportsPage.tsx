import React, { useState } from "react";
import {
  BarChart3,
  Download,
  Users,
  Briefcase,
  FileSpreadsheet,
  Loader2,
} from "lucide-react";
import api from "../services/api";

export const ReportsPage: React.FC = () => {
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleExport = async (reportTitle: string) => {
    try {
      setDownloading(reportTitle);

      // Trigger backend download stream
      const response = await api.get("/reports/export/headcount", {
        responseType: "blob",
      });

      // Create browser download link
      const blob = new Blob([response.data], {
        type: "text/csv;charset=utf-8;",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `${reportTitle.toLowerCase().replace(/\s+/g, "_")}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setDownloading(null);
    }
  };

  const reports = [
    {
      title: "Monthly Workforce Headcount Summary",
      category: "Human Resources",
      type: "CSV",
      icon: Users,
    },
    {
      title: "Quarterly Attendance & Overtime Breakdown",
      category: "Operations",
      type: "CSV",
      icon: BarChart3,
    },
    {
      title: "Tax Deductions & Payroll Ledger 2026",
      category: "Finance",
      type: "CSV",
      icon: FileSpreadsheet,
    },
    {
      title: "Annual Turnover & Retention Rate",
      category: "Executive",
      type: "CSV",
      icon: Briefcase,
    },
  ];

  const handleExportCSV = async () => {
    try {
      const response = await api.get("/reports/export/headcount", {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "workforce_headcount_report.csv");
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("Export failed", error);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Reports & Workforce Analytics
        </h1>
        <p className="text-sm text-gray-500">
          Generate, schedule, and export compliance and operational reports.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {reports.map((r, idx) => {
          const Icon = r.icon;
          const isCurrentLoading = downloading === r.title;

          return (
            <div
              key={idx}
              className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between hover:border-indigo-100 transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
                  <Icon size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">
                    {r.title}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {r.category} • Format: {r.type}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleExport(r.title)}
                disabled={isCurrentLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {isCurrentLoading ? (
                  <Loader2 size={14} className="animate-spin text-indigo-600" />
                ) : (
                  <Download size={14} />
                )}
                <span>{isCurrentLoading ? "Exporting..." : "Export"}</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ReportsPage;
