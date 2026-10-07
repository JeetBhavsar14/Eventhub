import { Injectable } from '@angular/core';
import { ApiError } from '@core/models';
import { axiosInstance } from './axios-instance';
import { handleApiError } from './api-error.handler';

export type ApiResult<T> = { data: T; error: null } | { data: null; error: ApiError };

@Injectable({ providedIn: 'root' })
export class ApiClient {

  async get<T>(url: string, params?: Record<string, unknown>): Promise<ApiResult<T>> {
    try {
      const response = await axiosInstance.get<T>(url, { params });
      return { data: response.data, error: null };
    } catch (error) {
      return { data: null, error: handleApiError(error) };
    }
  }

  async post<T>(url: string, body?: unknown): Promise<ApiResult<T>> {
    try {
      const response = await axiosInstance.post<T>(url, body);
      return { data: response.data, error: null };
    } catch (error) {
      return { data: null, error: handleApiError(error) };
    }
  }

  async put<T>(url: string, body?: unknown): Promise<ApiResult<T>> {
    try {
      const response = await axiosInstance.put<T>(url, body);
      return { data: response.data, error: null };
    } catch (error) {
      return { data: null, error: handleApiError(error) };
    }
  }

  async patch<T>(url: string, body?: unknown): Promise<ApiResult<T>> {
    try {
      const response = await axiosInstance.patch<T>(url, body);
      return { data: response.data, error: null };
    } catch (error) {
      return { data: null, error: handleApiError(error) };
    }
  }

  async delete<T>(url: string): Promise<ApiResult<T>> {
    try {
      const response = await axiosInstance.delete<T>(url);
      return { data: response.data, error: null };
    } catch (error) {
      return { data: null, error: handleApiError(error) };
    }
  }
}
