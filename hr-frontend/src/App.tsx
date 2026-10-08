import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Sidebar } from "./components/Common/Sidebar";

import LoginPage from "./pages/LoginPage";
import EmployeePage from "./pages/EmployeePage";
import AttendancePage from "./pages/AttendancePage";
import LeavePage from "./pages/LeavePage";
import PerformancePage from "./pages/PerformancePage";

const ProtectedLayout: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-sm">
        Authenticating session...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <Sidebar />
      <main className="flex-1 overflow-y-auto min-h-screen bg-slate-950">
        {children}
      </main>
    </div>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/employees"
            element={
              <ProtectedLayout>
                <EmployeePage />
              </ProtectedLayout>
            }
          />
          <Route
            path="/attendance"
            element={
              <ProtectedLayout>
                <AttendancePage />
              </ProtectedLayout>
            }
          />
          <Route
            path="/leaves"
            element={
              <ProtectedLayout>
                <LeavePage />
              </ProtectedLayout>
            }
          />
          <Route
            path="/performance"
            element={
              <ProtectedLayout>
                <PerformancePage />
              </ProtectedLayout>
            }
          />

          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
