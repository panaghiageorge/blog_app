import { apiRequest } from "../../shared/api";
import type {
  AuthResponse,
  ForgotPasswordResponse,
  MeResponse,
  RegisterResponse,
  ResetPasswordResponse,
  VerifyEmailResponse,
} from "./auth.types";

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
  apiRequest<RegisterResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });

export const meRequest = () => apiRequest<MeResponse>("/api/auth/me");

export const logoutRequest = () =>
  apiRequest<{ ok: true }>("/api/auth/logout", {
    method: "POST",
  });

export const verifyEmailRequest = (email: string, code: string) =>
  apiRequest<VerifyEmailResponse>("/api/auth/verify-email", {
    method: "POST",
    body: JSON.stringify({ email, code }),
  });

export const forgotPasswordRequest = (email: string) =>
  apiRequest<ForgotPasswordResponse>("/api/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });

export const resetPasswordRequest = (
  email: string,
  code: string,
  password: string,
) =>
  apiRequest<ResetPasswordResponse>("/api/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ email, code, password }),
  });
