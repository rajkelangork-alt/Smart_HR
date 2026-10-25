import React, { useState } from "react";
import { X, Mail, Building, Briefcase, ShieldCheck } from "lucide-react";
import api from "../../services/api";

interface AddEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddEmployeeModal: React.FC<AddEmployeeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [workEmail, setWorkEmail] = useState("");
  const [department, setDepartment] = useState("Engineering");
  const [designation, setDesignation] = useState("Full Stack Engineer");
  const [isDepartmentManager, setIsDepartmentManager] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  // Department quick-append badges from your original UI
  const departmentBadges = [
    {
      label: "_hr@smarthr.local",
      dept: "Human Resources",
      desig: "HR Specialist",
      key: "hr",
    },
    {
      label: "_operations@smarthr.local",
      dept: "Operations",
      desig: "Operations Analyst",
      key: "operations",
    },
    {
      label: "_tech@smarthr.local",
      dept: "Engineering",
      desig: "Full Stack Engineer",
      key: "tech",
    },
    {
      label: "_finance@smarthr.local",
      dept: "Finance",
      desig: "Financial Analyst",
      key: "finance",
    },
  ];

  const handleAppendBadge = (badge: (typeof departmentBadges)[0]) => {
    const cleanFirst = (firstName || "user")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "");
    const prefix = isDepartmentManager ? `${cleanFirst}manag` : cleanFirst;
    setWorkEmail(`${prefix}_${badge.key}@smarthr.local`);
    setDepartment(badge.dept);
    setDesignation(badge.desig);
  };

  const handleManagerToggle = (checked: boolean) => {
    setIsDepartmentManager(checked);
    if (workEmail.includes("_") && workEmail.includes("@smarthr.local")) {
      const cleanFirst = (firstName || "user")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "");
      const deptPart = workEmail.split("_")[1];
      const prefix = checked ? `${cleanFirst}manag` : cleanFirst;
      setWorkEmail(`${prefix}_${deptPart}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const payload = {
        firstName,
        lastName,
        workEmail,
        department,
        designation,
        isDepartmentManager,
      };

      const res = await api.post("/employees", payload);
      if (res.data?.success || res.status === 200 || res.status === 201) {
        onSuccess();
        onClose();
      } else {
        setError(res.data?.error || "Failed to register employee");
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          "Error creating employee account",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900">
            Add New Employee
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
            {error}
          </div>
        )}

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                First Name *
              </label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="e.g. Kevin"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Last Name *
              </label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="e.g. Peterson"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Work Email *
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="email"
                required
                value={workEmail}
                onChange={(e) => setWorkEmail(e.target.value)}
                placeholder="kevin_finance@smarthr.local"
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            {/* Click to append format tags */}
            <div className="mt-2 flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-slate-400">
                Click to append format:
              </span>
              {departmentBadges.map((badge) => (
                <button
                  key={badge.key}
                  type="button"
                  onClick={() => handleAppendBadge(badge)}
                  className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
                >
                  {badge.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Department
              </label>
              <div className="relative">
                <Building className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Designation
              </label>
              <div className="relative">
                <Briefcase className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>
          </div>

          {/* Role & Authority Delegation */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="flex items-center gap-1.5 text-slate-700 mb-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-bold uppercase tracking-wider">
                Role & Authority Delegation
              </span>
            </div>
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
              <input
                type="checkbox"
                checked={isDepartmentManager}
                onChange={(e) => handleManagerToggle(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              />
              <span>Assign as Department Manager (Limit: 1 per dept)</span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Employee"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEmployeeModal;
