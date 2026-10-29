import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { StaffService } from './staff.service';
import { ApiClient } from '@core/api';
import { AuthService } from '@core/auth';
import { signal } from '@angular/core';

describe('StaffService', () => {
  let service: StaffService;
  let mockApiClient: {
    get: ReturnType<typeof vi.fn>;
    patch: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockApiClient = {
      get: vi.fn(),
      patch: vi.fn(),
      post: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        StaffService,
        { provide: ApiClient, useValue: mockApiClient },
        { provide: AuthService, useValue: { currentUser: signal(null) } }
      ]
    });

    service = TestBed.inject(StaffService);
    service.attendees.set([
      {
        id: 'att-1',
        name: 'Aarav Sharma',
        ticketTier: 'VIP',
        ticketsCount: 1,
        wristbandColor: 'Gold',
        isVIP: true,
        orderId: 'ORD-101',
        checkInStatus: 'pending',
        checkInTime: null
      }
    ]);
  });

  it('should update attendee state and return true when checkInAttendee succeeds', async () => {
    mockApiClient.patch.mockResolvedValueOnce({
      data: { id: 'att-1', checkInStatus: 'checked_in', checkInTime: '10:00 AM' }
    });

    const result = await service.checkInAttendee('att-1', '10:00 AM');
    expect(result).toBe(true);
    expect(service.attendees()[0].checkInStatus).toBe('checked_in');
    expect(service.attendees()[0].checkInTime).toBe('10:00 AM');
  });

  it('should NOT update attendee state and return false when checkInAttendee fails', async () => {
    mockApiClient.patch.mockResolvedValueOnce({
      error: { code: 'NETWORK_ERROR', userMessage: 'Network failure' }
    });

    const result = await service.checkInAttendee('att-1', '10:00 AM');
    expect(result).toBe(false);
    expect(service.attendees()[0].checkInStatus).toBe('pending');
    expect(service.attendees()[0].checkInTime).toBeNull();
  });

  it('should revert attendee state and return true when undoCheckIn succeeds', async () => {
    service.attendees.set([
      {
        id: 'att-1',
        name: 'Aarav Sharma',
        ticketTier: 'VIP',
        ticketsCount: 1,
        wristbandColor: 'Gold',
        isVIP: true,
        orderId: 'ORD-101',
        checkInStatus: 'checked_in',
        checkInTime: '10:00 AM'
      }
    ]);

    mockApiClient.patch.mockResolvedValueOnce({
      data: { id: 'att-1', checkInStatus: 'pending', checkInTime: null }
    });

    const result = await service.undoCheckIn('att-1');
    expect(result).toBe(true);
    expect(service.attendees()[0].checkInStatus).toBe('pending');
    expect(service.attendees()[0].checkInTime).toBeNull();
  });

  it('should NOT revert attendee state and return false when undoCheckIn fails', async () => {
    service.attendees.set([
      {
        id: 'att-1',
        name: 'Aarav Sharma',
        ticketTier: 'VIP',
        ticketsCount: 1,
        wristbandColor: 'Gold',
        isVIP: true,
        orderId: 'ORD-101',
        checkInStatus: 'checked_in',
        checkInTime: '10:00 AM'
      }
    ]);

    mockApiClient.patch.mockResolvedValueOnce({
      error: { code: 'SERVER_ERROR', userMessage: 'Server 500 error' }
    });

    const result = await service.undoCheckIn('att-1');
    expect(result).toBe(false);
    expect(service.attendees()[0].checkInStatus).toBe('checked_in');
    expect(service.attendees()[0].checkInTime).toBe('10:00 AM');
  });
});

