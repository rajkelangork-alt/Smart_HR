import React, { createContext, useContext, useState, useEffect } from "react";
import api from "../services/api";

export type UserRole = "SUPER_ADMIN" | "MANAGER" | "EMPLOYEE";

export interface User {
  id: string;
  email: string;
  role: UserRole;
  employee?: {
    id: string;
    employeeNumber: string;
    firstName: string;
    lastName: string;
    isDepartmentManager: boolean;
    departmentId?: string;
    departments?: { id: string; name: string; code: string };
    designations?: { id: string; title: string; code: string };
  };
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const savedToken = localStorage.getItem("smarthr_token");
    const savedUser = localStorage.getItem("smarthr_user");

    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem("smarthr_token");
        localStorage.removeItem("smarthr_user");
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const res = await api.post("/auth/login", { email, password });
      if (res.data?.success) {
        const { accessToken, user: rawUser } = res.data.data;

        const cleanEmail = rawUser.email.toLowerCase();
        const roleStrings: string[] = (rawUser.roles || []).map((r: any) =>
          String(
            r?.roles?.name || r?.role?.name || r?.name || r || "",
          ).toUpperCase(),
        );

        let determinedRole: UserRole = "EMPLOYEE";
        if (
          cleanEmail === "admin@smarthr.local" ||
          roleStrings.includes("SUPER_ADMIN") ||
          roleStrings.includes("ADMIN")
        ) {
          determinedRole = "SUPER_ADMIN";
        } else if (
          rawUser.employee?.isDepartmentManager ||
          roleStrings.includes("MANAGER")
        ) {
          determinedRole = "MANAGER";
        }

        const normalizedUser: User = {
          id: rawUser.id,
          email: rawUser.email,
          role: determinedRole,
          employee: rawUser.employee,
        };

        localStorage.setItem("smarthr_token", accessToken);
        localStorage.setItem("smarthr_user", JSON.stringify(normalizedUser));

        setToken(accessToken);
        setUser(normalizedUser);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem("smarthr_token");
    localStorage.removeItem("smarthr_user");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};

export default AuthContext;
