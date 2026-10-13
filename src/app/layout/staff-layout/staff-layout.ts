import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '@core/auth';
import { StaffService, StaffAttendee, StaffIncident } from '@core/state';

export type StaffTab = 'today' | 'checkin' | 'attendees' | 'issues';
export type ScanOutcome = 'idle' | 'valid' | 'invalid' | 'duplicate';

@Component({
  selector: 'app-staff-layout',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './staff-layout.html',
  styleUrl: './staff-layout.css'
})
export class StaffLayoutComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  readonly staffService = inject(StaffService);

  // Active Bottom Tab (Mobile-first)
  activeTab = signal<StaffTab>('checkin');

  // Active Event Context
  readonly currentEvent = this.staffService.currentEvent;

  // Ticket Validation Scanner Simulator
  ticketSearchInput = signal('');
  validationOutcome = signal<ScanOutcome>('idle');
  validationResult = signal<{
    name: string;
    orderId: string;
    tier: string;
    tickets: number;
    wristband: string;
    isVIP: boolean;
    time?: string;
    message: string;
  } | null>(null);

  // Search & Filter in Attendees
  attendeeSearch = signal('');
  attendeeFilter = signal<'all' | 'pending' | 'checked_in'>('all');

  // Incident Logging
  showIncidentForm = signal(false);
  newIncidentCategory = signal('Lost Wristband');
  newIncidentNote = signal('');

  // Toast System
  toastMessage = signal<string | null>(null);

  // Expose signals from StaffService
  readonly attendees = this.staffService.attendees;
  readonly incidents = this.staffService.incidents;

  // Real-time Gate Admission Progress
  admissionStats = computed(() => {
    const list = this.attendees();
    const checked = list.filter(a => a.checkInStatus === 'checked_in').reduce((acc, a) => acc + a.ticketsCount, 0);
    const total = list.reduce((acc, a) => acc + a.ticketsCount, 0) || 10;
    const percent = Math.min(100, Math.round((checked / total) * 100));
    return {
      checked,
      total,
      percent,
      remaining: Math.max(0, total - checked)
    };
  });

  // Filtered Attendees for Search / List
  filteredAttendees = computed(() => {
    const list = this.attendees();
    const q = this.attendeeSearch().toLowerCase().trim();
    const f = this.attendeeFilter();

    return list.filter(a => {
      let matchFilter = true;
      if (f === 'pending') matchFilter = a.checkInStatus === 'pending';
      if (f === 'checked_in') matchFilter = a.checkInStatus === 'checked_in';

      const matchQuery =
        !q ||
        a.name?.toLowerCase().includes(q) ||
        a.orderId?.toLowerCase().includes(q);

      return matchFilter && matchQuery;
    });
  });

  ngOnInit() {
    this.staffService.loadAll();
  }

  setTab(tab: StaffTab) {
    this.activeTab.set(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Fast Pass Scanner Simulator
  verifyPass(codeOrOrder?: string) {
    const target = (codeOrOrder || this.ticketSearchInput()).trim().toUpperCase();
    if (!target) return;

    const found = this.attendees().find(
      a => a.orderId.toUpperCase() === target || a.name.toUpperCase().includes(target) || a.id.toUpperCase() === target
    );

    const nowTime = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    if (found) {
      if (found.checkInStatus === 'checked_in') {
        this.validationOutcome.set('duplicate');
        this.validationResult.set({
          name: found.name,
          orderId: found.orderId,
          tier: found.ticketTier,
          tickets: found.ticketsCount,
          wristband: found.wristbandColor,
          isVIP: found.isVIP,
          time: found.checkInTime || nowTime,
          message: `ALREADY SCANNED at ${found.checkInTime || nowTime}. Duplicate pass rejected.`
        });
      } else {
        this.checkInAttendee(found.id);
        this.validationOutcome.set('valid');
        this.validationResult.set({
          name: found.name,
          orderId: found.orderId,
          tier: found.ticketTier,
          tickets: found.ticketsCount,
          wristband: found.wristbandColor,
          isVIP: found.isVIP,
          time: nowTime,
          message: `VALID TICKET — Issue ${found.ticketsCount}x [${found.wristbandColor}] Wristband.`
        });
        this.showToast(`Valid Ticket: ${found.name} (${found.ticketsCount} admissions)`);
      }
    } else {
      this.validationOutcome.set('invalid');
      this.validationResult.set({
        name: 'Unrecognized Pass',
        orderId: target,
        tier: 'Unverified',
        tickets: 0,
        wristband: 'None',
        isVIP: false,
        message: 'Pass barcode not found in this event database.'
      });
    }

    this.ticketSearchInput.set('');
  }

  async checkInAttendee(attendeeId: string) {
    const nowTime = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    await this.staffService.checkInAttendee(attendeeId, nowTime);
  }

  async undoCheckIn(attendeeId: string) {
    await this.staffService.undoCheckIn(attendeeId);
    this.showToast('Check-in reversed to pending.');
  }

  resetScanResult() {
    this.validationOutcome.set('idle');
    this.validationResult.set(null);
  }

  // Incident Logging Actions
  async submitIncidentReport() {
    if (this.newIncidentNote().trim()) {
      await this.staffService.reportIncident(this.newIncidentCategory(), this.newIncidentNote().trim());
      this.newIncidentNote.set('');
      this.showIncidentForm.set(false);
      this.showToast('Incident logged and dispatched to Operations Lead.');
    }
  }

  // Toast System
  showToast(msg: string) {
    this.toastMessage.set(msg);
    setTimeout(() => {
      this.toastMessage.set(null);
    }, 3200);
  }

  signOut() {
    this.authService.logout();
    this.router.navigate(['/discover']);
  }
}
