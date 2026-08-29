export const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? "http://localhost:3001";

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
  localStorage.removeItem("auth_token");

  const headers = new Headers(init?.headers);
  if (init?.body) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: "include",
    headers,
  });

  if (!response.ok) {
    return parseError(response);
  }

  return (await response.json()) as T;
};