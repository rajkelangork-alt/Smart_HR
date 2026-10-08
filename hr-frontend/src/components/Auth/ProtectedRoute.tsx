import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { RoleName } from "../../types/models";

interface ProtectedRouteProps {
  allowedRoles?: RoleName[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  allowedRoles,
}) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const token = localStorage.getItem("accessToken");

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  // Allow if state is authenticated or token exists in storage during transition
  if (!isAuthenticated && !token) {
    return <Navigate to="/login" replace />;
  }

  // Check role authorization if allowedRoles is provided
  if (allowedRoles && allowedRoles.length > 0 && user) {
    const userRole = (user as any).role?.name || (user as any).role;
    if (userRole && !allowedRoles.includes(userRole)) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <Outlet />;
};

export default ProtectedRoute;
