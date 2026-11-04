import { Component, OnInit, signal, computed, inject, input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiClient } from '@core/api';
import { AuthService } from '@core/auth';
import { Booking, EventItem } from '@core/models';
import { ButtonComponent, IconComponent, PaginationBarComponent } from '@shared/components';

export type PaymentFilterTab = 'all' | 'paid' | 'pending' | 'cancelled' | 'refunds';

@Component({
  selector: 'app-my-payments',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, ButtonComponent, IconComponent, PaginationBarComponent],
  templateUrl: './my-payments.component.html',
  styleUrl: './my-payments.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MyPaymentsComponent implements OnInit {
  isEmbedded = input<boolean>(false);

  private apiClient = inject(ApiClient);
  private authService = inject(AuthService);
  private router = inject(Router);

  currentUser = this.authService.currentUser;

  bookings = signal<Booking[]>([]);
  isLoading = signal(true);
  error = signal<string | null>(null);

  activeTab = signal<PaymentFilterTab>('all');
  searchQuery = signal('');

  // Selected invoice for receipt modal
  selectedReceipt = signal<Booking | null>(null);

  // Pagination
  currentPage = signal(1);
  pageSize = signal(6);

  // KPI Computations
  totalSpent = computed(() => {
    return this.bookings()
      .filter(b => b.status === 'confirmed' || b.status === 'partially_cancelled')
      .reduce((sum, b) => sum + (b.totalAmount || 0), 0);
  });

  successfulCount = computed(() => {
    return this.bookings().filter(b => b.status === 'confirmed' || b.status === 'partially_cancelled').length;
  });

  pendingCount = computed(() => {
    return this.bookings().filter(b => b.status === 'pending').length;
  });

  cancelledCount = computed(() => {
    return this.bookings().filter(b => b.status === 'cancelled').length;
  });

  cancelledAmount = computed(() => {
    return this.bookings()
      .filter(b => b.status === 'cancelled')
      .reduce((sum, b) => sum + (b.totalAmount || 0), 0);
  });

  // Filtered Payments List
  filteredPayments = computed(() => {
    const tab = this.activeTab();
    const query = this.searchQuery().trim().toLowerCase();
    let list = this.bookings();

    if (tab === 'paid') {
      list = list.filter(b => b.status === 'confirmed' || b.status === 'partially_cancelled');
    } else if (tab === 'pending') {
      list = list.filter(b => b.status === 'pending');
    } else if (tab === 'cancelled') {
      list = list.filter(b => b.status === 'cancelled');
    } else if (tab === 'refunds') {
      // Future scope: currently returns empty list for refunds
      list = [];
    }

    if (query) {
      list = list.filter(b => 
        (b.eventTitle && b.eventTitle.toLowerCase().includes(query)) ||
        (b.bookingReference && b.bookingReference.toLowerCase().includes(query)) ||
        (b.id && b.id.toLowerCase().includes(query))
      );
    }

    return list;
  });

  // Pagination Computations
  totalPages = computed(() => {
    return Math.max(1, Math.ceil(this.filteredPayments().length / this.pageSize()));
  });

  paginatedPayments = computed(() => {
    const list = this.filteredPayments();
    const start = (this.currentPage() - 1) * this.pageSize();
    return list.slice(start, start + this.pageSize());
  });

  startItem = computed(() => {
    if (this.filteredPayments().length === 0) return 0;
    return (this.currentPage() - 1) * this.pageSize() + 1;
  });

  endItem = computed(() => {
    return Math.min(this.currentPage() * this.pageSize(), this.filteredPayments().length);
  });

  async ngOnInit(): Promise<void> {
    await this.loadPaymentsData();
  }

  async loadPaymentsData(): Promise<void> {
    const user = this.currentUser();
    if (!user) return;
    this.isLoading.set(true);
    this.error.set(null);

    try {
      const [bookingsRes, eventsRes] = await Promise.all([
        this.apiClient.get<Booking[]>('/bookings', { userId: user.id }),
        this.apiClient.get<EventItem[]>('/events')
      ]);

      if (bookingsRes.error || !bookingsRes.data) {
        this.error.set(bookingsRes.error?.userMessage || 'Could not load payment records. Please try again.');
        this.bookings.set([]);
      } else {
        const eventsMap = new Map<string, EventItem>();
        if (eventsRes.data && Array.isArray(eventsRes.data)) {
          for (const ev of eventsRes.data) {
            eventsMap.set(String(ev.id), ev);
          }
        }

        // Fetch any missing individual events by ID
        const missingIds = Array.from(new Set(
          bookingsRes.data
            .map(b => b.eventId)
            .filter(id => id && !eventsMap.has(String(id)))
        ));

        if (missingIds.length > 0) {
          await Promise.all(missingIds.map(async (evId) => {
            try {
              const singleEv = await this.apiClient.get<EventItem>(`/events/${evId}`);
              if (singleEv.data) {
                eventsMap.set(String(evId), singleEv.data);
              }
            } catch {}
          }));
        }

        // Enrich bookings with authoritative event metadata
        const enriched = bookingsRes.data.map(b => {
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

        this.bookings.set(enriched.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      }
    } catch {
      this.error.set('Failed to load payments history.');
    } finally {
      this.isLoading.set(false);
    }
  }

  setFilterTab(tab: PaymentFilterTab): void {
    this.activeTab.set(tab);
    this.currentPage.set(1);
  }

  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  openReceiptModal(booking: Booking): void {
    this.selectedReceipt.set(booking);
  }

  closeReceiptModal(): void {
    this.selectedReceipt.set(null);
  }

  printReceipt(): void {
    window.print();
  }

  resumeCheckout(booking: Booking): void {
    if (booking.eventId) {
      this.router.navigate(['/checkout', booking.eventId]);
    } else {
      this.router.navigate(['/discover']);
    }
  }

  bookAgain(booking: Booking): void {
    if (booking.eventId) {
      this.router.navigate(['/events', booking.eventId]);
    } else {
      this.router.navigate(['/discover']);
    }
  }
}
