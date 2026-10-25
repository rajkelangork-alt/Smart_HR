import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  UserCheck,
  CalendarOff,
  CreditCard,
  Clock,
  Award,
  ArrowUpRight,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalEmployees: 0,
    presentToday: 0,
    onLeave: 0,
    payrollStatus: "Ready",
  });
  const [recentEmployees, setRecentEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Safely extract active role
  const rawUser = user as any;
  const userRole: string = (
    rawUser?.role ||
    (Array.isArray(rawUser?.roles)
      ? rawUser.roles[0]?.name ||
        rawUser.roles[0]?.role?.name ||
        rawUser.roles[0]
      : "") ||
    "EMPLOYEE"
  ).toUpperCase();

  const isSuperAdmin = userRole === "ADMIN" || userRole === "SUPER_ADMIN";
  const isManager = userRole === "MANAGER" || userRole === "HR_MANAGER";

  const dashboardTitle = isSuperAdmin
    ? "Super Admin Dashboard"
    : isManager
      ? "Manager Dashboard"
      : "Employee Dashboard";

  useEffect(() => {
    let isMounted = true;
    const fetchMetrics = async () => {
      try {
        const [empRes, attRes, leaveRes] = await Promise.all([
          api.get("/employees").catch(() => ({ data: [] })),
          api.get("/attendance/roster").catch(() => ({ data: [] })),
          api.get("/leaves").catch(() => ({ data: [] })),
        ]);

        if (!isMounted) return;

        const employeesList: any[] = empRes.data?.data || empRes.data || [];
        const attendanceList: any[] = attRes.data?.data || attRes.data || [];
        const leavesList: any[] = leaveRes.data?.data || leaveRes.data || [];

        const checkedInCount = Array.isArray(attendanceList)
          ? attendanceList.filter(
              (a: any) =>
                a.clockIn && a.clockIn !== "--" && a.status !== "NOT MARKED",
            ).length
          : 0;

        const onLeaveCount = Array.isArray(leavesList)
          ? leavesList.filter(
              (l: any) => l.status === "APPROVED" || l.status === "PENDING",
            ).length
          : 0;

        setStats({
          totalEmployees: employeesList.length,
          presentToday: checkedInCount,
          onLeave: onLeaveCount,
          payrollStatus: "Ready",
        });

        setRecentEmployees(
          Array.isArray(employeesList) ? employeesList.slice(0, 5) : [],
        );
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchMetrics();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Dynamic Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {dashboardTitle}
            </h1>
            {isSuperAdmin && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-md">
                <ShieldCheck className="w-3 h-3" />
                Root Authority
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {isSuperAdmin
              ? "Executive workforce telemetry, personnel roster, and administrative controls."
              : "Workforce portal, daily shift monitor, and activity overview."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Authenticated:</span>
          <span className="text-xs font-semibold text-slate-800 bg-white border border-slate-200 px-2.5 py-1 rounded-lg shadow-sm">
            {rawUser?.email || "admin@smarthr.local"}
          </span>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Total Employees
            </span>
            <div className="text-3xl font-extrabold text-slate-900 mt-2">
              {loading ? "..." : stats.totalEmployees}
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Live DB Directory
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Present Today
            </span>
            <div className="text-3xl font-extrabold text-slate-900 mt-2">
              {loading ? "..." : stats.presentToday}
            </div>
            <span className="text-[11px] text-green-600 mt-1 block font-medium">
              Shift Punch In
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              On Leave
            </span>
            <div className="text-3xl font-extrabold text-slate-900 mt-2">
              {loading ? "..." : stats.onLeave}
            </div>
            <span className="text-[11px] text-amber-600 mt-1 block font-medium">
              Active Requests
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <CalendarOff className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Payroll Status
            </span>
            <div className="text-2xl font-extrabold text-purple-600 mt-2">
              {stats.payrollStatus}
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Current Cycle
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <CreditCard className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
          Operational Quick Actions
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <Link
            to="/attendance"
            className="group bg-white p-4 rounded-xl border border-slate-200 hover:border-blue-400 transition-all shadow-sm flex items-center gap-3.5"
          >
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Clock size={18} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 group-hover:text-blue-600">
                Log Attendance
              </p>
              <p className="text-[11px] text-slate-400">Clock in / out shift</p>
            </div>
          </Link>

          {(isSuperAdmin || isManager) && (
            <Link
              to="/employees"
              className="group bg-white p-4 rounded-xl border border-slate-200 hover:border-blue-400 transition-all shadow-sm flex items-center gap-3.5"
            >
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <Users size={18} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 group-hover:text-emerald-600">
                  Manage Staff
                </p>
                <p className="text-[11px] text-slate-400">
                  Add or review directory
                </p>
              </div>
            </Link>
          )}

          <Link
            to="/leaves"
            className="group bg-white p-4 rounded-xl border border-slate-200 hover:border-blue-400 transition-all shadow-sm flex items-center gap-3.5"
          >
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <CalendarOff size={18} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 group-hover:text-amber-600">
                {isSuperAdmin ? "Review Leaves" : "Apply for Leave"}
              </p>
              <p className="text-[11px] text-slate-400">Request & approvals</p>
            </div>
          </Link>

          <Link
            to="/performance"
            className="group bg-white p-4 rounded-xl border border-slate-200 hover:border-blue-400 transition-all shadow-sm flex items-center gap-3.5"
          >
            <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <Award size={18} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 group-hover:text-purple-600">
                {isSuperAdmin || isManager ? "Appraisals" : "My Performance"}
              </p>
              <p className="text-[11px] text-slate-400">Review evaluations</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Active Organization Roster Preview */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
              Active Organization Roster
            </h3>
            <span className="text-xs text-slate-400">
              Recently registered staff members
            </span>
          </div>
          <Link
            to="/employees"
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            View Complete Directory
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentEmployees.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400">
            No employees registered yet. Go to Employees tab to create one.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentEmployees.map((emp) => (
              <div
                key={emp.id}
                className="py-3 flex items-center justify-between hover:bg-slate-50/50 px-2 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs uppercase">
                    {(emp.firstName?.[0] || "U") + (emp.lastName?.[0] || "")}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">
                      {emp.firstName} {emp.lastName}
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      {emp.personalEmail || emp.email}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs">
                  <span className="text-slate-500 font-medium">
                    {emp.department?.name || emp.department || "General"}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      emp.isDepartmentManager
                        ? "bg-blue-50 text-blue-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {emp.isDepartmentManager ? "Manager" : "Employee"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
