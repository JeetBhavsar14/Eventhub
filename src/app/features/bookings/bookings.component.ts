import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import * as QRCode from 'qrcode';
import { ApiClient } from '@core/api';
import { AuthService } from '@core/auth';
import { Booking } from '@core/models';
import { ButtonComponent, PaginationBarComponent } from '@shared/components';

type BookingFilter = 'upcoming' | 'past' | 'all';

@Component({
  selector: 'app-bookings',
  standalone: true,
  imports: [CommonModule, RouterLink, ButtonComponent, PaginationBarComponent],
  templateUrl: './bookings.component.html',
  styleUrl: './bookings.component.css'
})
export class BookingsComponent implements OnInit {
  private apiClient = inject(ApiClient);
  private authService = inject(AuthService);

  bookings = signal<Booking[]>([]);
  selectedFilter = signal<BookingFilter>('upcoming');
  isLoading = signal(true);
  error = signal<string | null>(null);
  expandedBookingId = signal<string | null>(null);
  qrCodeUrl = signal('');

  // Pagination State
  currentPage = signal(1);
  pageSize = signal(4);

  currentUser = this.authService.currentUser;
  filteredBookings = computed(() => {
    const today = new Date().toISOString().slice(0, 10);
    const filter = this.selectedFilter();
    return this.bookings().filter((booking) => {
      if (filter === 'all') return true;
      return filter === 'upcoming' ? booking.eventDate >= today : booking.eventDate < today;
    });
  });

  totalPages = computed(() => {
    return Math.max(1, Math.ceil(this.filteredBookings().length / this.pageSize()));
  });

  paginatedBookings = computed(() => {
    const list = this.filteredBookings();
    const size = this.pageSize();
    const maxPage = Math.max(1, Math.ceil(list.length / size));
    const page = Math.min(this.currentPage(), maxPage);
    const start = (page - 1) * size;
    return list.slice(start, start + size);
  });

  startItem = computed(() => {
    const total = this.filteredBookings().length;
    if (total === 0) return 0;
    const size = this.pageSize();
    const maxPage = Math.max(1, Math.ceil(total / size));
    const page = Math.min(this.currentPage(), maxPage);
    return (page - 1) * size + 1;
  });

  endItem = computed(() => {
    const total = this.filteredBookings().length;
    const size = this.pageSize();
    const maxPage = Math.max(1, Math.ceil(total / size));
    const page = Math.min(this.currentPage(), maxPage);
    return Math.min(page * size, total);
  });

  setFilter(filter: BookingFilter) {
    this.selectedFilter.set(filter);
    this.currentPage.set(1);
  }

  setPage(page: number) {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  async ngOnInit() {
    await this.loadBookings();
  }

  async loadBookings() {
    const user = this.currentUser();
    if (!user) return;
    this.isLoading.set(true);
    this.error.set(null);
    const result = await this.apiClient.get<Booking[]>('/bookings', { userId: user.id });
    if (result.error || !result.data) {
      this.error.set('We could not load your bookings. Please try again.');
      this.bookings.set([]);
    } else {
      this.bookings.set([...result.data].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    }
    this.isLoading.set(false);
  }

  async toggleTicket(booking: Booking) {
    if (this.expandedBookingId() === booking.id) {
      this.expandedBookingId.set(null);
      return;
    }
    this.expandedBookingId.set(booking.id);
    try {
      this.qrCodeUrl.set(await QRCode.toDataURL(booking.bookingReference || booking.id, { width: 180, margin: 1 }));
    } catch {
      this.qrCodeUrl.set('');
    }
  }

  ticketCount(booking: Booking): number {
    return booking.tickets.reduce((total, ticket) => total + ticket.quantity, 0);
  }

  printTicket() {
    window.print();
  }
}
