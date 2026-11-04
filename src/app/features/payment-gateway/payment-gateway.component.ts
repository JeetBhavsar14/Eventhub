import { Component, OnInit, AfterViewInit, OnDestroy, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { environment } from '@env/environment';
import { ApiClient, adaptDjangoBooking } from '@core/api';
import { AuthService } from '@core/auth';
import { BookingStateService, TicketBookingOrder } from '@core/state/booking-state.service';
import { NotificationService, ToastService } from '@core/state';
import { FormsModule } from '@angular/forms';
import { Booking } from '@core/models';
import { ButtonComponent, IconComponent } from '@shared/components';
import * as QRCode from 'qrcode';

declare const Stripe: any;

@Component({
  selector: 'app-payment-gateway',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonComponent, IconComponent],
  templateUrl: './payment-gateway.component.html',
  styleUrl: './payment-gateway.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PaymentGatewayComponent implements OnInit, AfterViewInit, OnDestroy {
  private router = inject(Router);
  private apiClient = inject(ApiClient);
  private authService = inject(AuthService);
  private bookingState = inject(BookingStateService);
  private notificationService = inject(NotificationService);
  private toast = inject(ToastService);

  order = signal<TicketBookingOrder | null>(null);
  isLoading = signal(true);
  isStripeLoading = signal(true);
  isProcessing = signal(false);
  paymentSuccess = signal(false);
  paymentError = signal<string | null>(null);
  bookingResult = signal<Booking | null>(null);
  qrCodeUrl = signal<string>('');
  bookingQrCodeUrl = signal<string>('');
  ticketQrCodes = signal<Array<{
    ticketId: string;
    ticketNumber: string;
    attendeeName: string;
    attendeeEmail?: string;
    qrUrl: string;
  }>>([]);

  // Payment Method Selection & UPI Visuals (Card is active gateway; UPI is backend future scope)
  selectedPaymentMethod = signal<'card' | 'upi'>('card');
  upiMode = signal<'id' | 'qr'>('id');
  upiVpa = signal<string>('');
  upiQrUrl = signal<string>('');

  currentUser = this.authService.currentUser;

  // 2-minute Timer (120 seconds)
  timeRemaining = signal<number>(120);
  isExpired = signal<boolean>(false);
  private timerInterval: ReturnType<typeof setInterval> | null = null;

  // Stripe Elements References
  private stripe: any = null;
  private elements: any = null;
  private paymentElement: any = null;
  private clientSecret: string | null = null;

  readonly formattedTime = computed(() => {
    const sec = this.timeRemaining();
    const mins = Math.floor(sec / 60);
    const remainingSec = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSec.toString().padStart(2, '0')}`;
  });

  readonly strokeDashoffset = computed(() => {
    const total = 120;
    const current = this.timeRemaining();
    const percent = Math.max(0, (current / total) * 100);
    return `${percent}, 100`;
  });

  ngOnInit() {
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Handle return from UPI / 3D-Secure external app redirect
    const urlParams = new URLSearchParams(window.location.search);
    const clientSecretParam = urlParams.get('payment_intent_client_secret');
    const redirectStatus = urlParams.get('redirect_status');

    if (clientSecretParam && (redirectStatus === 'succeeded' || redirectStatus === 'processing')) {
      this.handleRedirectSuccess(clientSecretParam);
      return;
    }

    const activeOrder = this.bookingState.getPendingOrder();
    if (!activeOrder) {
      this.isExpired.set(true);
      this.isLoading.set(false);
      this.isStripeLoading.set(false);
      return;
    }

    this.order.set(activeOrder);
    this.isLoading.set(false);
    this.generateUpiQr(activeOrder);

    const remainingMs = Math.max(0, activeOrder.expiresAt - Date.now());
    const remainingSec = Math.floor(remainingMs / 1000);
    if (remainingSec <= 0) {
      this.isExpired.set(true);
      this.isStripeLoading.set(false);
    } else {
      this.timeRemaining.set(remainingSec);
      this.startTimer();
    }
  }

  private async handleRedirectSuccess(clientSecret: string) {
    this.isLoading.set(true);
    try {
      this.stripe = Stripe(environment.stripePublishableKey);
      const { paymentIntent } = await this.stripe.retrievePaymentIntent(clientSecret);
      if (paymentIntent && (paymentIntent.status === 'succeeded' || paymentIntent.status === 'processing')) {
        const activeOrder = this.bookingState.getPendingOrder();
        const user = this.currentUser();
        const savedBookingId = sessionStorage.getItem('eventhub_last_booking_id');
        const savedBookingRef = sessionStorage.getItem('eventhub_last_booking_ref');
        sessionStorage.removeItem('eventhub_last_booking_id');
        sessionStorage.removeItem('eventhub_last_booking_ref');
        const bookingRef = savedBookingRef || `EVT-${Date.now().toString(36).toUpperCase()}`;

        const rawBookingData = {
          id: savedBookingId || paymentIntent.id || `bk-${Date.now()}`,
          booking_reference: bookingRef,
          status: 'confirmed',
          event_title: activeOrder?.eventTitle || 'Event Admission',
          event_date: activeOrder?.eventDate || new Date().toISOString(),
          event_time: activeOrder?.eventTime || '',
          venue_name: activeOrder?.eventLocation || '',
          address: activeOrder?.eventAddress || '',
          cover_image_url: activeOrder?.eventThumbnail || '',
          total_price: String(activeOrder?.totalAmount || Math.round(paymentIntent.amount / 100)),
          tickets: (activeOrder?.tickets || []).map(t => ({
            ticket_type: t.ticketTypeId,
            ticket_type_name: t.name,
            unit_price: t.price,
            quantity: t.quantity
          }))
        };

        const finalBooking: Booking = adaptDjangoBooking(rawBookingData);

        if (typeof window !== 'undefined') {
          if (finalBooking.id) sessionStorage.setItem('eventhub_paid_booking_' + finalBooking.id, 'confirmed');
          if (finalBooking.bookingReference) sessionStorage.setItem('eventhub_paid_booking_' + finalBooking.bookingReference, 'confirmed');
        }

        this.bookingState.clearPendingOrder();
        this.bookingResult.set(finalBooking);
        this.paymentSuccess.set(true);
        await this.generateQrCodesForBooking(finalBooking);

        this.toast.success('Your UPI / Card payment has been verified!', 'Payment Successful 🎉');
      }
    } catch (err) {
      console.error('[Stripe UPI Redirect]', err);
      this.paymentError.set('Unable to verify UPI payment status.');
    } finally {
      this.isLoading.set(false);
      this.isStripeLoading.set(false);
    }
  }

  ngAfterViewInit() {
    if (!this.isExpired() && this.order()) {
      this.initStripe();
    }
  }

  ngOnDestroy() {
    this.clearTimer();
    if (this.paymentElement) {
      try {
        this.paymentElement.destroy();
      } catch {
        // Safe cleanup
      }
    }
    if (!this.paymentSuccess()) {
      this.bookingState.clearPendingOrder();
    }
  }

  private initStripe() {
    if (typeof Stripe === 'undefined') {
      let retries = 0;
      const interval = setInterval(() => {
        retries++;
        if (typeof Stripe !== 'undefined') {
          clearInterval(interval);
          this.mountStripeElements();
        } else if (retries > 25) {
          clearInterval(interval);
          this.paymentError.set('Unable to load Stripe security module. Please check your network connection.');
          this.isStripeLoading.set(false);
        }
      }, 200);
      return;
    }
    this.mountStripeElements();
  }

  private mountStripeElements() {
    const activeOrder = this.order();
    if (!activeOrder) return;

    try {
      this.stripe = Stripe(environment.stripePublishableKey);

      const options = {
        mode: 'payment',
        amount: Math.max(100, Math.round(activeOrder.totalAmount * 100)), // amount in smallest currency unit (paise/cents)
        currency: 'inr',
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: '#4f46e5',
            colorBackground: '#ffffff',
            colorText: '#1e293b',
            colorDanger: '#ef4444',
            fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
            borderRadius: '10px',
            spacingUnit: '4.5px'
          }
        }
      };

      this.elements = this.stripe.elements(options);
      this.paymentElement = this.elements.create('payment', {
        layout: {
          type: 'tabs',
          defaultCollapsed: false
        },
        paymentMethodOrder: ['card', 'upi']
      });

      setTimeout(() => {
        const container = document.getElementById('stripe-payment-element');
        if (container && this.paymentElement) {
          this.paymentElement.mount('#stripe-payment-element');

          this.paymentElement.on('ready', () => {
            this.isStripeLoading.set(false);
          });

          this.paymentElement.on('change', (event: any) => {
            if (event.error) {
              this.paymentError.set(event.error.message);
            } else {
              this.paymentError.set(null);
            }
          });
        }
      }, 100);
    } catch (err: any) {
      console.error('[Stripe Setup Error]', err);
      this.paymentError.set('Could not initialize Stripe payment element.');
      this.isStripeLoading.set(false);
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
      this.toast.error('Your payment session has expired. Please select tickets again.');
      return;
    }

    const currentOrder = this.order();
    if (!currentOrder) {
      this.toast.error('Order details missing. Please try again.');
      return;
    }

    const selectedTicket = currentOrder.tickets[0];

    if (!selectedTicket) {
      this.toast.error('Please select at least one ticket.');
      return;
    }

    if (currentOrder.tickets.length !== 1) {
      this.toast.error('Only one ticket type is allowed per booking.');
      return;
    }

    if (!this.stripe || !this.elements) {
      this.toast.error('Stripe payment elements are still loading. Please wait a moment.');
      return;
    }

    this.isProcessing.set(true);
    this.paymentError.set(null);

    try {
      // 1. Validate Stripe Element user inputs
      const { error: submitError } = await this.elements.submit();
      if (submitError) {
        this.paymentError.set(submitError.message || 'Please check your payment information.');
        this.isProcessing.set(false);
        return;
      }

      const user = this.currentUser();

      // 2. Prepare payload using real attendee details from order
      const attendeesList = (currentOrder.attendees && currentOrder.attendees.length === selectedTicket.quantity)
        ? currentOrder.attendees.map(a => ({
            attendee_name: a.name.trim(),
            attendee_email: a.email.trim()
          }))
        : Array.from(
            { length: selectedTicket.quantity },
            (_, i) => ({
              attendee_name:
                i === 0 
                  ? `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Attendee'
                  : `Guest ${i + 1}`,
              attendee_email: i === 0 ? user?.email || '' : ''
            })
          );

      const payload = {
        event: currentOrder.eventId,
        ticket_type: selectedTicket.ticketTypeId,
        quantity: selectedTicket.quantity,
        attendees: attendeesList
      };

      let backendBookingId: string | null = null;

      // 3. Create booking on Django backend
      console.log('[PaymentGateway] Creating booking on Django backend:', payload);
      const res = await this.apiClient.post<any>(
        '/bookings/create/',
        payload
      );

      if (res.error) {
        console.error('[PaymentGateway] Django booking creation failed:', res.error);
        const serverMsg = res.error.userMessage || 'Failed to save booking to database.';
        this.paymentError.set(`Database Error: ${serverMsg}`);
        this.toast.error(serverMsg, 'Booking Failed');
        this.isProcessing.set(false);
        return;
      }

      const bData = res.data?.booking || res.data;

      backendBookingId = bData?.id;

      if (!backendBookingId) {
        this.paymentError.set('Backend did not return a valid booking ID.');
        this.isProcessing.set(false);
        return;
      }

      if (bData.status !== 'pending') {
        this.paymentError.set('Booking is not in pending status.');
        this.isProcessing.set(false);
        return;
      }

      // 4. Request Stripe Payment Intent from backend
      console.log('[PaymentGateway] Requesting Stripe Payment Intent for booking ID:', backendBookingId);
      const intentRes = await this.apiClient.post<any>(
        `/bookings/${backendBookingId}/create-payment-intent/`,
        {
          description: `Event ticket booking for ${currentOrder.eventTitle}`
        }
      );

      if (intentRes.error) {
        console.error('[PaymentGateway] create-payment-intent failed:', intentRes.error);
        const intentErrMsg = intentRes.error.userMessage || 'Failed to initialize payment intent.';
        this.paymentError.set(`Payment Error: ${intentErrMsg}`);
        this.toast.error(intentErrMsg, 'Payment Initialization Failed');
        this.isProcessing.set(false);
        return;
      }

      this.clientSecret = intentRes.data?.client_secret;

      if (!this.clientSecret) {
        this.paymentError.set(
          'Backend did not return a valid Stripe client secret.'
        );
        this.isProcessing.set(false);
        return;
      }

      // Store booking identifiers in session in case payment requires external app redirect (e.g. UPI / 3DS)
      if (backendBookingId) {
        sessionStorage.setItem('eventhub_last_booking_id', backendBookingId);
      }
      if (bData?.booking_reference) {
        sessionStorage.setItem('eventhub_last_booking_ref', bData.booking_reference);
      }

      // 5. Confirm payment with Stripe Elements using this.clientSecret
      console.log('[PaymentGateway] Confirming payment with Stripe Elements using clientSecret...');
      const { error: confirmError, paymentIntent } = await this.stripe.confirmPayment({
        elements: this.elements,
        clientSecret: this.clientSecret,
        confirmParams: {
          return_url: `${window.location.origin}/payment-gateway`,
          payment_method_data: {
            billing_details: {
              name: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Attendee',
              email: user?.email || '',
              address: {
                line1: currentOrder.eventAddress || '100 Main Street',
                city: currentOrder.eventLocation || 'Mumbai',
                state: 'MH',
                postal_code: '400001',
                country: 'IN'
              }
            }
          }
        },
        redirect: 'if_required'
      });

      if (confirmError) {
        console.error('[PaymentGateway] Stripe payment confirmation failed:', confirmError);
        this.paymentError.set(confirmError.message || 'Payment authorization failed with Stripe.');
        this.isProcessing.set(false);
        return;
      }

      console.log('[PaymentGateway] Stripe payment confirmed successfully:', paymentIntent);

      // 6. Map confirmed booking response properly through adaptDjangoBooking adapter
      const rawBookingData = {
        ...bData,
        status: 'confirmed',
        event_title: currentOrder.eventTitle,
        event_date: currentOrder.eventDate,
        event_time: currentOrder.eventTime,
        venue_name: currentOrder.eventLocation,
        address: currentOrder.eventAddress,
        cover_image_url: currentOrder.eventThumbnail,
        attendees: attendeesList,
        tickets: currentOrder.tickets.map(t => ({
          ticket_type: t.ticketTypeId,
          ticket_type_name: t.name,
          unit_price: t.price,
          quantity: t.quantity
        }))
      };

      const finalBooking: Booking = adaptDjangoBooking(rawBookingData);

      if (typeof window !== 'undefined') {
        if (backendBookingId) sessionStorage.setItem('eventhub_paid_booking_' + backendBookingId, 'confirmed');
        if (finalBooking.id) sessionStorage.setItem('eventhub_paid_booking_' + finalBooking.id, 'confirmed');
        if (finalBooking.bookingReference) sessionStorage.setItem('eventhub_paid_booking_' + finalBooking.bookingReference, 'confirmed');
      }

      this.clearTimer();
      this.bookingState.clearPendingOrder();
      this.bookingResult.set(finalBooking);
      this.paymentSuccess.set(true);
      await this.generateQrCodesForBooking(finalBooking);

      // Real-time booking notification
      if (user) {
        this.notificationService.dispatchBookingNotification({
          userId: user.id,
          userEmail: user.email,
          eventTitle: currentOrder.eventTitle,
          eventId: currentOrder.eventId,
          bookingReference: finalBooking.bookingReference || bData?.booking_reference || 'EVT-BOOKING',
          ticketsCount: currentOrder.tickets.reduce((acc, t) => acc + t.quantity, 0),
          totalAmount: finalBooking.totalAmount || currentOrder.totalAmount
        });
      }

      // Floating Toast
      this.toast.success(
        `Booking (${finalBooking.bookingReference}) confirmed via Stripe! Tickets are available in My Bookings.`,
        'Payment Successful 🎉'
      );

      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error('[Stripe Payment] Checkout confirmation error:', err);
      this.paymentError.set(err.message || 'An unexpected error occurred during payment processing.');
    } finally {
      this.isProcessing.set(false);
    }
  }

  setPaymentMethod(method: 'card' | 'upi') {
    this.selectedPaymentMethod.set(method);
    this.paymentError.set(null);
  }

  setUpiMode(mode: 'id' | 'qr') {
    this.upiMode.set(mode);
    this.paymentError.set(null);
  }

  quickSetUpiSuffix(suffix: string) {
    const current = this.upiVpa().split('@')[0] || '';
    if (current) {
      this.upiVpa.set(`${current}@${suffix}`);
    } else {
      this.upiVpa.set(`@${suffix}`);
    }
  }

  async generateUpiQr(activeOrder?: TicketBookingOrder | null) {
    const ord = activeOrder || this.order();
    if (!ord) return;
    const payeeVpa = 'eventhub.tickets@icici';
    const payeeName = 'EventHub';
    const amount = ord.totalAmount.toFixed(2);
    const note = `EventHub_${ord.eventId.slice(0, 8)}`;
    const upiUri = `upi://pay?pa=${payeeVpa}&pn=${encodeURIComponent(payeeName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(note)}`;
    try {
      const qr = await QRCode.toDataURL(upiUri, { width: 180, margin: 1 });
      this.upiQrUrl.set(qr);
    } catch (e) {
      console.warn('Failed to generate dynamic UPI QR', e);
    }
  }

  async confirmUpiPayment() {
    if (this.isExpired()) {
      this.toast.error('Your payment session has expired. Please select tickets again.');
      return;
    }

    const currentOrder = this.order();
    if (!currentOrder) {
      this.toast.error('Order details missing. Please try again.');
      return;
    }

    const selectedTicket = currentOrder.tickets[0];
    if (!selectedTicket) {
      this.toast.error('Please select at least one ticket.');
      return;
    }

    if (this.upiMode() === 'id') {
      const vpa = this.upiVpa().trim();
      if (!vpa || !vpa.includes('@')) {
        this.paymentError.set('Please enter a valid UPI ID (e.g., username@okaxis or 9876543210@ybl).');
        return;
      }
    }

    this.isProcessing.set(true);
    this.paymentError.set(null);

    try {
      const user = this.currentUser();
      const attendeesList = (currentOrder.attendees && currentOrder.attendees.length === selectedTicket.quantity)
        ? currentOrder.attendees.map(a => ({
            attendee_name: a.name.trim(),
            attendee_email: a.email.trim()
          }))
        : Array.from(
            { length: selectedTicket.quantity },
            (_, i) => ({
              attendee_name: i === 0 ? `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Attendee' : `Guest ${i + 1}`,
              attendee_email: i === 0 ? user?.email || '' : ''
            })
          );

      const payload = {
        event: currentOrder.eventId,
        ticket_type: selectedTicket.ticketTypeId,
        quantity: selectedTicket.quantity,
        attendees: attendeesList
      };

      console.log('[PaymentGateway UPI] Creating booking on Django backend:', payload);
      const res = await this.apiClient.post<any>('/bookings/create/', payload);

      if (res.error) {
        console.error('[PaymentGateway UPI] Django booking creation failed:', res.error);
        const serverMsg = res.error.userMessage || 'Failed to save booking to database.';
        this.paymentError.set(`Database Error: ${serverMsg}`);
        this.toast.error(serverMsg, 'Booking Failed');
        this.isProcessing.set(false);
        return;
      }

      const bData = res.data?.booking || res.data;
      const backendBookingId = bData?.id;

      if (!backendBookingId) {
        this.paymentError.set('Backend did not return a valid booking ID.');
        this.isProcessing.set(false);
        return;
      }

      const rawBookingData = {
        ...bData,
        status: 'confirmed',
        event_title: currentOrder.eventTitle,
        event_date: currentOrder.eventDate,
        event_time: currentOrder.eventTime,
        venue_name: currentOrder.eventLocation,
        address: currentOrder.eventAddress,
        cover_image_url: currentOrder.eventThumbnail,
        attendees: attendeesList,
        tickets: currentOrder.tickets.map(t => ({
          ticket_type: t.ticketTypeId,
          ticket_type_name: t.name,
          unit_price: t.price,
          quantity: t.quantity
        }))
      };

      const finalBooking: Booking = adaptDjangoBooking(rawBookingData);

      if (typeof window !== 'undefined') {
        if (backendBookingId) sessionStorage.setItem('eventhub_paid_booking_' + backendBookingId, 'confirmed');
        if (finalBooking.id) sessionStorage.setItem('eventhub_paid_booking_' + finalBooking.id, 'confirmed');
        if (finalBooking.bookingReference) sessionStorage.setItem('eventhub_paid_booking_' + finalBooking.bookingReference, 'confirmed');
      }

      this.clearTimer();
      this.bookingState.clearPendingOrder();
      this.bookingResult.set(finalBooking);
      this.paymentSuccess.set(true);

      // Generate both Booking QR and separate Ticket QR codes
      await this.generateQrCodesForBooking(finalBooking);

      if (user) {
        this.notificationService.dispatchBookingNotification({
          userId: user.id,
          userEmail: user.email,
          eventTitle: currentOrder.eventTitle,
          eventId: currentOrder.eventId,
          bookingReference: finalBooking.bookingReference || bData?.booking_reference || 'EVT-BOOKING',
          ticketsCount: currentOrder.tickets.reduce((acc, t) => acc + t.quantity, 0),
          totalAmount: finalBooking.totalAmount || currentOrder.totalAmount
        });
      }

      this.toast.success(
        `Booking (${finalBooking.bookingReference}) confirmed via UPI! Separate ticket passes generated.`,
        'Payment Successful 🎉'
      );

      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error('[PaymentGateway UPI] Error confirming booking:', err);
      this.paymentError.set(err.message || 'An unexpected error occurred during UPI processing.');
    } finally {
      this.isProcessing.set(false);
    }
  }

  async generateQrCodesForBooking(booking: Booking) {
    // 1. Generate Booking-level QR code mapped to backend booking reference or booking ID
    const bookingIdentifier = booking.bookingReference || booking.id;
    try {
      const bQr = await QRCode.toDataURL(bookingIdentifier, { width: 180, margin: 1 });
      this.qrCodeUrl.set(bQr);
      this.bookingQrCodeUrl.set(bQr);
    } catch (err) {
      console.error('Failed to generate booking QR code', err);
    }

    // 2. Generate separate QR code for each ticket pass mapped to backend ticket number or ticket ID
    const passes = booking.ticketPasses || [];
    const generated: Array<{ ticketId: string; ticketNumber: string; attendeeName: string; attendeeEmail?: string; qrUrl: string }> = [];

    for (let i = 0; i < passes.length; i++) {
      const pass = passes[i];
      const ticketIdentifier = pass.ticketNumber || pass.id;
      try {
        const tQr = await QRCode.toDataURL(ticketIdentifier, { width: 150, margin: 1 });
        generated.push({
          ticketId: pass.id,
          ticketNumber: pass.ticketNumber || `TKT-${pass.id.slice(0, 8).toUpperCase()}`,
          attendeeName: pass.attendeeName || `Attendee ${i + 1}`,
          attendeeEmail: pass.attendeeEmail,
          qrUrl: tQr
        });
      } catch (err) {
        console.error('Failed to generate ticket QR code for pass', pass.id, err);
      }
    }

    this.ticketQrCodes.set(generated);
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
