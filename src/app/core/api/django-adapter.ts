import { EventItem, User, Booking, BookingTicket, BookingTicketPass, BookingAttendee, HostApplicationData, AdminHostApplication } from '@core/models';

const DEFAULT_EVENT_IMAGE = 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&w=800&q=80';

export interface EventMetadata {
  title: string;
  date: string;
  time?: string;
  venue?: string;
  address?: string;
  thumbnail?: string;
}

const eventMetadataCache = new Map<string, EventMetadata>();

export function registerEventMetadata(eventId: string, meta: EventMetadata): void {
  if (!eventId) return;
  const idStr = String(eventId);
  eventMetadataCache.set(idStr, meta);
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem('eventhub_event_meta_' + idStr, JSON.stringify(meta));
    } catch {}
  }
}

export function getEventMetadata(eventId: string): EventMetadata | undefined {
  if (!eventId) return undefined;
  const idStr = String(eventId);
  if (eventMetadataCache.has(idStr)) {
    return eventMetadataCache.get(idStr);
  }
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const stored = localStorage.getItem('eventhub_event_meta_' + idStr);
      if (stored) {
        const parsed = JSON.parse(stored);
        eventMetadataCache.set(idStr, parsed);
        return parsed;
      }
    } catch {}
  }
  return undefined;
}

/**
 * Normalizes a Django REST Framework Event object into the frontend EventItem format.
 */
export function adaptDjangoEvent(item: any): EventItem {
  if (!item) return item;

  // If already in frontend EventItem format:
  if (item.thumbnailUrl && item.ticketTypes) {
    return item as EventItem;
  }

  const start = item.start_at ? new Date(item.start_at) : null;
  const dateStr = start && !isNaN(start.getTime()) 
    ? start.toISOString().split('T')[0] 
    : (item.date || '2026-11-15');

  const timeStr = start && !isNaN(start.getTime())
    ? start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
    : (item.time || '07:00 PM');

  const format: 'In-Person' | 'Online' | 'Hybrid' = 
    item.event_type === 'online' ? 'Online' : (item.event_type === 'hybrid' ? 'Hybrid' : 'In-Person');

  const coverImage = item.cover_image_url || DEFAULT_EVENT_IMAGE;

  const adapted: EventItem = {
    id: String(item.id),
    title: item.title || 'Untitled Event',
    description: item.description || '',
    category: item.category_name || item.category || 'General',
    subcategory: item.subcategory_name || item.subcategory || undefined,
    format,
    status: (item.status === 'published' || item.status === 'draft' || item.status === 'completed' || item.status === 'cancelled') 
      ? item.status 
      : 'published',
    isFeatured: Boolean(item.is_featured ?? true),
    isPopular: Boolean(item.is_popular ?? true),
    thumbnailUrl: coverImage,
    imageUrl: coverImage,
    date: dateStr,
    time: timeStr,
    location: {
      venue: item.venue_name || 'EventHub Venue',
      city: item.city || 'Indore',
      address: item.address || undefined
    },
    capacity: item.capacity || 100,
    ticketTypes: item.ticket_types || [],
    maxTicketsPerBooking: 10,
    hostId: item.user || item.host_email || undefined,
    createdAt: item.created_at || new Date().toISOString()
  };

  registerEventMetadata(adapted.id, {
    title: adapted.title,
    date: adapted.date,
    time: adapted.time,
    venue: adapted.location?.venue,
    address: adapted.location?.address,
    thumbnail: adapted.thumbnailUrl
  });

  return adapted;
}

/**
 * Normalizes DRF paginated or list event responses into EventItem[].
 */
export function adaptDjangoEventList(data: any): EventItem[] {
  if (!data) return [];
  const rawList = Array.isArray(data) ? data : (data.results && Array.isArray(data.results) ? data.results : []);
  const list = rawList.map(adaptDjangoEvent);
  if (data && typeof data.count === 'number') {
    (list as any).count = data.count;
    (list as any).next = data.next;
    (list as any).previous = data.previous;
  }
  return list;
}

/**
 * Normalizes a Django REST Framework User / Profile record into the frontend User model.
 */
