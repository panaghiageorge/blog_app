import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { AdminPostPreviewPage } from "../pages/AdminPostPreviewPage";
import { AdminPostsPage } from "../pages/AdminPostsPage";
import { AdminSettingsPage } from "../pages/AdminSettingsPage";
import { AccountPage } from "../pages/AccountPage";
import { AuthorCreatePostPage } from "../pages/AuthorCreatePostPage";
import { AuthorPostsPage } from "../pages/AuthorPostsPage";
import { ForgotPasswordPage } from "../pages/ForgotPasswordPage";
import { HomePage } from "../pages/HomePage";
import { LegalPage } from "../pages/LegalPage";
import { LoginPage } from "../pages/LoginPage";
import { PostPage } from "../pages/PostPage";
import { SavedPostsPage } from "../pages/SavedPostsPage";
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
        <Route path="/legal/:key" element={<LegalPage />} />
        <Route
          path="/saved-posts"
          element={
            <ProtectedRoute requiredPermission="save_posts">
              <SavedPostsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/account"
          element={
            <ProtectedRoute requiredPermission="manage_account">
              <AccountPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/posts"
          element={
            <ProtectedRoute requiredPermission="publish_posts">
              <AdminPostsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/posts/:id/preview"
          element={
            <ProtectedRoute requiredPermission="publish_posts">
              <AdminPostPreviewPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <ProtectedRoute requiredPermission="manage_taxonomy">
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
            <ProtectedRoute requiredPermission="create_posts">
              <AuthorCreatePostPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/author/posts"
          element={
            <ProtectedRoute requiredPermission="manage_posts">
              <AuthorPostsPage />
            </ProtectedRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
