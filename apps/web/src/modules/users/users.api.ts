import { apiRequest } from "../../shared/api";
import type { UserRole } from "../auth/auth.types";
import type { UserItem, UsersResponse } from "./users.types";

export const getUsersRequest = (
  page: number,
  pageSize: number,
  search: string,
) =>
  apiRequest<UsersResponse>(
    `/api/users?${new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      ...(search.trim() ? { search: search.trim() } : {}),
    })}`,
  );

export const updateUserRequest = (
  id: number,
  payload: { name?: string; email?: string; role?: UserRole },
) =>
  apiRequest<{ item: UserItem }>(`/api/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
