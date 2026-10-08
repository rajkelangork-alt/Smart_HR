export interface CurrentUser {
  id: string;
  email: string;
  roleBadge?: "SUPER_ADMIN" | "MANAGER_ADMIN" | "MANAGER" | "EMPLOYEE";
  isDepartmentManager?: boolean;
  canAdminister?: boolean;
  roles?: Array<{ name: string } | string>;
}

export function getCurrentUser(): CurrentUser | null {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function useAuth() {
  const user = getCurrentUser();
  const email = (user?.email || "").toLowerCase().trim();

  // Super Admin: exclusively admin@smarthr.local
  const isSuperAdmin = email === "admin@smarthr.local";

  // Delegated Manager • Admin: has manager delegation and administration privileges
  const isManagerAdmin =
    !isSuperAdmin &&
    (user?.roleBadge === "MANAGER_ADMIN" ||
      Boolean(user?.isDepartmentManager && user?.canAdminister) ||
      ((email.includes("_operations@") ||
        email.includes("_tech@") ||
        email.includes("_hr@") ||
        email.includes("_finance@")) &&
        Boolean(user?.canAdminister)));

  // Pure Department Manager (without full Admin delegation)
  const isDepartmentManager =
    !isSuperAdmin &&
    !isManagerAdmin &&
    (user?.roleBadge === "MANAGER" || Boolean(user?.isDepartmentManager));

  // Regular Employee: no manager delegation or admin rights
  const isEmployee = !isSuperAdmin && !isManagerAdmin && !isDepartmentManager;

  return {
    user,
    email,
    isSuperAdmin,
    isManagerAdmin,
    isDepartmentManager,
    isEmployee,
    canCreateEmployee: isSuperAdmin || isManagerAdmin,
    canAppraise: isSuperAdmin || isManagerAdmin || isDepartmentManager,
    canPunch: !isSuperAdmin, // Super admin is an executive role, not punch-clock tracked
    canApplyLeave: !isSuperAdmin, // Super admin approves leaves, does not request time off
    hasApprovalsQueue: isSuperAdmin || isManagerAdmin || isDepartmentManager,
  };
}

export default useAuth;
