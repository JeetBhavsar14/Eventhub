import { Injectable, inject, signal } from '@angular/core';
import { ApiClient } from '@core/api';
import { ManagementApprovalItem, ManagementHostReviewItem, ManagementStaffMember } from '@core/models';

export interface ManagementMonitoredEvent {
  id: string;
  title: string;
  venue: string;
  capacity: number;
  bookedCount: number;
  revenue: number;
  opsStatus: 'smooth' | 'high_demand';
  managerInCharge: string;
}

export type { ManagementApprovalItem, ManagementHostReviewItem, ManagementStaffMember };

@Injectable({
  providedIn: 'root'
})
export class ManagementService {
  private api = inject(ApiClient);

  readonly approvalsQueue = signal<ManagementApprovalItem[]>([]);
  readonly hostApplications = signal<ManagementHostReviewItem[]>([]);
  readonly monitoredEvents = signal<ManagementMonitoredEvent[]>([]);
  readonly staffRoster = signal<ManagementStaffMember[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  async loadAll(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      const [approvalsRes, hostAppsRes, eventsRes, staffRes] = await Promise.all([
        this.api.get<ManagementApprovalItem[]>('/eventApprovals'),
        this.api.get<any[]>('/hostApplications'),
        this.api.get<any[]>('/events'),
        this.api.get<ManagementStaffMember[]>('/staffRoster')
      ]);

      if (approvalsRes.data) {
        this.approvalsQueue.set(approvalsRes.data);
      }

      if (hostAppsRes.data) {
        const mappedHosts: ManagementHostReviewItem[] = hostAppsRes.data.map((h: any) => ({
          id: h.id,
          applicantName: h.applicantName,
          email: h.email,
          phone: h.phone,
          organizationName: h.organizationName,
          city: h.city,
          scale: h.scale || h.expectedScale || '500 – 2,500 attendees',
          experience: h.experience || h.pastExperience || 'Experienced event organizer',
          docStatus: h.docStatus || 'verified',
          assignedReviewer: h.assignedReviewer || 'Rhea Kapoor (Operations Lead)',
          status: h.status || 'under_review',
          submittedDate: h.submittedDate || '2026-10-08'
        }));
        this.hostApplications.set(mappedHosts);
      }

      if (eventsRes.data) {
        const mappedMonitored: ManagementMonitoredEvent[] = eventsRes.data.slice(0, 4).map((e: any, idx: number) => ({
          id: e.id,
          title: e.title,
          venue: e.location?.venue || 'Bandra Fort Amphitheatre, Mumbai',
          capacity: e.capacity || 2000,
          bookedCount: Math.floor((e.capacity || 2000) * (0.65 + (idx * 0.08))),
          revenue: (e.ticketTypes?.[0]?.price || 999) * Math.floor((e.capacity || 2000) * 0.75),
          opsStatus: idx === 0 ? 'high_demand' : 'smooth',
          managerInCharge: idx % 2 === 0 ? 'Rhea Kapoor' : 'Vikram Seth'
        }));
        this.monitoredEvents.set(mappedMonitored);
      }

      if (staffRes.data) {
        this.staffRoster.set(staffRes.data);
      }
    } catch (err: any) {
      this.error.set(err?.message || 'Failed to load management workspace data');
    } finally {
      this.isLoading.set(false);
    }
  }

  async approveEvent(submissionId: string): Promise<boolean> {
    await this.api.patch(`/eventApprovals/${submissionId}`, { status: 'approved' });
    this.approvalsQueue.update(list =>
      list.map(item => item.id === submissionId ? { ...item, status: 'approved' } : item)
    );
    return true;
  }

  async requestChangesOnEvent(submissionId: string, note?: string): Promise<boolean> {
    await this.api.patch(`/eventApprovals/${submissionId}`, { status: 'changes_requested' });
    this.approvalsQueue.update(list =>
      list.map(item => item.id === submissionId ? { ...item, status: 'changes_requested' } : item)
    );
    return true;
  }

  async approveHostApplication(hostId: string): Promise<boolean> {
    await this.api.patch(`/hostApplications/${hostId}`, { status: 'approved' });
    this.hostApplications.update(list =>
      list.map(h => h.id === hostId ? { ...h, status: 'approved' } : h)
    );
    return true;
  }
}
