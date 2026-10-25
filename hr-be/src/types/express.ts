import { RoleName } from "@prisma/client";

export interface AuthenticatedUser {
  userId: string;
  email: string;
  roles: RoleName[];
  employeeId?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}
