import { Component, Input, Output, EventEmitter, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ButtonComponent, InputComponent } from '@shared/components';

@Component({
  selector: 'app-ticket-booking-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonComponent, InputComponent],
  templateUrl: './ticket-booking-form.component.html',
  styleUrl: './ticket-booking-form.component.css'
})
export class TicketBookingFormComponent {
  @Input() event!: any;
  @Input() currentUser!: any;
  @Output() bookingComplete = new EventEmitter<any>();
  @Output() cancel = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  
  // State for tickets selection: { [ticketTypeId]: quantity }
  selectedTickets = signal<{ [key: string]: number }>({});
  
  paymentForm: FormGroup = this.fb.group({
    cardNumber: ['', [Validators.required, Validators.minLength(16), Validators.maxLength(16)]],
    expiry: ['', Validators.required],
    cvv: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(4)]],
    nameOnCard: ['', Validators.required]
  });

  isProcessing = signal(false);
  errorMsg = signal('');

  totalAmount = computed(() => {
    let total = 0;
    const selections = this.selectedTickets();
    if (this.event?.ticketTypes) {
      for (const tt of this.event.ticketTypes) {
        if (selections[tt.id]) {
          total += tt.price * selections[tt.id];
        }
      }
    }
    return total;
  });

  totalQuantity = computed(() => {
    const selections = this.selectedTickets();
    return Object.values(selections).reduce((a, b) => a + b, 0);
  });

  updateQuantity(ticketTypeId: string, change: number) {
    const current = this.selectedTickets()[ticketTypeId] || 0;
    const next = Math.max(0, current + change);
    
    const currentTotal = this.totalQuantity();
    if (change > 0 && currentTotal >= (this.event.maxTicketsPerBooking || 10)) {
      this.errorMsg.set(`Maximum ${this.event.maxTicketsPerBooking} tickets per booking allowed.`);
      return;
    }
    
    this.errorMsg.set('');
    this.selectedTickets.update(st => ({ ...st, [ticketTypeId]: next }));
  }

  getQuantity(ticketTypeId: string): number {
    return this.selectedTickets()[ticketTypeId] || 0;
  }

  processBooking() {
    if (this.totalQuantity() === 0) {
      this.errorMsg.set('Please select at least one ticket.');
      return;
    }
    if (this.paymentForm.invalid) {
      this.paymentForm.markAllAsTouched();
      this.errorMsg.set('Please fill out valid payment details.');
      return;
    }

    this.isProcessing.set(true);
    this.errorMsg.set('');

    const selections = this.selectedTickets();
    const ticketsBooked = [];
    for (const tt of this.event.ticketTypes) {
       if (selections[tt.id] > 0) {
         ticketsBooked.push({
            ticketTypeId: tt.id,
            name: tt.name,
            price: tt.price,
            quantity: selections[tt.id]
         });
       }
    }

    const bookingPayload = {
      eventId: this.event.id,
      eventTitle: this.event.title,
      eventDate: this.event.date,
      eventLocation: this.event.location?.venue,
      eventThumbnail: this.event.thumbnailUrl,
      userId: this.currentUser?.id,
      tickets: ticketsBooked,
      totalAmount: this.totalAmount(),
      status: 'confirmed',
      paymentDetails: {
         last4: this.paymentForm.value.cardNumber.slice(-4)
      },
      createdAt: new Date().toISOString()
    };
    
    this.bookingComplete.emit(bookingPayload);
  }
}
