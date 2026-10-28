import { EventItem } from '../models/event.model';
import { EventFilter } from '../models/event-membership.model';
import { getStartingPrice } from './event.utils';

/**
 * Pure client-side filtering function for events.
 * Encapsulates search queries, category/type narrowing, price tiering, and date boundaries.
 */
export function filterEvents(
  events: EventItem[],
  searchQuery: string,
  filter: EventFilter
): EventItem[] {
  let result = [...events];

  // 1. Search Query Filter
  const search = searchQuery.trim().toLowerCase();
  if (search) {
    result = result.filter(e =>
      (e.title && e.title.toLowerCase().includes(search)) ||
      (e.category && e.category.toLowerCase().includes(search)) ||
      (e.description && e.description.toLowerCase().includes(search)) ||
      (e.location?.venue && e.location.venue.toLowerCase().includes(search)) ||
      (e.location?.city && e.location.city.toLowerCase().includes(search))
    );
  }

  // 2. Sub-Category / Type Filter
  if (filter.type && !filter.type.startsWith('All')) {
    result = result.filter(e =>
      (e.title && e.title.includes(filter.type!)) ||
      (e.description && e.description.includes(filter.type!)) ||
      e.category === filter.type ||
      e.subcategory === filter.type
    );
  }

  // 3. Price Filter
  if (filter.price && filter.price !== 'Any Price' && filter.price !== 'Any Range') {
    result = result.filter(e => {
      const price = getStartingPrice(e, 500);
      if (filter.price === 'Free') return price === 0;
      if (filter.price === 'Under ₹500') return price > 0 && price < 500;
      if (filter.price === '₹500 - ₹1500') return price >= 500 && price <= 1500;
      if (filter.price === '₹1500 - ₹3000') return price > 1500 && price <= 3000;
      if (filter.price === '₹3000+') return price > 3000;
      if (filter.price === 'Custom Range') {
        if (filter.minPrice !== undefined && price < filter.minPrice) return false;
        if (filter.maxPrice !== undefined && price > filter.maxPrice) return false;
        return true;
      }
      return true;
    });
  }

  // 4. Date Filter
  if (filter.startDate || filter.endDate) {
    result = result.filter(e => {
      if (!e.date) return false;
      if (filter.startDate && e.date < filter.startDate) return false;
      if (filter.endDate && e.date > filter.endDate) return false;
      return true;
    });
  } else if (filter.date === 'Today') {
    result = result.filter(e => e.date === '2026-11-01');
  } else if (filter.date === 'Tomorrow') {
    result = result.filter(e => e.date === '2026-11-02');
  } else if (filter.date === 'This Weekend') {
    result = result.filter(e =>
      e.date === '2026-11-03' ||
      e.date === '2026-11-04' ||
      e.date === '2026-11-07' ||
      e.date === '2026-11-08'
    );
  } else if (filter.date === 'Next Week') {
    result = result.filter(e => e.date >= '2026-11-05' && e.date <= '2026-11-12');
  } else if (filter.date === 'Custom Date' && filter.customDate) {
    result = result.filter(e => e.date === filter.customDate);
  }

  return result;
}
