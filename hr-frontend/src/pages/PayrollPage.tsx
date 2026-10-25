import React, { useState, useEffect } from "react";
import {
  DollarSign,
  Users,
  TrendingUp,
  Play,
  FileText,
  X,
  Loader2,
} from "lucide-react";
import api from "../services/api";

interface PayrollRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  department: string;
  designation: string;
  baseSalary: number;
  deductions: number;
  netSalary: number;
  period: string;
  status: string;
}

interface PayrollSummary {
  period: string;
  totalBudget: number;
  avgCompensation: number;
  records: PayrollRecord[];
}

export const PayrollPage: React.FC = () => {
  const [summary, setSummary] = useState<PayrollSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState<PayrollRecord | null>(
    null,
  );

  const storedUser = localStorage.getItem("user");
  const user = storedUser ? JSON.parse(storedUser) : null;
  const currentEmail = (user?.email || "").toLowerCase().trim();

  const isSuperAdmin =
    currentEmail === "admin@smarthr.local" || user?.roleBadge === "SUPER_ADMIN";
  const isManagerAdmin =
    !isSuperAdmin &&
    (user?.roleBadge === "MANAGER_ADMIN" ||
      Boolean(user?.isDepartmentManager && user?.canAdminister));
  const isEmployee =
    !isSuperAdmin && !isManagerAdmin && !user?.isDepartmentManager;

  const fetchPayroll = async () => {
    try {
      setLoading(true);
      const res = await api
        .get("/payroll/summary")
        .catch(() => ({ data: { data: null } }));
      if (res.data?.data) {
        // Filter out leftover seed names
        const cleanRecords = (res.data.data.records || []).filter(
          (r: PayrollRecord) => {
            const n = r.employeeName.toLowerCase();
            return !n.includes("sarah miller") && !n.includes("alex chen");
          },
        );

        // Employee sees only own payslip
        const finalRecords = isEmployee
          ? cleanRecords.filter(
              (r: PayrollRecord) => r.employeeNumber === user?.employeeNumber,
            )
          : cleanRecords;

        const totalBudget = finalRecords.reduce(
          (sum: number, r: PayrollRecord) => sum + r.netSalary,
          0,
        );
        const avgCompensation =
          finalRecords.length > 0
            ? Math.round(totalBudget / finalRecords.length)
            : 0;

        setSummary({
          period: res.data.data.period || "September 2026",
          totalBudget,
          avgCompensation,
          records: finalRecords,
        });
      }
    } catch (err) {
      console.error("Failed to load payroll:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayroll();
  }, []);

  const handleExecute = async () => {
    try {
      setExecuting(true);
      await api.post("/payroll/run", {});
      alert("Payroll run executed successfully for all registered employees.");
      await fetchPayroll();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to execute payroll run.");
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payroll Portal</h1>
          <p className="text-sm text-gray-500">
            {isEmployee
              ? "View monthly compensation statements and official payslips."
              : "Process monthly salary runs, monitor compensation budgets, and view employee payslips."}
          </p>
        </div>

        {isSuperAdmin && (
          <button
            onClick={handleExecute}
            disabled={executing}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-md cursor-pointer transition-all disabled:opacity-50"
          >
            {executing ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Play size={16} />
            )}
            <span>Execute Pay Run</span>
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <DollarSign size={24} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
              {isEmployee ? "Net Take-Home Pay" : "Total Payroll Budget"}
            </span>
            <div className="text-2xl font-extrabold text-gray-900 mt-0.5">
              ${(summary?.totalBudget || 0).toLocaleString()}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Users size={24} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
              Salaried Headcount
            </span>
            <div className="text-2xl font-extrabold text-gray-900 mt-0.5">
              {summary?.records.length || 0} Employees
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <TrendingUp size={24} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
              Average Compensation
            </span>
            <div className="text-2xl font-extrabold text-gray-900 mt-0.5">
              ${(summary?.avgCompensation || 0).toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Payroll Records Table */}
      <div className="bg-white rounded-2xl border border-gray-200/80 overflow-hidden shadow-xs">
        <div className="p-5 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-sm font-bold text-gray-900">
            Compensation Run List ({summary?.period || "Current"})
          </h2>
          <span className="text-xs text-gray-400">Auto-calculated Net Pay</span>
        </div>

        {loading ? (
          <div className="p-12 flex justify-center items-center text-gray-400 text-sm">
            <Loader2 size={20} className="animate-spin mr-2 text-indigo-600" />
            Loading payroll ledger...
          </div>
        ) : !summary || summary.records.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-sm">
            No active payroll records found for your roster.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/70 text-gray-500 font-semibold uppercase border-b border-gray-200">
                <tr>
                  <th className="py-3 px-5">Employee</th>
                  <th className="py-3 px-5">Department</th>
                  <th className="py-3 px-5">Gross Base</th>
                  <th className="py-3 px-5">Deductions</th>
                  <th className="py-3 px-5">Net Pay</th>
                  <th className="py-3 px-5 text-right">Payslip</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {summary.records.map((rec) => (
                  <tr key={rec.id} className="hover:bg-gray-50/50">
                    <td className="py-3 px-5 font-semibold text-gray-900">
                      <div>{rec.employeeName}</div>
                      <span className="text-[11px] text-gray-400 font-normal">
                        {rec.employeeNumber}
                      </span>
                    </td>
                    <td className="py-3 px-5 font-medium">{rec.department}</td>
                    <td className="py-3 px-5 font-semibold text-gray-900">
                      ${rec.baseSalary.toLocaleString()}
                    </td>
                    <td className="py-3 px-5 font-medium text-rose-600">
                      -${rec.deductions.toLocaleString()}
                    </td>
                    <td className="py-3 px-5 font-bold text-emerald-600">
                      ${rec.netSalary.toLocaleString()}
                    </td>
                    <td className="py-3 px-5 text-right">
                      <button
                        onClick={() => setSelectedPayslip(rec)}
                        className="text-indigo-600 font-semibold hover:underline cursor-pointer"
                      >
                        View Slip
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Official Payslip Modal */}
      {selectedPayslip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h2 className="text-base font-bold text-gray-900">
                Official Payslip
              </h2>
              <button
                type="button"
                onClick={() => setSelectedPayslip(null)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="bg-gray-50 p-3.5 rounded-xl space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Employee Name:</span>
                <span className="font-bold text-gray-900">
                  {selectedPayslip.employeeName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Employee ID:</span>
                <span className="font-mono font-semibold text-indigo-600">
                  {selectedPayslip.employeeNumber}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Period:</span>
                <span className="font-medium text-gray-700">
                  {selectedPayslip.period}
                </span>
              </div>
            </div>

            <div className="space-y-2 text-xs border-t border-b border-gray-100 py-3">
              <div className="flex justify-between font-medium">
                <span className="text-gray-600">Base Salary</span>
                <span className="text-gray-900 font-bold">
                  ${selectedPayslip.baseSalary.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between font-medium">
                <span className="text-gray-600">
                  Statutory Tax & Deductions
                </span>
                <span className="text-rose-600 font-semibold">
                  -${selectedPayslip.deductions.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center pt-1">
              <span className="text-sm font-bold text-gray-900">
                Net Take-Home Pay
              </span>
              <span className="text-lg font-extrabold text-emerald-600">
                ${selectedPayslip.netSalary.toLocaleString()}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setSelectedPayslip(null)}
              className="w-full mt-2 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs cursor-pointer transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayrollPage;
