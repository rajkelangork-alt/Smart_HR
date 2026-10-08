export type RoleName =
  | "ADMIN"
  | "HR_MANAGER"
  | "MANAGER"
  | "EMPLOYEE"
  | "ACCOUNTANT";

export interface UserRole {
  role: {
    id: string;
    name: RoleName;
    description?: string;
  };
}

export interface User {
  id: string;
  email: string;
  isActive: boolean;
  roles: UserRole[];
  employeeId?: string;
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    employeeNumber: string;
  };
}

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  employeeNumber: string;
  departmentId?: string;
  designationId?: string;
  employmentStatus: string;
  department?: {
    id: string;
    name: string;
    code: string;
  };
  designation?: {
    id: string;
    title: string;
  };
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  clockIn?: string;
  clockOut?: string;
  status: "PRESENT" | "ABSENT" | "LATE" | "HALF_DAY";
  workHours?: number;
}
