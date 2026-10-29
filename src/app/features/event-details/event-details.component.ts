import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ApiClient } from '@core/api';
import { AuthService } from '@core/auth';
import { EventItem } from '@core/models';
import { getStartingPrice } from '@core/utils';
import { IconComponent, EventCardComponent } from '@shared/components';

@Component({
  selector: 'app-event-details',
  standalone: true,
  imports: [CommonModule, IconComponent, RouterLink, EventCardComponent],
  templateUrl: './event-details.component.html',
  styleUrl: './event-details.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EventDetailsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private apiClient = inject(ApiClient);
  private authService = inject(AuthService);
  private sanitizer = inject(DomSanitizer);

  event = signal<EventItem | null>(null);
  similarEvents = signal<EventItem[]>([]);
  isLoading = signal(true);
  error = signal<string | null>(null);
  
  isBookingModalOpen = signal(false);
  currentUser = this.authService.currentUser;

  getStartingPrice(): number {
    return getStartingPrice(this.event(), 500);
  }

  get mapUrl(): SafeResourceUrl {
    const city = this.event()?.location?.city || 'Mumbai';
    const embedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=72.80%2C18.90%2C72.95%2C19.10&layer=mapnik&marker=18.98%2C72.83`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(embedUrl);
  }

  get googleMapsSearchUrl(): string {
    const venue = this.event()?.location?.venue || '';
    const city = this.event()?.location?.city || '';
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue + ' ' + city)}`;
  }

  ngOnInit() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.route.paramMap.subscribe(async (params) => {
      const id = params.get('id');
      if (id) {
        await this.loadEvent(id);
      }
    });
  }

  async loadEvent(id: string) {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      const res = await this.apiClient.get<EventItem>(`/events/${id}`);
      if (res.data) {
        this.event.set(res.data);
        await this.loadSimilarEvents(res.data.category, res.data.id, res.data.location?.city);
      } else {
        this.error.set(res.error?.userMessage || 'Event not found.');
      }
    } catch (err) {
      console.error(err);
      this.error.set('Failed to load event details.');
    } finally {
      this.isLoading.set(false);
    }
  }

  async loadSimilarEvents(category?: string, currentId?: string, city?: string) {
    try {
      let query = '';
      if (category) {
        query = `category=${encodeURIComponent(category)}`;
      } else if (city) {
        query = `location.city=${encodeURIComponent(city)}`;
      }
      const res = await this.apiClient.get<EventItem[]>(`/events?${query}`);
      let list = res.data || [];
      list = list.filter(e => e.id !== currentId);
      
      // If fewer than 3 events found in same category, fetch more from the city
      if (list.length < 3 && city) {
        const fallbackRes = await this.apiClient.get<EventItem[]>(`/events?location.city=${encodeURIComponent(city)}`);
        const fallbackList = (fallbackRes.data || []).filter(e => e.id !== currentId && !list.some(l => l.id === e.id));
        list = [...list, ...fallbackList];
      }
      
      this.similarEvents.set(list.slice(0, 3));
    } catch (err) {
      console.error('Failed to load similar events:', err);
      this.similarEvents.set([]);
    }
  }


  bookTicket() {
    if (!this.currentUser()) {
      alert('Please log in first to book tickets.');
      this.router.navigate(['/auth/login']);
      return;
    }
    const currentEvent = this.event();
    if (!currentEvent) return;
    this.router.navigate(['/checkout', currentEvent.id]);
  }

}
