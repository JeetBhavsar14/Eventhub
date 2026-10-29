import { Injectable, computed, inject, signal } from '@angular/core';
import { ApiClient } from '@core/api';
import { StaffAttendee, StaffIncident, StaffRosterItem, StaffEventDuty, StaffPermission, EventMembership } from '@core/models';
import { AuthService } from '@core/auth';

export type { StaffAttendee, StaffIncident, StaffRosterItem, StaffEventDuty, StaffPermission };

export interface StaffDesignationPreset {
  id: string;
  title: string;
  responsibility: string;
  gate: string;
  roleDuty: string;
  permissions: string[];
}

export const STAFF_DESIGNATION_PRESETS: StaffDesignationPreset[] = [
  {
    id: 'gate_scanner',
    title: 'Gate & Barcode Scanner',
    responsibility: 'ticketing',
    gate: 'Gate 2 — Turnstile B',
    roleDuty: 'Primary Barcode Scanner & VIP Wristband Verification',
    permissions: ['scan_tickets', 'view_attendees', 'view_duty']
  },
  {
    id: 'security_officer',
    title: 'Security & Incident Officer',
    responsibility: 'security_safety',
    gate: 'Perimeter & Rapid Response Post 4',
    roleDuty: 'Crowd Safety Monitoring, Incident Escalation & Zone Patrol',
    permissions: ['log_incidents', 'view_duty']
  },
  {
    id: 'guest_relations',
    title: 'Guest Relations & Info Desk',
    responsibility: 'registration',
    gate: 'Main Concierge & Registration Foyer',
    roleDuty: 'Guest Inquiries, Roster Lookup & VIP Credential Issuance',
    permissions: ['view_attendees', 'view_duty']
  },
  {
    id: 'venue_supervisor',
    title: 'Venue Operations Supervisor',
    responsibility: 'venue_operations',
    gate: 'Central Operations Command',
    roleDuty: 'All-Access Ground Supervisor: Gates, Attendee Roster & Security Dispatches',
    permissions: ['scan_tickets', 'view_attendees', 'log_incidents', 'view_duty']
  }
];

@Injectable({
  providedIn: 'root'
})
export class StaffService {
  private api = inject(ApiClient);
  private authService = inject(AuthService);

  readonly currentDuty = signal<StaffEventDuty>({
    title: 'Sunwave Sunset Electronic Fest 2026',
    venue: 'Bandra Fort Amphitheatre, Mumbai',
    gate: 'Gate 2 — Turnstile B',
    startTime: '16:00',
    endTime: '23:30',
    roleDuty: 'Primary Barcode Scanner & VIP Wristband Verification',
    designation: 'Gate & Barcode Scanner',
    responsibility: 'ticketing',
    permissions: ['scan_tickets', 'view_attendees', 'view_duty']
  });

  // Alias for backward compatibility
  readonly currentEvent = this.currentDuty;

  // Active designation & permission computed signals
  readonly activeDesignation = computed(() => this.currentDuty().designation || 'Event Staff');
  readonly permissions = computed<string[]>(() => this.currentDuty().permissions || ['scan_tickets', 'view_attendees', 'view_duty']);

  // Specific capability checks for layout adaptation
  readonly canScanTickets = computed(() => this.permissions().includes('scan_tickets'));
  readonly canViewAttendees = computed(() => this.permissions().includes('view_attendees'));
  readonly canLogIncidents = computed(() => this.permissions().includes('log_incidents'));
  readonly canViewDuty = computed(() => this.permissions().includes('view_duty') || true);

  readonly attendees = signal<StaffAttendee[]>([]);
  readonly incidents = signal<StaffIncident[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  /**
   * Switches designation and granted permissions dynamically
   */
  setDesignationPreset(presetId: string): void {
    const preset = STAFF_DESIGNATION_PRESETS.find(p => p.id === presetId);
    if (!preset) return;

    this.currentDuty.update(curr => ({
      ...curr,
      designation: preset.title,
      responsibility: preset.responsibility,
      gate: preset.gate,
      roleDuty: preset.roleDuty,
      permissions: [...preset.permissions]
    }));
  }

  async loadAll(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      const user = this.authService.currentUser();
      const [attendeesRes, incidentsRes, membershipsRes] = await Promise.all([
        this.api.get<StaffAttendee[]>('/attendees'),
        this.api.get<StaffIncident[]>('/staffIncidents'),
        user ? this.api.get<EventMembership[]>('/eventMemberships', { email: user.email }) : Promise.resolve({ data: [] as EventMembership[] })
      ]);

      const firstError = attendeesRes.error || incidentsRes.error;
      if (firstError) {
        this.error.set(firstError.userMessage);
      }

      if (attendeesRes.data) {
        this.attendees.set(attendeesRes.data);
      }
      if (incidentsRes.data) {
        this.incidents.set(incidentsRes.data);
      }

      // If active event membership exists for this user, apply their assigned designation and permissions!
      if (membershipsRes.data && membershipsRes.data.length > 0) {
        const staffMem = membershipsRes.data.find(m => m.role === 'staff' || m.role === 'volunteer' || m.role === 'event_manager') || membershipsRes.data[0];
        if (staffMem) {
          this.currentDuty.update(curr => ({
            ...curr,
            designation: staffMem.designation || staffMem.roleName || curr.designation,
            responsibility: staffMem.responsibility || curr.responsibility,
            permissions: (staffMem.permissions && staffMem.permissions.length > 0) ? staffMem.permissions : curr.permissions
          }));
        }
      }
    } catch (err: unknown) {
      const apiErr = err as { userMessage?: string } | null;
      this.error.set(apiErr?.userMessage || 'An unexpected error occurred. Please try again.');
    } finally {
      this.isLoading.set(false);
    }
  }

  async checkInAttendee(attendeeId: string, checkInTime: string): Promise<boolean> {
    const res = await this.api.patch(`/attendees/${attendeeId}`, {
      checkInStatus: 'checked_in',
      checkInTime
    });
    if (res.error) {
      return false;
    }
    this.attendees.update(list =>
      list.map(a => a.id === attendeeId ? { ...a, checkInStatus: 'checked_in', checkInTime } : a)
    );
    return true;
  }

  async undoCheckIn(attendeeId: string): Promise<boolean> {
    const res = await this.api.patch(`/attendees/${attendeeId}`, {
      checkInStatus: 'pending',
      checkInTime: null
    });
    if (res.error) {
      return false;
    }
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
