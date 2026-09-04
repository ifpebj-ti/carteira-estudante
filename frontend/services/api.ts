/**
 * Resolves the correct API base URL for the environment.
 *
 * Docker architecture:
 * - Client-side (browser): uses NEXT_PUBLIC_API_URL (e.g., http://localhost:8000)
 * - Server-side (SSR/middleware): uses internal Docker network URL (e.g., http://backend:8000)
 *   to avoid routing through the host machine.
 */
const getApiUrl = (): string => {
  if (typeof window === 'undefined') {
    // Server-side: use internal Docker service name if available
    return process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  }
  // Client-side: use public URL exposed to the browser
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
};

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export const api = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const baseUrl = getApiUrl();

  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
  };

  const config: RequestInit = {
    ...options,
    credentials: 'include', // Include HttpOnly cookies in all requests
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  const response = await fetch(`${baseUrl}${endpoint}`, config);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new ApiError(
      response.status,
      errorData.detail || 'Ocorreu um erro inesperado ao se comunicar com o servidor.'
    );
  }

  // Some endpoints might not return JSON (like 204 No Content)
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
};

