import { apiRequest } from "../../shared/api";
import type {
  CategoryItem,
  LanguageItem,
  PostItem,
  PostPayload,
  PostsResponse,
  TagItem,
} from "./posts.types";

export const getCategoriesRequest = () =>
  apiRequest<{ items: CategoryItem[] }>("/api/categories");

export const createCategoryRequest = (payload: {
  code: string;
  name: string;
  nativeName: string;
}) =>
  apiRequest<{ item: CategoryItem }>("/api/categories", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const updateCategoryRequest = (
  id: number,
  payload: Partial<{ code: string; name: string; nativeName: string }>,
) =>
  apiRequest<{ item: CategoryItem }>(`/api/categories/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

export const deleteCategoryRequest = (id: number) =>
  apiRequest<{ item: CategoryItem }>(`/api/categories/${id}`, {
    method: "DELETE",
  });

export const getLanguagesRequest = () =>
  apiRequest<{ items: LanguageItem[] }>("/api/languages");

export const getTagsRequest = () =>
  apiRequest<{ items: TagItem[] }>("/api/tags");

export const createTagRequest = (payload: { code: string; name: string }) =>
  apiRequest<{ item: TagItem }>("/api/tags", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const updateTagRequest = (
  id: number,
  payload: Partial<{ code: string; name: string }>,
) =>
  apiRequest<{ item: TagItem }>(`/api/tags/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

export const deleteTagRequest = (id: number) =>
  apiRequest<{ item: TagItem }>(`/api/tags/${id}`, {
    method: "DELETE",
  });

export const getPostsRequest = (
  page: number,
  pageSize: number,
  search: string,
  language?: string,
) =>
  apiRequest<PostsResponse>(
    `/api/posts?${new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      ...(search.trim() ? { search: search.trim() } : {}),
      ...(language ? { language } : {}),
    })}`,
  );

export const getPostBySlugRequest = (slug: string, language?: string) =>
  apiRequest<{ item: PostItem }>(
    `/api/posts/slug/${slug}${language ? `?language=${encodeURIComponent(language)}` : ""}`,
  );

export const getManagePostsRequest = (
  page: number,
  pageSize: number,
  search: string,
) =>
  apiRequest<PostsResponse>(
    `/api/posts/manage?${new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      ...(search.trim() ? { search: search.trim() } : {}),
    })}`,
  );

export const getSavedPostsRequest = (
  page: number,
  pageSize: number,
  search: string,
  language?: string,
) =>
  apiRequest<PostsResponse>(
    `/api/posts/saved?${new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      ...(search.trim() ? { search: search.trim() } : {}),
      ...(language ? { language } : {}),
    })}`,
  );

export const getSavedPostStatusRequest = (id: number) =>
  apiRequest<{ isSaved: boolean }>(`/api/posts/${id}/saved`);

export const savePostRequest = (id: number) =>
  apiRequest<{ isSaved: boolean }>(`/api/posts/${id}/save`, { method: "POST" });

export const unsavePostRequest = (id: number) =>
  apiRequest<{ isSaved: boolean }>(`/api/posts/${id}/save`, { method: "DELETE" });

export const trackPostViewRequest = (id: number) =>
  apiRequest<{ item: { id: number; viewCount: number; lastViewedAt: string | null } }>(
    `/api/posts/${id}/view`,
    { method: "POST" },
  );

export const createPostRequest = (payload: PostPayload) =>
  apiRequest<{ item: PostItem }>("/api/posts", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const updatePostRequest = (id: number, payload: Partial<PostPayload>) =>
  apiRequest<{ item: PostItem }>(`/api/posts/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

export const publishPostRequest = (id: number) =>
  apiRequest<{ item: PostItem }>(`/api/posts/${id}/publish`, {
    method: "POST",
  });

export const deletePostRequest = (id: number) =>
  apiRequest<{ item: PostItem }>(`/api/posts/${id}`, {
    method: "DELETE",
  });

export const uploadPostImageRequest = (file: File) => {
  const formData = new FormData();
  formData.append("file", file);

  return apiRequest<{ url: string; filename: string; mimetype: string }>("/api/uploads/images", {
    method: "POST",
    body: formData,
  });
};
