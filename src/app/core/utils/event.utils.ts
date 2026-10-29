/**
 * Event domain utility functions
 */

export interface TicketTypeLike {
  price?: number;
  available?: number;
  name?: string;
}

export interface EventLike {
  id?: string;
  title?: string;
  ticketTypes?: TicketTypeLike[];
}

/**
 * Calculates the lowest starting price for an event.
 * If tickets are empty or invalid, falls back to a sensible default.
 */
export function getStartingPrice(event?: EventLike | null, fallback: number = 0): number {
  if (!event || !event.ticketTypes || event.ticketTypes.length === 0) {
    return fallback;
  }
  const prices = event.ticketTypes
    .map((t) => (typeof t.price === 'number' ? t.price : 0))
    .filter((p) => !isNaN(p));
    
  if (prices.length === 0) return fallback;
  return Math.min(...prices);
}

/**
 * Formats starting price string (e.g. "Free Entry" or "₹500")
 */
export function formatStartingPrice(event?: EventLike | null, freeLabel: string = 'Free Entry'): string {
  const price = getStartingPrice(event, 0);
  return price > 0 ? `₹${price}` : freeLabel;
}
