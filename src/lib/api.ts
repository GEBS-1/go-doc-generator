export class ApiError extends Error {
  status: number;

  data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export interface ApiFetchOptions extends RequestInit {
  token?: string | null;
}

const normalizeBaseUrl = (baseUrl?: string) => {
  if (!baseUrl) {
    return "";
  }
  return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
};

const API_BASE_URL = normalizeBaseUrl(import.meta.env.VITE_BACKEND_URL);

export async function apiFetch<TResponse = unknown>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<TResponse> {
  const { token, headers, body, ...rest } = options;

  const baseHeaders: Record<string, string> = {
    Accept: "application/json",
    ...(headers as Record<string, string> | undefined),
  };

  if (token) {
    baseHeaders.Authorization = `Bearer ${token}`;
  }

  let requestBody = body;

  if (requestBody && !(requestBody instanceof FormData)) {
    if (!baseHeaders["Content-Type"]) {
      baseHeaders["Content-Type"] = "application/json";
    }

    if (typeof requestBody !== "string") {
      requestBody = JSON.stringify(requestBody);
    }
  }

  const url =
    path.startsWith("http://") || path.startsWith("https://")
      ? path
      : `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;

  const response = await fetch(url, {
    ...rest,
    headers: baseHeaders,
    body: requestBody,
  });

  if (response.status === 204) {
    return undefined as TResponse;
  }

  let data: unknown = null;
  const contentType = response.headers.get("Content-Type");

  if (contentType && contentType.includes("application/json")) {
    try {
      data = await response.json();
    } catch (error) {
      data = null;
    }
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const message =
      (typeof data === "object" && data && "error" in data && typeof data.error === "string"
        ? data.error
        : undefined) || response.statusText || "Неизвестная ошибка";
    throw new ApiError(message, response.status, data);
  }

  return data as TResponse;
}

