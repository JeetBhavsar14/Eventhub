import { Component, inject, OnInit, OnDestroy, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ApiClient } from '@core/api';
import { LocationService } from '@core/state';
import { ButtonComponent, InputComponent, EventFilterComponent } from '@shared/components';
import { SVGS } from '@shared/assets';
import { EventFilter } from '@core/models/event-membership.model';

@Component({
  selector: 'app-discover',
  standalone: true,
  imports: [CommonModule, RouterLink, ButtonComponent, EventFilterComponent],
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
  skeletonPlaceholders = [1, 2, 3, 4, 5, 6];
  
  currentSlideIndex = signal(0);
  private slideInterval: any;

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

    effect(() => {
      const city = this.locationService.selectedCity();
      this.loadPromotionalEvents(city);
      this.loadEvents(city, this.currentFilter);
    });
  }

  ngOnInit() {
    this.startCarousel();
    
    this.route.queryParams.subscribe((params: any) => {
      this.currentFilter = {
        category: params['category'] || this.currentFilter.category,
        type: params['type'] || undefined,
        date: params['date'] || this.currentFilter.date,
        customDate: params['customDate'] || undefined,
        price: params['price'] || this.currentFilter.price
      };
      
      const city = this.locationService.selectedCity();
      this.loadEvents(city, this.currentFilter);
    });
  }

  ngOnDestroy() {
    this.stopCarousel();
  }

  handleFilterChange(filter: any) {
    this.currentFilter = filter;
    
    const queryParams: any = {};
    if (filter.category !== 'All') queryParams.category = filter.category;
    if (filter.type) queryParams.type = filter.type;
    if (filter.date !== 'Any Date') queryParams.date = filter.date;
    if (filter.customDate) queryParams.customDate = filter.customDate;
    if (filter.price !== 'Any Price') queryParams.price = filter.price;
    
    const scrollY = window.scrollY;

this.router.navigate([], {
  relativeTo: this.route,
  queryParams,
  queryParamsHandling: 'merge',
  replaceUrl: true
}).then(() => {
  window.scrollTo({
    top: scrollY,
    behavior: 'instant'
  });
});
    
    const city = this.locationService.selectedCity();
    this.loadEvents(city, this.currentFilter);
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

  private async loadEvents(city: string, filter: any) {
    this.isLoading.set(true);
    try {
      let query = `location.city=${city}`;
      if (filter.category && filter.category !== 'All') {
        query += `&category=${encodeURIComponent(filter.category)}`;
      }
      
      const response = await this.apiClient.get<any[]>(`/events?${query}`);
      let fetchedEvents = response.data || [];

      // Client-side Type filter
      if (filter.type && !filter.type.startsWith('All')) {
        // Here we'd ideally query the backend, but since mock db only has category we can do text matching
        fetchedEvents = fetchedEvents.filter(e => e.title.includes(filter.type) || e.description.includes(filter.type) || e.category === filter.type);
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
          return true;
        });
      }

      // Client-side Date filter (using our mock 2026 dates)
      if (filter.date === 'Today') {
        fetchedEvents = fetchedEvents.filter(e => e.date === '2026-11-01');
      } else if (filter.date === 'Tomorrow') {
        fetchedEvents = fetchedEvents.filter(e => e.date === '2026-11-02');
      } else if (filter.date === 'This Weekend') {
        fetchedEvents = fetchedEvents.filter(e => e.date === '2026-11-03' || e.date === '2026-11-04');
      } else if (filter.date === 'Next Week') {
        fetchedEvents = fetchedEvents.filter(e => e.date === '2026-11-05' || e.date === '2026-11-06');
      } else if (filter.date === 'Custom Date' && filter.customDate) {
        fetchedEvents = fetchedEvents.filter(e => e.date === filter.customDate);
      }

      this.featuredEvents.set(fetchedEvents);
    } catch (err) {
      console.error('Failed to load events:', err);
      this.featuredEvents.set([]);
    } finally {
      this.isLoading.set(false);
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
}
