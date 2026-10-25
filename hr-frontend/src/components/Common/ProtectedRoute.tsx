import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export const ProtectedRoute: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const token =
    localStorage.getItem("accessToken") || localStorage.getItem("token");

  // Prevent routing redirects while AuthProvider re-hydrates tokens
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
        <div className="text-center text-xs font-semibold text-slate-400">
          Loading authentication session...
        </div>
      </div>
    );
  }

  // If no active authenticated user or token exists, route to login
  if (!isAuthenticated && !token && !user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
