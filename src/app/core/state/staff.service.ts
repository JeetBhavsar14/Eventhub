import { Injectable, inject, signal } from '@angular/core';
import { ApiClient } from '@core/api';
import { StaffAttendee, StaffIncident, StaffRosterItem } from '@core/models';

export interface StaffEventDuty {
  title: string;
  venue: string;
  gate: string;
  startTime: string;
  endTime: string;
  roleDuty: string;
}

export type { StaffAttendee, StaffIncident, StaffRosterItem };

@Injectable({
  providedIn: 'root'
})
export class StaffService {
  private api = inject(ApiClient);

  readonly currentEvent = signal<StaffEventDuty>({
    title: 'Sunwave Sunset Electronic Fest 2026',
    venue: 'Bandra Fort Amphitheatre, Mumbai',
    gate: 'Gate 2 — Turnstile B',
    startTime: '16:00',
    endTime: '23:30',
    roleDuty: 'Primary Barcode Scanner & VIP Wristband Verification'
  });

  readonly attendees = signal<StaffAttendee[]>([]);
  readonly incidents = signal<StaffIncident[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  async loadAll(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      const [attendeesRes, incidentsRes] = await Promise.all([
        this.api.get<StaffAttendee[]>('/attendees'),
        this.api.get<StaffIncident[]>('/staffIncidents')
      ]);

      if (attendeesRes.data) {
        this.attendees.set(attendeesRes.data);
      }
      if (incidentsRes.data) {
        this.incidents.set(incidentsRes.data);
      }
    } catch (err: any) {
      this.error.set(err?.message || 'Failed to load staff roster data');
    } finally {
      this.isLoading.set(false);
    }
  }

  async checkInAttendee(attendeeId: string, checkInTime: string): Promise<boolean> {
    await this.api.patch(`/attendees/${attendeeId}`, {
      checkInStatus: 'checked_in',
      checkInTime
    });
    this.attendees.update(list =>
      list.map(a => a.id === attendeeId ? { ...a, checkInStatus: 'checked_in', checkInTime } : a)
    );
    return true;
  }

  async undoCheckIn(attendeeId: string): Promise<boolean> {
    await this.api.patch(`/attendees/${attendeeId}`, {
      checkInStatus: 'pending',
      checkInTime: null
    });
    this.attendees.update(list =>
      list.map(a => a.id === attendeeId ? { ...a, checkInStatus: 'pending', checkInTime: null } : a)
    );
    return true;
  }

  async reportIncident(category: string, description: string): Promise<boolean> {
    const newInc: StaffIncident = {
      id: `inc-${Date.now()}`,
      category,
      description,
      time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      status: 'dispatched'
    };

    const res = await this.api.post<StaffIncident>('/staffIncidents', newInc);
    if (res.data) {
      this.incidents.update(list => [res.data!, ...list]);
      return true;
    }
    return false;
  }
}
