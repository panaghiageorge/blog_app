import { apiRequest } from "../../shared/api";
import type {
  CategoryItem,
  LanguageItem,
  PostItem,
  PostPayload,
  PostsResponse,
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

export const getLanguagesRequest = () =>
  apiRequest<{ items: LanguageItem[] }>("/api/languages");

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

