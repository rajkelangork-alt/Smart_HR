export type RoleType =
  | "ADMIN"
  | "HR_MANAGER"
  | "MANAGER"
  | "EMPLOYEE"
  | "ACCOUNTANT";

export function useAuthRole() {
  const token =
    localStorage.getItem("token") || localStorage.getItem("auth_token");
  let user: any = null;

  try {
    const rawUser = localStorage.getItem("user");
    if (rawUser) {
      user = JSON.parse(rawUser);
    } else if (token) {
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join(""),
      );
      user = JSON.parse(jsonPayload);
    }
  } catch (e) {
    user = null;
  }

  const roleName: string = (
    user?.role?.name ||
    user?.role ||
    user?.roles?.[0] ||
    "EMPLOYEE"
  ).toUpperCase();

  const isAdmin = roleName.includes("ADMIN");
  const isHR = roleName.includes("HR");
  const isManager = roleName.includes("MANAGER");
  const isAccountant =
    roleName.includes("ACCOUNT") || roleName.includes("FINANCE");
  const isEmployee = !isAdmin && !isHR && !isManager && !isAccountant;
  const isPrivileged = isAdmin || isHR || isManager;

  return {
    user,
    role: roleName as RoleType,
    isAdmin,
    isHR,
    isManager,
    isAccountant,
    isEmployee,
    isPrivileged,
  };
}

export default useAuthRole;
