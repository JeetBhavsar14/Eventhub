import { EventItem, EventTicketType } from '@core/models';

export const DEFAULT_EVENT_IMAGE = 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&w=800&q=80';

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
    if (item.startingPrice === undefined && Array.isArray(item.ticketTypes) && item.ticketTypes.length > 0) {
      const prices = item.ticketTypes
        .map((t: any) => typeof t.price === 'string' ? parseFloat(t.price) : Number(t.price))
        .filter((p: number) => !isNaN(p));
      if (prices.length > 0) {
        item.startingPrice = Math.min(...prices);
      }
    }
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

  // Normalize ticket types from Django response if available
  const rawTicketTypes = item.ticket_types || item.ticketTypes || [];
  const ticketTypes: EventTicketType[] = Array.isArray(rawTicketTypes) ? rawTicketTypes.map((tt: any) => {
    const rawPrice = tt.price ?? tt.unit_price ?? tt.total_price ?? tt.total_amount ?? (tt.tickets?.[0]?.price) ?? 0;
    const rawName = tt.name || tt.ticket_type_name || (tt.tickets?.[0]?.name) || 'General';
    const rawAvailable = tt.available_quantity !== undefined 
      ? tt.available_quantity 
      : (tt.available !== undefined ? tt.available : tt.total_quantity);
    const rawCapacity = tt.total_quantity ?? tt.capacity ?? 100;

    return {
      id: String(tt.id || tt.ticket_type || tt.ticketTypeId || ''),
      name: rawName,
      price: typeof rawPrice === 'string' ? parseFloat(rawPrice) || 0 : Number(rawPrice) || 0,
      capacity: Number(rawCapacity) || 100,
      available: rawAvailable !== undefined ? Number(rawAvailable) : 100,
      description: tt.description || ''
    };
  }) : [];

  // Parse direct price on item if present
  const rawItemPrice = item.price ?? item.starting_price ?? item.min_price ?? item.ticket_price;
  const parsedPrice = (rawItemPrice !== undefined && rawItemPrice !== null)
    ? (typeof rawItemPrice === 'string' ? parseFloat(rawItemPrice) : Number(rawItemPrice))
    : undefined;
  const directPrice = (parsedPrice !== undefined && !isNaN(parsedPrice)) ? parsedPrice : undefined;

  let computedStartingPrice: number | undefined = directPrice;
  if (ticketTypes.length > 0) {
    const minTicketPrice = Math.min(...ticketTypes.map(t => t.price));
    if (!isNaN(minTicketPrice)) {
      computedStartingPrice = minTicketPrice;
    }
  }

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
    ticketTypes,
    price: directPrice ?? computedStartingPrice,
    startingPrice: computedStartingPrice,
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

