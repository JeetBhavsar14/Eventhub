import { Component, OnInit, inject, signal, computed, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiClient } from '@core/api';
import { AuthService } from '@core/auth';
import { NotificationService, ToastService } from '@core/state';
import { Offer } from '@core/models';
import { ButtonComponent, InputComponent } from '@shared/components';
import { PaymentFormComponent } from '@shared/forms';
import * as QRCode from 'qrcode';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonComponent, PaymentFormComponent],
  templateUrl: './checkout.html',
  styleUrl: './checkout.css'
})
export class Checkout implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private apiClient = inject(ApiClient);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private toast = inject(ToastService);

  event = signal<any>(null);
  isLoading = signal(true);
  error = signal<string | null>(null);

  selectedTickets = signal<{ [key: string]: number }>({});
  couponCode = signal('');
  appliedCoupon = signal<Offer | null>(null);
  couponError = signal('');

  isProcessing = signal(false);
  bookingSuccess = signal(false);
  bookingResult = signal<any>(null);
  qrCodeUrl = signal<string>('');

  @ViewChild(PaymentFormComponent) paymentForm!: PaymentFormComponent;

  currentUser = this.authService.currentUser;

  // Computations
  totalQuantity = computed(() => {
    return Object.values(this.selectedTickets()).reduce((a, b) => a + b, 0);
  });

  subtotal = computed(() => {
    let total = 0;
    const selections = this.selectedTickets();
    if (this.event()?.ticketTypes) {
      for (const tt of this.event().ticketTypes) {
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
      const res = await this.apiClient.get<any>(`/events/${id}`);
      if (res.data) {
        this.event.set(res.data);
      } else {
        this.error.set('Event not found.');
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
    const ticketType = this.event()?.ticketTypes?.find((ticket: any) => ticket.id === ticketTypeId);
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

  async processPayment() {
    if (this.totalQuantity() === 0) {
      alert('Please select at least one ticket.');
      return;
    }

    if (!this.paymentForm.validate()) {
      alert('Please complete the payment details correctly.');
      return;
    }

    const user = this.currentUser();
    if (!user) {
      this.router.navigate(['/auth/login']);
      return;
    }
    this.isProcessing.set(true);
    this.error.set(null);

    const selections = this.selectedTickets();
    const ticketsBooked = [];
    for (const tt of this.event().ticketTypes) {
       if (selections[tt.id] > 0) {
         ticketsBooked.push({
            ticketTypeId: tt.id,
            name: tt.name,
            price: tt.price,
            quantity: selections[tt.id]
         });
       }
    }

    const payment = this.paymentForm.getPaymentSelection();
    const bookingReference = `EH-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const payload = {
      bookingReference,
      eventId: this.event().id,
      eventTitle: this.event().title,
      eventDate: this.event().date,
      eventTime: this.event().time,
      eventLocation: this.event().location?.venue,
      eventAddress: [this.event().location?.city, this.event().location?.state, this.event().location?.country].filter(Boolean).join(', '),
      eventThumbnail: this.event().thumbnailUrl,
      attendee: { id: user.id, name: `${user.firstName} ${user.lastName}`.trim(), email: user.email, phone: user.phone },
      userId: user.id,
      tickets: ticketsBooked,
      subtotal: this.subtotal(),
      discount: this.discount(),
      offerCode: this.appliedCoupon()?.code || null,
      tax: this.taxAmount(),
      totalAmount: this.grandTotal(),
      status: 'confirmed',
      payment: { ...payment, status: 'paid', transactionReference: `TXN-${Date.now().toString(36).toUpperCase()}` },
      createdAt: new Date().toISOString()
    };

    try {
      const res = await this.apiClient.post<any>('/bookings', payload);
      if (!res.error && res.data) {
        this.bookingResult.set(res.data);
        this.bookingSuccess.set(true);
        this.generateQrCode(res.data.bookingReference || res.data.id);
        
        // Dispatch real-time booking confirmation notification (Phase 8)
        this.notificationService.dispatchBookingNotification({
          userId: user.id,
          userEmail: user.email,
          eventTitle: this.event().title,
          eventId: this.event().id,
          bookingReference: res.data.bookingReference || payload.bookingReference,
          ticketsCount: ticketsBooked.reduce((acc, t) => acc + t.quantity, 0),
          totalAmount: this.grandTotal()
        });

        // Trigger global floating toast (High-Impact UI/UX)
        this.toast.success(
          `Your digital pass (${res.data.bookingReference || payload.bookingReference}) is ready in My Bookings!`,
          'Booking Confirmed 🎉'
        );

        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        this.error.set('We could not confirm your payment. Please try again.');
      }
    } catch (err) {
      this.error.set('An unexpected error occurred while confirming payment.');
    } finally {
      this.isProcessing.set(false);
    }
  }

  async generateQrCode(bookingId: string) {
    try {
      const url = await QRCode.toDataURL(bookingId, { width: 200, margin: 1 });
      this.qrCodeUrl.set(url);
    } catch (err) {
      console.error(err);
    }
  }

  printTicket() {
    window.print();
  }

  goHome() {
    this.router.navigate(['/']);
  }
}
