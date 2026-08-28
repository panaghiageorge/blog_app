import type { ReactElement } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../modules/auth/AuthContext";
import type { UserRole } from "../modules/auth/auth.types";

type Props = {
  children: ReactElement;
  allowedRoles?: UserRole[];
};

export const ProtectedRoute = ({ children, allowedRoles }: Props) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <p>Checking session...</p>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (allowedRoles && (!user || !allowedRoles.includes(user.role))) {
    return <Navigate to="/author/posts" replace />;
  }

  return children;
};
