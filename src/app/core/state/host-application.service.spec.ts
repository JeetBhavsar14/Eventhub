import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { HostApplicationService } from './host-application.service';
import { AuthService } from '@core/auth';
import { ApiClient } from '@core/api';
import { LocalStorageService } from '@core/storage';
import { User } from '@core/models';

describe('HostApplicationService', () => {
  let service: HostApplicationService;
  let currentUserSignal: ReturnType<typeof signal<User | null>>;
  let isAuthenticatedSignal: ReturnType<typeof signal<boolean>>;
  let inMemoryStorage: Map<string, unknown>;

  const mockAttendeeUser: User = {
    id: 'user-007',
    email: 'priti@gmail.com',
    firstName: 'Priti',
    lastName: 'Patel',
    phone: '9313094070',
    avatarUrl: undefined,
    isEmailVerified: true,
    isPhoneVerified: false,
    isHost: false,
    platformRole: 'user',
    createdAt: '2026-10-30T10:00:00.000Z'
  };

  const mockApprovedHostUser: User = {
    id: 'user-001',
    email: 'jeet@eventhub.com',
    firstName: 'Jeet',
    lastName: 'Shah',
    phone: '+91 98765 43210',
    avatarUrl: undefined,
    isEmailVerified: true,
    isPhoneVerified: true,
    isHost: true,
    platformRole: 'host',
    createdAt: '2025-01-01T00:00:00.000Z'
  };

  beforeEach(() => {
    inMemoryStorage = new Map();
    currentUserSignal = signal<User | null>(null);
    isAuthenticatedSignal = signal<boolean>(false);

    const mockLocalStorage = {
      get: vi.fn(<T>(key: string): T | null => (inMemoryStorage.get(key) as T) || null),
      set: vi.fn(<T>(key: string, val: T): void => { inMemoryStorage.set(key, val); }),
      remove: vi.fn((key: string): void => { inMemoryStorage.delete(key); }),
      clear: vi.fn((): void => { inMemoryStorage.clear(); }),
      has: vi.fn((key: string): boolean => inMemoryStorage.has(key))
    };

    const mockAuthService = {
      currentUser: currentUserSignal,
      isAuthenticated: isAuthenticatedSignal
    };

    const mockApiClient = {
      get: vi.fn().mockResolvedValue({ data: [] }),
      post: vi.fn().mockResolvedValue({ data: {} })
    };

    TestBed.configureTestingModule({
      providers: [
        HostApplicationService,
        { provide: AuthService, useValue: mockAuthService },
        { provide: LocalStorageService, useValue: mockLocalStorage },
        { provide: ApiClient, useValue: mockApiClient }
      ]
    });

    service = TestBed.inject(HostApplicationService);
  });

  it('should default to "guest" when no user is authenticated', () => {
    expect(service.status()).toBe('guest');
    expect(service.applicationData()).toBeNull();
  });

  it('should default strictly to "not_applied" for a newly registered attendee', () => {
    currentUserSignal.set(mockAttendeeUser);
    isAuthenticatedSignal.set(true);
    TestBed.flushEffects();

    expect(service.status()).toBe('not_applied');
    expect(service.applicationData()).toBeNull();
  });

  it('should evaluate to "approved" when user is already a host', () => {
    currentUserSignal.set(mockApprovedHostUser);
    isAuthenticatedSignal.set(true);
    TestBed.flushEffects();

    expect(service.status()).toBe('approved');
  });

  it('should isolate host application submissions to the current user and not bleed to another new user', () => {
    // 1. Priti logs in/registers
    currentUserSignal.set(mockAttendeeUser);
    isAuthenticatedSignal.set(true);
    TestBed.flushEffects();

    expect(service.status()).toBe('not_applied');

    // 2. Priti submits host application
    service.submitApplication({
      applicantName: 'Priti Patel',
      email: 'priti@gmail.com',
      organizationName: 'Priti Events'
    });

    expect(service.status()).toBe('submitted');
    expect(service.applicationData()?.applicantName).toBe('Priti Patel');

    // 3. User logs out
    currentUserSignal.set(null);
    isAuthenticatedSignal.set(false);
    TestBed.flushEffects();

    expect(service.status()).toBe('guest');
    expect(service.applicationData()).toBeNull();

    // 4. A brand new user registers
    const brandNewUser: User = {
      id: 'user-008',
      email: 'fresh.attendee@gmail.com',
      firstName: 'Fresh',
      lastName: 'User',
      phone: '9999988888',
      avatarUrl: undefined,
      isEmailVerified: true,
      isPhoneVerified: false,
      isHost: false,
      platformRole: 'user',
      createdAt: '2026-10-30T10:30:00.000Z'
    };

    currentUserSignal.set(brandNewUser);
    isAuthenticatedSignal.set(true);
    TestBed.flushEffects();

    // MUST strictly be not_applied for the new user!
    expect(service.status()).toBe('not_applied');
    expect(service.applicationData()).toBeNull();
  });

  it('should reset application and prototype state when resetApplication is called', () => {
    currentUserSignal.set(mockAttendeeUser);
    isAuthenticatedSignal.set(true);
    TestBed.flushEffects();

    service.submitApplication({ applicantName: 'Priti Patel' });
    expect(service.status()).toBe('submitted');

    service.resetApplication();
    expect(service.status()).toBe('not_applied');
    expect(service.applicationData()).toBeNull();
  });
});

