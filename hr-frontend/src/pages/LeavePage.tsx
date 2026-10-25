import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import {
  Clock,
  CheckCircle2,
  XCircle,
  Plus,
  X,
  AlertOctagon,
} from "lucide-react";

interface AuthenticatedByData {
  name: string;
  email: string;
  role: string;
}

interface LeaveRecord {
  id: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  employeeId: string;
  employees?: {
    id: string;
    firstName: string;
    lastName: string;
    personalEmail: string;
    isDepartmentManager: boolean;
    departments?: { name: string };
  };
  authenticatedBy?: AuthenticatedByData;
}

export const LeavePage: React.FC = () => {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState<LeaveRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Apply Leave Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [leaveType, setLeaveType] = useState("ANNUAL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [modalError, setModalError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSuperAdmin =
    (user?.role || "").toUpperCase() === "SUPER_ADMIN" ||
    (user?.email || "").toLowerCase() === "admin@smarthr.local";

  const isManager = (user?.role || "").toUpperCase() === "MANAGER";

  const fetchLeaves = async () => {
    try {
      setIsLoading(true);
      const res = await api.get("/leaves");
      if (res.data?.data) {
        setLeaves(res.data.data);
      }
    } catch (err) {
      console.error("Failed to load leaves:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, [user]);

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError("");
    setIsSubmitting(true);

    try {
      const res = await api.post("/leaves", {
        leaveType,
        startDate,
        endDate,
        reason,
      });

      if (res.data?.success) {
        setIsModalOpen(false);
        setReason("");
        setStartDate("");
        setEndDate("");
        await fetchLeaves();
      }
    } catch (err: any) {
      setModalError(
        err.response?.data?.error || "Failed to submit leave request",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusUpdate = async (
    leaveId: string,
    newStatus: "APPROVED" | "REJECTED",
  ) => {
    try {
      const res = await api.patch(`/leaves/${leaveId}/status`, {
        status: newStatus,
      });
      if (res.data?.success) {
        await fetchLeaves();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to update leave status");
    }
  };

  const pendingCount = leaves.filter((l) => l.status === "PENDING").length;
  const approvedCount = leaves.filter((l) => l.status === "APPROVED").length;
  const rejectedCount = leaves.filter((l) => l.status === "REJECTED").length;

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Leave Management
          </h1>
          <p className="text-sm font-medium text-slate-300 mt-1">
            Submit time-off requests and track your leave status.
          </p>
        </div>

        {user?.role !== "SUPER_ADMIN" && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-lg shadow-indigo-600/20 transition-all self-start"
          >
            <Plus className="w-4 h-4" />
            <span>Apply for Leave</span>
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-400 font-bold">
              Pending Requests
            </p>
            <span className="text-2xl font-bold text-amber-400 mt-1 block">
              {pendingCount}
            </span>
          </div>
          <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-400 font-bold">
              Approved Leaves
            </p>
            <span className="text-2xl font-bold text-emerald-400 mt-1 block">
              {approvedCount}
            </span>
          </div>
          <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-400 font-bold">
              Rejected Requests
            </p>
            <span className="text-2xl font-bold text-rose-400 mt-1 block">
              {rejectedCount}
            </span>
          </div>
          <div className="p-3 bg-rose-500/10 rounded-xl border border-rose-500/20 text-rose-400">
            <XCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Leave Requests Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div>
          <h2 className="text-sm uppercase font-bold text-slate-200 tracking-wider">
            {user?.role === "EMPLOYEE"
              ? "My Submitted Leave Requests"
              : "Departmental Leave Requests Log"}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Live request log from database
          </p>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-xs text-slate-400">
            Loading leave requests...
          </div>
        ) : leaves.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">
            No leave requests found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Applicant</th>
                  <th className="py-3 px-4">Leave Type</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4">Authenticated By</th>
                  <th className="py-3 px-4">Status</th>
                  {(isSuperAdmin || isManager) && (
                    <th className="py-3 px-4 text-right">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {leaves.map((l) => {
                  const applicant = l.employees;
                  const startStr = new Date(l.startDate).toLocaleDateString();
                  const endStr = new Date(l.endDate).toLocaleDateString();

                  // Can the current viewer approve/reject this row?
                  const isOwnLeave =
                    (user?.employee as any)?.id === l.employeeId;
                  const canAction =
                    (isSuperAdmin || isManager) &&
                    !isOwnLeave &&
                    l.status === "PENDING";

                  return (
                    <tr
                      key={l.id}
                      className="hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white">
                          {applicant
                            ? `${applicant.firstName} ${applicant.lastName}`
                            : "Applicant"}
                        </div>
                        <div className="font-mono text-[11px] text-slate-400">
                          {applicant?.personalEmail || ""}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-200">
                        {l.leaveType}
                      </td>
                      <td className="py-3.5 px-4 text-slate-300 font-mono text-[11px]">
                        {startStr} &rarr; {endStr}
                      </td>
                      <td className="py-3.5 px-4 text-slate-300 max-w-xs truncate">
                        {l.reason}
                      </td>
                      <td className="py-3.5 px-4">
                        {l.authenticatedBy ? (
                          <div>
                            <div className="flex items-center space-x-1.5">
                              <span className="font-semibold text-slate-200">
                                {l.authenticatedBy.name}
                              </span>
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                {l.authenticatedBy.role}
                              </span>
                            </div>
                            <div className="font-mono text-[11px] text-slate-400">
                              {l.authenticatedBy.email}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-mono text-[11px]">
                            Super Admin (admin@smarthr.local)
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                            l.status === "APPROVED"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : l.status === "REJECTED"
                                ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                                : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          }`}
                        >
                          {l.status}
                        </span>
                      </td>
                      {(isSuperAdmin || isManager) && (
                        <td className="py-3.5 px-4 text-right">
                          {canAction ? (
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={() =>
                                  handleStatusUpdate(l.id, "APPROVED")
                                }
                                className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() =>
                                  handleStatusUpdate(l.id, "REJECTED")
                                }
                                className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-semibold"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-500 text-[11px]">
                              --
                            </span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Apply Leave Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-base font-bold text-slate-100">
                Apply for Leave
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalError && (
              <div className="mt-3 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium flex items-center space-x-2">
                <AlertOctagon className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleApplyLeave} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1">
                  Leave Type
                </label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 text-sm font-medium focus:outline-none focus:border-indigo-500"
                >
                  <option value="ANNUAL">Annual Leave</option>
                  <option value="SICK">Sick Leave</option>
                  <option value="CASUAL">Casual Leave</option>
                  <option value="UNPAID">Unpaid Leave</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 text-sm font-medium focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 text-sm font-medium focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1">
                  Reason
                </label>
                <textarea
                  rows={3}
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="State the reason for leave..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 text-sm font-medium focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 disabled:opacity-50"
                >
                  {isSubmitting ? "Submitting..." : "Submit Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeavePage;
