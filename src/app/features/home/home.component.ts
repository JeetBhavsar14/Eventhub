import { Component, inject, OnInit, signal, computed } from '@angular/core';
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
export class HomeComponent implements OnInit {
  private api = inject(ApiClient);
  public locationService = inject(LocationService);
  public authService = inject(AuthService);
  private router = inject(Router);

  // Search Bar State
  searchQuery = signal('');
  selectedCategory = signal('All');

  // Events Data
  allEvents = signal<any[]>([]);
  isLoading = signal(true);

  // Categories Explorer Data with vibrant high-res imagery
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

  // Category Filter Dropdown Options
  readonly categoryOptions = [
    'All',
    'Festivals',
    'Concerts',
    'Conferences',
    'Shows & Entertainment',
    'Sports',
    'Workshops'
  ];

  // City list for hero quick pick
  readonly popularCities = [
    'Mumbai',
    'Delhi NCR',
    'Bengaluru',
    'Hyderabad',
    'Pune',
    'Goa'
  ];

  // Filtered Featured & Trending Events in selected City
  trendingEvents = computed(() => {
    const city = this.locationService.selectedCity();
    const events = this.allEvents();
    
    // Prioritize events in current city that are marked featured or popular
    const cityEvents = events.filter(e => 
      e.status === 'published' &&
      (!e.location?.city || e.location.city.toLowerCase() === city.toLowerCase() || city === 'All Cities')
    );

    if (cityEvents.length > 0) {
      return cityEvents.slice(0, 6);
    }
    // Fallback to top published events if city has few
    return events.filter(e => e.status === 'published').slice(0, 6);
  });

  // Highlight Spotlight Event (Top Hero Banner)
  spotlightEvent = computed(() => {
    const trending = this.trendingEvents();
    return trending.length > 0 ? trending[0] : null;
  });

  async ngOnInit(): Promise<void> {
    await this.loadEvents();
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

  // Search Action
  executeSearch(): void {
    const q = this.searchQuery().trim();
    const cat = this.selectedCategory();
    const queryParams: Record<string, string> = {};

    if (q) queryParams['q'] = q;
    if (cat && cat !== 'All') queryParams['category'] = cat;

    this.router.navigate(['/discover'], { queryParams });
  }

  selectCity(city: string): void {
    this.locationService.setCity(city);
  }

  navigateToCategory(catSlug: string): void {
    this.router.navigate(['/discover'], { queryParams: { category: catSlug } });
  }

  getStartingPrice(event: any): number {
    if (!event.ticketTypes || event.ticketTypes.length === 0) return 0;
    const prices = event.ticketTypes.map((t: any) => t.price || 0);
    return Math.min(...prices);
  }
}
