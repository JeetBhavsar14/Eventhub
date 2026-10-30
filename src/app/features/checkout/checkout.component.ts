import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiClient } from '@core/api';
import { AuthService } from '@core/auth';
import { BookingStateService } from '@core/state/booking-state.service';
import { Offer, EventItem, EventTicketType } from '@core/models';
import { ButtonComponent, IconComponent } from '@shared/components';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonComponent, IconComponent],
  templateUrl: './checkout.component.html',
  styleUrl: './checkout.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CheckoutComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private apiClient = inject(ApiClient);
  private authService = inject(AuthService);
  private bookingState = inject(BookingStateService);

  event = signal<EventItem | null>(null);
  isLoading = signal(true);
  error = signal<string | null>(null);

  selectedTickets = signal<{ [key: string]: number }>({});
  couponCode = signal('');
  appliedCoupon = signal<Offer | null>(null);
  couponError = signal('');

  showProceedModal = signal(false);
  bookingSuccess = signal(false);

  currentUser = this.authService.currentUser;

  // Computations
  totalQuantity = computed(() => {
    return Object.values(this.selectedTickets()).reduce((a, b) => a + b, 0);
  });

  subtotal = computed(() => {
    let total = 0;
    const selections = this.selectedTickets();
    const ev = this.event();
    if (ev?.ticketTypes) {
      for (const tt of ev.ticketTypes) {
        if (selections[tt.id]) {
          total += tt.price * selections[tt.id];
        }
      }
    }
    return total;
  });


  discount = computed(() => {
    const coupon = this.appliedCoupon();
    if (!coupon) return 0;
    let disc = 0;
    if (coupon.discountPercentage) {
      disc = this.subtotal() * (coupon.discountPercentage / 100);
      if (coupon.maxDiscount && disc > coupon.maxDiscount) {
        disc = coupon.maxDiscount;
      }
    } else if (coupon.discountAmount) {
      disc = coupon.discountAmount;
    }
    return Math.min(disc, this.subtotal()); // can't discount more than subtotal
  });

  taxAmount = computed(() => {
    const taxableAmount = this.subtotal() - this.discount();
    return Math.round(taxableAmount * 0.18); // 18% GST
  });

  grandTotal = computed(() => {
    return this.subtotal() - this.discount() + this.taxAmount();
  });

  ngOnInit() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.route.paramMap.subscribe(async (params) => {
      const id = params.get('eventId');
      if (id) {
        await this.loadEvent(id);
      }
    });
  }

  async loadEvent(id: string) {
    this.isLoading.set(true);
    try {
      const res = await this.apiClient.get<EventItem>(`/events/${id}`);
      if (res.data) {
        this.event.set(res.data);
      } else {
        this.error.set(res.error?.userMessage || 'Event not found.');
      }
    } catch (err) {
      this.error.set('Failed to load event details.');
    } finally {
      this.isLoading.set(false);
    }
  }

  updateQuantity(ticketTypeId: string, change: number) {
    const current = this.selectedTickets()[ticketTypeId] || 0;
    const next = Math.max(0, current + change);
    const ticketType = this.event()?.ticketTypes?.find(ticket => ticket.id === ticketTypeId);
    const max = this.event()?.maxTicketsPerBooking || 10;
    const currentTotal = this.totalQuantity();
    
    if (change > 0 && currentTotal >= max) {
      this.error.set(`A maximum of ${max} tickets can be purchased in one booking.`);
      return;
    }
    if (change > 0 && current >= (ticketType?.available ?? 0)) {
      this.error.set(`Only ${ticketType?.available ?? 0} ${ticketType?.name ?? 'tickets'} remain.`);
      return;
    }
    
    this.error.set(null);
    this.selectedTickets.update(st => ({ ...st, [ticketTypeId]: next }));
  }

  getQuantity(ticketTypeId: string): number {
    return this.selectedTickets()[ticketTypeId] || 0;
  }

  async applyCoupon() {
    const code = this.couponCode().trim().toUpperCase();
    if (!code) return;
    this.couponError.set('');
    try {
      const res = await this.apiClient.get<Offer[]>('/offers');
      const offer = res.data?.find((item) => item.isActive && item.code.toUpperCase() === code);
      if (!offer) {
        this.couponError.set('Enter a valid active offer code.');
      } else if (new Date(offer.expiresAt) < new Date()) {
        this.couponError.set('This offer has expired.');
      } else if (offer.minOrderAmount && this.subtotal() < offer.minOrderAmount) {
        this.couponError.set(`This offer requires a minimum booking of ₹${offer.minOrderAmount}.`);
      } else {
        this.couponCode.set(offer.code);
        this.appliedCoupon.set(offer);
      }
    } catch (err) {
      this.couponError.set('Failed to apply coupon.');
    }
  }

  removeCoupon() {
    this.appliedCoupon.set(null);
    this.couponCode.set('');
  }

  openProceedModal() {
    if (this.totalQuantity() === 0) {
      alert('Please select at least one ticket.');
      return;
    }

    const user = this.currentUser();
    if (!user) {
      this.router.navigate(['/auth/login']);
      return;
    }

    this.showProceedModal.set(true);
  }

  closeProceedModal() {
    this.showProceedModal.set(false);
  }

  confirmAndRedirectToGateway() {
    if (this.totalQuantity() === 0) return;

    const user = this.currentUser();
    if (!user) {
      this.router.navigate(['/auth/login']);
      return;
    }

    const currentEvent = this.event();
    if (!currentEvent) {
      alert('Event details not loaded');
      return;
    }

    const selections = this.selectedTickets();
    const ticketsBooked = [];
    for (const tt of currentEvent.ticketTypes || []) {
      if (selections[tt.id] > 0) {
        ticketsBooked.push({
          ticketTypeId: tt.id,
          name: tt.name,
          price: tt.price,
          quantity: selections[tt.id]
        });
      }
    }

    // Set order in state with 2-minute expiration
    this.bookingState.setPendingOrder({
      eventId: currentEvent.id,
      eventTitle: currentEvent.title,
      eventDate: currentEvent.date,
      eventTime: currentEvent.time,
      eventLocation: currentEvent.location?.venue,
      eventAddress: [currentEvent.location?.city, currentEvent.location?.state, currentEvent.location?.country].filter(Boolean).join(', '),
      eventThumbnail: currentEvent.thumbnailUrl,
      tickets: ticketsBooked,
      subtotal: this.subtotal(),
      discount: this.discount(),
      offerCode: this.appliedCoupon()?.code || null,
      tax: this.taxAmount(),
      totalAmount: this.grandTotal()
    });

    this.showProceedModal.set(false);
    this.router.navigate(['/payment-gateway']);
  }


  goHome() {
    this.router.navigate(['/']);
  }
}
