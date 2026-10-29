import { Component, Input, Output, EventEmitter, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HostAttendeeRecord } from '@core/models';
import { IconComponent, PaginationBarComponent } from '@shared/components';

@Component({
  selector: 'app-host-bookings',
  standalone: true,
  imports: [CommonModule, IconComponent, PaginationBarComponent],
  templateUrl: './host-bookings.component.html',
  styleUrl: './host-bookings.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HostBookingsComponent {
  @Input({ required: true }) attendees: HostAttendeeRecord[] = [];

  @Output() exportCsv = new EventEmitter<void>();

  // Bookings & Attendees Pagination
  bookingsPage = signal(1);
  bookingsPageSize = signal(6);

  bookingsTotalPages = computed(() => {
    const total = this.attendees.length;
    return Math.max(1, Math.ceil(total / this.bookingsPageSize()));
  });

  paginatedAttendees = computed(() => {
    const list = this.attendees;
    const size = this.bookingsPageSize();
    const maxPage = Math.max(1, Math.ceil(list.length / size));
    const page = Math.min(this.bookingsPage(), maxPage);
    const start = (page - 1) * size;
    return list.slice(start, start + size);
  });

  bookingsPaginationInfo = computed(() => {
    const total = this.attendees.length;
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
