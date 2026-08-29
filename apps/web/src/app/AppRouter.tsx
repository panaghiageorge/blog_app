import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { AdminPostPreviewPage } from "../pages/AdminPostPreviewPage";
import { AdminPostsPage } from "../pages/AdminPostsPage";
import { AdminSettingsPage } from "../pages/AdminSettingsPage";
import { AuthorCreatePostPage } from "../pages/AuthorCreatePostPage";
import { AuthorPostsPage } from "../pages/AuthorPostsPage";
import { ForgotPasswordPage } from "../pages/ForgotPasswordPage";
import { HomePage } from "../pages/HomePage";
import { LoginPage } from "../pages/LoginPage";
import { PostPage } from "../pages/PostPage";
import { VerifyEmailPage } from "../pages/VerifyEmailPage";
import { AppLayout } from "./AppLayout";

export const AppRouter = () => {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/posts/:slug" element={<PostPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route
          path="/admin/posts"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminPostsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/posts/:id/preview"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminPostPreviewPage />
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
          path="/author/posts/:id/preview"
          element={
            <ProtectedRoute allowedRoles={["admin", "author"]}>
              <AdminPostPreviewPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/author/posts/new"
          element={
            <ProtectedRoute allowedRoles={["admin", "author"]}>
              <AuthorCreatePostPage />
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
