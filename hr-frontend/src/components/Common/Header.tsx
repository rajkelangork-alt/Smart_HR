import React from "react";
import { useNavigate } from "react-router-dom";
import { User, LogOut } from "lucide-react";

export const Header: React.FC = () => {
  const navigate = useNavigate();

  const storedUser = localStorage.getItem("user");
  const user = storedUser ? JSON.parse(storedUser) : null;

  const email = user?.email || "user@smarthr.local";
  const firstName = user?.firstName || "";
  const lastName = user?.lastName || "";
  const fullName = `${firstName} ${lastName}`.trim() || email.split("@")[0];

  // Resolve display badge matching the 3 strict roles
  let roleLabel = "Employee";
  if (
    user?.roleBadge === "SUPER_ADMIN" ||
    email.toLowerCase() === "admin@smarthr.local"
  ) {
    roleLabel = "Super Admin";
  } else if (
    user?.roleBadge === "MANAGER_ADMIN" ||
    (user?.isDepartmentManager && user?.canAdminister)
  ) {
    roleLabel = "Manager, Admin";
  } else if (user?.roleBadge === "MANAGER" || user?.isDepartmentManager) {
    roleLabel = "Manager";
  }

  const handleSignOut = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    navigate("/login", { replace: true });
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200/80 px-8 flex items-center justify-between z-10 shrink-0">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Smart HR Portal</h2>
      </div>

      <div className="flex items-center gap-5">
        {/* User Identity Block */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs">
            <User size={18} />
          </div>
          <div className="text-left">
            <p className="text-xs font-bold text-gray-900 leading-tight">
              {email}
            </p>
            <p className="text-[11px] text-gray-500 font-medium leading-tight mt-0.5">
              {roleLabel}{" "}
              {fullName && fullName !== email.split("@")[0]
                ? `• ${fullName}`
                : ""}
            </p>
          </div>
        </div>

        {/* Sign Out Button */}
        <button
          onClick={handleSignOut}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50 text-xs font-semibold cursor-pointer transition-colors"
        >
          <LogOut size={14} />
          <span>Sign Out</span>
        </button>
      </div>
    </header>
  );
};

export default Header;
