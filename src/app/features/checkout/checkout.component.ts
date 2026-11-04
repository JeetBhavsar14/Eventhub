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
  attendees = signal<Array<{ name: string; email: string }>>([]);
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
    return 0; // Taxes and fees are included in backend ticket pricing
  });

  grandTotal = computed(() => {
    return this.subtotal() - this.discount();
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
        const eventData = { ...res.data };

        // Fetch real Django ticket types for this event
        try {
          const ttRes = await this.apiClient.get<any>(`/bookings/events/${id}/ticket-types/`);
          if (ttRes.data) {
            const rawList = Array.isArray(ttRes.data) 
              ? ttRes.data 
              : (Array.isArray(ttRes.data.results) ? ttRes.data.results : []);
            
            eventData.ticketTypes = rawList.map((tt: any) => {
              const rawPrice = tt.price ?? tt.unit_price ?? tt.total_price ?? tt.total_amount ?? (tt.tickets?.[0]?.price) ?? 0;
              const rawName = tt.name || tt.ticket_type_name || (tt.tickets?.[0]?.name) || 'General';
              const rawAvailable = tt.available_quantity !== undefined 
                ? tt.available_quantity 
                : (tt.available !== undefined ? tt.available : tt.total_quantity);
              const rawCapacity = tt.total_quantity ?? tt.capacity ?? 100;

              return {
                id: String(tt.id || tt.ticket_type || tt.ticketTypeId),
                name: rawName,
                price: typeof rawPrice === 'string' ? parseFloat(rawPrice) || 0 : Number(rawPrice) || 0,
                capacity: Number(rawCapacity) || 100,
                available: rawAvailable !== undefined ? Number(rawAvailable) : 100,
                description: tt.description || ''
              };
            });
          } else {
            eventData.ticketTypes = [];
          }
        } catch (ttErr) {
          console.warn('[Checkout] Failed to load ticket types from Django:', ttErr);
          eventData.ticketTypes = [];
        }

        this.event.set(eventData);

        // Auto-select 1 ticket by default so quantity is 1 and price is displayed immediately
        if (eventData.ticketTypes && eventData.ticketTypes.length > 0) {
          const firstAvailable = eventData.ticketTypes.find((t: any) => (t.available === undefined || t.available > 0));
          if (firstAvailable) {
            this.selectedTickets.set({ [firstAvailable.id]: 1 });
            this.syncAttendees(1);
          }
        }
      } else {
        this.error.set(res.error?.userMessage || 'Event not found.');
      }
    } catch (err) {
      this.error.set('Failed to load event details.');
    } finally {
      this.isLoading.set(false);
    }
  }

  trackByIndex(index: number): number {
    return index;
  }

  syncAttendees(qty: number) {
    const user = this.currentUser();
    const current = [...this.attendees()];
    const defaultName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Attendee';
    const defaultEmail = user?.email || '';

    if (current.length === 0 && qty > 0) {
      current.push({ name: defaultName, email: defaultEmail });
    }

    while (current.length < qty) {
      current.push({ name: '', email: '' });
    }

    if (current.length > qty) {
      current.splice(qty);
    }

    this.attendees.set(current);
  }

  updateAttendee(index: number, field: 'name' | 'email', value: string) {
    this.attendees.update(list => {
      const copy = [...list];
      if (copy[index]) {
        copy[index] = { ...copy[index], [field]: value };
      }
      return copy;
    });
    this.error.set(null);
  }

  updateQuantity(ticketTypeId: string, change: number) {
    const current = this.selectedTickets()[ticketTypeId] || 0;
    const next = Math.max(0, current + change);
    const ticketType = this.event()?.ticketTypes?.find(ticket => ticket.id === ticketTypeId);
    const max = this.event()?.maxTicketsPerBooking || 10;
    const currentTotal = this.totalQuantity();
    
    if (change > 0) {
      // Backend rule: only one ticket type is allowed per booking
      const currentSelections = this.selectedTickets();
      const hasOtherType = Object.keys(currentSelections).some(id => id !== ticketTypeId && currentSelections[id] > 0);
      if (hasOtherType) {
        this.error.set('Only one ticket type is allowed per booking. You can purchase multiple tickets of the same type.');
        return;
      }
    }

    if (change > 0 && currentTotal >= max) {
      this.error.set(`A maximum of ${max} tickets can be purchased in one booking.`);
      return;
    }
    if (change > 0 && current >= (ticketType?.available ?? 0)) {
      this.error.set(`Only ${ticketType?.available ?? 0} ${ticketType?.name ?? 'tickets'} remain.`);
      return;
    }
    
    this.error.set(null);
    this.selectedTickets.update(st => {
      const updated = { ...st, [ticketTypeId]: next };
      const newTotal = Object.values(updated).reduce((a, b) => a + b, 0);
      this.syncAttendees(newTotal);
      return updated;
    });
  }

  getQuantity(ticketTypeId: string): number {
    return this.selectedTickets()[ticketTypeId] || 0;
  }

  getRemainingTickets(ticketType: any): number {
    const base = ticketType?.available !== undefined ? ticketType.available : (ticketType?.capacity ?? 0);
    const selected = this.getQuantity(ticketType?.id);
    return Math.max(0, base - selected);
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

    const attList = this.attendees();
    for (let i = 0; i < attList.length; i++) {
      const a = attList[i];
      if (!a.name.trim()) {
        this.error.set(`Please enter the full name for Ticket #${i + 1}.`);
        window.scrollTo({ top: 300, behavior: 'smooth' });
        return;
      }
      if (!a.email.trim() || !a.email.includes('@')) {
        this.error.set(`Please enter a valid email for Ticket #${i + 1}.`);
        window.scrollTo({ top: 300, behavior: 'smooth' });
        return;
      }
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

    if (ticketsBooked.length !== 1) {
      alert('Only one ticket type is allowed per booking.');
      return;
    }

    const attList = this.attendees();
    for (let i = 0; i < attList.length; i++) {
      const a = attList[i];
      if (!a.name.trim() || !a.email.trim()) {
        this.error.set(`Please provide details for Ticket #${i + 1}.`);
        return;
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
      attendees: this.attendees(),
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
