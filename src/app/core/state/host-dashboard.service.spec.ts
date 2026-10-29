import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HostDashboardService } from './host-dashboard.service';
import { ApiClient } from '@core/api';
import { AuthService } from '@core/auth';
import { HostApplicationService } from '@core/state/host-application.service';
import { signal } from '@angular/core';

describe('HostDashboardService', () => {
  let service: HostDashboardService;
  let mockApiClient: {
    get: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockApiClient = {
      get: vi.fn().mockResolvedValue({ data: [] })
    };

    TestBed.configureTestingModule({
      providers: [
        HostDashboardService,
        { provide: ApiClient, useValue: mockApiClient },
        { provide: AuthService, useValue: { currentUser: signal(null) } },
        { provide: HostApplicationService, useValue: { status: signal('approved'), applicationData: signal(null) } }
      ]
    });

    service = TestBed.inject(HostDashboardService);
  });

  it('should expose API failure userMessage when loadAll encounters an error response', async () => {
    mockApiClient.get.mockResolvedValueOnce({
      error: { code: 'SERVER_ERROR', userMessage: 'An internal server error occurred. Please try again later.' }
    });

    await service.loadAll();
    expect(service.error()).toBe('An internal server error occurred. Please try again later.');
  });

  it('should mask unexpected raw JavaScript Error messages and set safe fallback', async () => {
    // Only the first call rejects; the rest resolve cleanly to avoid unhandled rejections
    mockApiClient.get
      .mockRejectedValueOnce(new Error('FATAL_INTERNAL_SOCKET_CRASH_SECRET_KEY_12345'))
      .mockResolvedValue({ data: [] });

    await service.loadAll();
    expect(service.error()).toBe('An unexpected error occurred. Please try again.');
    expect(service.error()).not.toContain('SOCKET_CRASH');
    expect(service.error()).not.toContain('SECRET_KEY');
  });
});
