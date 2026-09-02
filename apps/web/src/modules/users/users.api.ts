import { apiRequest } from "../../shared/api";
import type { User, UserRole } from "../auth/auth.types";
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
  payload: { name?: string; email?: string; avatarUrl?: string | null; role?: UserRole },
) =>
  apiRequest<{ item: UserItem }>(`/api/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });


export const updateAccountRequest = (payload: { name?: string; avatarUrl?: string | null }) =>
  apiRequest<{ user: User }>("/api/users/me", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

export const changeAccountPasswordRequest = (payload: {
  currentPassword: string;
  newPassword: string;
}) =>
  apiRequest<{ ok: true }>("/api/users/me/password", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
