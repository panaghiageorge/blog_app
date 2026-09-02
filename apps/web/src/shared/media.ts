import { API_BASE_URL } from "./api";

export const mediaUrl = (url?: string | null) => {
  if (!url) return "";
  return url.startsWith("/uploads/") ? `${API_BASE_URL}${url}` : url;
};
