import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { Clock, Calendar, AlertCircle } from "lucide-react";

interface AuthenticatedByData {
  name: string;
  email: string;
  role: string;
}

interface RosterRow {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  isDepartmentManager: boolean;
  clockIn: string;
  clockOut: string;
  shiftStatus: string;
  authenticatedBy?: AuthenticatedByData;
}

interface AttendanceStats {
  presentToday: number;
  workingDays: number;
  lateArrivals: number;
}

export const AttendancePage: React.FC = () => {
  const { user } = useAuth();
  const [roster, setRoster] = useState<RosterRow[]>([]);
  const [stats, setStats] = useState<AttendanceStats>({
    presentToday: 0,
    workingDays: 22,
    lateArrivals: 0,
  });
  const [isPunching, setIsPunching] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const isEmployeeOrManager =
    user?.role === "EMPLOYEE" || user?.role === "MANAGER";

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [statsRes, rosterRes] = await Promise.all([
        api.get("/attendance/stats"),
        api.get("/attendance/workforce-roster"),
      ]);

      if (statsRes.data?.data) {
        setStats(statsRes.data.data);
      } else if (
        statsRes.data &&
        typeof statsRes.data.presentToday === "number"
      ) {
        setStats(statsRes.data);
      }

      let list: RosterRow[] = [];
      if (Array.isArray(rosterRes.data)) {
        list = rosterRes.data;
      } else if (Array.isArray(rosterRes.data?.data)) {
        list = rosterRes.data.data;
      }
      setRoster(list);
    } catch (err) {
      console.error("Failed to load attendance data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handlePunchIn = async () => {
    try {
      setIsPunching(true);
      const res = await api.post("/attendance/punch-in");
      if (res.data?.success || res.status === 200) {
        await fetchData();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to punch in");
      await fetchData();
    } finally {
      setIsPunching(false);
    }
  };

  const handlePunchOut = async () => {
    try {
      setIsPunching(true);
      const res = await api.post("/attendance/punch-out");
      if (res.data?.success || res.status === 200) {
        await fetchData();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to punch out");
      await fetchData();
    } finally {
      setIsPunching(false);
    }
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {user?.role === "EMPLOYEE"
              ? "My Attendance"
              : "Attendance Tracking"}
          </h1>
          <p className="text-sm font-medium text-slate-300 mt-1">
            {user?.role === "SUPER_ADMIN" &&
              "Comprehensive organizational shift attendance logs and audit data."}
            {user?.role === "MANAGER" &&
              "Department shift audit and team attendance status."}
            {user?.role === "EMPLOYEE" &&
              "Daily punch records and active shift audit."}
          </p>
        </div>

        {isEmployeeOrManager && (
          <div className="flex items-center space-x-3">
            <button
              onClick={handlePunchIn}
              disabled={isPunching}
              className="flex items-center space-x-1.5 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Clock In</span>
            </button>
            <button
              onClick={handlePunchOut}
              disabled={isPunching}
              className="flex items-center space-x-1.5 px-4 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg shadow-rose-600/20 transition-all disabled:opacity-50"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Clock Out</span>
            </button>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-400 font-bold">
              Present Today
            </p>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-2xl font-bold text-white">
                {stats.presentToday}
              </span>
              <span className="text-xs font-semibold text-emerald-400">
                Checked In
              </span>
            </div>
          </div>
          <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-400 font-bold">
              Working Days
            </p>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-2xl font-bold text-white">
                {stats.workingDays}
              </span>
              <span className="text-xs font-semibold text-indigo-400">
                Days
              </span>
            </div>
          </div>
          <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-indigo-400">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-400 font-bold">
              Late Arrivals
            </p>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-2xl font-bold text-white">
                {stats.lateArrivals}
              </span>
              <span className="text-xs font-semibold text-amber-400">
                Flagged
              </span>
            </div>
          </div>
          <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 text-amber-400">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Workforce Shift Roster Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div>
          <h2 className="text-sm uppercase font-bold text-slate-200 tracking-wider">
            Workforce Shift Roster
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Live operational roster view from database
          </p>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-xs text-slate-400">
            Loading roster data...
          </div>
        ) : roster.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">
            No shift records available for current user scope.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Clock In</th>
                  <th className="py-3 px-4">Clock Out</th>
                  <th className="py-3 px-4">Shift Status</th>
                  <th className="py-3 px-4">Authenticated By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {roster.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white">
                        {row.firstName} {row.lastName}
                      </div>
                      <div className="font-mono text-[11px] text-slate-400">
                        {row.email}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-300">
                      {row.clockIn}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-300">
                      {row.clockOut}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                          row.shiftStatus === "PRESENT"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : row.shiftStatus === "COMPLETED"
                              ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                              : "bg-slate-800 text-slate-400 border-slate-700"
                        }`}
                      >
                        {row.shiftStatus}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {row.authenticatedBy ? (
                        <div>
                          <div className="flex items-center space-x-1.5">
                            <span className="font-semibold text-slate-200">
                              {row.authenticatedBy.name}
                            </span>
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                              {row.authenticatedBy.role}
                            </span>
                          </div>
                          <div className="font-mono text-[11px] text-slate-400">
                            {row.authenticatedBy.email}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 font-mono text-[11px]">
                          Super Admin (admin@smarthr.local)
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendancePage;
