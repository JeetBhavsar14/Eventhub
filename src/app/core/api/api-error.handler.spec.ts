import { describe, it, expect } from 'vitest';
import axios, { AxiosError, AxiosResponse } from 'axios';
import { handleApiError } from './api-error.handler';

describe('handleApiError', () => {
  function createAxiosError(status: number, data: unknown, code?: string): AxiosError {
    const error = new AxiosError('Request failed with status code ' + status);
    error.response = {
      status,
      statusText: 'Error',
      headers: {},
      config: {} as any,
      data
    } as AxiosResponse;
    if (code) error.code = code;
    return error;
  }

  it('should map 400 with validation userMessage and fieldErrors', () => {
    const err = createAxiosError(400, {
      message: 'Invalid input data',
      errors: { email: ['Email format is invalid'] }
    });
    const result = handleApiError(err);
    expect(result.code).toBe('VALIDATION_ERROR');
    expect(result.status).toBe(400);
    expect(result.userMessage).toBe('Invalid input data');
    expect(result.fieldErrors).toEqual({ email: ['Email format is invalid'] });
  });

  it('should map 401 Unauthorized with custom server message', () => {
    const err = createAxiosError(401, { message: 'Invalid credentials.' });
    const result = handleApiError(err);
    expect(result.code).toBe('UNAUTHORIZED');
    expect(result.status).toBe(401);
    expect(result.userMessage).toBe('Invalid credentials.');
  });

  it('should map 401 Unauthorized with default message when server response is empty', () => {
    const err = createAxiosError(401, {});
    const result = handleApiError(err);
    expect(result.code).toBe('UNAUTHORIZED');
    expect(result.userMessage).toBe('Your session has expired or you are not signed in. Please log in.');
  });

  it('should map 403 Forbidden with default message', () => {
    const err = createAxiosError(403, null);
    const result = handleApiError(err);
    expect(result.code).toBe('FORBIDDEN');
    expect(result.status).toBe(403);
    expect(result.userMessage).toBe('You do not have permission to perform this action.');
  });

  it('should map 404 Not Found', () => {
    const err = createAxiosError(404, { message: 'Event evt-999 not found' });
    const result = handleApiError(err);
    expect(result.code).toBe('NOT_FOUND');
    expect(result.status).toBe(404);
    expect(result.userMessage).toBe('Event evt-999 not found');
  });

  it('should map 409 Conflict with meaningful message', () => {
    const err = createAxiosError(409, { message: 'An account with this email address already exists.' });
    const result = handleApiError(err);
    expect(result.code).toBe('CONFLICT');
    expect(result.status).toBe(409);
    expect(result.userMessage).toBe('An account with this email address already exists.');
  });

  it('should map 422 Unprocessable Entity with Django REST Framework detail string', () => {
    const err = createAxiosError(422, { detail: 'Unable to process transaction with current balance.' });
    const result = handleApiError(err);
    expect(result.code).toBe('VALIDATION_ERROR');
    expect(result.userMessage).toBe('Unable to process transaction with current balance.');
  });

  it('should map 500 Server Error and ignore raw HTML proxy error pages', () => {
    const err = createAxiosError(500, '<!DOCTYPE html><html><body>500 Internal Server Error</body></html>');
    const result = handleApiError(err);
    expect(result.code).toBe('SERVER_ERROR');
    expect(result.status).toBe(500);
    expect(result.userMessage).toBe('An internal server error occurred. Please try again later.');
  });

  it('should map network failure when no response is received', () => {
    const err = new AxiosError('Network Error');
    err.request = {}; // request initiated, no response
    const result = handleApiError(err);
    expect(result.code).toBe('NETWORK_ERROR');
    expect(result.userMessage).toContain('Network connection failed');
    expect(result.diagnosticMessage).toBe('Network Error');
  });

  it('should map ECONNABORTED timeout errors', () => {
    const err = new AxiosError('timeout of 10000ms exceeded');
    err.code = 'ECONNABORTED';
    err.request = {};
    const result = handleApiError(err);
    expect(result.code).toBe('TIMEOUT_ERROR');
    expect(result.userMessage).toContain('Request timed out');
    expect(result.diagnosticMessage).toBe('timeout of 10000ms exceeded');
  });

  it('should protect unexpected internal errors and not expose raw Error.message to users', () => {
    const sensitiveError = new Error('FATAL: password authentication failed for user "postgres"');
    const result = handleApiError(sensitiveError);
    expect(result.code).toBe('UNKNOWN_ERROR');
    expect(result.userMessage).toBe('An unexpected error occurred. Please try again.');
    expect(result.userMessage).not.toContain('postgres');
    expect(result.userMessage).not.toContain('password');
    expect(result.diagnosticMessage).toBe('FATAL: password authentication failed for user "postgres"');
  });

  it('should protect non-Error throws with safe userMessage and separate diagnosticMessage', () => {
    const rawThrow = { crashDetails: 'memory corrupted at 0xdeadbeef' };
    const result = handleApiError(rawThrow);
    expect(result.code).toBe('UNKNOWN_ERROR');
    expect(result.userMessage).toBe('An unexpected error occurred. Please try again.');
    expect(result.diagnosticMessage).toContain('object');
  });
});
