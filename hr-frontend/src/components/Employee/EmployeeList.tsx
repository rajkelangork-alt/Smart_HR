import React, { useState, useEffect } from "react";
import {
  Search,
  UserPlus,
  Mail,
  Phone,
  Briefcase,
  Building,
  Eye,
  Trash2,
  X,
  Loader2,
  AlertCircle,
} from "lucide-react";
import api from "../../services/api";
import AddEmployeeModal from "./AddEmployeeModal";

interface Employee {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  department: string;
  departmentCode?: string;
  designation: string;
  employmentStatus: string;
  isDepartmentManager?: boolean;
  canAdminister?: boolean;
  roleBadge?: string;
}

export const EmployeeList: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Profile Modal State
  const [selectedProfile, setSelectedProfile] = useState<Employee | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Current session details for permissions
  const storedUser = localStorage.getItem("user");
  const currentUser = storedUser ? JSON.parse(storedUser) : null;
  const isSuperAdmin = currentUser?.email === "admin@smarthr.local";

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const res = await api.get("/employees");
      const list = res.data?.data?.employees || res.data?.data || [];
      setEmployees(list);
    } catch (err) {
      console.error("Failed to fetch employees:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleDelete = async (employee: Employee) => {
    if (employee.email?.toLowerCase() === "admin@smarthr.local") {
      alert("The Super Administrator account cannot be deleted.");
      return;
    }

    const confirmDelete = window.confirm(
      `Are you sure you want to remove ${employee.firstName} ${employee.lastName} from the organization?`,
    );
    if (!confirmDelete) return;

    try {
      setDeletingId(employee.id);
      await api.delete(`/employees/${employee.id}`);
      setIsProfileModalOpen(false);
      setSelectedProfile(null);
      await fetchEmployees();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to delete employee.");
    } finally {
      setDeletingId(null);
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    const q = searchQuery.toLowerCase();
    return (
      emp.firstName?.toLowerCase().includes(q) ||
      emp.lastName?.toLowerCase().includes(q) ||
      emp.employeeNumber?.toLowerCase().includes(q) ||
      emp.email?.toLowerCase().includes(q) ||
      emp.department?.toLowerCase().includes(q) ||
      emp.designation?.toLowerCase().includes(q)
    );
  });

  const getRoleBadge = (emp: Employee) => {
    if (
      emp.email?.toLowerCase() === "admin@smarthr.local" ||
      emp.roleBadge === "SUPER_ADMIN"
    ) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-100 text-indigo-800 border border-indigo-200">
          Super Admin
        </span>
      );
    }
    if (
      emp.roleBadge === "MANAGER_ADMIN" ||
      (emp.isDepartmentManager && emp.canAdminister)
    ) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-100 text-purple-800 border border-purple-200">
          Manager • Admin
        </span>
      );
    }
    if (emp.roleBadge === "MANAGER" || emp.isDepartmentManager) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
          Manager
        </span>
      );
    }
    return null;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Employee Directory
          </h1>
          <p className="text-sm text-gray-500">
            View, inspect employee profiles, and manage active roster records.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-md cursor-pointer transition-all"
        >
          <UserPlus size={16} />
          <span>Add Employee</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md w-full">
        <Search
          size={16}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          type="text"
          placeholder="Search by name, employee number, or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden shadow-xs"
        />
      </div>

      {/* Grid of Employee Cards */}
      {loading ? (
        <div className="flex justify-center items-center py-20 text-gray-400 text-sm">
          <Loader2 size={24} className="animate-spin mr-2 text-indigo-600" />
          Loading employee directory...
        </div>
      ) : filteredEmployees.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-200 text-gray-400 text-sm">
          No employees found matching your criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredEmployees.map((emp) => (
            <div
              key={emp.id}
              className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs hover:shadow-md transition-shadow duration-200 flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                {/* Header: Avatar, Name, Employee ID & Badges */}
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 font-bold flex items-center justify-center text-sm shadow-inner uppercase">
                    {emp.firstName?.[0]}
                    {emp.lastName?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="font-bold text-gray-900 leading-snug truncate">
                        {emp.firstName} {emp.lastName}
                      </p>
                      {getRoleBadge(emp)}
                    </div>
                    <p className="text-xs font-semibold text-indigo-600">
                      {emp.employeeNumber}
                    </p>
                  </div>
                </div>

                {/* Details Breakdown */}
                <div className="space-y-1.5 text-xs text-gray-500 pt-1">
                  <div className="flex items-center gap-2 truncate">
                    <Mail size={14} className="text-gray-400 shrink-0" />
                    <span className="truncate">{emp.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone size={14} className="text-gray-400 shrink-0" />
                    <span>{emp.phone || "+1 555-0100"}</span>
                  </div>
                  <div className="flex items-center gap-2 truncate">
                    <Briefcase size={14} className="text-gray-400 shrink-0" />
                    <span className="truncate">{emp.designation}</span>
                  </div>
                  <div className="flex items-center gap-2 truncate">
                    <Building size={14} className="text-gray-400 shrink-0" />
                    <span className="truncate">{emp.department}</span>
                  </div>
                </div>
              </div>

              {/* Status and Action Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {emp.employmentStatus || "ACTIVE"}
                </span>

                <button
                  onClick={() => {
                    setSelectedProfile(emp);
                    setIsProfileModalOpen(true);
                  }}
                  className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                >
                  <Eye size={14} />
                  <span>View Profile →</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Employee Modal */}
      <AddEmployeeModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onEmployeeAdded={fetchEmployees}
        currentCount={employees.length}
      />

      {/* View Detailed Profile Modal */}
      {isProfileModalOpen && selectedProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-5">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h2 className="text-base font-bold text-gray-900">
                Employee Profile Information
              </h2>
              <button
                type="button"
                onClick={() => setIsProfileModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Profile Avatar Card */}
            <div className="flex items-center gap-4 p-4 bg-indigo-50/60 rounded-xl border border-indigo-100">
              <div className="w-14 h-14 rounded-xl bg-indigo-600 text-white font-bold text-lg flex items-center justify-center shadow-xs uppercase">
                {selectedProfile.firstName?.[0]}
                {selectedProfile.lastName?.[0]}
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="text-base font-bold text-gray-900 leading-snug">
                    {selectedProfile.firstName} {selectedProfile.lastName}
                  </h3>
                  {getRoleBadge(selectedProfile)}
                </div>
                <p className="text-xs text-indigo-600 font-semibold">
                  {selectedProfile.employeeNumber}
                </p>
                <p className="text-xs text-gray-500 font-medium">
                  {selectedProfile.designation} • {selectedProfile.department}
                </p>
              </div>
            </div>

            {/* Profile Attributes */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                <span className="text-[10px] text-gray-400 font-bold uppercase block">
                  Work Email
                </span>
                <span className="text-gray-800 font-medium truncate block mt-0.5">
                  {selectedProfile.email}
                </span>
              </div>
              <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                <span className="text-[10px] text-gray-400 font-bold uppercase block">
                  Phone Number
                </span>
                <span className="text-gray-800 font-medium block mt-0.5">
                  {selectedProfile.phone || "+1 555-0100"}
                </span>
              </div>
              <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                <span className="text-[10px] text-gray-400 font-bold uppercase block">
                  Department
                </span>
                <span className="text-gray-800 font-medium block mt-0.5">
                  {selectedProfile.department}
                </span>
              </div>
              <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                <span className="text-[10px] text-gray-400 font-bold uppercase block">
                  Employment Status
                </span>
                <span className="text-emerald-700 font-semibold block mt-0.5">
                  {selectedProfile.employmentStatus || "ACTIVE"}
                </span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-between items-center pt-3 border-t border-gray-100">
              {selectedProfile.email?.toLowerCase() !==
              "admin@smarthr.local" ? (
                <button
                  type="button"
                  onClick={() => handleDelete(selectedProfile)}
                  disabled={deletingId === selectedProfile.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 cursor-pointer disabled:opacity-50"
                >
                  {deletingId === selectedProfile.id ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Trash2 size={14} />
                  )}
                  <span>Remove Employee</span>
                </button>
              ) : (
                <div className="text-[11px] text-gray-400 italic">
                  Protected System Administrator
                </div>
              )}

              <button
                type="button"
                onClick={() => setIsProfileModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeList;
