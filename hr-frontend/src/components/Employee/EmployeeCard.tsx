import React from "react";
import { Mail, Phone, Briefcase, Building2, Eye } from "lucide-react";

export interface Employee {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email?: string;
  personalEmail?: string;
  workEmail?: string;
  phone?: string;
  department?: { name: string } | string;
  designation?: { title: string } | string;
  status?: string;
  employmentStatus?: string;
}

interface EmployeeCardProps {
  employee: Employee;
  onViewProfile: (employee: Employee) => void;
}

export const EmployeeCard: React.FC<EmployeeCardProps> = ({
  employee,
  onViewProfile,
}) => {
  const initials =
    `${employee.firstName?.[0] || ""}${employee.lastName?.[0] || ""}`.toUpperCase();

  // Safe extract of email from whichever property exists
  const displayEmail =
    employee.email ||
    employee.personalEmail ||
    employee.workEmail ||
    `${employee.firstName.toLowerCase()}.${employee.lastName.toLowerCase()}@smarthr.local`;

  // Safe extract of department name
  const deptName =
    typeof employee.department === "object"
      ? employee.department?.name
      : employee.department || "General";

  // Safe extract of designation
  const desigTitle =
    typeof employee.designation === "object"
      ? (employee.designation as any)?.title
      : employee.designation || "General Staff";

  const status = employee.status || employee.employmentStatus || "ACTIVE";

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs flex flex-col justify-between hover:border-indigo-300 transition-all">
      <div>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center text-sm border border-indigo-100">
            {initials}
          </div>
          <div>
            <p className="font-bold text-gray-900 leading-snug">
              {employee.firstName} {employee.lastName}
            </p>
            <p className="text-xs font-semibold text-indigo-600">
              {employee.employeeNumber}
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-2 text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <Mail size={14} className="text-gray-400 shrink-0" />
            <span className="truncate text-gray-700">{displayEmail}</span>
          </div>
          <div className="flex items-center gap-2">
            <Phone size={14} className="text-gray-400 shrink-0" />
            <span>{employee.phone || "+1 555-0100"}</span>
          </div>
          <div className="flex items-center gap-2 font-medium text-gray-800">
            <Briefcase size={14} className="text-gray-400 shrink-0" />
            <span className="truncate">{desigTitle}</span>
          </div>
          <div className="flex items-center gap-2">
            <Building2 size={14} className="text-gray-400 shrink-0" />
            <span>{deptName}</span>
          </div>
        </div>
      </div>

      <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between">
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          {status}
        </span>

        {/* Real interactive button that triggers the profile modal */}
        <button
          type="button"
          onClick={() => onViewProfile(employee)}
          className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-2.5 py-1.5 rounded-lg cursor-pointer flex items-center gap-1 transition-all"
        >
          <Eye size={14} />
          <span>View Profile →</span>
        </button>
      </div>
    </div>
  );
};

export default EmployeeCard;
