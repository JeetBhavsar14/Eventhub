import { Component, inject, OnInit, AfterViewInit, ViewChild, ElementRef, signal, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiClient } from '@core/api';
import { LocationService } from '@core/state';
import { AuthService } from '@core/auth';
import { IconComponent } from '@shared/components';

export interface CategoryCard {
  id: string;
  name: string;
  tagline: string;
  icon: string;
  slug: string;
  imageUrl: string;
  eventsCount: number;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, IconComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit, AfterViewInit {
  private api = inject(ApiClient);
  public locationService = inject(LocationService);
  public authService = inject(AuthService);
  private router = inject(Router);

  @ViewChild('bgVideo') bgVideoRef?: ElementRef<HTMLVideoElement>;

  // Search & Filter State
  searchQuery = signal('');
  selectedCategory = signal('All');
  searchFocused = signal(false);
  recentSearches = signal<string[]>(['Festivals', 'Concerts', 'Mumbai', 'Comedy', 'Workshop']);

  // Custom Dropdown State
  showCityDropdown = signal(false);
  showCategoryDropdown = signal(false);

  // Events Data
  allEvents = signal<any[]>([]);
  isLoading = signal(true);

  // Spotlight Autocomplete Filtered Events (Matching Header Search Bar Logic)
  readonly spotlightEvents = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const events = this.allEvents();

    if (!query) {
      return events.filter(e => e.isFeatured || e.isPopular || e.status === 'published').slice(0, 4);
    }

    return events.filter(e =>
      (e.title && e.title.toLowerCase().includes(query)) ||
      (e.category && e.category.toLowerCase().includes(query)) ||
      (e.location?.venue && e.location.venue.toLowerCase().includes(query)) ||
      (e.location?.city && e.location.city.toLowerCase().includes(query)) ||
      (e.description && e.description.toLowerCase().includes(query))
    ).slice(0, 6);
  });

  // Categories Explorer Data with vibrant imagery
  readonly categories: CategoryCard[] = [
    {
      id: 'cat-festivals',
      name: 'Festivals & Music',
      tagline: 'EDM, Indie & Multi-day Camping',
      icon: 'music',
      slug: 'Festivals',
      imageUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=800&q=80',
      eventsCount: 24
    },
    {
      id: 'cat-concerts',
      name: 'Live Concerts',
      tagline: 'Stadium Tours & Acoustic Nights',
      icon: 'radio',
      slug: 'Concerts',
      imageUrl: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=800&q=80',
      eventsCount: 38
    },
    {
      id: 'cat-tech',
      name: 'Tech & Startups',
      tagline: 'AI Summits, Hackathons & Expos',
      icon: 'cpu',
      slug: 'Conferences',
      imageUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80',
      eventsCount: 19
    },
    {
      id: 'cat-shows',
      name: 'Theater & Comedy',
      tagline: 'Stand-up Specials & Broadway Drama',
      icon: 'smile',
      slug: 'Shows & Entertainment',
      imageUrl: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?auto=format&fit=crop&w=800&q=80',
      eventsCount: 15
    },
    {
      id: 'cat-sports',
      name: 'Sports & Racing',
      tagline: 'Marathons, Football & Esports',
      icon: 'activity',
      slug: 'Sports',
      imageUrl: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=800&q=80',
      eventsCount: 12
    },
    {
      id: 'cat-workshops',
      name: 'Workshops & Masterclasses',
      tagline: 'Culinary, Pottery & Design Labs',
      icon: 'book-open',
      slug: 'Workshops',
      imageUrl: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80',
      eventsCount: 16
    }
  ];

  // Category Filter Options
  readonly categoryOptions = [
    'All',
    'Festivals',
    'Concerts',
    'Conferences',
    'Shows & Entertainment',
    'Sports',
    'Workshops',
    'Activities',
    'Technology',
    'Arts & Culture',
    'Food & Lifestyle',
    'Comedy & Theater',
    'Health & Wellness',
    'Parties & Nightlife'
  ];

  // Popular Quick-Pill Cities
  readonly popularCities = [
    'Mumbai',
    'Delhi-NCR',
    'Bengaluru',
    'Ahmedabad',
    'Pune',
    'Hyderabad'
  ];

  // Complete list of searchable/selectable cities
  readonly allCities = [
    'Mumbai',
    'Delhi-NCR',
    'Bengaluru',
    'Ahmedabad',
    'Pune',
    'Hyderabad',
    'Chennai',
    'Kolkata',
    'Chandigarh',
    'Jaipur'
  ];

  // Normalize city names for robust matching (e.g., 'Delhi-NCR' === 'Delhi NCR' === 'delhi')
  normalizeCity(c: string | null | undefined): string {
    if (!c) return '';
    return c.toLowerCase().replace(/[-\s]+/g, '').trim();
  }

  isCityMatch(eventCity: string | null | undefined, targetCity: string | null | undefined): boolean {
    if (!targetCity || targetCity === 'All Cities') return true;
    if (!eventCity) return false;
    const nEvent = this.normalizeCity(eventCity);
    const nTarget = this.normalizeCity(targetCity);
    return nEvent === nTarget || nEvent.includes(nTarget) || nTarget.includes(nEvent);
  }

  isCityActive(city: string): boolean {
    return this.isCityMatch(this.locationService.selectedCity(), city);
  }

  // Reactive Computed Trending & Filtered Events for Selected City
  trendingEvents = computed(() => {
    const city = this.locationService.selectedCity();
    const query = this.searchQuery().trim().toLowerCase();
    const cat = this.selectedCategory();
    const events = this.allEvents().filter(e => e.status === 'published');

    let filtered = events;

    // 1. Filter by selected City (accurate city filtering)
    if (city && city !== 'All Cities') {
      const cityFiltered = filtered.filter(e => this.isCityMatch(e.location?.city, city));
      // If city has matching events, prioritize them; if fewer than 4, blend with other featured events
      filtered = cityFiltered.length >= 4 
        ? cityFiltered 
        : [...cityFiltered, ...filtered.filter(e => !cityFiltered.includes(e))];
    }

    // 2. Filter by Category
    if (cat && cat !== 'All') {
      const catFiltered = filtered.filter(e => 
        e.category && e.category.toLowerCase() === cat.toLowerCase()
      );
      if (catFiltered.length > 0) {
        filtered = catFiltered;
      }
    }

    // 3. Filter by Search Query in real-time
    if (query) {
      filtered = filtered.filter(e =>
        (e.title && e.title.toLowerCase().includes(query)) ||
        (e.description && e.description.toLowerCase().includes(query)) ||
        (e.location?.venue && e.location.venue.toLowerCase().includes(query)) ||
        (e.location?.city && e.location.city.toLowerCase().includes(query)) ||
        (e.category && e.category.toLowerCase().includes(query))
      );
    }

    return filtered;
  });

  // Curated Selection Dual-Row Marquee Data (Derived from local trending events)
  readonly curatedRow1 = computed(() => {
    const list = this.trendingEvents();
    if (!list.length) return [];
    const row = list.filter((_, i) => i % 2 === 0);
    // Pad to at least 5 cards so track has plenty of cards across all screen sizes
    return row.length < 5 ? [...row, ...row].slice(0, 8) : row.slice(0, 10);
  });

  readonly curatedRow2 = computed(() => {
    const list = this.trendingEvents();
    if (!list.length) return [];
    const row = list.filter((_, i) => i % 2 === 1);
    return row.length < 5 ? [...row, ...row].slice(0, 8) : row.slice(0, 10);
  });

  async ngOnInit(): Promise<void> {
    await this.loadEvents();
  }

  ngAfterViewInit(): void {
    this.initHeroVideo();
  }

  private initHeroVideo(): void {
    const video = this.bgVideoRef?.nativeElement;
    if (!video) return;

    // Explicitly enforce muted state to satisfy browser autoplay policies
    video.muted = true;
    video.defaultMuted = true;

    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Fallback for strict browser autoplay policies: trigger on first scroll or touch
        const unlock = () => {
          video.play().catch(() => {});
          window.removeEventListener('scroll', unlock);
          window.removeEventListener('touchstart', unlock);
          window.removeEventListener('click', unlock);
        };
        window.addEventListener('scroll', unlock, { once: true, passive: true });
        window.addEventListener('touchstart', unlock, { once: true, passive: true });
        window.addEventListener('click', unlock, { once: true });
      });
    }
  }

  // Close dropdowns and spotlight on outside click
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.search-input-field')) {
      this.searchFocused.set(false);
    }
    if (!target.closest('.category-field-wrapper')) {
      this.showCategoryDropdown.set(false);
    }
    if (!target.closest('.city-field-wrapper')) {
      this.showCityDropdown.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.searchFocused.set(false);
    this.showCategoryDropdown.set(false);
    this.showCityDropdown.set(false);
  }

  async loadEvents(): Promise<void> {
    this.isLoading.set(true);
    try {
      const res = await this.api.get<any[]>('/events');
      if (res.data) {
        this.allEvents.set(res.data);
      }
    } catch (e) {
      console.error('Failed to load landing events', e);
    } finally {
      this.isLoading.set(false);
    }
  }

  // Search input handler
  onSearchInput(value: string): void {
    this.searchQuery.set(value || '');
  }

  onSearchFocus(): void {
    this.searchFocused.set(true);
    this.showCategoryDropdown.set(false);
    this.showCityDropdown.set(false);
  }

  clearSearch(): void {
    this.searchQuery.set('');
  }

  selectRecentSearch(term: string): void {
    this.searchQuery.set(term);
    this.executeSearch();
  }

  selectSearchItem(eventId: string): void {
    this.searchFocused.set(false);
    this.router.navigate(['/events', eventId]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Select City without navigating away
  selectCity(city: string): void {
    this.locationService.setCity(city);
    this.showCityDropdown.set(false);
  }

  toggleCityMenu(event: Event): void {
    event.stopPropagation();
    this.showCityDropdown.update(v => !v);
    if (this.showCityDropdown()) {
      this.showCategoryDropdown.set(false);
      this.searchFocused.set(false);
    }
  }

  toggleCategoryMenu(event: Event): void {
    event.stopPropagation();
    this.showCategoryDropdown.update(v => !v);
    if (this.showCategoryDropdown()) {
      this.showCityDropdown.set(false);
      this.searchFocused.set(false);
    }
  }

  onSelectCategory(cat: string, event: Event): void {
    event.stopPropagation();
    this.selectedCategory.set(cat);
    this.showCategoryDropdown.set(false);
  }

  // Clear all filters
  resetFilters(): void {
    this.searchQuery.set('');
    this.selectedCategory.set('All');
  }

  // Full Search / Catalog Navigation (matching header search query logic)
  executeSearch(event?: Event): void {
    if (event) event.preventDefault();
    const q = this.searchQuery().trim();
    const cat = this.selectedCategory();
    const city = this.locationService.selectedCity();

    if (q) {
      this.recentSearches.update(list => [q, ...list.filter(item => item.toLowerCase() !== q.toLowerCase())].slice(0, 5));
    }

    this.searchFocused.set(false);
    this.showCategoryDropdown.set(false);
    this.showCityDropdown.set(false);

    const queryParams: Record<string, string> = {};
    if (q) {
      queryParams['search'] = q;
      queryParams['q'] = q; // Provide both for full compatibility
    }
    if (cat && cat !== 'All') queryParams['category'] = cat;
    if (city && city !== 'All Cities') queryParams['city'] = city;

    this.router.navigate(['/discover'], { queryParams });
  }

  navigateToCategory(catSlug: string): void {
    this.router.navigate(['/discover'], { queryParams: { category: catSlug } });
  }

  // Navigate to host application and ensure page starts at the top
  navigateToApply(): void {
    window.scrollTo({ top: 0, behavior: 'instant' });
    this.router.navigate(['/host/apply']).then(() => {
      window.scrollTo({ top: 0, behavior: 'instant' });
    });
  }

  getStartingPrice(event: any): number {
    if (!event.ticketTypes || event.ticketTypes.length === 0) return 0;
    const prices = event.ticketTypes.map((t: any) => t.price || 0);
    return Math.min(...prices);
  }
}
