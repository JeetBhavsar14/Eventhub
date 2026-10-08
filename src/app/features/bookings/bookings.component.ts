import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import * as QRCode from 'qrcode';
import { ApiClient } from '@core/api';
import { AuthService } from '@core/auth';
import { Booking } from '@core/models';
import { ButtonComponent } from '@shared/components';

type BookingFilter = 'upcoming' | 'past' | 'all';

@Component({
  selector: 'app-bookings',
  standalone: true,
  imports: [CommonModule, RouterLink, ButtonComponent],
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

  currentUser = this.authService.currentUser;
  filteredBookings = computed(() => {
    const today = new Date().toISOString().slice(0, 10);
    const filter = this.selectedFilter();
    return this.bookings().filter((booking) => {
      if (filter === 'all') return true;
      return filter === 'upcoming' ? booking.eventDate >= today : booking.eventDate < today;
    });
  });

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
