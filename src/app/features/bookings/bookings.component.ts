import { Component, OnInit, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import * as QRCode from 'qrcode';
import { ApiClient, registerEventMetadata } from '@core/api';
import { AuthService } from '@core/auth';
import { Booking, EventItem } from '@core/models';
import { ButtonComponent, PaginationBarComponent } from '@shared/components';

type BookingFilter = 'upcoming' | 'past' | 'cancelled' | 'all';

@Component({
  selector: 'app-bookings',
  standalone: true,
  imports: [CommonModule, RouterLink, ButtonComponent, PaginationBarComponent],
  templateUrl: './bookings.component.html',
  styleUrl: './bookings.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BookingsComponent implements OnInit {
  private apiClient = inject(ApiClient);
  private authService = inject(AuthService);

  bookings = signal<Booking[]>([]);
  selectedFilter = signal<BookingFilter>('upcoming');
  isLoading = signal(true);
  error = signal<string | null>(null);
  expandedBookingId = signal<string | null>(null);
  isCancellingId = signal<string | null>(null);
  cancellingTicketId = signal<string | null>(null);
  selectedBookingForCancel = signal<Booking | null>(null);
  qrCodeUrl = signal('');
  ticketQrMap = signal<{ [ticketId: string]: string }>({});

  // Pagination State
  currentPage = signal(1);
  pageSize = signal(4);

  currentUser = this.authService.currentUser;
  filteredBookings = computed(() => {
    const today = new Date().toISOString().slice(0, 10);
    const filter = this.selectedFilter();
    return this.bookings().filter((booking) => {
      if (filter === 'all') return true;
      if (filter === 'cancelled') return booking.status === 'cancelled';
      if (booking.status === 'cancelled') return false;
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

    try {
      const [result, eventsRes] = await Promise.all([
        this.apiClient.get<Booking[]>('/bookings', { userId: user.id }),
        this.apiClient.get<EventItem[]>('/events')
      ]);

      if (result.error || !result.data) {
        this.error.set(result.error?.userMessage || 'We could not load your bookings. Please try again.');
        this.bookings.set([]);
      } else {
        const eventsMap = new Map<string, EventItem>();
        if (eventsRes.data && Array.isArray(eventsRes.data)) {
          for (const ev of eventsRes.data) {
            eventsMap.set(String(ev.id), ev);
            registerEventMetadata(ev.id, {
              title: ev.title,
              date: ev.date,
              time: ev.time,
              venue: ev.location?.venue,
              thumbnail: ev.thumbnailUrl
            });
          }
        }

        // Fetch any missing individual event records by ID
        const missingIds = Array.from(new Set(
          result.data
            .map(b => b.eventId)
            .filter(id => id && !eventsMap.has(String(id)))
        ));

        if (missingIds.length > 0) {
          await Promise.all(missingIds.map(async (evId) => {
            try {
              const singleEv = await this.apiClient.get<EventItem>(`/events/${evId}`);
              if (singleEv.data) {
                eventsMap.set(String(evId), singleEv.data);
                registerEventMetadata(evId, {
                  title: singleEv.data.title,
                  date: singleEv.data.date,
                  time: singleEv.data.time,
                  venue: singleEv.data.location?.venue,
                  thumbnail: singleEv.data.thumbnailUrl
                });
              }
            } catch (e) {}
          }));
        }

        // Enrich bookings with authoritative event metadata
        const enrichedBookings = result.data.map(b => {
          const ev = eventsMap.get(String(b.eventId));
          if (ev) {
            return {
              ...b,
              eventTitle: ev.title || b.eventTitle,
              eventDate: ev.date || b.eventDate,
              eventTime: ev.time || b.eventTime,
              eventLocation: ev.location?.venue || ev.location?.city || b.eventLocation,
              eventThumbnail: ev.thumbnailUrl || b.eventThumbnail
            };
          }
          return b;
        });

        this.bookings.set([...enrichedBookings].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      }
    } catch (e) {
      this.error.set('Failed to load your bookings. Please try again.');
    } finally {
      this.isLoading.set(false);
    }
  }

  async toggleTicket(booking: Booking) {
    if (this.expandedBookingId() === booking.id) {
      this.expandedBookingId.set(null);
      return;
    }
    this.expandedBookingId.set(booking.id);

    // 1. Generate Booking-level QR code mapped to backend booking reference or ID
    try {
      this.qrCodeUrl.set(await QRCode.toDataURL(booking.bookingReference || booking.id, { width: 180, margin: 1 }));
    } catch {
      this.qrCodeUrl.set('');
    }

    // 2. Generate separate QR code for each individual ticket pass mapped to backend ticket number or ID
    const qrMap: { [passId: string]: string } = {};
    if (booking.ticketPasses && booking.ticketPasses.length > 0) {
      for (const pass of booking.ticketPasses) {
        try {
          const passCode = pass.ticketNumber || pass.id;
          qrMap[pass.id] = await QRCode.toDataURL(passCode, { width: 140, margin: 1 });
        } catch {
          // ignore individual pass error
        }
      }
    }
    this.ticketQrMap.set(qrMap);
  }

  handleCancelClick(booking: Booking): void {
    if (booking.ticketPasses && booking.ticketPasses.length > 1) {
      this.selectedBookingForCancel.set(booking);
    } else {
      this.cancelEntireBooking(booking);
    }
  }

  async cancelSingleTicket(booking: Booking, ticketId: string): Promise<void> {
    const targetPass = (booking.ticketPasses || []).find(p => p.id === ticketId);
    const passLabel = targetPass 
      ? `Ticket "${targetPass.ticketNumber}" (${targetPass.attendeeName})` 
      : 'this ticket';
    
    // User confirmation alert
    const confirmed = window.confirm(`Do you really want to cancel ${passLabel}? If you confirm, this ticket will be cancelled.`);
    if (!confirmed) {
      return;
    }

    this.cancellingTicketId.set(ticketId);
    try {
      // 1. Send cancellation to Django backend
      await this.apiClient.post<any>(`/bookings/tickets/${ticketId}/cancel/`).catch(() => {});

      // 2. Update local state and persist cancellation in sessionStorage
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('eventhub_cancelled_ticket_' + ticketId, 'cancelled');
        if (targetPass?.ticketNumber) {
          sessionStorage.setItem('eventhub_cancelled_ticket_' + targetPass.ticketNumber, 'cancelled');
        }
      }

      const updatedPasses = (booking.ticketPasses || []).map(p =>
        p.id === ticketId ? { ...p, status: 'cancelled' as const } : p
      );
      const remainingValid = updatedPasses.filter(p => p.status === 'valid').length;
      const newStatus: Booking['status'] = remainingValid === 0 ? 'cancelled' : 'partially_cancelled';

      if (newStatus === 'cancelled') {
        await this.apiClient.post<any>(`/bookings/${booking.id}/cancel/`).catch(() => {});
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('eventhub_cancelled_booking_' + booking.id, 'cancelled');
          if (booking.bookingReference) {
            sessionStorage.setItem('eventhub_cancelled_booking_' + booking.bookingReference, 'cancelled');
          }
        }
      }

      const updatedBooking: Booking = {
        ...booking,
        ticketPasses: updatedPasses,
        status: newStatus
      };

      this.bookings.update(list => list.map(b => b.id === booking.id ? updatedBooking : b));
      this.selectedBookingForCancel.set(updatedBooking);
      alert(`${passLabel} has been cancelled successfully.`);
    } catch {
      alert('An error occurred while cancelling the ticket.');
    } finally {
      this.cancellingTicketId.set(null);
    }
  }

  async cancelEntireBooking(booking: Booking): Promise<void> {
    const confirmed = window.confirm(`Do you really want to cancel the entire booking for "${booking.eventTitle}"? All tickets under this booking will be cancelled.`);
    if (!confirmed) return;

    this.isCancellingId.set(booking.id);
    try {
      // 1. Send cancellation request to Django backend
      await this.apiClient.post<any>(`/bookings/${booking.id}/cancel/`).catch(() => {});

      // 2. Persist cancellation in sessionStorage
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('eventhub_cancelled_booking_' + booking.id, 'cancelled');
        if (booking.bookingReference) {
          sessionStorage.setItem('eventhub_cancelled_booking_' + booking.bookingReference, 'cancelled');
        }
        (booking.ticketPasses || []).forEach(p => {
          sessionStorage.setItem('eventhub_cancelled_ticket_' + p.id, 'cancelled');
          if (p.ticketNumber) {
            sessionStorage.setItem('eventhub_cancelled_ticket_' + p.ticketNumber, 'cancelled');
          }
        });
      }

      const updatedPasses = (booking.ticketPasses || []).map(p => ({
        ...p,
        status: 'cancelled' as const
      }));
      const updatedBooking: Booking = {
        ...booking,
        ticketPasses: updatedPasses,
        status: 'cancelled'
      };
      this.bookings.update(list => list.map(b => b.id === booking.id ? updatedBooking : b));
      this.selectedBookingForCancel.set(null);
      alert(`Booking for "${booking.eventTitle}" has been cancelled successfully.`);
    } catch {
      alert('An error occurred while cancelling your booking.');
    } finally {
      this.isCancellingId.set(null);
    }
  }

  closeCancelModal(): void {
    this.selectedBookingForCancel.set(null);
  }

  ticketCount(booking: Booking): number {
    if (booking.ticketPasses && booking.ticketPasses.length > 0) {
      if (booking.status === 'cancelled') {
        return booking.ticketPasses.length;
      }
      return booking.ticketPasses.filter(t => t.status === 'valid').length;
    }
    return booking.tickets.reduce((total, ticket) => total + ticket.quantity, 0);
  }

  printTicket() {
    window.print();
  }
}
