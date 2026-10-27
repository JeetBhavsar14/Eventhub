import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DomSanitizer, SafeHtml, SafeResourceUrl } from '@angular/platform-browser';
import { ApiClient } from '@core/api';
import { AuthService } from '@core/auth';
import { ButtonComponent, IconComponent } from '@shared/components';
import { SVGS } from '@shared/assets';

@Component({
  selector: 'app-event-details',
  standalone: true,
  imports: [CommonModule, ButtonComponent, IconComponent, RouterLink],
  templateUrl: './event-details.component.html',
  styleUrl: './event-details.component.css'
})
export class EventDetailsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private apiClient = inject(ApiClient);
  private authService = inject(AuthService);
  private sanitizer = inject(DomSanitizer);

  event = signal<any>(null);
  similarEvents = signal<any[]>([]);
  isLoading = signal(true);
  error = signal<string | null>(null);
  
  isBookingModalOpen = signal(false);
  currentUser = this.authService.currentUser;

  calendarSvg: SafeHtml;
  mapPinSvg: SafeHtml;
  ticketSvg: SafeHtml;

  constructor() {
    this.calendarSvg = this.sanitizer.bypassSecurityTrustHtml(SVGS.calendar);
    this.mapPinSvg = this.sanitizer.bypassSecurityTrustHtml(SVGS.mapPin);
    this.ticketSvg = this.sanitizer.bypassSecurityTrustHtml(SVGS.ticket);
  }

  getStartingPrice(): number {
    const ev = this.event();
    if (!ev?.ticketTypes || ev.ticketTypes.length === 0) return 500;
    const prices = ev.ticketTypes.map((t: any) => t.price || 0);
    return Math.min(...prices);
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
      const res = await this.apiClient.get<any>(`/events/${id}`);
      if (res.data) {
        this.event.set(res.data);
        await this.loadSimilarEvents(res.data.category, res.data.id, res.data.location?.city);
      } else {
        this.error.set('Event not found.');
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
      const res = await this.apiClient.get<any[]>(`/events?${query}`);
      let list = res.data || [];
      list = list.filter((e: any) => e.id !== currentId);
      
      // If fewer than 3 events found in same category, fetch more from the city
      if (list.length < 3 && city) {
        const fallbackRes = await this.apiClient.get<any[]>(`/events?location.city=${encodeURIComponent(city)}`);
        const fallbackList = (fallbackRes.data || []).filter((e: any) => e.id !== currentId && !list.some(l => l.id === e.id));
        list = [...list, ...fallbackList];
      }
      
      this.similarEvents.set(list.slice(0, 3));
    } catch (err) {
      console.error('Failed to load similar events:', err);
      this.similarEvents.set([]);
    }
  }

  getStartingPriceFor(ev: any): number {
    if (!ev?.ticketTypes || ev.ticketTypes.length === 0) return 500;
    const prices = ev.ticketTypes.map((t: any) => t.price || 0);
    return Math.min(...prices);
  }

  bookTicket() {
    if (!this.currentUser()) {
      alert('Please log in first to book tickets.');
      this.router.navigate(['/auth/login']);
      return;
    }
    this.router.navigate(['/checkout', this.event().id]);
  }
}
