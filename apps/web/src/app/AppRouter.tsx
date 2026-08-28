import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { AdminPostsPage } from "../pages/AdminPostsPage";
import { AdminSettingsPage } from "../pages/AdminSettingsPage";
import { AuthorPostsPage } from "../pages/AuthorPostsPage";
import { HomePage } from "../pages/HomePage";
import { LoginPage } from "../pages/LoginPage";
import { PostPage } from "../pages/PostPage";
import { AppLayout } from "./AppLayout";

export const AppRouter = () => {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/posts/:slug" element={<PostPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/admin/posts"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminPostsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminSettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/author/posts"
          element={
            <ProtectedRoute allowedRoles={["admin", "author"]}>
              <AuthorPostsPage />
            </ProtectedRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
