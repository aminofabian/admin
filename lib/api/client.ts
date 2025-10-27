import { API_BASE_URL, TOKEN_KEY } from '@/lib/constants/api';
import { storage } from '@/lib/utils/storage';
import type { ApiError } from '@/types';

interface RequestConfig extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getHeaders(isMultipart = false): HeadersInit {
    const headers: HeadersInit = {};
    
    if (!isMultipart) {
      headers['Content-Type'] = 'application/json';
    }

    const token = storage.get(TOKEN_KEY);
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  private buildUrl(endpoint: string, params?: Record<string, string | number | boolean | undefined>): string {
    // Handle local Next.js API routes (start with 'api/')
    if (endpoint.startsWith('api/')) {
      return `/${endpoint}`;
    }

    // Handle backend API routes
    if (!this.baseUrl) {
      throw new Error('API_BASE_URL is not configured. Please set NEXT_PUBLIC_API_URL in your .env.local file.');
    }

    let fullUrl = `${this.baseUrl}${endpoint}`;
    
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        fullUrl += `?${queryString}`;
      }
    }

    return fullUrl;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      let errorData: ApiError;
      let rawResponseText = '';
      
      try {
        rawResponseText = await response.text();
        try {
          errorData = JSON.parse(rawResponseText);
        } catch {
          errorData = {
            status: 'error',
            message: `HTTP ${response.status}: ${response.statusText}`,
            detail: rawResponseText.substring(0, 200) || 'No response body',
          };
        }
      } catch {
        errorData = {
          status: 'error',
          message: `HTTP ${response.status}: ${response.statusText}`,
          detail: 'Failed to read response body',
        };
      }

      console.error('🚨 API Error Details:', {
        status: response.status,
        statusText: response.statusText,
        url: response.url,
        endpoint: response.url.replace(this.baseUrl, ''),
        errorMessage: errorData.message,
        errorDetail: errorData.detail,
        rawError: errorData,
      });

      // Check for invalid token errors
      const errorMessage = errorData.message || errorData.detail || errorData.error || '';
      const errorCode = errorData.code || '';
      
      const isInvalidToken = 
        errorMessage.includes('Given token not valid for any token type') ||
        errorMessage.includes('token_not_valid') ||
        errorMessage.includes('Token is invalid') ||
        errorMessage.includes('Token has expired') ||
        errorMessage.includes('Invalid token') ||
        errorCode === 'token_not_valid' ||
        (response.status === 401 && (
          errorMessage.toLowerCase().includes('token') || 
          errorMessage.toLowerCase().includes('authentication') ||
          errorMessage.toLowerCase().includes('unauthorized')
        ));

      if (isInvalidToken) {
        console.warn('🚨 Invalid token detected - redirecting to login page');
        console.warn('Error details:', { status: response.status, message: errorMessage, code: errorCode });
        
        // Clear all stored authentication data
        storage.clear();
        
        // Redirect to login page (use replace to prevent back navigation)
        if (typeof window !== 'undefined') {
          window.location.replace('/login');
        }
        
        // Throw a user-friendly error
        throw {
          status: 'error',
          message: 'Your session has expired. Please login again.',
        };
      }

      throw errorData;
    }

    return response.json();
  }

  async get<T>(endpoint: string, config?: RequestConfig): Promise<T> {
    const url = this.buildUrl(endpoint, config?.params);
    
    console.log('🔵 API GET:', { endpoint, url, params: config?.params });
    
    try {
      const response = await fetch(url, {
        ...config,
        method: 'GET',
        headers: this.getHeaders(),
      });

      return this.handleResponse<T>(response);
    } catch (error: unknown) {
      // Handle network errors
      if (error instanceof Error && error.name === 'TypeError' && error.message === 'Failed to fetch') {
        const networkError = {
          status: 'error',
          message: `Cannot connect to server. Please check if the API is running at ${this.baseUrl}`,
          detail: `Failed to fetch ${endpoint}`,
        };
        console.error('🔴 Network Error:', networkError);
        throw networkError;
      }
      throw error;
    }
  }

  async post<T>(endpoint: string, data?: unknown, config?: RequestConfig): Promise<T> {
    const isFormData = data instanceof FormData;
    const url = this.buildUrl(endpoint, config?.params);
    
    console.log('🟢 API POST:', {
      endpoint,
      url,
      data: isFormData ? '[FormData]' : data,
      params: config?.params,
    });

    try {
      const headers = this.getHeaders(isFormData);
      console.log('📤 Request Headers:', headers);
      
      const response = await fetch(url, {
        ...config,
        method: 'POST',
        headers,
        body: isFormData ? data : JSON.stringify(data),
        credentials: 'include', // Include cookies for CSRF token
      });

      console.log('📥 Response Status:', response.status, response.statusText);
      
      return this.handleResponse<T>(response);
    } catch (error: unknown) {
      // Handle network errors
      if (error instanceof Error && error.name === 'TypeError' && error.message === 'Failed to fetch') {
        const networkError = {
          status: 'error',
          message: `Cannot connect to server. Please check if the API is running at ${this.baseUrl}`,
          detail: `Failed to fetch ${endpoint}`,
        };
        console.error('🔴 Network Error:', networkError);
        throw networkError;
      }
      throw error;
    }
  }

  async put<T>(endpoint: string, data?: unknown, config?: RequestConfig): Promise<T> {
    const isFormData = data instanceof FormData;
    const url = this.buildUrl(endpoint, config?.params);
    
    const response = await fetch(url, {
      ...config,
      method: 'PUT',
      headers: this.getHeaders(isFormData),
      body: isFormData ? data : JSON.stringify(data),
    });

    return this.handleResponse<T>(response);
  }

  async patch<T>(endpoint: string, data?: unknown, config?: RequestConfig): Promise<T> {
    const isFormData = data instanceof FormData;
    const url = this.buildUrl(endpoint, config?.params);
    
    const response = await fetch(url, {
      ...config,
      method: 'PATCH',
      headers: this.getHeaders(isFormData),
      body: isFormData ? data : JSON.stringify(data),
    });

    return this.handleResponse<T>(response);
  }

  async delete<T>(endpoint: string, config?: RequestConfig): Promise<T> {
    const url = this.buildUrl(endpoint, config?.params);
    
    const response = await fetch(url, {
      ...config,
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    return this.handleResponse<T>(response);
  }
}

export const apiClient = new ApiClient(API_BASE_URL);

