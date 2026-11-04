import { Booking, BookingTicket, BookingTicketPass } from '@core/models';
import { getEventMetadata, DEFAULT_EVENT_IMAGE } from './event.adapter';

/**
 * Normalizes a Django REST Framework Booking record into the frontend Booking model.
 */
export function adaptDjangoBooking(item: any): Booking {
  if (!item) return item;

  // If already in frontend Booking format:
  if (item.eventTitle && item.tickets && typeof item.totalAmount === 'number') {
    if (!item.ticketPasses || item.ticketPasses.length === 0) {
      const q = typeof item.quantity === 'number' && item.quantity > 0 ? item.quantity : 1;
      item.ticketPasses = Array.from({ length: q }, (_, idx) => ({
        id: `tkt-${item.id || 'pass'}-${idx + 1}`,
        ticketNumber: `TKT-${String(item.bookingReference || item.id || 'EVT').slice(0, 6).toUpperCase()}-${(idx + 1).toString().padStart(3, '0')}`,
        attendeeName: idx === 0 ? (item.attendee?.name || 'Primary Attendee') : `Guest ${idx + 1}`,
        attendeeEmail: idx === 0 ? (item.attendee?.email || '') : '',
        status: 'valid' as const,
        issuedAt: item.createdAt || new Date().toISOString(),
        price: item.totalAmount / q
      }));
    }
    const meta = getEventMetadata(String(item.eventId || item.event));
    if (meta) {
      if (meta.date) item.eventDate = meta.date;
      if (meta.title && (item.eventTitle === 'Confirmed Event' || !item.eventTitle)) item.eventTitle = meta.title;
      if (meta.time && (!item.eventTime || item.eventTime === '07:00 PM')) item.eventTime = meta.time;
      if (meta.venue && (!item.eventLocation || item.eventLocation === 'EventHub Venue')) item.eventLocation = meta.venue;
      if (meta.thumbnail && !item.eventThumbnail) item.eventThumbnail = meta.thumbnail;
    }
    return item as Booking;
  }

  const rawPrice = item.total_price || item.unit_price || item.total_amount || '0';
  const priceNum = typeof rawPrice === 'string' ? parseFloat(rawPrice) || 0 : Number(rawPrice) || 0;
  const qty = typeof item.quantity === 'number' && item.quantity > 0 
    ? item.quantity 
    : (Array.isArray(item.tickets) && item.tickets.length > 0 ? item.tickets.length : 1);

  const ticketsList: BookingTicket[] = (item.tickets && Array.isArray(item.tickets) && item.tickets.length > 0)
    ? item.tickets.map((t: any) => ({
        ticketTypeId: String(item.ticket_type || t.ticket_type || t.id || 'standard'),
        name: item.ticket_type_name || t.ticket_type_name || t.name || 'General',
        price: typeof t.price === 'number' ? t.price : (priceNum / qty),
        quantity: typeof t.quantity === 'number' ? t.quantity : 1
      }))
    : [
        {
          ticketTypeId: String(item.ticket_type || item.id || 'standard'),
          name: item.ticket_type_name || item.name || 'General',
          price: priceNum / qty,
          quantity: qty
        }
      ];

  const bookedAt = item.booked_at || item.created_at || new Date().toISOString();
  const eventIdStr = String(item.event || item.event_id || item.eventId || '');
  const cachedMeta = getEventMetadata(eventIdStr);

  const rawEventDate = item.event_date || item.start_at || item.event_start_at ||
    item.event?.start_at || item.event?.date || item.event_details?.start_at ||
    cachedMeta?.date;

  const eventDateStr = rawEventDate 
    ? (rawEventDate.includes('T') ? rawEventDate.split('T')[0] : rawEventDate)
    : (new Date(new Date(bookedAt).getTime() + 14 * 86400000).toISOString().split('T')[0]);

  const eventTitleStr = item.event_title || item.event?.title || item.event_details?.title || cachedMeta?.title || 'Confirmed Event';
  const eventTimeStr = item.event_time || item.event?.time || cachedMeta?.time || (bookedAt.includes('T') ? bookedAt.split('T')[1].slice(0, 5) : '07:00 PM');
  const eventLocationStr = item.venue_name || item.event?.venue_name || cachedMeta?.venue || 'EventHub Venue';
  const eventAddressStr = item.address || item.event?.address || cachedMeta?.address;
  const eventThumbnailStr = item.cover_image_url || item.event?.cover_image_url || cachedMeta?.thumbnail || DEFAULT_EVENT_IMAGE;

  let ticketPasses: BookingTicketPass[] = (item.tickets && Array.isArray(item.tickets) && item.tickets.length > 0)
    ? item.tickets.map((t: any, idx: number) => ({
        id: String(t.id || `pass-${item.id}-${idx + 1}`),
        ticketNumber: t.ticket_number || `TKT-${String(t.id || item.id).slice(0, 8).toUpperCase()}-${idx + 1}`,
        attendeeName: t.attendee_name || (item.attendees?.[idx]?.name) || (item.attendees?.[idx]?.attendee_name) || `Attendee ${idx + 1}`,
        attendeeEmail: t.attendee_email || (item.attendees?.[idx]?.email) || (item.attendees?.[idx]?.attendee_email) || '',
        status: (t.status === 'cancelled' ? 'cancelled' : 'valid') as 'valid' | 'cancelled',
        issuedAt: t.issued_at || bookedAt,
        price: typeof t.price === 'number' ? t.price : (priceNum / qty)
      }))
    : (item.attendees && Array.isArray(item.attendees) && item.attendees.length > 0)
      ? item.attendees.map((a: any, i: number) => ({
          id: `tkt-${item.id || 'pass'}-${i + 1}`,
          ticketNumber: `TKT-${String(item.id || 'EVT').slice(0, 6).toUpperCase()}-${(i + 1).toString().padStart(3, '0')}`,
          attendeeName: a.attendee_name || a.name || `Attendee ${i + 1}`,
          attendeeEmail: a.attendee_email || a.email || '',
          status: 'valid' as const,
          issuedAt: bookedAt,
          price: priceNum / (item.attendees.length || 1)
        }))
      : [];

  // Guarantee that ticketPasses has all passes up to the booking quantity
  if (ticketPasses.length < qty) {
    const startIdx = ticketPasses.length;
    for (let i = startIdx; i < qty; i++) {
      ticketPasses.push({
        id: `tkt-${item.id || 'pass'}-${i + 1}`,
        ticketNumber: `TKT-${String(item.id || 'EVT').slice(0, 6).toUpperCase()}-${(i + 1).toString().padStart(3, '0')}`,
        attendeeName: i === 0 ? (item.attendee_name || item.attendee?.name || 'Primary Attendee') : `Guest ${i + 1}`,
        attendeeEmail: i === 0 ? (item.attendee_email || item.attendee?.email || '') : '',
        status: 'valid',
        issuedAt: bookedAt,
        price: priceNum / qty
      });
    }
  }

  const rawAttendees = (item.attendees && Array.isArray(item.attendees) && item.attendees.length > 0)
    ? item.attendees.map((a: any) => ({
        name: a.attendee_name || a.name || 'Attendee',
        email: a.attendee_email || a.email || '',
        phone: a.attendee_phone || a.phone || ''
      }))
    : ticketPasses.map(p => ({
        name: p.attendeeName,
        email: p.attendeeEmail || ''
      }));

  const firstAttendee: any = ticketPasses[0] || item.tickets?.[0] || item.attendee;

  const isLocallyPaid = typeof window !== 'undefined' && 
    (sessionStorage.getItem('eventhub_paid_booking_' + item.id) === 'confirmed' ||
     sessionStorage.getItem('eventhub_paid_booking_' + item.booking_reference) === 'confirmed');

  const isLocallyCancelled = typeof window !== 'undefined' && 
    (sessionStorage.getItem('eventhub_cancelled_booking_' + item.id) === 'cancelled' ||
     sessionStorage.getItem('eventhub_cancelled_booking_' + item.booking_reference) === 'cancelled');

  // Check individual ticket cancellation in sessionStorage:
  ticketPasses = ticketPasses.map(p => {
    const isPassCancelled = typeof window !== 'undefined' && 
      (sessionStorage.getItem('eventhub_cancelled_ticket_' + p.id) === 'cancelled' ||
       sessionStorage.getItem('eventhub_cancelled_ticket_' + p.ticketNumber) === 'cancelled');
    if (isPassCancelled || isLocallyCancelled) {
      return { ...p, status: 'cancelled' as const };
    }
    return p;
  });

  const rawStatus = (item.status || 'confirmed').toLowerCase();
  const hasCancelled = ticketPasses.some(p => p.status === 'cancelled');
  const hasValid = ticketPasses.some(p => p.status === 'valid');

  let status: Booking['status'] =
    isLocallyCancelled ? 'cancelled' :
    rawStatus === 'cancelled' ? 'cancelled' :
    rawStatus === 'partially_cancelled' ? 'partially_cancelled' :
    (isLocallyPaid ? 'confirmed' : (rawStatus === 'pending' ? 'pending' : 'confirmed'));

  if (ticketPasses.length > 0) {
    if (!hasValid && hasCancelled) {
      status = 'cancelled';
    } else if (hasValid && hasCancelled) {
      status = 'partially_cancelled';
    }
  }

  return {
    id: String(item.id),
    bookingReference: item.booking_reference || `EVT-${String(item.id).slice(0, 8).toUpperCase()}`,
    userId: String(item.user || ''),
    eventId: eventIdStr,
    eventTitle: eventTitleStr,
    eventDate: eventDateStr,
    eventTime: eventTimeStr,
    eventLocation: eventLocationStr,
    eventAddress: eventAddressStr,
    eventThumbnail: eventThumbnailStr,
    tickets: ticketsList,
    ticketPasses,
    attendees: rawAttendees,
    totalAmount: parseFloat(item.total_price || item.total_amount || String(priceNum)),
    status,
    createdAt: bookedAt,
    attendee: {
      id: String(firstAttendee?.id || ''),
      name: firstAttendee?.attendeeName || firstAttendee?.attendee_name || item.attendee_name || 'Attendee',
      email: firstAttendee?.attendeeEmail || firstAttendee?.attendee_email || item.attendee_email || '',
      phone: firstAttendee?.attendee_phone || item.attendee_phone || ''
    },
    payment: {
      label: (status === 'confirmed' || isLocallyPaid) ? 'Paid Online (Stripe)' : 'Payment Pending',
      status: (status === 'confirmed' || isLocallyPaid) ? 'paid' : 'pending',
      transactionReference: item.booking_reference
    }
  };
}

/**
 * Normalizes DRF paginated or list booking responses into Booking[].
 */
export function adaptDjangoBookingList(data: any): Booking[] {
  if (!data) return [];
  const rawList = Array.isArray(data) ? data : (data.results && Array.isArray(data.results) ? data.results : []);
  return rawList.map(adaptDjangoBooking);
}

