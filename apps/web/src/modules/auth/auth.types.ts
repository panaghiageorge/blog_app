export type AuthMode = "login" | "register";

export type UserRole = "admin" | "author";

export type User = {
  id: number;
  email: string;
  name: string;
  avatarUrl?: string | null;
  role: UserRole;
  createdAt: string;
};

export type AuthResponse = {
  user: User;
};

export type RegisterResponse = {
  ok: true;
  email: string;
};

export type VerifyEmailResponse = {
  ok: true;
};

export type ForgotPasswordResponse = {
  ok: true;
  email: string;
};

export type ResetPasswordResponse = {
  ok: true;
};

export type MeResponse = {
  user: User;
};
