import { Component, OnInit, OnDestroy, inject, signal, computed, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ApiClient } from '@core/api';
import { AuthService } from '@core/auth';
import { BookingStateService, TicketBookingOrder } from '@core/state/booking-state.service';
import { NotificationService, ToastService } from '@core/state';
import { ButtonComponent, IconComponent } from '@shared/components';
import { PaymentFormComponent } from '@shared/forms';
import * as QRCode from 'qrcode';

@Component({
  selector: 'app-payment-gateway',
  standalone: true,
  imports: [CommonModule, ButtonComponent, IconComponent, PaymentFormComponent],
  templateUrl: './payment-gateway.component.html',
  styleUrl: './payment-gateway.component.css'
})
export class PaymentGatewayComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private apiClient = inject(ApiClient);
  private authService = inject(AuthService);
  private bookingState = inject(BookingStateService);
  private notificationService = inject(NotificationService);
  private toast = inject(ToastService);

  order = signal<TicketBookingOrder | null>(null);
  isLoading = signal(true);
  isProcessing = signal(false);
  paymentSuccess = signal(false);
  bookingResult = signal<any>(null);
  qrCodeUrl = signal<string>('');

  currentUser = this.authService.currentUser;

  // 2-minute Timer (120 seconds)
  timeRemaining = signal<number>(120);
  isExpired = signal<boolean>(false);
  private timerInterval: any = null;

  @ViewChild(PaymentFormComponent) paymentForm!: PaymentFormComponent;

  readonly formattedTime = computed(() => {
    const sec = this.timeRemaining();
    const mins = Math.floor(sec / 60);
    const remainingSec = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSec.toString().padStart(2, '0')}`;
  });

  // SVG circular progress calculation
  readonly strokeDashoffset = computed(() => {
    const total = 120;
    const current = this.timeRemaining();
    const percent = Math.max(0, (current / total) * 100);
    return `${percent}, 100`;
  });

  ngOnInit() {
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const activeOrder = this.bookingState.getPendingOrder();
    if (!activeOrder) {
      // No active order found or already expired
      this.isExpired.set(true);
      this.isLoading.set(false);
      return;
    }

    this.order.set(activeOrder);
    this.isLoading.set(false);

    // Calculate remaining seconds from expiry timestamp
    const remainingMs = Math.max(0, activeOrder.expiresAt - Date.now());
    const remainingSec = Math.floor(remainingMs / 1000);
    if (remainingSec <= 0) {
      this.isExpired.set(true);
    } else {
      this.timeRemaining.set(remainingSec);
      this.startTimer();
    }
  }

  ngOnDestroy() {
    this.clearTimer();
    // If the user navigates to any other page without completing payment, terminate and clear the session
    if (!this.paymentSuccess()) {
      this.bookingState.clearPendingOrder();
    }
  }

  private startTimer() {
    this.clearTimer();
    this.timerInterval = setInterval(() => {
      this.timeRemaining.update(prev => {
        if (prev <= 1) {
          this.clearTimer();
          this.isExpired.set(true);
          this.bookingState.clearPendingOrder();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  private clearTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  cancelAndReturn() {
    const ord = this.order();
    this.bookingState.clearPendingOrder();
    if (ord?.eventId) {
      this.router.navigate(['/checkout', ord.eventId]);
    } else {
      this.router.navigate(['/discover']);
    }
  }

  returnToEvent() {
    const ord = this.order();
    this.bookingState.clearPendingOrder();
    if (ord?.eventId) {
      this.router.navigate(['/checkout', ord.eventId]);
    } else {
      this.router.navigate(['/discover']);
    }
  }

  async confirmPayment() {
    if (this.isExpired()) {
      alert('Your payment session has expired. Please select tickets again.');
      return;
    }

    const currentOrder = this.order();
    if (!currentOrder) {
      alert('Order details missing. Please try again.');
      return;
    }

    if (!this.paymentForm.validate()) {
      alert('Please fill out the payment details accurately.');
      return;
    }

    const user = this.currentUser();
    if (!user) {
      this.router.navigate(['/auth/login']);
      return;
    }

    this.isProcessing.set(true);
    const payment = this.paymentForm.getPaymentSelection();
    const bookingReference = `EH-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    const payload = {
      bookingReference,
      eventId: currentOrder.eventId,
      eventTitle: currentOrder.eventTitle,
      eventDate: currentOrder.eventDate,
      eventTime: currentOrder.eventTime,
      eventLocation: currentOrder.eventLocation,
      eventAddress: currentOrder.eventAddress,
      eventThumbnail: currentOrder.eventThumbnail,
      attendee: { id: user.id, name: `${user.firstName} ${user.lastName}`.trim(), email: user.email, phone: user.phone },
      userId: user.id,
      tickets: currentOrder.tickets,
      subtotal: currentOrder.subtotal,
      discount: currentOrder.discount,
      offerCode: currentOrder.offerCode || null,
      tax: currentOrder.tax,
      totalAmount: currentOrder.totalAmount,
      status: 'confirmed',
      payment: {
        ...payment,
        status: 'paid',
        transactionReference: `TXN-${Date.now().toString(36).toUpperCase()}`
      },
      createdAt: new Date().toISOString()
    };

    try {
      const res = await this.apiClient.post<any>('/bookings', payload);
      if (!res.error && res.data) {
        this.clearTimer();
        this.bookingState.clearPendingOrder();
        this.bookingResult.set(res.data);
        this.paymentSuccess.set(true);
        await this.generateQrCode(res.data.bookingReference || res.data.id);

        // Real-time booking notification
        this.notificationService.dispatchBookingNotification({
          userId: user.id,
          userEmail: user.email,
          eventTitle: currentOrder.eventTitle,
          eventId: currentOrder.eventId,
          bookingReference: res.data.bookingReference || payload.bookingReference,
          ticketsCount: currentOrder.tickets.reduce((acc, t) => acc + t.quantity, 0),
          totalAmount: currentOrder.totalAmount
        });

        // Floating Toast
        this.toast.success(
          `Booking (${res.data.bookingReference || payload.bookingReference}) confirmed! Tickets are available in My Bookings.`,
          'Payment Successful 🎉'
        );

        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        alert(res.error?.userMessage || 'Payment verification failed. Please try again.');
      }
    } catch (err) {
      console.error(err);
      alert('An unexpected error occurred while confirming payment.');
    } finally {
      this.isProcessing.set(false);
    }
  }

  async generateQrCode(bookingId: string) {
    try {
      const url = await QRCode.toDataURL(bookingId, { width: 200, margin: 1 });
      this.qrCodeUrl.set(url);
    } catch (err) {
      console.error('Failed to generate QR code', err);
    }
  }

  printTicket() {
    window.print();
  }

  goToBookings() {
    this.router.navigate(['/bookings']);
  }

  goHome() {
    this.router.navigate(['/']);
  }
}
