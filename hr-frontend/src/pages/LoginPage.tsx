import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import {
  ShieldCheck,
  UserCheck,
  KeyRound,
  ArrowRight,
  Eye,
  EyeOff,
} from "lucide-react";

interface RosterMember {
  id: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
  department: string;
  password?: string;
}

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [roster, setRoster] = useState<RosterMember[]>([]);

  const fetchRoster = async () => {
    try {
      const res = await api.get("/auth/roster");
      if (res.data?.success) {
        setRoster(res.data.data);
      }
    } catch (err) {
      console.error("Failed to load roster:", err);
    }
  };

  useEffect(() => {
    fetchRoster();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const success = await login(email, password);
    if (success) {
      navigate("/employees");
    } else {
      setError("Invalid credentials. Select an account from the roster list.");
      setIsLoading(false);
    }
  };

  const handleAutofill = (m: RosterMember) => {
    setEmail(m.email);
    setPassword(m.password || `${m.email.split("@")[0]}@12345`);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col lg:flex-row items-center justify-center p-6 gap-8">
      {/* Sign-in Card */}
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
        <div className="flex items-center space-x-3 mb-6">
          <div className="bg-indigo-600 p-2.5 rounded-xl text-white shadow-lg shadow-indigo-600/30">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              SmartHR Enterprise
            </h1>
            <p className="text-xs text-slate-400">
              Strict 3-Tier RBAC & Lineage Verification
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Enter email address"
              className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 text-sm font-medium placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter password"
                className="w-full pl-3.5 pr-10 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 text-sm font-medium placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200 transition-colors focus:outline-none"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/20 disabled:opacity-50"
          >
            <span>{isLoading ? "Authenticating..." : "Sign In"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Dynamic 11-Member Credentials Roster */}
      <div
        className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl flex flex-col"
        style={{ maxHeight: "560px" }}
      >
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2 text-slate-200">
            <UserCheck className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-bold text-slate-100">
              11-Member Credentials Roster
            </h2>
          </div>
          <span className="text-[11px] bg-slate-800 text-slate-300 font-semibold px-2 py-0.5 rounded border border-slate-700">
            Click to Autofill
          </span>
        </div>

        <div className="space-y-2 overflow-y-auto pr-1">
          {roster.map((m) => (
            <div
              key={m.id}
              onClick={() => handleAutofill(m)}
              className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-indigo-500/60 hover:bg-slate-800/40 cursor-pointer transition-all flex items-center justify-between group"
            >
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-semibold text-slate-100 group-hover:text-indigo-300 transition-colors">
                    {m.firstName} {m.lastName}
                  </span>
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                      m.role === "SUPER_ADMIN"
                        ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                        : m.role === "MANAGER"
                          ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/30"
                          : "bg-slate-800 text-slate-300 border-slate-700"
                    }`}
                  >
                    {m.role}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                  {m.email}
                </p>
              </div>

              <div className="flex items-center space-x-1.5 text-xs text-slate-400 group-hover:text-indigo-400 transition-colors">
                <KeyRound className="w-3.5 h-3.5" />
                <span className="font-mono text-sm tracking-widest">
                  ••••••••
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
