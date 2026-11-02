import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { AdminService } from './admin.service';
import { ApiClient } from '@core/api';
import { AdminHostApplication, AdminUser } from '@core/models';

describe('AdminService', () => {
  let service: AdminService;
  let mockApiClient: {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
    patch: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockApiClient = {
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        AdminService,
        { provide: ApiClient, useValue: mockApiClient }
      ]
    });

    service = TestBed.inject(AdminService);
  });

  it('should compute financial metrics from initial settlements', () => {
    const metrics = service.financialMetrics();
    expect(metrics.totalGMV).toBe(885000);
    expect(metrics.totalPlatformCommission).toBe(44250);
    expect(metrics.pendingPayouts).toBe(399000);
    expect(metrics.settledPayouts).toBe(270750);
    expect(metrics.takeRatePercentage).toBe(5.0);
  });

  it('should load all admin entities and map them to signals', async () => {
    mockApiClient.get
      .mockResolvedValueOnce({
        data: [
          {
            id: 'app-1',
            applicantName: 'Alice',
            organizationName: 'Wonderland Ent',
            email: 'alice@example.com',
            status: 'under_review'
          }
        ]
      })
      .mockResolvedValueOnce({
        data: [
          {
            id: 'evt-1',
            title: 'Rock Concert',
            status: 'published',
            isFeatured: true,
            location: { city: 'Mumbai', venue: 'Arena' }
          }
        ]
      })
      .mockResolvedValueOnce({
        data: [
          {
            id: 'u-1',
            email: 'user1@example.com',
            firstName: 'Bob',
            lastName: 'Builder',
            platformRole: 'host',
            status: 'active'
          }
        ]
      })
      .mockResolvedValueOnce({
        data: [
          {
            id: 'bc-1',
            title: 'Maintenance',
            body: 'Tonight at midnight',
            audience: 'all',
            sentAt: '2026-11-01'
          }
        ]
      });

    await service.loadAll();

    expect(service.hostApplications().length).toBe(1);
    expect(service.hostApplications()[0].applicantName).toBe('Alice');
    expect(service.curationEvents().length).toBe(1);
    expect(service.curationEvents()[0].status).toBe('approved');
    expect(service.users().length).toBe(1);
    expect(service.users()[0].name).toBe('Bob Builder');
    expect(service.broadcasts().length).toBe(1);
  });

  it('should approve host application and promote matching user role', async () => {
    service.hostApplications.set([
      {
        id: 'app-1',
        applicantName: 'Alice',
        organizationName: 'Wonderland Ent',
        organizationType: 'Agency',
        city: 'Mumbai',
        expectedScale: 'Large',
        primaryCategories: ['Music'],
        pastExperience: '10 years',
        idDocName: 'pan.pdf',
        email: 'alice@example.com',
        phone: '9876543210',
        submittedDate: '2026-11-01',
        submittedAt: '2026-11-01',
        status: 'under_review'
      }
    ]);
    service.users.set([
      {
        id: 'u-1',
        name: 'Alice',
        email: 'alice@example.com',
        phone: '9876543210',
        role: 'user',
        status: 'active',
        avatar: '',
        joinedDate: '2026-01-01',
        totalSpent: 100,
        totalBookings: 1,
        isHost: false
      }
    ]);

    mockApiClient.patch.mockResolvedValue({ data: { status: 'approved' } });

    const result = await service.approveHostApplication('app-1');
    expect(result).toBe(true);
    expect(service.hostApplications()[0].status).toBe('approved');
    expect(service.users()[0].role).toBe('host');
  });

  it('should reject host application and update state', async () => {
    service.hostApplications.set([
      {
        id: 'app-2',
        applicantName: 'Dan',
        organizationName: 'Dan Corp',
        organizationType: 'Individual',
        city: 'Delhi',
        expectedScale: 'Small',
        primaryCategories: ['Tech'],
        pastExperience: 'None',
        idDocName: 'id.pdf',
        email: 'dan@example.com',
        phone: '9876543211',
        submittedDate: '2026-11-01',
        submittedAt: '2026-11-01',
        status: 'under_review'
      }
    ]);

    mockApiClient.patch.mockResolvedValueOnce({ data: { status: 'rejected' } });

    const result = await service.rejectHostApplication('app-2');
    expect(result).toBe(true);
    expect(service.hostApplications()[0].status).toBe('rejected');
  });

  it('should request clarification for host application', async () => {
    service.hostApplications.set([
      {
        id: 'app-3',
        applicantName: 'Eve',
        organizationName: 'Eve Shows',
        organizationType: 'Individual',
        city: 'Pune',
        expectedScale: 'Medium',
        primaryCategories: ['Art'],
        pastExperience: 'Some',
        idDocName: 'doc.pdf',
        email: 'eve@example.com',
        phone: '9876543212',
        submittedDate: '2026-11-01',
        submittedAt: '2026-11-01',
        status: 'under_review'
      }
    ]);

    mockApiClient.patch.mockResolvedValueOnce({ data: { status: 'changes_requested' } });

    const result = await service.requestMoreHostInfo('app-3');
    expect(result).toBe(true);
    expect(service.hostApplications()[0].status).toBe('changes_requested');
  });

  it('should approve event and update status to approved', async () => {
    service.curationEvents.set([
      {
        id: 'evt-10',
        title: 'Tech Meetup',
        hostName: 'Organizer',
        organization: 'Org',
        city: 'Bengaluru',
        venue: 'Hall',
        date: '2026-12-01',
        capacity: 200,
        ticketPrice: 500,
        soundPermitUploaded: true,
        venuePermitUploaded: true,
        status: 'pending_review',
        isFeatured: false,
        imageUrl: ''
      }
    ]);

    mockApiClient.patch.mockResolvedValueOnce({ data: { status: 'published' } });

    const result = await service.approveEvent('evt-10');
    expect(result).toBe(true);
    expect(service.curationEvents()[0].status).toBe('approved');
  });

  it('should delist event and update status to rejected', async () => {
    service.curationEvents.set([
      {
        id: 'evt-11',
        title: 'Policy Violating Event',
        hostName: 'Organizer',
        organization: 'Org',
        city: 'Goa',
        venue: 'Beach',
        date: '2026-12-01',
        capacity: 200,
        ticketPrice: 500,
        soundPermitUploaded: true,
        venuePermitUploaded: true,
        status: 'approved',
        isFeatured: false,
        imageUrl: ''
      }
    ]);

    mockApiClient.patch.mockResolvedValueOnce({ data: { status: 'rejected' } });

    const result = await service.delistEvent('evt-11');
    expect(result).toBe(true);
    expect(service.curationEvents()[0].status).toBe('rejected');
  });

  it('should toggle event featured status', async () => {
    service.curationEvents.set([
      {
        id: 'evt-12',
        title: 'Festival',
        hostName: 'Organizer',
        organization: 'Org',
        city: 'Delhi',
        venue: 'Stadium',
        date: '2026-12-01',
        capacity: 5000,
        ticketPrice: 1500,
        soundPermitUploaded: true,
        venuePermitUploaded: true,
        status: 'approved',
        isFeatured: false,
        imageUrl: ''
      }
    ]);

    mockApiClient.patch.mockResolvedValueOnce({ data: { isFeatured: true } });

    const result = await service.toggleEventFeatured('evt-12');
    expect(result).toBe(true);
    expect(service.curationEvents()[0].isFeatured).toBe(true);
  });

  it('should dispatch event feedback and update status to changes_requested', async () => {
    service.curationEvents.set([
      {
        id: 'evt-13',
        title: 'Concert',
        hostName: 'Organizer',
        organization: 'Org',
        city: 'Kolkata',
        venue: 'Park',
        date: '2026-12-01',
        capacity: 1000,
        ticketPrice: 800,
        soundPermitUploaded: true,
        venuePermitUploaded: true,
        status: 'pending_review',
        isFeatured: false,
        imageUrl: ''
      }
    ]);

    mockApiClient.patch.mockResolvedValueOnce({ data: { status: 'pending_review' } });

    const result = await service.sendEventFeedback('evt-13', 'Need fire safety certificate');
    expect(result).toBe(true);
    expect(service.curationEvents()[0].status).toBe('changes_requested');
  });

  it('should change user role and update isHost flag', async () => {
    service.users.set([
      {
        id: 'u-10',
        name: 'Charlie',
        email: 'charlie@example.com',
        phone: '9876543210',
        role: 'user',
        status: 'active',
        avatar: '',
        joinedDate: '2026-01-01',
        totalSpent: 50,
        totalBookings: 1,
        isHost: false
      }
    ]);

    mockApiClient.patch.mockResolvedValueOnce({ data: { platformRole: 'host', isHost: true } });

    const result = await service.changeUserRole('u-10', 'host');
    expect(result).toBe(true);
    expect(service.users()[0].role).toBe('host');
    expect(service.users()[0].isHost).toBe(true);
  });

  it('should change user status to suspended', async () => {
    service.users.set([
      {
        id: 'u-11',
        name: 'Spammer',
        email: 'spam@example.com',
        phone: '9876543210',
        role: 'user',
        status: 'active',
        avatar: '',
        joinedDate: '2026-01-01',
        totalSpent: 0,
        totalBookings: 0,
        isHost: false
      }
    ]);

    mockApiClient.patch.mockResolvedValueOnce({ data: { status: 'suspended' } });

    const result = await service.changeUserStatus('u-11', 'suspended');
    expect(result).toBe(true);
    expect(service.users()[0].status).toBe('suspended');
  });

  it('should release settlement payout and mark it settled', async () => {
    const result = await service.releaseSettlementPayout('stl-101');
    expect(result).toBe(true);
    const settled = service.settlements().find(s => s.id === 'stl-101');
    expect(settled?.status).toBe('settled');
    expect(settled?.settledDate).toBeDefined();
  });

  it('should post and prepend broadcast message', async () => {
    const newBroadcast = {
      id: 'bc-99',
      title: 'Emergency Drill',
      body: 'All staff report',
      audience: 'all',
      sentAt: '2026-11-02'
    };
    mockApiClient.post.mockResolvedValueOnce({ data: newBroadcast });

    const result = await service.sendBroadcast('Emergency Drill', 'All staff report');
    expect(result).toBe(true);
    expect(service.broadcasts()[0].title).toBe('Emergency Drill');
  });
});

