import api from "./api";
import { Employee } from "../types/models";

export interface EmployeeFilterParams {
  departmentId?: string;
  designationId?: string;
  employmentStatus?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface EmployeeListResponse {
  employees: Employee[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const employeeService = {
  getEmployees: async (
    params?: EmployeeFilterParams,
  ): Promise<EmployeeListResponse> => {
    const response = await api.get("/employees", { params });
    return response.data.data;
  },

  getEmployeeById: async (id: string): Promise<Employee> => {
    const response = await api.get(`/employees/${id}`);
    return response.data.data;
  },

  getOrgChart: async () => {
    const response = await api.get("/employees/org-chart");
    return response.data.data;
  },

  createEmployee: async (data: any): Promise<Employee> => {
    const response = await api.post("/employees", data);
    return response.data.data;
  },

  updateEmployee: async (id: string, data: any): Promise<Employee> => {
    const response = await api.put(`/employees/${id}`, data);
    return response.data.data;
  },
};
