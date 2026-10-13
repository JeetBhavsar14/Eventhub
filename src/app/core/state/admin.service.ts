import { Injectable, computed, inject, signal } from '@angular/core';
import { ApiClient } from '@core/api';
import { AdminHostApplication, AdminCurationEvent, AdminUser, AdminBroadcast } from '@core/models';

export type { AdminHostApplication, AdminCurationEvent, AdminUser, AdminBroadcast };

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private api = inject(ApiClient);

  readonly hostApplications = signal<AdminHostApplication[]>([]);
  readonly curationEvents = signal<AdminCurationEvent[]>([]);
  readonly users = signal<AdminUser[]>([]);
  readonly broadcasts = signal<AdminBroadcast[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  async loadAll(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      const [appsRes, eventsRes, usersRes, bcRes] = await Promise.all([
        this.api.get<AdminHostApplication[]>('/hostApplications'),
        this.api.get<any[]>('/events'),
        this.api.get<any[]>('/users'),
        this.api.get<AdminBroadcast[]>('/broadcasts')
      ]);

      if (appsRes.data) {
        const mappedApps = appsRes.data.map((a: any) => ({
          ...a,
          submittedAt: a.submittedAt || a.submittedDate || 'Recently'
        }));
        this.hostApplications.set(mappedApps);
      }

      if (eventsRes.data) {
        // Map backend event structure to admin curation view model if needed
        const mappedEvents: AdminCurationEvent[] = eventsRes.data.map((e: any) => ({
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
          status: e.status === 'published' ? 'approved' : 'pending_review',
          imageUrl: e.thumbnailUrl || 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&w=800&q=80'
        }));
        this.curationEvents.set(mappedEvents);
      }

      if (usersRes.data) {
        const mappedUsers: AdminUser[] = usersRes.data.map((u: any) => ({
          id: u.id,
          name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email.split('@')[0],
          email: u.email,
          role: u.platformRole || (u.isHost ? 'host' : 'user'),
          status: u.status || 'active',
          avatar: u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.email}`,
          joinedDate: u.createdAt ? new Date(u.createdAt).toISOString().split('T')[0] : '2025-01-01',
          totalSpent: u.platformRole === 'admin' ? 0 : 4200,
          totalBookings: u.totalBookings ?? 3
        }));
        this.users.set(mappedUsers);
      }

      if (bcRes.data) {
        this.broadcasts.set(bcRes.data);
      }
    } catch (err: any) {
      this.error.set(err?.message || 'Failed to load admin workspace data');
    } finally {
      this.isLoading.set(false);
    }
  }

  async approveHostApplication(appId: string): Promise<boolean> {
    const res = await this.api.patch<AdminHostApplication>(`/hostApplications/${appId}`, {
      status: 'approved'
    });
    if (res.data || !res.error) {
      this.hostApplications.update(list =>
        list.map(a => a.id === appId ? { ...a, status: 'approved' } : a)
      );
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
    this.curationEvents.update(list =>
      list.map(e => e.id === eventId ? { ...e, status: 'approved' } : e)
    );
    return true;
  }

  async sendEventFeedback(eventId: string, feedback: string): Promise<boolean> {
    this.curationEvents.update(list =>
      list.map(e => e.id === eventId ? { ...e, status: 'changes_requested' } : e)
    );
    return true;
  }

  async changeUserRole(userId: string, newRole: AdminUser['role']): Promise<boolean> {
    await this.api.patch(`/users/${userId}`, {
      platformRole: newRole,
      isHost: newRole === 'host'
    });
    this.users.update(list =>
      list.map(u => u.id === userId ? { ...u, role: newRole } : u)
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
