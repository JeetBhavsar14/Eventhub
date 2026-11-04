/**
 * Event domain utility functions
 */

export interface TicketTypeLike {
  price?: number | string;
  available?: number;
  name?: string;
}

export interface EventLike {
  id?: string;
  title?: string;
  price?: number | string;
  startingPrice?: number | string;
  starting_price?: number | string;
  min_price?: number | string;
  ticketTypes?: TicketTypeLike[];
}

/**
 * Calculates the lowest starting price for an event.
 * If tickets are empty or invalid, falls back to direct event price, then fallback.
 */
export function getStartingPrice(event?: EventLike | null, fallback: number = 0): number {
  if (!event) {
    return fallback;
  }

  if (event.ticketTypes && event.ticketTypes.length > 0) {
    const prices = event.ticketTypes
      .map((t) => {
        if (typeof t.price === 'number') return t.price;
        if (typeof t.price === 'string') return parseFloat(t.price);
        return NaN;
      })
      .filter((p) => !isNaN(p));
      
    if (prices.length > 0) return Math.min(...prices);
  }

  const directPrice = event.startingPrice ?? event.price ?? (event as any).starting_price ?? (event as any).min_price;
  if (directPrice !== undefined && directPrice !== null) {
    const num = typeof directPrice === 'string' ? parseFloat(directPrice) : Number(directPrice);
    if (!isNaN(num)) return num;
  }

  return fallback;
}

/**
 * Formats starting price string (e.g. "Free Entry" or "₹500")
 */
export function formatStartingPrice(event?: EventLike | null, freeLabel: string = 'Free Entry'): string {
  if (!event) return freeLabel;

  const hasTickets = !!(event.ticketTypes && event.ticketTypes.length > 0);
  const hasDirectPrice = event.startingPrice !== undefined || event.price !== undefined || 
    (event as any).starting_price !== undefined || (event as any).min_price !== undefined;

  if (!hasTickets && !hasDirectPrice) {
    return freeLabel;
  }

  const price = getStartingPrice(event, 0);
  return price > 0 ? `₹${price}` : freeLabel;
}
