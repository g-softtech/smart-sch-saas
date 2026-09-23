export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.status = status;
    this.data = data;
    this.name = 'ApiError';
  }
}

interface RequestOptions extends RequestInit {
  requireAuth?: boolean;
}

export const apiClient = {
  get: (url: string, options?: RequestOptions) => request(url, { ...options, method: 'GET' }),
  post: (url: string, data?: unknown, options?: RequestOptions) => request(url, { ...options, method: 'POST', body: data ? JSON.stringify(data) : undefined }),
  put: (url: string, data?: unknown, options?: RequestOptions) => request(url, { ...options, method: 'PUT', body: data ? JSON.stringify(data) : undefined }),
  patch: (url: string, data?: unknown, options?: RequestOptions) => request(url, { ...options, method: 'PATCH', body: data ? JSON.stringify(data) : undefined }),
  delete: (url: string, options?: RequestOptions) => request(url, { ...options, method: 'DELETE' }),
};

async function request(endpoint: string, options: RequestOptions = {}) {
  const { requireAuth = true, headers = {}, ...customConfig } = options;

  const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://localhost:3000';
  const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const config: RequestInit = {
    cache: 'no-store',
    ...customConfig,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (requireAuth) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (token) {
      (config.headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    const tenantId = typeof window !== 'undefined' ? localStorage.getItem('x-tenant-id') : null;
    const schoolId = typeof window !== 'undefined' ? localStorage.getItem('x-school-id') : null;
    const campusId = typeof window !== 'undefined' ? localStorage.getItem('x-campus-id') : null;

    if (tenantId) (config.headers as Record<string, string>)['x-tenant-id'] = tenantId;
    if (schoolId) (config.headers as Record<string, string>)['x-school-id'] = schoolId;
    if (campusId) (config.headers as Record<string, string>)['x-campus-id'] = campusId;
  }

  try {
    const response = await fetch(url, config);
    
    // We expect 204 No Content to be empty
    if (response.status === 204) return null;

    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (response.ok) {
      // Handle the canonical { success, data } envelope if it exists
      if (data && typeof data === 'object' && 'success' in data && 'data' in data) {
        return data.data;
      }
      return data;
    }

    if (response.status === 401) {
      // Clear token and redirect to login if auth fails
      if (typeof window !== 'undefined') {
        localStorage.removeItem('access_token');
        localStorage.removeItem('x-tenant-id');
        localStorage.removeItem('x-school-id');
        localStorage.removeItem('x-campus-id');
        // Prevent redirect loop if already on login
        if (window.location.pathname !== '/login') {
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination
          window.location.href = '/login';
        }
      }
    }

    // Preserve non-401 API errors
    const errorData = data as Record<string, unknown>;
    
    let errorMessage = response.statusText;
    if (errorData) {
      if (typeof errorData.message === 'string') {
        errorMessage = errorData.message;
      } else if (Array.isArray(errorData.message)) {
        errorMessage = errorData.message.join(', ');
      } else if (typeof errorData.error === 'string') {
        errorMessage = errorData.error;
      }
    }
    
    throw new ApiError(response.status, errorMessage, data);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, error instanceof Error ? error.message : 'Unknown network error');
  }
}
