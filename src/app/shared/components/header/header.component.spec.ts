import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { HeaderComponent } from './header.component';
import { AuthService } from '@core/auth';
import { ApiClient } from '@core/api';
import { LocationService, HostApplicationService, NotificationService, EventTeamService, ToastService } from '@core/state';
import { User, AppNotification } from '@core/models';

describe('HeaderComponent', () => {
  let component: HeaderComponent;
  let fixture: ComponentFixture<HeaderComponent>;

  let mockAuthService: {
    isAuthenticated: ReturnType<typeof signal<boolean>>;
    currentUser: ReturnType<typeof signal<User | null>>;
    logout: ReturnType<typeof vi.fn>;
  };

  let mockLocationService: {
    selectedCity: ReturnType<typeof signal<string>>;
    setCity: ReturnType<typeof vi.fn>;
  };

  let mockHostAppService: {
    status: ReturnType<typeof signal<string>>;
  };

  let mockNotificationService: {
    notifications: ReturnType<typeof signal<AppNotification[]>>;
    unreadCount: ReturnType<typeof signal<number>>;
    loadNotifications: ReturnType<typeof vi.fn>;
    markAllAsRead: ReturnType<typeof vi.fn>;
    markAsRead: ReturnType<typeof vi.fn>;
    updateInvitationStatus: ReturnType<typeof vi.fn>;
    deleteNotification: ReturnType<typeof vi.fn>;
  };

  let mockEventTeamService: {
    acceptInvitation: ReturnType<typeof vi.fn>;
    declineInvitation: ReturnType<typeof vi.fn>;
  };

  let mockToastService: {
    info: ReturnType<typeof vi.fn>;
    success: ReturnType<typeof vi.fn>;
    warning: ReturnType<typeof vi.fn>;
  };

  let mockApiClient: {
    get: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    mockAuthService = {
      isAuthenticated: signal(true),
      currentUser: signal<User | null>({
        id: 'usr-1',
        email: 'john@example.com',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+91 9876543210',
        isEmailVerified: true,
        isPhoneVerified: true,
        platformRole: 'user',
        isHost: false,
        createdAt: '2026-01-01'
      }),
      logout: vi.fn()
    };

    mockLocationService = {
      selectedCity: signal('Mumbai'),
      setCity: vi.fn((city: string) => mockLocationService.selectedCity.set(city))
    };

    mockHostAppService = {
      status: signal('guest')
    };

    mockNotificationService = {
      notifications: signal<AppNotification[]>([]),
      unreadCount: signal(0),
      loadNotifications: vi.fn(),
      markAllAsRead: vi.fn().mockResolvedValue(true),
      markAsRead: vi.fn().mockResolvedValue(true),
      updateInvitationStatus: vi.fn().mockResolvedValue(true),
      deleteNotification: vi.fn().mockResolvedValue(true)
    };

    mockEventTeamService = {
      acceptInvitation: vi.fn().mockResolvedValue({ targetRoute: '/staff' }),
      declineInvitation: vi.fn().mockResolvedValue(true)
    };

    mockToastService = {
      info: vi.fn(),
      success: vi.fn(),
      warning: vi.fn()
    };

    mockApiClient = {
      get: vi.fn().mockResolvedValue({ data: [] })
    };

    if (typeof window !== 'undefined') {
      window.scrollTo = vi.fn();
    }

    await TestBed.configureTestingModule({
      imports: [HeaderComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: mockAuthService },
        { provide: LocationService, useValue: mockLocationService },
        { provide: HostApplicationService, useValue: mockHostAppService },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: EventTeamService, useValue: mockEventTeamService },
        { provide: ToastService, useValue: mockToastService },
        { provide: ApiClient, useValue: mockApiClient }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create and initialize categories', () => {
    expect(component).toBeTruthy();
    expect(component.primaryCategories.length).toBeGreaterThan(0);
    expect(component.selectedCity()).toBe('Mumbai');
  });

  it('should handle city selection and update location service', () => {
    component.onCitySelected('Bengaluru');
    expect(mockLocationService.setCity).toHaveBeenCalledWith('Bengaluru');
    expect(component.showCityMenu).toBe(false);
  });

  it('should toggle notifications dropdown and load notifications when opening', () => {
    const fakeEvent = { stopPropagation: vi.fn() } as unknown as MouseEvent;
    expect(component.showNotifications()).toBe(false);

    component.toggleNotifications(fakeEvent);
    expect(component.showNotifications()).toBe(true);
    expect(mockNotificationService.loadNotifications).toHaveBeenCalled();

    component.toggleNotifications(fakeEvent);
    expect(component.showNotifications()).toBe(false);
  });

  it('should toggle user menu and close other flyouts', () => {
    component.showCityMenu = true;
    component.toggleUserMenu();
    expect(component.showUserMenu).toBe(true);
    expect(component.showCityMenu).toBe(false);
  });

  it('should mark all notifications as read and display toast', async () => {
    const fakeEvent = { stopPropagation: vi.fn() } as unknown as MouseEvent;
    await component.markAllNotificationsAsRead(fakeEvent);
    expect(mockNotificationService.markAllAsRead).toHaveBeenCalled();
    expect(mockToastService.info).toHaveBeenCalledWith('All notifications marked as read', 'Notifications');
  });

  it('should logout user and display toast', () => {
    component.logout();
    expect(mockAuthService.logout).toHaveBeenCalled();
    expect(mockToastService.info).toHaveBeenCalledWith('You have logged out.', 'Account');
  });
});

