import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AdminLayoutComponent } from './admin-layout.component';
import { AuthService } from '@core/auth';
import { Router, provideRouter } from '@angular/router';
import { HostApplicationService, AdminService, ToastService, AdminHostApplication, AdminCurationEvent, AdminUser, AdminSettlement } from '@core/state';

describe('AdminLayoutComponent', () => {
  let component: AdminLayoutComponent;
  let fixture: ComponentFixture<AdminLayoutComponent>;
  let router: Router;

  let mockAuthService: { logout: ReturnType<typeof vi.fn> };
  let mockHostAppService: { setPrototypeState: ReturnType<typeof vi.fn> };
  let mockToastService: { info: ReturnType<typeof vi.fn> };
  let mockAdminService: {
    loadAll: ReturnType<typeof vi.fn>;
    hostApplications: ReturnType<typeof signal<AdminHostApplication[]>>;
    curationEvents: ReturnType<typeof signal<AdminCurationEvent[]>>;
    users: ReturnType<typeof signal<AdminUser[]>>;
    settlements: ReturnType<typeof signal<AdminSettlement[]>>;
    financialMetrics: ReturnType<typeof signal<any>>;
    approveHostApplication: ReturnType<typeof vi.fn>;
    rejectHostApplication: ReturnType<typeof vi.fn>;
    requestMoreHostInfo: ReturnType<typeof vi.fn>;
    approveEvent: ReturnType<typeof vi.fn>;
    delistEvent: ReturnType<typeof vi.fn>;
    toggleEventFeatured: ReturnType<typeof vi.fn>;
    sendEventFeedback: ReturnType<typeof vi.fn>;
    changeUserRole: ReturnType<typeof vi.fn>;
    changeUserStatus: ReturnType<typeof vi.fn>;
    releaseSettlementPayout: ReturnType<typeof vi.fn>;
    sendBroadcast: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    mockAuthService = { logout: vi.fn() };
    mockHostAppService = { setPrototypeState: vi.fn() };
    mockToastService = { info: vi.fn() };

    mockAdminService = {
      loadAll: vi.fn(),
      hostApplications: signal<AdminHostApplication[]>([]),
      curationEvents: signal<AdminCurationEvent[]>([]),
      users: signal<AdminUser[]>([]),
      settlements: signal<AdminSettlement[]>([]),
      financialMetrics: signal({
        totalGMV: 500000,
        totalPlatformCommission: 25000,
        pendingPayouts: 150000,
        settledPayouts: 325000,
        takeRatePercentage: 5.0
      }),
      approveHostApplication: vi.fn().mockResolvedValue(true),
      rejectHostApplication: vi.fn().mockResolvedValue(true),
      requestMoreHostInfo: vi.fn().mockResolvedValue(true),
      approveEvent: vi.fn().mockResolvedValue(true),
      delistEvent: vi.fn().mockResolvedValue(true),
      toggleEventFeatured: vi.fn().mockResolvedValue(true),
      sendEventFeedback: vi.fn().mockResolvedValue(true),
      changeUserRole: vi.fn().mockResolvedValue(true),
      changeUserStatus: vi.fn().mockResolvedValue(true),
      releaseSettlementPayout: vi.fn().mockResolvedValue(true),
      sendBroadcast: vi.fn().mockResolvedValue(true)
    };

    if (typeof window !== 'undefined') {
      window.scrollTo = vi.fn();
    }

    await TestBed.configureTestingModule({
      imports: [AdminLayoutComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: mockAuthService },
        { provide: HostApplicationService, useValue: mockHostAppService },
        { provide: ToastService, useValue: mockToastService },
        { provide: AdminService, useValue: mockAdminService }
      ]
    }).compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture = TestBed.createComponent(AdminLayoutComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should initialize and load all admin state on ngOnInit', () => {
    expect(mockAdminService.loadAll).toHaveBeenCalled();
    expect(component.currentView()).toBe('overview');
  });

  it('should switch navigation views via setView', () => {
    component.setView('host_applications');
    expect(component.currentView()).toBe('host_applications');

    component.setView('finance');
    expect(component.currentView()).toBe('finance');
  });

  it('should toggle mobile navigation state', () => {
    expect(component.isMobileNavOpen()).toBe(false);
    component.toggleMobileNav();
    expect(component.isMobileNavOpen()).toBe(true);
    component.toggleMobileNav();
    expect(component.isMobileNavOpen()).toBe(false);
  });

  it('should manage broadcast modal state and submit broadcasts', async () => {
    expect(component.showBroadcastModal()).toBe(false);
    component.openBroadcastModal();
    expect(component.showBroadcastModal()).toBe(true);

    await component.sendBroadcast({ title: 'System Notice', body: 'Maintenance in 1 hour' });
    expect(mockAdminService.sendBroadcast).toHaveBeenCalledWith('System Notice', 'Maintenance in 1 hour');
    expect(component.showBroadcastModal()).toBe(false);
  });

  it('should open and close host application modal', () => {
    const dummyApp: AdminHostApplication = {
      id: 'app-99',
      applicantName: 'Sarah',
      organizationName: 'SoundWave',
      organizationType: 'Agency',
      city: 'Delhi',
      expectedScale: 'Large',
      primaryCategories: ['Music'],
      pastExperience: '10 years',
      idDocName: 'license.pdf',
      email: 'sarah@soundwave.com',
      phone: '9876543210',
      submittedDate: '2026-11-01',
      submittedAt: '2026-11-01',
      status: 'under_review'
    };

    component.openAppDetailsModal(dummyApp);
    expect(component.selectedAppForModal()).toEqual(dummyApp);

    component.closeAppDetailsModal();
    expect(component.selectedAppForModal()).toBeNull();
  });

  it('should execute confirmation dialog flow for destructive and positive actions', async () => {
    let actionExecuted = false;
    component.triggerConfirm(
      'Delist Event?',
      'Are you sure you want to delist?',
      'Delist',
      true,
      () => { actionExecuted = true; }
    );

    expect(component.showConfirmationDialog()).toBe(true);
    expect(component.confirmDialogData.title).toBe('Delist Event?');
    expect(component.confirmDialogData.isDestructive).toBe(true);

    await component.executeConfirmAction();
    expect(actionExecuted).toBe(true);
    expect(component.showConfirmationDialog()).toBe(false);
  });

  it('should cancel confirmation dialog without executing pending action', () => {
    let actionExecuted = false;
    component.triggerConfirm(
      'Test Confirm',
      'Test message',
      'Confirm',
      false,
      () => { actionExecuted = true; }
    );

    component.cancelConfirm();
    expect(actionExecuted).toBe(false);
    expect(component.showConfirmationDialog()).toBe(false);
  });

  it('should sign out and redirect to login page', () => {
    component.signOut();
    expect(mockAuthService.logout).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
  });
});