export function mapDjangoUserToAppUser(djangoUser: any): User {
  if (!djangoUser) {
    throw new Error('No user data provided from Django');
  }

  const role = (djangoUser.platform_role || 'user').toLowerCase();
  const isSuperAdmin = role === 'super_admin';
  const isAdmin = isSuperAdmin || role === 'admin';
  const isHost = role === 'host' || isAdmin;

  // Determine appropriate display names
  let firstName = djangoUser.first_name || '';
  let lastName = djangoUser.last_name || '';

  if (!firstName && isSuperAdmin) {
    firstName = 'Super Admin';
  } else if (!firstName && djangoUser.email) {
    firstName = djangoUser.email.split('@')[0];
  }

  return {
    id: String(djangoUser.id),
    email: djangoUser.email,
    phone: djangoUser.phone || '',
    firstName,
    lastName,
    bio: djangoUser.bio || '',
    avatarUrl: djangoUser.avatar_url || '',
    isEmailVerified: Boolean(djangoUser.is_email_verified),
    isPhoneVerified: Boolean(djangoUser.is_phone_verified),
    isHost,
    platformRole: (isSuperAdmin ? 'super_admin' : (role === 'host' ? 'host' : 'user')) as User['platformRole'],
    createdAt: djangoUser.created_at || new Date().toISOString()
  };
}

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

/**
 * Normalizes a Django REST Framework HostApplication record into frontend HostApplicationData.
 */
export function adaptDjangoHostApplication(item: any): HostApplicationData {
  if (!item) return item;
  if (item.applicantName && item.organizationType) {
    return item as HostApplicationData;
  }

  const rawStatus = (item.status || 'pending').toLowerCase();
  const status: HostApplicationData['status'] =
    rawStatus === 'approved' ? 'approved' :
    rawStatus === 'rejected' ? 'rejected' :
    rawStatus === 'changes_requested' ? 'changes_requested' :
    'under_review';

  return {
    id: String(item.id),
    userId: String(item.user || ''),
    applicantName: item.business_name || 'Host Applicant',
    email: item.email || item.user_email || '',
    phone: item.phone || '',
    organizationType: (item.organization_type || 'agency') as HostApplicationData['organizationType'],
    organizationName: item.business_name || 'Independent Host',
    websiteOrSocial: item.website || '',
    experienceLevel: (item.experience_level || '1-3-years') as HostApplicationData['experienceLevel'],
    primaryCategories: item.primary_categories || ['Workshops', 'Conferences'],
    expectedAttendeeScale: item.expected_scale || '100 - 500 attendees',
    city: item.city || 'Indore',
    pastEventDescription: item.reason || '',
    idType: 'business_reg',
    status,
    statusMessage: item.admin_notes || (
      status === 'approved' ? 'Your host application has been approved! You have full organizer privileges.' :
      status === 'rejected' ? 'Your host application was rejected by curation.' :
      'Your application is currently under review by the EventHub curation board.'
    ),
    submittedAt: item.created_at || new Date().toISOString(),
    updatedAt: item.updated_at || new Date().toISOString()
  };
}

/**
 * Normalizes DRF paginated or list host application responses into HostApplicationData[].
 */
export function adaptDjangoHostApplicationList(data: any): HostApplicationData[] {
  if (!data) return [];
  const rawList = Array.isArray(data) ? data : (data.results && Array.isArray(data.results) ? data.results : []);
  return rawList.map(adaptDjangoHostApplication);
}

/**
 * Normalizes a Django REST Framework HostApplication record into AdminHostApplication.
 */
export function adaptDjangoAdminHostApplication(item: any): AdminHostApplication {
  if (!item) return item;
  if (item.applicantName && item.expectedScale) {
    return item as AdminHostApplication;
  }

  const rawStatus = (item.status || 'pending').toLowerCase();
  const status: AdminHostApplication['status'] =
    rawStatus === 'approved' ? 'approved' :
    rawStatus === 'rejected' ? 'rejected' :
    rawStatus === 'changes_requested' ? 'changes_requested' :
    'under_review';

  const createdAt = item.created_at || new Date().toISOString();

  return {
    id: String(item.id),
    applicantName: item.business_name || 'Host Applicant',
    email: item.email || item.user_email || 'applicant@eventhub.com',
    phone: item.phone || '+91 98000 00000',
    organizationName: item.business_name || 'Independent Host',
    organizationType: item.organization_type || 'agency',
    city: item.city || 'Indore',
    expectedScale: item.expected_scale || '100 - 500 attendees',
    primaryCategories: item.primary_categories || ['Workshops', 'Conferences'],
    pastExperience: item.reason || '',
    idDocName: 'business_verification.pdf',
    status,
    submittedDate: createdAt.split('T')[0],
    submittedAt: createdAt
  };
}

/**
 * Normalizes DRF paginated or list host application responses into AdminHostApplication[].
 */
export function adaptDjangoAdminHostApplicationList(data: any): AdminHostApplication[] {
  if (!data) return [];
  const rawList = Array.isArray(data) ? data : (data.results && Array.isArray(data.results) ? data.results : []);
  return rawList.map(adaptDjangoAdminHostApplication);
}



