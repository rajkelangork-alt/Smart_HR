import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  Users,
  Clock,
  Calendar,
  Award,
  LogOut,
  ShieldCheck,
} from "lucide-react";

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const role = user.role;

  const navItems = [
    {
      name: role === "EMPLOYEE" ? "My Profile" : "Directory",
      path: "/employees",
      icon: Users,
    },
    {
      name: role === "EMPLOYEE" ? "My Attendance" : "Attendance Roster",
      path: "/attendance",
      icon: Clock,
    },
    {
      name: "Leave Management",
      path: "/leaves",
      icon: Calendar,
    },
    {
      name: "Appraisals & Reviews",
      path: "/performance",
      icon: Award,
    },
  ];

  const handleSignOut = () => {
    logout();
    navigate("/login");
  };

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between h-screen sticky top-0 select-none z-30">
      <div>
        {/* Brand Banner */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="bg-indigo-600 p-2 rounded-lg text-white shadow-lg shadow-indigo-600/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <span className="font-bold text-lg text-white tracking-wide">
              SmartHR
            </span>
          </div>
          <span
            className={`text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded border ${
              role === "SUPER_ADMIN"
                ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                : role === "MANAGER"
                  ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/30"
                  : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
            }`}
          >
            {role}
          </span>
        </div>

        {/* User Identity Card */}
        <div className="px-6 py-4 border-b border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-200 font-semibold text-sm">
              {user.employee?.firstName
                ? user.employee.firstName[0].toUpperCase()
                : user.email[0].toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-slate-100 truncate">
                {user.employee
                  ? `${user.employee.firstName} ${user.employee.lastName}`
                  : user.email.split("@")[0]}
              </p>
              <p className="text-xs text-slate-400 truncate">{user.email}</p>
            </div>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="p-4 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Logout Action */}
      <div className="p-4 border-t border-slate-800">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-lg text-sm font-semibold text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
