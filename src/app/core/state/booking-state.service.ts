import { inject, Injectable, signal } from '@angular/core';
import { SessionStorageService } from '@core/storage';

export interface TicketBookingOrder {
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventTime?: string;
  eventLocation?: string;
  eventAddress?: string;
  eventThumbnail?: string;
  tickets: Array<{
    ticketTypeId: string;
    name: string;
    price: number;
    quantity: number;
  }>;
  subtotal: number;
  discount: number;
  offerCode?: string | null;
  tax: number;
  totalAmount: number;
  expiresAt: number; // Unix timestamp for expiration (2 min)
}

const STORAGE_KEY = 'eventhub_pending_booking_order';

@Injectable({
  providedIn: 'root'
})
export class BookingStateService {
  private sessionStorage = inject(SessionStorageService);
  private _pendingOrder = signal<TicketBookingOrder | null>(null);

  readonly pendingOrder = this._pendingOrder.asReadonly();

  constructor() {
    this.restoreFromStorage();
  }

  setPendingOrder(order: Omit<TicketBookingOrder, 'expiresAt'>): TicketBookingOrder {
    const fullOrder: TicketBookingOrder = {
      ...order,
      expiresAt: Date.now() + 2 * 60 * 1000 // 2 minutes from now
    };
    this._pendingOrder.set(fullOrder);
    this.sessionStorage.set(STORAGE_KEY, fullOrder);
    return fullOrder;
  }

  getPendingOrder(): TicketBookingOrder | null {
    if (!this._pendingOrder()) {
      this.restoreFromStorage();
    }
    const current = this._pendingOrder();
    if (current && current.expiresAt < Date.now()) {
      this.clearPendingOrder();
      return null;
    }
    return current;
  }

  clearPendingOrder(): void {
    this._pendingOrder.set(null);
    this.sessionStorage.remove(STORAGE_KEY);
  }

  private restoreFromStorage(): void {
    const parsed = this.sessionStorage.get<TicketBookingOrder>(STORAGE_KEY);
    if (parsed) {
      if (parsed.expiresAt > Date.now()) {
        this._pendingOrder.set(parsed);
      } else {
        this.sessionStorage.remove(STORAGE_KEY);
      }
    }
  }
}

