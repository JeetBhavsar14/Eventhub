import { Component, inject, OnInit, OnDestroy, signal, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ApiClient } from '@core/api';
import { LocationService } from '@core/state';
import { ButtonComponent, InputComponent, EventFilterComponent, IconComponent } from '@shared/components';
import { SVGS } from '@shared/assets';
import { EventFilter } from '@core/models/event-membership.model';

@Component({
  selector: 'app-discover',
  standalone: true,
  imports: [CommonModule, RouterLink, ButtonComponent, EventFilterComponent, IconComponent],
  templateUrl: './discover.component.html',
  styleUrl: './discover.component.css'
})
export class DiscoverComponent implements OnInit, OnDestroy {
  private apiClient = inject(ApiClient);
  public locationService = inject(LocationService);
  private sanitizer = inject(DomSanitizer);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  
  featuredEvents = signal<any[]>([]);
  promotionalEvents = signal<any[]>([]);
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

  readonly pageNumbers = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const delta = 2;
    const pages: (number | string)[] = [];

    for (let i = 1; i <= total; i++) {
      if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== '...') {
        pages.push('...');
      }
    }
    return pages;
  });
  
  searchQuery = signal<string>('');
  currentSlideIndex = signal(0);
  private slideInterval: any;
  private filterDebounceTimer: any;

  calendarSvg: SafeHtml;
  mapPinSvg: SafeHtml;
  ticketSvg: SafeHtml;
  trendingSvg: SafeHtml;

  categorySvgs: Record<string, SafeHtml> = {};

  currentFilter: EventFilter = {
    category: 'All',
    type: undefined,
    date: 'Any Date',
    customDate: undefined,
    price: 'Any Price'
  };

  constructor() {
    this.calendarSvg = this.sanitizer.bypassSecurityTrustHtml(SVGS.calendar);
    this.mapPinSvg = this.sanitizer.bypassSecurityTrustHtml(SVGS.mapPin);
    this.ticketSvg = this.sanitizer.bypassSecurityTrustHtml(SVGS.ticket);
    this.trendingSvg = this.sanitizer.bypassSecurityTrustHtml(SVGS.trending);

    this.categorySvgs['Concerts'] = this.sanitizer.bypassSecurityTrustHtml(SVGS.concerts);
    this.categorySvgs['Sports'] = this.sanitizer.bypassSecurityTrustHtml(SVGS.sports);
    this.categorySvgs['Conferences'] = this.sanitizer.bypassSecurityTrustHtml(SVGS.conferences);
    this.categorySvgs['Workshops'] = this.sanitizer.bypassSecurityTrustHtml(SVGS.workshops);
    this.categorySvgs['Festivals'] = this.sanitizer.bypassSecurityTrustHtml(SVGS.festivals);
    this.categorySvgs['Others'] = this.sanitizer.bypassSecurityTrustHtml(SVGS.others);
    this.categorySvgs['Shows & Entertainment'] = this.sanitizer.bypassSecurityTrustHtml(SVGS.shows);
    this.categorySvgs['Activities'] = this.sanitizer.bypassSecurityTrustHtml(SVGS.activities);
    this.categorySvgs['Technology'] = this.sanitizer.bypassSecurityTrustHtml(SVGS.technology);
    this.categorySvgs['Arts & Culture'] = this.sanitizer.bypassSecurityTrustHtml(SVGS.arts);
    this.categorySvgs['Food & Lifestyle'] = this.sanitizer.bypassSecurityTrustHtml(SVGS.food);
    this.categorySvgs['Comedy & Theater'] = this.sanitizer.bypassSecurityTrustHtml(SVGS.comedy);
    this.categorySvgs['Health & Wellness'] = this.sanitizer.bypassSecurityTrustHtml(SVGS.wellness);
    this.categorySvgs['Parties & Nightlife'] = this.sanitizer.bypassSecurityTrustHtml(SVGS.parties);

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

  getCategorySvg(category: string): SafeHtml {
    return this.categorySvgs[category] || this.ticketSvg;
  }

  getStartingPrice(event: any): number {
    if (!event.ticketTypes || event.ticketTypes.length === 0) return 0;
    const prices = event.ticketTypes.map((t: any) => t.price || 0);
    return Math.min(...prices);
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
      
      const response = await this.apiClient.get<any[]>(`/events?${query}`);
      let fetchedEvents = response.data || [];

      // Client-side Search filter
      const search = this.searchQuery().trim().toLowerCase();
      if (search) {
        fetchedEvents = fetchedEvents.filter(e => 
          (e.title && e.title.toLowerCase().includes(search)) || 
          (e.category && e.category.toLowerCase().includes(search)) || 
          (e.description && e.description.toLowerCase().includes(search)) || 
          (e.location?.venue && e.location.venue.toLowerCase().includes(search)) || 
          (e.location?.city && e.location.city.toLowerCase().includes(search))
        );
      }

      // Client-side Type filter
      if (filter.type && !filter.type.startsWith('All')) {
        fetchedEvents = fetchedEvents.filter(e => 
          (e.title && e.title.includes(filter.type)) || 
          (e.description && e.description.includes(filter.type)) || 
          e.category === filter.type
        );
      }

      // Client-side Price filter
      if (filter.price && filter.price !== 'Any Price') {
        fetchedEvents = fetchedEvents.filter(e => {
          const price = e.ticketTypes?.[0]?.price || 500;
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

      // Client-side Date filter
      if (filter.startDate || filter.endDate) {
        fetchedEvents = fetchedEvents.filter(e => {
          if (!e.date) return false;
          if (filter.startDate && e.date < filter.startDate) return false;
          if (filter.endDate && e.date > filter.endDate) return false;
          return true;
        });
      } else if (filter.date === 'Today') {
        fetchedEvents = fetchedEvents.filter(e => e.date === '2026-11-01');
      } else if (filter.date === 'Tomorrow') {
        fetchedEvents = fetchedEvents.filter(e => e.date === '2026-11-02');
      } else if (filter.date === 'This Weekend') {
        fetchedEvents = fetchedEvents.filter(e => e.date === '2026-11-03' || e.date === '2026-11-04' || e.date === '2026-11-07' || e.date === '2026-11-08');
      } else if (filter.date === 'Next Week') {
        fetchedEvents = fetchedEvents.filter(e => e.date >= '2026-11-05' && e.date <= '2026-11-12');
      } else if (filter.date === 'Custom Date' && filter.customDate) {
        fetchedEvents = fetchedEvents.filter(e => e.date === filter.customDate);
      }

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
      const response = await this.apiClient.get<any[]>('/events', { 
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
  goToPage(page: number | string) {
    if (typeof page !== 'number') return;
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    this.scrollToEventsTop();
  }

  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.goToPage(this.currentPage() + 1);
    }
  }

  prevPage() {
    if (this.currentPage() > 1) {
      this.goToPage(this.currentPage() - 1);
    }
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
}

