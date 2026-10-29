import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ManagementService } from './management.service';
import { ApiClient } from '@core/api';

describe('ManagementService', () => {
  let service: ManagementService;
  let mockApiClient: {
    get: ReturnType<typeof vi.fn>;
    patch: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockApiClient = {
      get: vi.fn(),
      patch: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        ManagementService,
        { provide: ApiClient, useValue: mockApiClient }
      ]
    });

    service = TestBed.inject(ManagementService);
    service.staffRoster.set([
      {
        id: 'st-1',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '9876543210',
        role: 'Security Lead',
        assignedEvent: 'evt-100',
        assignedGate: 'Gate 1',
        status: 'off_duty'
      }
    ]);
  });

  it('should update local state and return true when updateStaffAssignment succeeds', async () => {
    mockApiClient.patch.mockResolvedValueOnce({
      data: {
        id: 'st-1',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '9876543210',
        role: 'Security Lead',
        assignedEvent: 'evt-100',
        assignedGate: 'Gate 2',
        status: 'on_duty'
      }
    });

    const result = await service.updateStaffAssignment('st-1', 'Gate 2', 'on_duty');
    expect(result).toBe(true);
    expect(service.staffRoster()[0].assignedGate).toBe('Gate 2');
    expect(service.staffRoster()[0].status).toBe('on_duty');
  });

  it('should NOT update local state and return false when updateStaffAssignment fails', async () => {
    mockApiClient.patch.mockResolvedValueOnce({
      error: { code: 'SERVER_ERROR', userMessage: 'Failed to update gate' }
    });

    const result = await service.updateStaffAssignment('st-1', 'Gate 2', 'on_duty');
    expect(result).toBe(false);
    expect(service.staffRoster()[0].assignedGate).toBe('Gate 1');
    expect(service.staffRoster()[0].status).toBe('off_duty');
  });
});
