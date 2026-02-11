import { AxiosError } from 'axios';

interface ErrorResponse {
  message?: string;
  error?: string;
  errors?: Record<string, string[]> | string[];
  detail?: string;
}

/**
 * Parse backend error and return user-friendly message
 */
export function parseErrorMessage(error: unknown, fallbackMessage = 'An unexpected error occurred'): string {
  // Handle AxiosError
  if (error && typeof error === 'object' && 'isAxiosError' in error) {
    const axiosError = error as AxiosError<ErrorResponse>;
    
    // Network error (no response from server)
    if (!axiosError.response) {
      if (axiosError.message === 'Network Error') {
        return 'Unable to connect to the server. Please check your internet connection.';
      }
      return 'Network error. Please try again.';
    }

    const { status, data } = axiosError.response;

    // Handle different status codes
    switch (status) {
      case 400:
        return parseValidationError(data) || 'Invalid request. Please check your input.';
      case 401:
        return data?.message || data?.error || 'Invalid credentials. Please try again.';
      case 403:
        return parseRBACError(data) || 'You do not have permission to perform this action.';
      case 404:
        return 'The requested resource was not found.';
      case 409:
        return data?.message || data?.error || 'A conflict occurred. This resource may already exist.';
      case 422:
        return parseValidationError(data) || 'Validation failed. Please check your input.';
      case 429:
        return 'Too many requests. Please wait a moment and try again.';
      case 500:
        return 'Server error. Please try again later.';
      case 503:
        return 'Service temporarily unavailable. Please try again later.';
      default:
        return data?.message || data?.error || data?.detail || fallbackMessage;
    }
  }

  // Handle generic Error objects
  if (error instanceof Error) {
    return error.message || fallbackMessage;
  }

  // Handle string errors
  if (typeof error === 'string') {
    return error;
  }

  return fallbackMessage;
}

/**
 * Parse validation errors from backend
 */
function parseValidationError(data: ErrorResponse | undefined): string | null {
  if (!data) return null;

  // Handle errors as object with field-specific errors
  if (data.errors && typeof data.errors === 'object' && !Array.isArray(data.errors)) {
    const firstError = Object.values(data.errors)[0];
    if (Array.isArray(firstError) && firstError.length > 0) {
      return firstError[0];
    }
  }

  // Handle errors as array
  if (Array.isArray(data.errors) && data.errors.length > 0) {
    return data.errors[0];
  }

  return null;
}

/**
 * Parse RBAC-specific 403 errors with helpful messages
 */
function parseRBACError(data: ErrorResponse | undefined): string | null {
  if (!data) return null;

  const msg = (data.message || data.error || data.detail || '').toLowerCase();

  if (msg.includes('cluster') && msg.includes('access')) {
    return 'You don\'t have access to this cluster. Contact your administrator to request access.';
  }
  if (msg.includes('editor') || msg.includes('modify')) {
    return 'This action requires Editor or Admin access. Contact your administrator for a role upgrade.';
  }
  if (msg.includes('admin')) {
    return 'Administrator privileges are required for this action.';
  }
  if (msg.includes('token') || msg.includes('auth')) {
    return 'Your authentication has expired. Please sign in again.';
  }

  return data.message || data.error || data.detail || null;
}

/**
 * Get all validation errors as field-message pairs
 */
export function parseFieldErrors(error: unknown): Record<string, string> {
  if (error && typeof error === 'object' && 'isAxiosError' in error) {
    const axiosError = error as AxiosError<ErrorResponse>;
    const data = axiosError.response?.data;

    if (data?.errors && typeof data.errors === 'object' && !Array.isArray(data.errors)) {
      const fieldErrors: Record<string, string> = {};
      
      for (const [field, messages] of Object.entries(data.errors)) {
        if (Array.isArray(messages) && messages.length > 0) {
          fieldErrors[field] = messages[0];
        }
      }
      
      return fieldErrors;
    }
  }

  return {};
}
