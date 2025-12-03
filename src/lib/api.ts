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

export interface ApiFetchOptions {
  token?: string | null;
  method?: RequestInit['method'];
  headers?: RequestInit['headers'];
  body?: RequestInit['body'] | Record<string, any> | any[];
  cache?: RequestInit['cache'];
  credentials?: RequestInit['credentials'];
  integrity?: RequestInit['integrity'];
  keepalive?: RequestInit['keepalive'];
  mode?: RequestInit['mode'];
  redirect?: RequestInit['redirect'];
  referrer?: RequestInit['referrer'];
  referrerPolicy?: RequestInit['referrerPolicy'];
  signal?: RequestInit['signal'];
  window?: RequestInit['window'];
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

  let requestBody: BodyInit | undefined = body as BodyInit | undefined;

  if (requestBody && !(requestBody instanceof FormData)) {
    if (!baseHeaders["Content-Type"]) {
      baseHeaders["Content-Type"] = "application/json";
    }

    if (typeof requestBody !== "string") {
      requestBody = JSON.stringify(requestBody) as BodyInit;
    }
  }

  const url =
    path.startsWith("http://") || path.startsWith("https://")
      ? path
      : `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;

  console.log('[apiFetch] Запрос:', {
    url,
    method: rest.method || 'GET',
    hasToken: !!token,
    path,
    API_BASE_URL,
  });

  const response = await fetch(url, {
    ...rest,
    headers: baseHeaders,
    body: requestBody,
    credentials: 'include', // Важно: отправляем cookie с каждым запросом
  });

  console.log('[apiFetch] Ответ:', {
    status: response.status,
    statusText: response.statusText,
    ok: response.ok,
    url: response.url,
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

