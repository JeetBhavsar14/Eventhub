export interface BookingAttendee {
  name: string;
  email: string;
  phone?: string;
}

export interface BookingTicketPass {
  id: string;
  ticketNumber: string;
  attendeeName: string;
  attendeeEmail?: string;
  status: 'valid' | 'cancelled';
  issuedAt?: string;
  price?: number;
}

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
  ticketPasses?: BookingTicketPass[];
  attendees?: BookingAttendee[];
  totalAmount: number;
  status: 'confirmed' | 'cancelled' | 'pending' | 'partially_cancelled';
  createdAt: string;
  attendee?: { id: string; name: string; email: string; phone: string };
  payment?: { label: string; status: 'paid' | 'pending' | 'failed'; transactionReference?: string };
}
