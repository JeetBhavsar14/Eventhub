export interface BookingTicket {
  ticketTypeId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface Booking {
  id: string;
  bookingReference?: string;
  userId: string;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventTime?: string;
  eventLocation?: string;
  eventAddress?: string;
  eventThumbnail?: string;
  tickets: BookingTicket[];
  totalAmount: number;
  status: 'confirmed' | 'cancelled' | 'pending';
  createdAt: string;
  attendee?: { id: string; name: string; email: string; phone: string };
  payment?: { label: string; status: 'paid' | 'pending' | 'failed'; transactionReference?: string };
}
