import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import {
  UserPlus,
  Search,
  X,
  Mail,
  Briefcase,
  Building,
  Trash2,
  AlertOctagon,
  ShieldCheck,
} from "lucide-react";

interface AuthenticatedByData {
  name: string;
  email: string;
  role: string;
  label?: string;
}

interface EmployeeRecord {
  id: string;
  userId?: string;
  employeeNumber?: string;
  firstName: string;
  lastName: string;
  personalEmail?: string;
  email?: string;
  phone?: string;
  isDepartmentManager?: boolean;
  departments?: { id: string; name: string; code: string };
  designations?: { id: string; title: string; code: string };
  createdByLabel?: string;
  authenticatedBy?: AuthenticatedByData;
}

export const EmployeePage: React.FC = () => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Profile Detail Modal
  const [activeProfile, setActiveProfile] = useState<EmployeeRecord | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = useState(false);

  // Creation Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [departmentName, setDepartmentName] = useState("Operations");
  const [designationTitle, setDesignationTitle] = useState(
    "Operations Specialist",
  );
  const [isManagerRole, setIsManagerRole] = useState(false);
  const [modalError, setModalError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSuperAdmin =
    (user?.role || "").toUpperCase() === "SUPER_ADMIN" ||
    (user?.email || "").toLowerCase() === "admin@smarthr.local";

  const myDeptName =
    (user?.employee as any)?.departments?.name ||
    (user?.employee as any)?.department?.name ||
    "Operations";

  const fetchEmployees = async () => {
    try {
      setIsLoading(true);
      const res = await api.get("/employees");

      let list: EmployeeRecord[] = [];
      if (Array.isArray(res.data)) {
        list = res.data;
      } else if (Array.isArray(res.data?.data)) {
        list = res.data.data;
      }

      setEmployees(list);
    } catch (err) {
      console.error("Failed to load personnel:", err);
      setEmployees([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [user]);

  const handleOpenCreateModal = () => {
    setModalError("");
    if (employees.length >= 11) {
      alert(
        "Organization limit reached: Maximum 11 accounts permitted in SmartHR.",
      );
      return;
    }

    if (!isSuperAdmin) {
      setDepartmentName(myDeptName);
      setDesignationTitle(`${myDeptName} Specialist`);
      setIsManagerRole(false);
      const cleanFirst = firstName.trim().toLowerCase() || "employee";
      const cleanDept = myDeptName.toLowerCase().slice(0, 4);
      setEmail(`${cleanFirst}_${cleanDept}@smarthr.local`);
    } else {
      setDepartmentName("Operations");
      setDesignationTitle("Operations Specialist");
      setIsManagerRole(false);
      setEmail("");
    }
    setIsModalOpen(true);
  };

  const handleDomainChip = (domain: string) => {
    if (!isSuperAdmin) return;
    const cleanFirst =
      firstName.trim().toLowerCase().replace(/\s+/g, "") || "employee";
    if (domain === "operations") {
      setEmail(`${cleanFirst}_operations@smarthr.local`);
      setDepartmentName("Operations");
      setDesignationTitle(
        isManagerRole ? "Operations Lead" : "Operations Specialist",
      );
    } else if (domain === "tech") {
      setEmail(`${cleanFirst}_tech@smarthr.local`);
      setDepartmentName("Tech");
      setDesignationTitle(isManagerRole ? "Tech Lead" : "Software Engineer");
    } else if (domain === "finance") {
      setEmail(`${cleanFirst}_finance@smarthr.local`);
      setDepartmentName("Accountant");
      setDesignationTitle(
        isManagerRole ? "Finance Manager" : "Finance Specialist",
      );
    } else if (domain === "hr") {
      setEmail(`${cleanFirst}_hr@smarthr.local`);
      setDepartmentName("HR");
      setDesignationTitle(isManagerRole ? "HR Lead" : "HR Specialist");
    }
  };

  const handleManagerCheckbox = (checked: boolean) => {
    if (!isSuperAdmin) return;
    setIsManagerRole(checked);
    if (departmentName.toLowerCase().includes("operat")) {
      setDesignationTitle(
        checked ? "Operations Lead" : "Operations Specialist",
      );
    } else if (departmentName.toLowerCase().includes("tech")) {
      setDesignationTitle(checked ? "Tech Lead" : "Software Engineer");
    } else if (
      departmentName.toLowerCase().includes("account") ||
      departmentName.toLowerCase().includes("finan")
    ) {
      setDesignationTitle(checked ? "Finance Manager" : "Finance Specialist");
    } else if (departmentName.toLowerCase().includes("hr")) {
      setDesignationTitle(checked ? "HR Lead" : "HR Specialist");
    }
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError("");

    if (employees.length >= 11) {
      setModalError(
        "Organization limit reached: Maximum 11 accounts permitted in SmartHR.",
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await api.post("/employees", {
        firstName,
        lastName,
        email,
        departmentName: isSuperAdmin ? departmentName : myDeptName,
        designationTitle,
        isDepartmentManager: isSuperAdmin ? isManagerRole : false,
      });

      if (res.data?.success || res.status === 201) {
        setIsModalOpen(false);
        setFirstName("");
        setLastName("");
        setEmail("");
        setIsManagerRole(false);
        await fetchEmployees();
      }
    } catch (err: any) {
      setModalError(err.response?.data?.error || "Failed to provision member");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEmployee = async (empId: string) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this employee? This will immediately remove their access and update the system roster.",
      )
    ) {
      return;
    }

    try {
      setIsDeleting(true);
      const res = await api.delete(`/employees/${empId}`);
      if (res.data?.success || res.status === 200) {
        setActiveProfile(null);
        await fetchEmployees();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to delete employee");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!user) return null;

  const filteredEmployees = employees.filter((emp) => {
    if (!searchQuery.trim()) return true;
    const term = searchQuery.toLowerCase().trim();
    const fullName =
      `${emp.firstName || ""} ${emp.lastName || ""}`.toLowerCase();
    const mail = (emp.personalEmail || emp.email || "").toLowerCase();
    const num = (emp.employeeNumber || "").toLowerCase();
    const dept = (emp.departments?.name || "").toLowerCase();
    return (
      fullName.includes(term) ||
      mail.includes(term) ||
      num.includes(term) ||
      dept.includes(term)
    );
  });

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {user.role === "EMPLOYEE" ? "My Profile" : "Employee Directory"}
          </h1>
          <p className="text-sm font-medium text-slate-300 mt-1">
            {isSuperAdmin &&
              "View, inspect employee profiles, and manage active roster records."}
            {user.role === "MANAGER" &&
              "Departmental roster: viewing self and direct departmental subordinates."}
            {user.role === "EMPLOYEE" &&
              "View your verified personnel details."}
          </p>
        </div>

        {(isSuperAdmin || user.role === "MANAGER") && (
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-lg shadow-indigo-600/20 transition-all self-start"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Employee</span>
          </button>
        )}
      </div>

      {/* Search Bar - Hidden for regular employees */}
      {user.role !== "EMPLOYEE" && (
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, employee number, or email..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 placeholder-slate-400 text-sm font-medium focus:outline-none focus:border-indigo-500 transition-colors shadow-inner"
          />
        </div>
      )}

      {/* Directory Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-400 text-sm">
          Loading personnel directory...
        </div>
      ) : filteredEmployees.length === 0 ? (
        <div className="p-12 text-center text-slate-500 border border-slate-800 rounded-xl bg-slate-900/40">
          No personnel records match current search scope.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredEmployees.map((emp) => {
            const empEmail = emp.personalEmail || emp.email || "";
            const empNum = emp.employeeNumber || "EMP-000";
            const isRootAdmin =
              empNum === "EMP-000" || empEmail === "admin@smarthr.local";
            const roleBadge = isRootAdmin
              ? "SUPER_ADMIN"
              : emp.isDepartmentManager
                ? "MANAGER"
                : "EMPLOYEE";

            let designationLabel = emp.designations?.title || "Specialist";
            if (
              !emp.isDepartmentManager &&
              !isRootAdmin &&
              designationLabel.toLowerCase().includes("lead")
            ) {
              designationLabel = designationLabel.replace(
                /lead/i,
                "Specialist",
              );
            }

            const deptTitle = emp.departments?.name || "Operations";

            return (
              <div
                key={emp.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl hover:border-slate-700 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-sm">
                        {emp.firstName ? emp.firstName[0] : "U"}
                        {emp.lastName ? emp.lastName[0] : ""}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-100 text-base">
                          {emp.firstName} {emp.lastName}
                        </h3>
                        <p className="font-mono text-xs text-indigo-400 font-semibold">
                          {empNum}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                        roleBadge === "SUPER_ADMIN"
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                          : roleBadge === "MANAGER"
                            ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/30"
                            : "bg-slate-800 text-slate-300 border-slate-700"
                      }`}
                    >
                      {roleBadge}
                    </span>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2 text-xs text-slate-300 font-medium">
                    <div className="flex items-center space-x-2 text-slate-400">
                      <Mail className="w-3.5 h-3.5 text-slate-500" />
                      <span className="truncate">{empEmail}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-slate-400">
                      <Briefcase className="w-3.5 h-3.5 text-slate-500" />
                      <span>{designationLabel}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-slate-400">
                      <Building className="w-3.5 h-3.5 text-slate-500" />
                      <span>{deptTitle}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    ACTIVE
                  </span>
                  <button
                    onClick={() => setActiveProfile(emp)}
                    className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    View Profile &rarr;
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Profile Details Modal with Dynamic Lineage */}
      {activeProfile && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-base font-bold text-slate-100">
                Employee Details
              </h2>
              <button
                onClick={() => setActiveProfile(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-3.5 text-sm">
              <div>
                <p className="text-xs uppercase text-slate-400 font-bold">
                  Full Name
                </p>
                <p className="font-semibold text-white mt-0.5">
                  {activeProfile.firstName} {activeProfile.lastName}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs uppercase text-slate-400 font-bold">
                    Employee ID
                  </p>
                  <p className="font-mono text-xs font-bold text-indigo-400 mt-0.5">
                    {activeProfile.employeeNumber || "EMP-000"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase text-slate-400 font-bold">
                    Department
                  </p>
                  <p className="font-semibold text-white mt-0.5">
                    {activeProfile.departments?.name || "Operations"}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-400 font-bold">
                  Designation
                </p>
                <p className="font-semibold text-white mt-0.5">
                  {!activeProfile.isDepartmentManager &&
                  (activeProfile.designations?.title || "")
                    .toLowerCase()
                    .includes("lead")
                    ? activeProfile.designations?.title.replace(
                        /lead/i,
                        "Specialist",
                      )
                    : activeProfile.designations?.title || "Specialist"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-400 font-bold">
                  Work Email
                </p>
                <p className="font-mono text-xs text-white mt-0.5">
                  {activeProfile.personalEmail || activeProfile.email}
                </p>
              </div>

              {/* Dynamic Lineage Card showing real Name, Email & Role */}
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-indigo-400">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Authenticated / Created By Lineage:</span>
                </div>
                {activeProfile.authenticatedBy ? (
                  <div className="mt-2 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white">
                        {activeProfile.authenticatedBy.name}
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        {activeProfile.authenticatedBy.role}
                      </span>
                    </div>
                    <p className="font-mono text-[11px] text-slate-400">
                      {activeProfile.authenticatedBy.email}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs font-mono text-slate-200 mt-1 font-semibold">
                    {activeProfile.createdByLabel ||
                      "Super Admin (admin@smarthr.local) - SUPER_ADMIN"}
                  </p>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              {isSuperAdmin &&
              activeProfile.employeeNumber !== "EMP-000" &&
              activeProfile.personalEmail !== "admin@smarthr.local" ? (
                <button
                  onClick={() => handleDeleteEmployee(activeProfile.id)}
                  disabled={isDeleting}
                  className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-semibold transition-all disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isDeleting ? "Deleting..." : "Delete Employee"}</span>
                </button>
              ) : (
                <div />
              )}

              <button
                onClick={() => setActiveProfile(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Employee Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-base font-bold text-slate-100">
                {isSuperAdmin
                  ? "Add New Employee"
                  : `Add ${myDeptName} Team Member`}
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

            <form onSubmit={handleCreateEmployee} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Enter first name"
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 text-sm font-medium focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Enter last name"
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 text-sm font-medium focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1">
                  Work Email *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name_dept@smarthr.local"
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 text-sm font-medium focus:outline-none focus:border-indigo-500"
                />

                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] text-slate-400">Autofill:</span>
                  {isSuperAdmin ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleDomainChip("operations")}
                        className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-800 hover:bg-indigo-900"
                      >
                        _operations@smarthr.local
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDomainChip("tech")}
                        className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-800 hover:bg-indigo-900"
                      >
                        _tech@smarthr.local
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDomainChip("finance")}
                        className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-800 hover:bg-indigo-900"
                      >
                        _finance@smarthr.local
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDomainChip("hr")}
                        className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-800 hover:bg-indigo-900"
                      >
                        _hr@smarthr.local
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        const cleanFirst =
                          firstName.trim().toLowerCase().replace(/\s+/g, "") ||
                          "employee";
                        const deptTag = myDeptName.toLowerCase().slice(0, 4);
                        setEmail(`${cleanFirst}_${deptTag}@smarthr.local`);
                      }}
                      className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-800"
                    >
                      _{myDeptName.toLowerCase().slice(0, 4)}@smarthr.local
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!isSuperAdmin}
                    value={isSuperAdmin ? departmentName : myDeptName}
                    onChange={(e) => setDepartmentName(e.target.value)}
                    placeholder="Enter department"
                    className={`w-full px-3 py-2 rounded-lg border text-sm font-medium focus:outline-none ${
                      isSuperAdmin
                        ? "bg-slate-800 border-slate-700 text-slate-100 focus:border-indigo-500"
                        : "bg-slate-900 border-slate-800 text-slate-400 cursor-not-allowed"
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1">
                    Designation
                  </label>
                  <input
                    type="text"
                    required
                    value={designationTitle}
                    onChange={(e) => setDesignationTitle(e.target.value)}
                    placeholder="Enter designation"
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 text-sm font-medium focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {isSuperAdmin && (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center space-x-2.5">
                  <input
                    type="checkbox"
                    id="delegateManager"
                    checked={isManagerRole}
                    onChange={(e) => handleManagerCheckbox(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 bg-slate-800 border-slate-700 focus:ring-0"
                  />
                  <label
                    htmlFor="delegateManager"
                    className="text-xs font-semibold text-slate-200 cursor-pointer"
                  >
                    Assign as Department Manager (Limit: 1 per department)
                  </label>
                </div>
              )}

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
                  {isSubmitting ? "Creating..." : "Create Employee"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeePage;
