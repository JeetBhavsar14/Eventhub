import { Injectable, inject, signal, computed } from '@angular/core';
import { ApiClient } from '@core/api';
import { ManagementStaffMember, EventItem } from '@core/models';

interface MonitoredEventSource extends EventItem {
  hostName?: string;
  organization?: string;
}

export interface ManagementMonitoredEvent {
  id: string;
  title: string;
  hostName: string;
  organization: string;
  venue: string;
  capacity: number;
  bookedCount: number;
  revenue: number;
  opsStatus: 'smooth' | 'high_demand';
  managerInCharge: string;
  delegationStatus: 'active' | 'temporary';
}

export interface ManagementGateStatus {
  gate: string;
  staffAssigned: string;
  throughputPerHour: number;
  status: 'normal' | 'crowded' | 'hold';
}

export type { ManagementStaffMember };

@Injectable({
  providedIn: 'root'
})
export class ManagementService {
  private api = inject(ApiClient);

  readonly monitoredEvents = signal<ManagementMonitoredEvent[]>([]);
  readonly staffRoster = signal<ManagementStaffMember[]>([]);
  readonly gateStatuses = signal<ManagementGateStatus[]>([
    { gate: 'Gate 1 — Main Turnstiles', staffAssigned: 'Karan Malhotra', throughputPerHour: 280, status: 'normal' },
    { gate: 'Gate 2 — VIP FastPass', staffAssigned: 'Ananya Joshi', throughputPerHour: 140, status: 'normal' },
    { gate: 'Gate 3 — Media & Backstage', staffAssigned: 'Vikram Seth', throughputPerHour: 45, status: 'normal' },
    { gate: 'Gate 4 — General East', staffAssigned: 'Pooja Hegde', throughputPerHour: 320, status: 'crowded' }
  ]);
  readonly isLoading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  // Computed summary metrics for delegated operations
  readonly totalDelegatedEvents = computed(() => this.monitoredEvents().length);
  readonly totalOnDutyStaff = computed(() => this.staffRoster().filter(s => s.status === 'on_duty').length);
  readonly totalAdmissionsMonitored = computed(() =>
    this.monitoredEvents().reduce((acc, ev) => acc + ev.bookedCount, 0)
  );

  async loadAll(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      const [eventsRes, staffRes] = await Promise.all([
        this.api.get<MonitoredEventSource[]>('/events'),
        this.api.get<ManagementStaffMember[]>('/staffRoster')
      ]);

      const firstError = eventsRes.error || staffRes.error;
      if (firstError) {
        this.error.set(firstError.userMessage);
      }

      if (eventsRes.data) {
        // Events specifically delegated by Event Owners to this Management operations desk
        const mappedMonitored: ManagementMonitoredEvent[] = eventsRes.data.slice(0, 4).map((e: MonitoredEventSource, idx: number) => ({
          id: e.id,
          title: e.title,
          hostName: e.hostName || 'Riya Mehta (Event Owner)',
          organization: e.organization || 'Starlight Live Experiences',
          venue: e.location?.venue || 'Bandra Fort Amphitheatre, Mumbai',
          capacity: e.capacity || 2000,
          bookedCount: Math.floor((e.capacity || 2000) * (0.65 + (idx * 0.08))),
          revenue: (e.ticketTypes?.[0]?.price || 999) * Math.floor((e.capacity || 2000) * 0.75),
          opsStatus: idx === 0 ? 'high_demand' : 'smooth',
          managerInCharge: 'Rhea Kapoor (Operations Lead)',
          delegationStatus: 'active'
        }));
        this.monitoredEvents.set(mappedMonitored);
      }

      if (staffRes.data) {
        this.staffRoster.set(staffRes.data);
      }
    } catch (err: unknown) {
      const apiErr = err as { userMessage?: string } | null;
      this.error.set(apiErr?.userMessage || 'An unexpected error occurred. Please try again.');
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Operations duty assignment for on-ground staff
   */
  async updateStaffAssignment(staffId: string, assignedGate: string, status: 'on_duty' | 'break' | 'off_duty'): Promise<boolean> {
    const res = await this.api.patch<ManagementStaffMember>(`/staffRoster/${staffId}`, { assignedGate, status });
    if (res.error) {
      return false;
    }
    this.staffRoster.update(list =>
      list.map(s => s.id === staffId ? { ...s, assignedGate, status } : s)
    );
    return true;
  }
}
