export const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? "http://127.0.0.1:3001";

type ApiError = {
  code?: string;
  error?: string;
  message?: string;
};

const validationMessages = {
  ro: "Verifică datele introduse înainte de trimitere.",
  en: "Check the entered values before submitting.",
} as const;

const getCurrentLanguage = () =>
  localStorage.getItem("language") === "en" ? "en" : "ro";

const isTechnicalValidationError = (payload: ApiError) =>
  payload.code?.startsWith("FST_ERR_") ||
  payload.message?.includes("body/") ||
  payload.message?.includes(" must ");

export const getAuthToken = () => localStorage.getItem("auth_token");
export const setAuthToken = (token: string) =>
  localStorage.setItem("auth_token", token);
export const clearAuthToken = () => localStorage.removeItem("auth_token");

const parseError = async (response: Response): Promise<never> => {
  let message = `Request failed (${response.status})`;
  try {
    const payload = (await response.json()) as ApiError;
    if (isTechnicalValidationError(payload)) {
      message = validationMessages[getCurrentLanguage()];
    } else if (payload.message) {
      message = payload.message;
    }
  } catch {
    // Ignore invalid JSON body on error response.
  }

  throw new Error(message);
};

export const apiRequest = async <T>(
  path: string,
  init?: RequestInit,
): Promise<T> => {
  const token = getAuthToken();
  const headers = new Headers(init?.headers);
  if (init?.body) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    return parseError(response);
  }

  return (await response.json()) as T;
};
