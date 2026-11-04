import { Component, Input, Output, EventEmitter, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HostAttendeeRecord, BookingTicketPass } from '@core/models';
import { IconComponent, PaginationBarComponent } from '@shared/components';

@Component({
  selector: 'app-host-bookings',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, PaginationBarComponent],
  templateUrl: './host-bookings.component.html',
  styleUrl: './host-bookings.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HostBookingsComponent {
  @Input({ required: true }) attendees: HostAttendeeRecord[] = [];

  @Output() exportCsv = new EventEmitter<void>();

  // Search & Filtering State
  searchQuery = signal<string>('');
  statusFilter = signal<'all' | 'confirmed' | 'checked_in' | 'cancelled'>('all');

  // Selected Attendee Record Drawer / Modal State
  selectedRecord = signal<HostAttendeeRecord | null>(null);

  // Copied Ticket Feedback State
  copiedPassId = signal<string | null>(null);

  // Reactive Check-In State by pass identifier & order ID
  checkedInPasses = signal<Record<string, boolean>>({});
  checkedInOrders = signal<Record<string, boolean>>({});

  // Bookings & Attendees Pagination
  bookingsPage = signal(1);
  bookingsPageSize = signal(6);

  // Filtered Attendees
  filteredAttendees = computed(() => {
    const list = this.attendees;
    const query = this.searchQuery().trim().toLowerCase();
    const filter = this.statusFilter();

    return list.filter(item => {
      // 1. Status Filter
      if (filter === 'confirmed') {
        if (item.status === 'cancelled' || this.isOrderCheckedIn(item)) return false;
      } else if (filter === 'checked_in') {
        if (!this.isOrderCheckedIn(item)) return false;
      } else if (filter === 'cancelled') {
        if (item.status !== 'cancelled' && item.checkInStatus !== 'cancelled') return false;
      }

      // 2. Search Query Matching
      if (!query) return true;

      const orderMatch = (item.orderId || '').toLowerCase().includes(query);
      const nameMatch = (item.attendeeName || '').toLowerCase().includes(query);
      const emailMatch = (item.email || '').toLowerCase().includes(query);
      const eventMatch = (item.eventTitle || '').toLowerCase().includes(query);
      const tierMatch = (item.tier || '').toLowerCase().includes(query);

      // Check nested attendee names / ticket passes
      const passes = this.getRecordPasses(item);
      const passMatch = passes.some(p =>
        (p.attendeeName || '').toLowerCase().includes(query) ||
        (p.attendeeEmail || '').toLowerCase().includes(query) ||
        (p.ticketNumber || '').toLowerCase().includes(query)
      );

      return orderMatch || nameMatch || emailMatch || eventMatch || tierMatch || passMatch;
    });
  });

  bookingsTotalPages = computed(() => {
    const total = this.filteredAttendees().length;
    return Math.max(1, Math.ceil(total / this.bookingsPageSize()));
  });

  paginatedAttendees = computed(() => {
    const list = this.filteredAttendees();
    const size = this.bookingsPageSize();
    const maxPage = Math.max(1, Math.ceil(list.length / size));
    const page = Math.min(this.bookingsPage(), maxPage);
    const start = (page - 1) * size;
    return list.slice(start, start + size);
  });

  bookingsPaginationInfo = computed(() => {
    const total = this.filteredAttendees().length;
    if (total === 0) return { start: 0, end: 0, total: 0 };
    const size = this.bookingsPageSize();
    const maxPage = Math.max(1, Math.ceil(total / size));
    const page = Math.min(this.bookingsPage(), maxPage);
    const start = (page - 1) * size + 1;
    const end = Math.min(page * size, total);
    return { start, end, total };
  });

  bookingsPageNumbers = computed(() => {
    const total = this.bookingsTotalPages();
    const current = this.bookingsPage();
    const pages: number[] = [];
    const startPage = Math.max(1, current - 2);
    const endPage = Math.min(total, startPage + 4);
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  });

  // Filter & Search Handlers
  onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
    this.bookingsPage.set(1);
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.bookingsPage.set(1);
  }

  setStatusFilter(filter: 'all' | 'confirmed' | 'checked_in' | 'cancelled'): void {
    this.statusFilter.set(filter);
    this.bookingsPage.set(1);
  }

  // Attendee Detail Drawer / Modal Handlers
  openAttendeeDetails(record: HostAttendeeRecord, event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }
    this.selectedRecord.set(record);
  }

  closeAttendeeDetails(): void {
    this.selectedRecord.set(null);
  }

  // Get complete passes for a booking record
  getRecordPasses(record: HostAttendeeRecord | null): BookingTicketPass[] {
    if (!record) return [];

    if (record.ticketPasses && record.ticketPasses.length > 0) {
      return record.ticketPasses;
    }

    if (record.attendees && record.attendees.length > 0) {
      return record.attendees.map((att, idx) => ({
        id: `pass-${record.orderId}-${idx + 1}`,
        ticketNumber: `TKT-${record.orderId.replace(/[^A-Za-z0-9]/g, '').slice(0, 6).toUpperCase()}-${(idx + 1).toString().padStart(3, '0')}`,
        attendeeName: att.name || `Attendee ${idx + 1}`,
        attendeeEmail: att.email || record.email || '',
        status: (record.status === 'cancelled' ? 'cancelled' : 'valid') as 'valid' | 'cancelled',
        issuedAt: record.bookingDate,
        price: (record.totalAmount || 0) / (record.attendees!.length || 1)
      }));
    }

    const count = Math.max(1, record.ticketsCount || 1);
    const fallback: BookingTicketPass[] = [];
    for (let i = 0; i < count; i++) {
      fallback.push({
        id: `pass-${record.orderId}-${i + 1}`,
        ticketNumber: `TKT-${record.orderId.replace(/[^A-Za-z0-9]/g, '').slice(0, 6).toUpperCase()}-${(i + 1).toString().padStart(3, '0')}`,
        attendeeName: i === 0 ? record.attendeeName : `Guest ${i + 1}`,
        attendeeEmail: i === 0 ? record.email : '',
        status: (record.status === 'cancelled' ? 'cancelled' : 'valid') as 'valid' | 'cancelled',
        issuedAt: record.bookingDate,
        price: (record.totalAmount || 0) / count
      });
    }
    return fallback;
  }

  // Check-In State Queries
  isPassCheckedIn(pass: BookingTicketPass | any, orderId?: string): boolean {
    const passKey = pass?.id || pass?.ticketNumber;
    if (passKey && this.checkedInPasses()[passKey] !== undefined) {
      return this.checkedInPasses()[passKey];
    }
    if (orderId && this.checkedInOrders()[orderId]) {
      return true;
    }
    return pass?.status === 'checked_in';
  }

  isOrderCheckedIn(record: HostAttendeeRecord): boolean {
    if (this.checkedInOrders()[record.orderId] !== undefined) {
      return this.checkedInOrders()[record.orderId];
    }
    const passes = this.getRecordPasses(record);
    if (passes.length > 0) {
      return passes.every(p => this.isPassCheckedIn(p, record.orderId));
    }
    return record.checkInStatus === 'checked_in';
  }

  // Check-In Action Handlers
  togglePassCheckIn(pass: BookingTicketPass | any, record: HostAttendeeRecord, event?: MouseEvent): void {
    if (event) event.stopPropagation();
    if (pass.status === 'cancelled' || record.status === 'cancelled') return;

    const passKey = pass.id || pass.ticketNumber;
    const current = this.isPassCheckedIn(pass, record.orderId);
    const next = !current;

    this.checkedInPasses.update(map => ({
      ...map,
      [passKey]: next
    }));

    // Check if all passes for this record are now checked in
    const passes = this.getRecordPasses(record);
    const allChecked = passes.every(p => {
      const k = p.id || p.ticketNumber;
      return k === passKey ? next : this.isPassCheckedIn(p, record.orderId);
    });

    this.checkedInOrders.update(m => ({ ...m, [record.orderId]: allChecked }));
  }

  toggleAllPassesCheckIn(record: HostAttendeeRecord, event?: MouseEvent): void {
    if (event) event.stopPropagation();
    if (record.status === 'cancelled') return;

    const passes = this.getRecordPasses(record);
    const currentlyAllChecked = passes.every(p => this.isPassCheckedIn(p, record.orderId));
    const nextState = !currentlyAllChecked;

    this.checkedInOrders.update(m => ({ ...m, [record.orderId]: nextState }));
    this.checkedInPasses.update(m => {
      const updated = { ...m };
      passes.forEach(p => {
        const key = p.id || p.ticketNumber;
        if (key) updated[key] = nextState;
      });
      return updated;
    });
  }

  // Clipboard copy for Ticket Number
  copyTicketNumber(ticketNumber: string, event?: MouseEvent): void {
    if (event) event.stopPropagation();
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(ticketNumber).then(() => {
        this.copiedPassId.set(ticketNumber);
        setTimeout(() => this.copiedPassId.set(null), 2000);
      }).catch(() => {});
    }
  }

  // Export Attendees to CSV file download
  downloadAttendeeRosterCsv(): void {
    const records = this.attendees;
    if (!records || records.length === 0) {
      this.exportCsv.emit();
      return;
    }

    const headers = [
      'Order ID',
      'Event Title',
      'Primary Purchaser',
      'Purchaser Email',
      'Pass Number',
      'Attendee Name',
      'Attendee Email',
      'Ticket Tier',
      'Ticket Pass Number',
      'Total Amount (INR)',
      'Booking Date',
      'Order Status',
      'Check-in Status'
    ];

    const rows: string[] = [headers.join(',')];

    for (const rec of records) {
      const passes = this.getRecordPasses(rec);
      passes.forEach((pass, idx) => {
        const isChecked = this.isPassCheckedIn(pass, rec.orderId);
        const row = [
          `"${rec.orderId}"`,
          `"${(rec.eventTitle || '').replace(/"/g, '""')}"`,
          `"${(rec.attendeeName || '').replace(/"/g, '""')}"`,
          `"${(rec.email || '').replace(/"/g, '""')}"`,
          `"${idx + 1}"`,
          `"${(pass.attendeeName || '').replace(/"/g, '""')}"`,
          `"${(pass.attendeeEmail || '').replace(/"/g, '""')}"`,
          `"${(rec.tier || 'General Admission').replace(/"/g, '""')}"`,
          `"${pass.ticketNumber}"`,
          `"${rec.totalAmount || 0}"`,
          `"${rec.bookingDate || ''}"`,
          `"${rec.status || 'confirmed'}"`,
          `"${isChecked ? 'Checked In' : 'Pending'}"`
        ];
        rows.push(row.join(','));
      });
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(rows.join('\n'));
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', `host-attendees-roster-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    this.exportCsv.emit();
  }

  // Print Roster
  printAttendeePasses(): void {
    if (typeof window !== 'undefined') {
      window.print();
    }
  }

  // Pagination Handlers
  setBookingsPage(p: number): void {
    if (p >= 1 && p <= this.bookingsTotalPages()) {
      this.bookingsPage.set(p);
      this.scrollToTop();
    }
  }

  setBookingsPageSize(size: number): void {
    this.bookingsPageSize.set(size);
    this.bookingsPage.set(1);
    this.scrollToTop();
  }

  private scrollToTop(): void {
    setTimeout(() => {
      const el = document.getElementById('host-bookings-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  }
}
