import { Injectable, computed, inject, signal } from '@angular/core';
import { ApiClient } from '@core/api';
import { AdminHostApplication, AdminCurationEvent, AdminUser, AdminBroadcast, AdminSettlement, EventItem, User } from '@core/models';

interface StoredAdminEvent extends EventItem {
  hostName?: string;
  organization?: string;
}
interface StoredAdminUser extends User {
  status?: AdminUser['status'];
  avatar?: string;
  totalBookings?: number;
}

export type { AdminHostApplication, AdminCurationEvent, AdminUser, AdminBroadcast, AdminSettlement };

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private api = inject(ApiClient);

  readonly hostApplications = signal<AdminHostApplication[]>([]);
  readonly curationEvents = signal<AdminCurationEvent[]>([]);
  readonly users = signal<AdminUser[]>([]);
  readonly broadcasts = signal<AdminBroadcast[]>([]);
  readonly settlements = signal<AdminSettlement[]>([
    {
      id: 'stl-101',
      eventId: 'evt-100',
      eventTitle: 'Mumbai Festivals Showcase 1',
      hostName: 'Riya Mehta',
      organization: 'Starlight Live Experiences',
      grossAmount: 420000,
      platformCommission: 21000, // 5%
      netPayout: 399000,
      status: 'pending',
      bankAccount: 'HDFC Bank •••• 4821',
      requestedDate: '2026-10-14'
    },
    {
      id: 'stl-102',
      eventId: 'evt-101',
      eventTitle: 'Ahmedabad Tech Innovation Summit',
      hostName: 'Vikram Joshi',
      organization: 'TechVision Gujarat',
      grossAmount: 285000,
      platformCommission: 14250, // 5%
      netPayout: 270750,
      status: 'settled',
      bankAccount: 'ICICI Bank •••• 9912',
      requestedDate: '2026-10-10',
      settledDate: '2026-10-12'
    },
    {
      id: 'stl-103',
      eventId: 'evt-102',
      eventTitle: 'Soulful Sufi & Ghazal Night',
      hostName: 'Kabir Khan',
      organization: 'Heritage Cultural Foundation',
      grossAmount: 180000,
      platformCommission: 9000, // 5%
      netPayout: 171000,
      status: 'on_hold',
      bankAccount: 'Axis Bank •••• 1104',
      requestedDate: '2026-10-15'
    }
  ]);

  readonly isLoading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  // Financial Computations
  readonly financialMetrics = computed(() => {
    const list = this.settlements();
    const totalGMV = list.reduce((sum, s) => sum + s.grossAmount, 0);
    const totalPlatformCommission = list.reduce((sum, s) => sum + s.platformCommission, 0);
    const pendingPayouts = list
      .filter(s => s.status === 'pending')
      .reduce((sum, s) => sum + s.netPayout, 0);
    const settledPayouts = list
      .filter(s => s.status === 'settled')
      .reduce((sum, s) => sum + s.netPayout, 0);

    return {
      totalGMV,
      totalPlatformCommission,
      pendingPayouts,
      settledPayouts,
      takeRatePercentage: 5.0
    };
  });

  async loadAll(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      const [appsRes, eventsRes, usersRes, bcRes] = await Promise.all([
        this.api.get<AdminHostApplication[]>('/hostApplications'),
        this.api.get<StoredAdminEvent[]>('/events'),
        this.api.get<StoredAdminUser[]>('/users'),
        this.api.get<AdminBroadcast[]>('/broadcasts')
      ]);

      const firstError = appsRes.error || eventsRes.error || usersRes.error || bcRes.error;
      if (firstError) {
        this.error.set(firstError.userMessage);
      }

      if (appsRes.data) {
        const mappedApps = appsRes.data.map((a: AdminHostApplication) => ({
          ...a,
          submittedAt: a.submittedAt || a.submittedDate || 'Recently'
        }));
        this.hostApplications.set(mappedApps);
      }

      if (eventsRes.data) {
        const mappedEvents: AdminCurationEvent[] = eventsRes.data.map((e: StoredAdminEvent) => ({
          id: e.id,
          title: e.title,
          hostName: e.hostName || (e.location?.city ? `${e.location.city} Organizer` : 'Event Producer'),
          organization: e.organization || 'Independent Production',
          city: e.location?.city || 'Mumbai',
          venue: e.location?.venue || 'Venue TBD',
          date: e.date || 'Upcoming 2026',
          capacity: e.capacity || 1000,
          ticketPrice: e.ticketTypes?.[0]?.price ?? 0,
          soundPermitUploaded: true,
          venuePermitUploaded: true,
          status: e.status === 'published' ? 'approved' : e.status === 'cancelled' ? 'rejected' : 'pending_review',
          isFeatured: !!e.isFeatured,
          imageUrl: e.thumbnailUrl || 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&w=800&q=80'
        }));
        this.curationEvents.set(mappedEvents);
      }

      if (usersRes.data) {
        const mappedUsers: AdminUser[] = usersRes.data.map((u: StoredAdminUser) => ({
          id: u.id,
          name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email.split('@')[0],
          email: u.email,
          phone: u.phone || '+91 98000 00000',
          role: (u.platformRole === 'super_admin' ? 'admin' : (u.platformRole || (u.isHost ? 'host' : 'user'))) as AdminUser['role'],
          status: u.status || 'active',
          avatar: u.avatar || u.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.email}`,
          joinedDate: u.createdAt ? new Date(u.createdAt).toISOString().split('T')[0] : '2025-01-01',
          totalSpent: u.platformRole === 'admin' ? 0 : 4200,
          totalBookings: u.totalBookings ?? 3,
          isHost: !!u.isHost
        }));
        this.users.set(mappedUsers);
      }

      if (bcRes.data) {
        this.broadcasts.set(bcRes.data);
      }
    } catch (err: unknown) {
      const apiErr = err as { userMessage?: string } | null;
      this.error.set(apiErr?.userMessage || 'An unexpected error occurred. Please try again.');
    } finally {
      this.isLoading.set(false);
    }
  }

  async approveHostApplication(appId: string): Promise<boolean> {
    const app = this.hostApplications().find(a => a.id === appId);
    const res = await this.api.patch<AdminHostApplication>(`/hostApplications/${appId}`, {
      status: 'approved'
    });
    if (res.data || !res.error) {
      this.hostApplications.update(list =>
        list.map(a => a.id === appId ? { ...a, status: 'approved' } : a)
      );

      // Also promote user in users array if found by email
      if (app?.email) {
        const existingUser = this.users().find(u => u.email === app.email);
        if (existingUser) {
          await this.changeUserRole(existingUser.id, 'host');
        }
      }
      return true;
    }
    return false;
  }

  async rejectHostApplication(appId: string): Promise<boolean> {
    const res = await this.api.patch<AdminHostApplication>(`/hostApplications/${appId}`, {
      status: 'rejected'
    });
    if (res.data || !res.error) {
      this.hostApplications.update(list =>
        list.map(a => a.id === appId ? { ...a, status: 'rejected' } : a)
      );
      return true;
    }
    return false;
  }

  async requestMoreHostInfo(appId: string): Promise<boolean> {
    const res = await this.api.patch<AdminHostApplication>(`/hostApplications/${appId}`, {
      status: 'changes_requested'
    });
    if (res.data || !res.error) {
      this.hostApplications.update(list =>
        list.map(a => a.id === appId ? { ...a, status: 'changes_requested' } : a)
      );
      return true;
    }
    return false;
  }

  async approveEvent(eventId: string): Promise<boolean> {
    const res = await this.api.patch(`/events/${eventId}`, { status: 'published' });
    if (res.error) return false;
    this.curationEvents.update(list =>
      list.map(e => e.id === eventId ? { ...e, status: 'approved' } : e)
    );
    return true;
  }

  async delistEvent(eventId: string): Promise<boolean> {
    const res = await this.api.patch(`/events/${eventId}`, { status: 'rejected' });
    if (res.error) return false;
    this.curationEvents.update(list =>
      list.map(e => e.id === eventId ? { ...e, status: 'rejected' } : e)
    );
    return true;
  }

  async toggleEventFeatured(eventId: string): Promise<boolean> {
    const ev = this.curationEvents().find(e => e.id === eventId);
    if (!ev) return false;
    const nextVal = !ev.isFeatured;
    const res = await this.api.patch(`/events/${eventId}`, { isFeatured: nextVal });
    if (res.error) return false;
    this.curationEvents.update(list =>
      list.map(e => e.id === eventId ? { ...e, isFeatured: nextVal } : e)
    );
    return true;
  }

  submitEventChangeRequest(eventId: string, updatedData: Partial<AdminCurationEvent>) {
    this.curationEvents.update(list => {
      const existing = list.find(e => e.id === eventId);
      if (existing) {
        return list.map(e => e.id === eventId ? {
          ...e,
          ...updatedData,
          status: 'pending_review'
        } : e);
      } else {
        const newCuration: AdminCurationEvent = {
          id: eventId,
          title: updatedData.title || 'Updated Event',
          hostName: updatedData.hostName || 'Host Producer',
          organization: updatedData.organization || 'Independent Production',
          city: updatedData.city || 'Mumbai',
          venue: updatedData.venue || 'Venue TBD',
          date: updatedData.date || 'Upcoming 2026',
          capacity: updatedData.capacity || 100,
          ticketPrice: updatedData.ticketPrice ?? 0,
          soundPermitUploaded: true,
          venuePermitUploaded: true,
          status: 'pending_review',
          isFeatured: false,
          imageUrl: updatedData.imageUrl || 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&w=800&q=80'
        };
        return [newCuration, ...list];
      }
    });
  }

  async sendEventFeedback(eventId: string, feedback: string): Promise<boolean> {
    const res = await this.api.patch(`/events/${eventId}`, {
      status: 'pending_review',
      adminFeedback: feedback
    });
    if (res.error) return false;
    this.curationEvents.update(list =>
      list.map(e => e.id === eventId ? { ...e, status: 'changes_requested' } : e)
    );
    return true;
  }

  async changeUserRole(userId: string, newRole: AdminUser['role']): Promise<boolean> {
    const res = await this.api.patch(`/users/${userId}`, {
      platformRole: newRole,
      isHost: newRole === 'host'
    });
    if (res.error) return false;
    this.users.update(list =>
      list.map(u => u.id === userId ? { ...u, role: newRole, isHost: newRole === 'host' } : u)
    );
    return true;
  }

  async changeUserStatus(userId: string, newStatus: 'active' | 'suspended'): Promise<boolean> {
    const res = await this.api.patch(`/users/${userId}`, { status: newStatus });
    if (res.error) return false;
    this.users.update(list =>
      list.map(u => u.id === userId ? { ...u, status: newStatus } : u)
    );
    return true;
  }

  async releaseSettlementPayout(settlementId: string): Promise<boolean> {
    const now = new Date().toISOString().split('T')[0];
    this.settlements.update(list =>
      list.map(s => s.id === settlementId ? { ...s, status: 'settled', settledDate: now } : s)
    );
    return true;
  }

  async sendBroadcast(title: string, body: string): Promise<boolean> {
    const newBc: AdminBroadcast = {
      id: `bc-${Date.now()}`,
      title,
      body,
      audience: 'all',
      sentAt: new Date().toISOString()
    };
    const res = await this.api.post<AdminBroadcast>('/broadcasts', newBc);
    if (res.data) {
      this.broadcasts.update(list => [res.data!, ...list]);
      return true;
    }
    return false;
  }
}
