export interface ApiResponse<T = unknown> {
  status: 'success' | 'error';
  message?: string;
  data?: T;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ApiError {
  status: 'error';
  message: string;
  detail?: string;
  errors?: Record<string, string[]>;
  error?: string; // Alternative error message field
  code?: string; // Error code field (e.g., 'token_not_valid')
}

