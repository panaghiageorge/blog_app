import type { UserRole } from "../modules/auth/auth.types";

export type Permission =
  | "manage_users"
  | "manage_taxonomy"
  | "manage_legal"
  | "manage_posts"
  | "create_posts"
  | "publish_posts"
  | "save_posts"
  | "upload_images"
  | "manage_account";

export const rolePermissions: Record<UserRole, Permission[]> = {
  admin: [
    "manage_users",
    "manage_taxonomy",
    "manage_legal",
    "manage_posts",
    "create_posts",
    "publish_posts",
    "save_posts",
    "upload_images",
    "manage_account",
  ],
  author: [
    "manage_posts",
    "create_posts",
    "save_posts",
    "upload_images",
    "manage_account",
  ],
};

export const hasPermission = (role: UserRole | undefined, permission: Permission) =>
  Boolean(role && rolePermissions[role]?.includes(permission));
