export type AuthMode = "login" | "register";

export type UserRole = "admin" | "author";

export type User = {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
};

export type AuthResponse = {
  token: string;
  user: User;
};

export type MeResponse = {
  user: User;
};
