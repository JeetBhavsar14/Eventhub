import axios from 'axios';
import { ApiError, ApiErrorCode } from '@core/models';

export function handleApiError(error: unknown): ApiError {

  // Case 1: Axios got a response from the server (e.g. 400, 401, 403, 404, 500)
  if (axios.isAxiosError(error) && error.response) {
    const status = error.response.status;
    const data = error.response.data as Record<string, unknown>;

    const codeMap: Record<number, ApiErrorCode> = {
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      422: 'VALIDATION_ERROR',
      400: 'VALIDATION_ERROR',
    };

    return {
      code: codeMap[status] ?? 'SERVER_ERROR',
      message: (data?.['message'] as string) ?? 'Something went wrong.',
      status,
      fieldErrors: data?.['errors'] as Record<string, string[]> | undefined,
    };
  }

  // Case 2: Request was made but no response received (network down, timeout)
  if (axios.isAxiosError(error) && error.request) {
    return {
      code: 'NETWORK_ERROR',
      message: 'Network error. Please check your connection.',
    };
  }

  // Case 3: Something completely unexpected
  return {
    code: 'UNKNOWN_ERROR',
    message: 'An unexpected error occurred.',
  };
}
