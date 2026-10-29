import axios from 'axios';
import { ApiError, ApiErrorCode } from '@core/models';

/**
 * Standard HTTP Status Code to ApiErrorCode mapping
 */
const STATUS_CODE_MAP: Record<number, ApiErrorCode> = {
  400: 'VALIDATION_ERROR',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'VALIDATION_ERROR',
  500: 'SERVER_ERROR',
  502: 'SERVER_ERROR',
  503: 'SERVER_ERROR',
  504: 'SERVER_ERROR',
};

/**
 * Meaningful user-facing fallback messages per HTTP status code
 */
const DEFAULT_STATUS_MESSAGES: Record<number, string> = {
  400: 'The request was invalid. Please check your submission.',
  401: 'Your session has expired or you are not signed in. Please log in.',
  403: 'You do not have permission to perform this action.',
  404: 'The requested resource could not be found.',
  409: 'A conflict occurred. The resource may already exist or has changed.',
  422: 'Validation failed. Please verify the information entered.',
  500: 'An internal server error occurred. Please try again later.',
  502: 'The server received an invalid response. Please try again shortly.',
  503: 'The service is temporarily unavailable. Please try again later.',
  504: 'The gateway timed out waiting for the server. Please try again.',
};

/**
 * Safely extracts user-friendly server messages from various backend conventions
 * (json-server, Express, Django REST Framework, Spring, etc.)
 */
function extractServerMessage(data: unknown): string | null {
  if (!data) return null;

  // 1. Plain string response (guard against raw HTML error pages from proxies/Nginx)
  if (typeof data === 'string') {
    const trimmed = data.trim();
    if (trimmed.startsWith('<') || trimmed.includes('<html') || trimmed.includes('<!DOCTYPE')) {
      return null;
    }
    return trimmed.length > 0 && trimmed.length < 300 ? trimmed : null;
  }

  // 2. Structured JSON response
  if (typeof data === 'object') {
    const record = data as Record<string, unknown>;

    // Direct message property
    if (typeof record['message'] === 'string' && record['message'].trim()) {
      return record['message'].trim();
    }

    // Django REST Framework detail property
    if (typeof record['detail'] === 'string' && record['detail'].trim()) {
      return record['detail'].trim();
    }

    // Error property as string
    if (typeof record['error'] === 'string' && record['error'].trim()) {
      return record['error'].trim();
    }

    // Error property as nested object with message
    if (record['error'] && typeof record['error'] === 'object') {
      const inner = record['error'] as Record<string, unknown>;
      if (typeof inner['message'] === 'string' && inner['message'].trim()) {
        return inner['message'].trim();
      }
    }

    // If validation errors exist, extract first field error message
    const errors = (record['errors'] || record['fieldErrors']) as Record<string, unknown> | undefined;
    if (errors && typeof errors === 'object' && !Array.isArray(errors)) {
      for (const key of Object.keys(errors)) {
        const val = errors[key];
        if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'string') {
          return `${key}: ${val[0]}`;
        }
        if (typeof val === 'string' && val.trim()) {
          return `${key}: ${val.trim()}`;
        }
      }
    }
  }

  return null;
}

/**
 * Extracts normalized field-level validation errors
 */
function extractFieldErrors(data: unknown): Record<string, string[]> | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const record = data as Record<string, unknown>;
  const raw = record['errors'] || record['fieldErrors'];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;

  const result: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (Array.isArray(value)) {
      result[key] = value.map(v => String(v));
    } else if (typeof value === 'string' && value.trim()) {
      result[key] = [value.trim()];
    }
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

/**
 * Maps raw Axios errors, network failures, timeouts, and unexpected errors
 * into a typed, structured ApiError.
 */
export function handleApiError(error: unknown): ApiError {
  // Case 1: Axios response received from server (HTTP 4xx, 5xx)
  if (axios.isAxiosError(error) && error.response) {
    const status = error.response.status;
    const data = error.response.data;

    const code: ApiErrorCode =
      STATUS_CODE_MAP[status] ??
      (status >= 400 && status < 500 ? 'VALIDATION_ERROR' : 'SERVER_ERROR');

    const userMessage =
      extractServerMessage(data) ??
      DEFAULT_STATUS_MESSAGES[status] ??
      'An unexpected server error occurred. Please try again.';

    return {
      code,
      userMessage,
      status,
      fieldErrors: extractFieldErrors(data),
      diagnosticMessage: typeof data === 'string' ? data : undefined,
    };
  }

  // Case 2: Axios request made without response (Timeout or Network down)
  if (axios.isAxiosError(error)) {
    // Check timeout
    if (error.code === 'ECONNABORTED' || error.message?.toLowerCase().includes('timeout')) {
      return {
        code: 'TIMEOUT_ERROR',
        userMessage: 'Request timed out. The server took too long to respond. Please try again.',
        diagnosticMessage: error.message,
      };
    }

    // Check canceled request
    if (axios.isCancel(error)) {
      return {
        code: 'UNKNOWN_ERROR',
        userMessage: 'Request was canceled.',
        diagnosticMessage: error.message,
      };
    }

    // Network connection failure
    if (error.request || error.message?.toLowerCase().includes('network')) {
      return {
        code: 'NETWORK_ERROR',
        userMessage: 'Network connection failed. Please check your internet connection and try again.',
        diagnosticMessage: error.message,
      };
    }

    return {
      code: 'NETWORK_ERROR',
      userMessage: 'Network connection failed. Please check your internet connection and try again.',
      diagnosticMessage: error.message,
    };
  }

  // Case 3: Standard JavaScript Error (mask internal error.message from userMessage)
  if (error instanceof Error) {
    return {
      code: 'UNKNOWN_ERROR',
      userMessage: 'An unexpected error occurred. Please try again.',
      diagnosticMessage: error.message,
    };
  }

  // Case 4: Completely unexpected non-error throw
  return {
    code: 'UNKNOWN_ERROR',
    userMessage: 'An unexpected error occurred. Please try again.',
    diagnosticMessage: error != null ? String(error) : undefined,
  };
}
