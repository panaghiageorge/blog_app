import { apiRequest } from "../../shared/api";
import type { AuthResponse, MeResponse } from "./auth.types";

export const loginRequest = (email: string, password: string) =>
  apiRequest<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

export const registerRequest = (
  name: string,
  email: string,
  password: string,
) =>
  apiRequest<AuthResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });

export const meRequest = () => apiRequest<MeResponse>("/api/auth/me");
