import type { UserRole } from "../auth/auth.types";

export type UserItem = {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
};

export type UsersResponse = {
  items: UserItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};
