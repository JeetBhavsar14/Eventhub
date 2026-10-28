import { Component, inject, OnInit, OnDestroy, signal, effect, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { ApiClient } from '@core/api';
import { LocationService } from '@core/state';
import { ButtonComponent, EventFilterComponent, IconComponent, EventCardComponent, PaginationBarComponent } from '@shared/components';
import { EventItem, EventFilter } from '@core/models';
import { EVENT_CATEGORIES, MOBILE_PRICE_FILTER_OPTIONS } from '@core/constants';
import { getStartingPrice, filterEvents } from '@core/utils';

@Component({
  selector: 'app-discover',
  standalone: true,
  imports: [CommonModule, RouterLink, ButtonComponent, EventFilterComponent, IconComponent, EventCardComponent, PaginationBarComponent],
  templateUrl: './discover.component.html',
  styleUrl: './discover.component.css'
})
export class DiscoverComponent implements OnInit, OnDestroy {
  private apiClient = inject(ApiClient);
  public locationService = inject(LocationService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  
  featuredEvents = signal<EventItem[]>([]);
  promotionalEvents = signal<EventItem[]>([]);
  isLoading = signal(true);
  isFiltering = signal(false);
  skeletonPlaceholders = [1, 2, 3, 4, 5, 6];

  // ── Pagination State (6 events per page) ─────────────────────
  readonly pageSize = signal<number>(6);
  readonly currentPage = signal<number>(1);

  readonly totalEvents = computed(() => this.featuredEvents().length);
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.totalEvents() / this.pageSize())));

  readonly paginatedEvents = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.featuredEvents().slice(start, start + this.pageSize());
  });

  readonly startIndex = computed(() => {
    if (this.totalEvents() === 0) return 0;
    return (this.currentPage() - 1) * this.pageSize() + 1;
  });

  readonly endIndex = computed(() => {
    return Math.min(this.currentPage() * this.pageSize(), this.totalEvents());
  });
  
  searchQuery = signal<string>('');
  currentSlideIndex = signal(0);
  private slideInterval: any;
  private filterDebounceTimer: any;


  currentFilter: EventFilter = {
    category: 'All',
    type: undefined,
    date: 'Any Date',
    customDate: undefined,
    price: 'Any Price'
  };

  // ── Mobile Filters Row & Drawer State ────────────────────────
  readonly categories = EVENT_CATEGORIES;
  readonly priceOptions = MOBILE_PRICE_FILTER_OPTIONS;

  showMobileFilterCard = signal(false);

  readonly activeFiltersCount = computed(() => {
    let count = 0;
    const f = this.currentFilter;
    if (f.category && f.category !== 'All') count++;
    if (f.type) count++;
    if (f.date && f.date !== 'Any Date') count++;
    if (f.customDate || f.startDate) count++;
    if (f.price && f.price !== 'Any Price' && f.price !== 'Any Range') count++;
    if (f.minPrice !== undefined || f.maxPrice !== undefined) count++;
    return count;
  });

  toggleMobileFilterCard() {
    this.showMobileFilterCard.update(v => !v);
  }

  closeMobileFilterCard() {
    this.showMobileFilterCard.set(false);
  }

  onMobileCategorySelect(category: string) {
    this.handleFilterChange({
      ...this.currentFilter,
      category,
      type: undefined
    });
  }

  onMobilePriceSelect(price: string) {
    const normalizedPrice = (price === 'Any Range' || price === 'Any Price') ? 'Any Price' : price;
    this.handleFilterChange({
      ...this.currentFilter,
      price: normalizedPrice,
      minPrice: normalizedPrice === 'Custom Range' ? this.currentFilter.minPrice : undefined,
      maxPrice: normalizedPrice === 'Custom Range' ? this.currentFilter.maxPrice : undefined
    });
  }

  mobileDropdownOpen = signal<'category' | 'price' | null>(null);

  toggleMobileDropdown(type: 'category' | 'price', event?: MouseEvent) {
    if (event) event.stopPropagation();
    this.mobileDropdownOpen.update(curr => curr === type ? null : type);
  }

  closeMobileDropdowns() {
    this.mobileDropdownOpen.set(null);
  }

  selectMobileCategory(cat: string, event?: MouseEvent) {
    if (event) event.stopPropagation();
    this.onMobileCategorySelect(cat);
    this.closeMobileDropdowns();
  }

  selectMobilePrice(pr: string, event?: MouseEvent) {
    if (event) event.stopPropagation();
    this.closeMobileDropdowns();
    if (pr === 'Custom Range') {
      this.handleFilterChange({
        ...this.currentFilter,
        price: 'Custom Range'
      });
      this.showMobileFilterCard.set(true);
    } else {
      this.onMobilePriceSelect(pr);
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (this.mobileDropdownOpen()) {
      this.closeMobileDropdowns();
    }
  }

  resetAllFilters() {
    this.handleFilterChange({
      category: 'All',
      type: undefined,
      date: 'Any Date',
      customDate: undefined,
      startDate: undefined,
      endDate: undefined,
      price: 'Any Price',
      minPrice: undefined,
      maxPrice: undefined
    });
    this.closeMobileFilterCard();
  }

  constructor() {
    effect(() => {
      const city = this.locationService.selectedCity();
      this.loadPromotionalEvents(city);
      this.loadEvents(city, this.currentFilter, true);
    });
  }

  ngOnInit() {
    this.startCarousel();
    
    this.route.queryParams.subscribe((params: any) => {
      this.searchQuery.set(params['search'] || '');
      this.currentFilter = {
        category: params['category'] || 'All',
        type: params['type'] || undefined,
        date: params['date'] || 'Any Date',
        customDate: params['customDate'] || undefined,
        startDate: params['startDate'] || undefined,
        endDate: params['endDate'] || undefined,
        price: params['price'] || 'Any Price',
        minPrice: params['minPrice'] ? Number(params['minPrice']) : undefined,
        maxPrice: params['maxPrice'] ? Number(params['maxPrice']) : undefined
      };
      
      this.currentPage.set(1);
      const city = this.locationService.selectedCity();
      this.loadEvents(city, this.currentFilter, true);
    });
  }

  ngOnDestroy() {
    this.stopCarousel();
    if (this.filterDebounceTimer) {
      clearTimeout(this.filterDebounceTimer);
    }
  }

  handleFilterChange(filter: EventFilter) {
    this.currentFilter = filter;
    this.currentPage.set(1);
    
    const queryParams: Record<string, string> = {};
    if (filter.category && filter.category !== 'All') queryParams['category'] = filter.category;
    if (filter.type) queryParams['type'] = filter.type;
    if (filter.date && filter.date !== 'Any Date') queryParams['date'] = filter.date;
    if (filter.customDate) queryParams['customDate'] = filter.customDate;
    if (filter.startDate) queryParams['startDate'] = filter.startDate;
    if (filter.endDate) queryParams['endDate'] = filter.endDate;
    if (filter.price && filter.price !== 'Any Price') queryParams['price'] = filter.price;
    if (filter.minPrice !== undefined && filter.minPrice !== null) queryParams['minPrice'] = String(filter.minPrice);
    if (filter.maxPrice !== undefined && filter.maxPrice !== null) queryParams['maxPrice'] = String(filter.maxPrice);
    
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      replaceUrl: true
    });
    
    clearTimeout(this.filterDebounceTimer);
    this.filterDebounceTimer = setTimeout(() => {
      const city = this.locationService.selectedCity();
      this.loadEvents(city, this.currentFilter, false);
    }, 180);
  }

  private startCarousel() {
    this.stopCarousel();
    this.slideInterval = setInterval(() => {
      if (this.promotionalEvents().length > 0) {
        this.currentSlideIndex.set((this.currentSlideIndex() + 1) % this.promotionalEvents().length);
      }
    }, 6000);
  }

  private stopCarousel() {
    if (this.slideInterval) {
      clearInterval(this.slideInterval);
    }
  }

  setSlide(index: number) {
    this.currentSlideIndex.set(index);
    this.startCarousel();
  }

  getStartingPrice(event: any): number {
    return getStartingPrice(event, 0);
  }

  private async loadEvents(city: string, filter: any, isInitial: boolean = false) {
    if (isInitial || this.featuredEvents().length === 0) {
      this.isLoading.set(true);
    } else {
      this.isFiltering.set(true);
    }
    try {
      let query = `location.city=${city}`;
      if (filter.category && filter.category !== 'All') {
        query += `&category=${encodeURIComponent(filter.category)}`;
      }
      
      const response = await this.apiClient.get<EventItem[]>(`/events?${query}`);
      const rawEvents: EventItem[] = response.data || [];
      const fetchedEvents = filterEvents(rawEvents, this.searchQuery(), filter);

      this.featuredEvents.set(fetchedEvents);
    } catch (err) {
      console.error('Failed to load events:', err);
      this.featuredEvents.set([]);
    } finally {
      this.isLoading.set(false);
      this.isFiltering.set(false);
    }
  }

  private async loadPromotionalEvents(city: string) {
    try {
      const response = await this.apiClient.get<EventItem[]>('/events', { 
        isPopular: true,
        'location.city': city
      });
      if (!response.error && response.data) {
        this.promotionalEvents.set(response.data.slice(0, 2));
      } else {
        this.promotionalEvents.set([]);
      }
    } catch (err) {
      console.error('Failed to load promotional events:', err);
      this.promotionalEvents.set([]);
    }
  }

  clearActiveSearch() {
    this.searchQuery.set('');
    this.currentPage.set(1);
    const params: any = { ...this.route.snapshot.queryParams };
    delete params['search'];
    this.router.navigate(['/discover'], { queryParams: params });
  }

  // ── Pagination Actions ───────────────────────────────────────
  goToPage(page: number) {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    this.scrollToEventsTop();
  }


  scrollToEventsTop() {
    setTimeout(() => {
      const el = document.getElementById('discover-events-section') || document.querySelector('.events-main');
      if (el) {
        const y = el.getBoundingClientRect().top + window.scrollY - 90;
        window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
      }
    }, 40);
  }

  getCategoryIcon(category?: string): string {
    if (!category) return 'others';
    const c = category.toLowerCase();
    if (c.includes('concert')) return 'concerts';
    if (c.includes('sport')) return 'sports';
    if (c.includes('conf')) return 'conferences';
    if (c.includes('workshop')) return 'workshops';
    if (c.includes('fest')) return 'festivals';
    if (c.includes('show') || c.includes('entertainment')) return 'shows';
    if (c.includes('activit')) return 'activities';
    if (c.includes('tech')) return 'technology';
    if (c.includes('art') || c.includes('culture')) return 'arts';
    if (c.includes('food') || c.includes('life')) return 'food';
    if (c.includes('comedy') || c.includes('theater')) return 'comedy';
    if (c.includes('wellness') || c.includes('health')) return 'wellness';
    if (c.includes('part') || c.includes('night')) return 'parties';
    return 'others';
  }
}


